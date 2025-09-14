import { type ConfigI, type ConfigProviderI, isValidEnv } from './ConfigI.js';
import type { JWTInput } from 'google-auth-library/build/src/auth/credentials.js';

type RawConfig = Record<
  | keyof ConfigI['secrets']
  | Exclude<keyof ConfigI, 'secrets' | 'gServiceAccountEmail'>,
  string
>;

export class ConfigProviderEnv implements ConfigProviderI {
  public async loadConfig(): Promise<ConfigI> {
    return this.validateAndPrepare(this.getRawConfigAndClearSecrets());
  }

  protected validateAndPrepare(rawConfig: RawConfig): ConfigI {
    if (!isValidEnv(rawConfig.env)) {
      throw new Error(`'${rawConfig.env}' is not a valid environment`);
    }

    let gServiceAccount;
    try {
      gServiceAccount = JSON.parse(rawConfig.gServiceAccount) as JWTInput;
    } catch (err) {
      throw new Error(`Failed to parse google service account json`, {
        cause: err,
      });
    }
    if (!gServiceAccount.client_email || !gServiceAccount.private_key) {
      throw new Error(`Invalid Google service account`);
    }

    return Object.freeze({
      secrets: {
        botToken: rawConfig.botToken,
        gServiceAccount: gServiceAccount,
      },
      region: rawConfig.region,
      env: rawConfig.env,
      gServiceAccountEmail: gServiceAccount.client_email,
      botName: rawConfig.botName,
    });
  }

  protected getRawConfigAndClearSecrets(): RawConfig {
    const config = {
      botToken: this.getEnvVar('BOT_TOKEN'),
      gServiceAccount: this.getEnvVar('GSERVICEACCOUNT'),
      region: this.getEnvVar('AWS_REGION', ''),
      env: this.getEnvVar('ENV'),
      botName: this.getEnvVar('BOT_NAME'),
    };

    this.clearSecrets(['BOT_TOKEN', 'GSERVICEACCOUNT']);

    return config;
  }

  private getEnvVar(name: string, defaultValue?: string): string {
    const value = process.env[name];
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Env variable '${name}' is not defined`);
    }

    return value;
  }

  private clearSecrets(secretKeys: string[]): void {
    for (const key of secretKeys) {
      delete process.env[key];
    }
  }
}
