import { DDBRepository } from './DDBRepository.js';
import type {
  ShareOtp,
  SheetI,
  SheetsRepositoryI,
} from '../SheetsRepositoryI.js';
import {
  type DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';

const DEFAULT_TTL_SECONDS = 3600 * 24 * 30; // 30 days
const OTP_TTL_SECONDS = 300; // 5 minutes

export class SheetsRepository
  extends DDBRepository
  implements SheetsRepositoryI
{
  constructor(ddb: DynamoDBDocumentClient) {
    super(ddb, `sheets`);
  }

  public async getSheet(sheetId: string): Promise<SheetI> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        sheet_id: sheetId,
      },
    });

    const response = await this.ddb.send(command);
    if (!response.Item) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    return response.Item as SheetI;
  }

  public async addSheet(
    sheet: SheetI,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<SheetI> {
    const timestamp = this.getTimestamp();
    const expiresAt = timestamp + ttlSeconds;

    const sheetResult = {
      ...sheet,
      created_at: sheet.created_at ? sheet.created_at : timestamp,
      updated_at: timestamp,
    };
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...sheetResult,
        expiresAt, // DynamoDB TTL attribute (auto-expiry)
      },
    });

    await this.ddb.send(command);

    return sheetResult;
  }

  public async addOtp(sheetId: string, otpCode: string): Promise<void> {
    const timestamp = this.getTimestamp();
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        sheet_id: sheetId,
      },
      UpdateExpression: 'SET otp = :otp, updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':otp': {
          otp: otpCode,
          expires_at: timestamp + OTP_TTL_SECONDS,
        } as ShareOtp,
        ':timestamp': timestamp,
      },
    });

    await this.ddb.send(command);
  }

  public async removeOtp(sheetId: string): Promise<void> {
    const timestamp = this.getTimestamp();
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        sheet_id: sheetId,
      },
      UpdateExpression: 'REMOVE otp SET updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':timestamp': timestamp,
      },
    });

    await this.ddb.send(command);
  }

  public async findByOtp(otpCode: string): Promise<SheetI | null> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'otp.otp = :otpCode AND otp.expires_at > :now',
      ExpressionAttributeValues: {
        ':otpCode': otpCode,
        ':now': this.getTimestamp(),
      },
    });

    const response = await this.ddb.send(command);
    if (!response.Items || response.Items.length === 0) {
      return null;
    }

    return response.Items[0] as SheetI;
  }

  public async addParticipant(sheetId: string, userId: number): Promise<void> {
    const timestamp = this.getTimestamp();
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        sheet_id: sheetId,
      },
      UpdateExpression:
        'SET participant_ids = list_append(if_not_exists(participant_ids, :empty_list), :user_id), updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':user_id': [userId],
        ':empty_list': [],
        ':timestamp': timestamp,
      },
    });

    await this.ddb.send(command);
  }

  public async updateLastRecordIndex(
    sheetId: string,
    lastRecordIndex: number,
  ): Promise<void> {
    const timestamp = this.getTimestamp();
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        sheet_id: sheetId,
      },
      UpdateExpression:
        'SET last_record_index = :lastRecordIndex, updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':lastRecordIndex': lastRecordIndex,
        ':timestamp': timestamp,
      },
    });

    await this.ddb.send(command);
  }

  public async listSheets(
    participantId: number,
    limit = 20,
    lastEvaluatedKey?: Record<string, unknown>,
  ): Promise<{
    items: SheetI[];
    lastEvaluatedKey: Record<string, unknown> | undefined;
  }> {
    const command = new ScanCommand({
      TableName: this.tableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      FilterExpression: 'contains(participant_ids, :participantId)',
      ExpressionAttributeValues: {
        ':participantId': participantId,
      },
    });

    const response = await this.ddb.send(command);

    return {
      items: (response.Items ?? []) as SheetI[],
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  }

  public async createTableIfNotExists(): Promise<void> {
    try {
      // Check if the table exists
      await this.ddb.send(
        new DescribeTableCommand({ TableName: this.tableName }),
      );
      console.log(`Table already exists: ${this.tableName}`);
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        // Table doesn't exist → create it
        const command = new CreateTableCommand({
          TableName: this.tableName,
          KeySchema: [{ AttributeName: 'sheet_id', KeyType: 'HASH' }],
          AttributeDefinitions: [
            { AttributeName: 'sheet_id', AttributeType: 'S' },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        });

        await this.ddb.send(command);
        console.log(`Table created: ${this.tableName}`);
      } else {
        // Some other error
        console.error('Error checking/creating table:', err);
        throw err;
      }
    }
  }
}
