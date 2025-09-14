import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';
import type { ConfigI } from './ConfigI.js';
import { ConfigProviderEnv } from './ConfigProviderEnv.js';

export class ConfigProviderAws extends ConfigProviderEnv {
  public async loadConfig(): Promise<ConfigI> {
    const rawConfig = this.getRawConfigAndClearSecrets();

    try {
      const secrets: Record<keyof ConfigI['secrets'], string> = {
        botToken: rawConfig.botToken,
        gServiceAccount: rawConfig.gServiceAccount,
      };
      const ssmClient = new SSMClient({ region: rawConfig.region });

      const arns = Object.values<string>(secrets);

      const response = await ssmClient.send(
        new GetParametersCommand({
          Names: arns,
          WithDecryption: true, // Must be true for SecureString
        }),
      );
      if (response.InvalidParameters && response.InvalidParameters.length > 0) {
        throw new Error(
          `Invalid parameters: ${response.InvalidParameters.join(', ')}`,
        );
      }

      type SecretParamName = keyof ConfigI['secrets'];
      const arnToNameMap = Object.entries(secrets).reduce(
        (acc, [name, arn]) => {
          acc[arn] = name as SecretParamName;
          return acc;
        },
        {} as Record<string, SecretParamName>,
      );

      response.Parameters?.forEach((param) => {
        if (!param.ARN) return;
        const name = arnToNameMap[param.ARN];
        if (name && param.Value) {
          rawConfig[name] = param.Value;
        }
      });
    } catch (error) {
      console.error('Failed to retrieve secrets from SSM:', error);
      throw error;
    }

    return this.validateAndPrepare(rawConfig);
  }
}
