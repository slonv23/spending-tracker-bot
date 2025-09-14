import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getPublicConfig } from '../../config/index.js';

export abstract class DDBRepository {
  protected ddb: DynamoDBDocumentClient;
  protected tableName: string;

  constructor(ddb: DynamoDBDocumentClient, tableNameWithoutSuffix: string) {
    this.ddb = ddb;
    this.tableName = `${tableNameWithoutSuffix}-${getPublicConfig().env}`;
  }

  protected getTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}
