import type {
  UserSettingsI,
  UserSettingsRepositoryI,
} from '../UserSettingsRepositoryI.js';
import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DDBRepository } from './DDBRepository.js';

const DEFAULT_TTL_SECONDS = 3600 * 24 * 30; // 30 days

export class UserSettingsRepository
  extends DDBRepository
  implements UserSettingsRepositoryI
{
  constructor(ddb: DynamoDBDocumentClient) {
    super(ddb, `user-settings`);
  }

  public async getUserSettings(userId: number): Promise<UserSettingsI | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { user_id: userId },
    });

    const result = await this.ddb.send(command);
    return result.Item ? (result.Item as UserSettingsI) : null;
  }

  public async saveUserSettings(
    userSettings: UserSettingsI,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<UserSettingsI> {
    const timestamp = this.getTimestamp();
    const expiresAt = timestamp + ttlSeconds;

    const userSettingsResult = {
      ...userSettings,
      created_at: userSettings.created_at ? userSettings.created_at : timestamp,
      updated_at: timestamp,
    };
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...userSettingsResult,
        expiresAt, // DynamoDB TTL attribute (auto-expiry)
      },
    });

    await this.ddb.send(command);

    return userSettingsResult;
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
          KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
          AttributeDefinitions: [
            { AttributeName: 'user_id', AttributeType: 'N' },
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
