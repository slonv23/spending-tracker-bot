import { memoize } from 'lodash-es';
import { UserSettingsRepository } from '../persistence/dynamodb/UserSettingsRepository.js';
import type { ConfigI } from '../config/ConfigI.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SheetsRepository } from '../persistence/dynamodb/SheetsRepository.js';
import { GoogleSheetsHelper } from '../integrations/GoogleSheetsHelper.js';
import { SpendingSheetManager } from '../utils/spendings/SpendingSheetManager.js';
import type { UserSettingsI } from '../persistence/UserSettingsRepositoryI.js';

export class AppContainer {
  private config: ConfigI;

  constructor(config: ConfigI) {
    this.config = config;
  }

  public userRepository = memoize(() => {
    return new UserSettingsRepository(this.ddbClient());
  });

  public sheetsRepository = memoize(() => {
    return new SheetsRepository(this.ddbClient());
  });

  public googleSheetsHelper = memoize(() => {
    return new GoogleSheetsHelper(this.config.secrets.gServiceAccount);
  });

  public spendingSheetManager(
    userSettings: UserSettingsI,
    sheetId: string,
  ): SpendingSheetManager {
    return new SpendingSheetManager(
      userSettings,
      sheetId,
      this.sheetsRepository(),
      this.googleSheetsHelper(),
    );
  }

  private ddbClient = memoize(() => {
    return this.config.env === 'local'
      ? this.createDDBLocalClient()
      : this.createDDBLambdaClient();
  });

  private createDDBLocalClient(): DynamoDBDocumentClient {
    const client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000', // local endpoint
      credentials: {
        accessKeyId: 'fakeMyKeyId', // DynamoDB local ignores auth
        secretAccessKey: 'fakeSecretKey',
      },
    });

    return DynamoDBDocumentClient.from(client);
  }

  private createDDBLambdaClient(): DynamoDBDocumentClient {
    const client = new DynamoDBClient({ region: this.config.region });

    return DynamoDBDocumentClient.from(client);
  }
}
