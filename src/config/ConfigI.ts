import type { JWTInput } from 'google-auth-library/build/src/auth/credentials.js';

export interface PublicConfigI {
  region: string;
  env: 'local' | 'dev' | 'stage' | 'prod';
  gServiceAccountEmail: string;
  botName: string;
}

export interface ConfigI extends PublicConfigI {
  secrets: {
    botToken: string;
    gServiceAccount: JWTInput;
  };
}

export interface ConfigProviderI {
  loadConfig(): Promise<ConfigI>;
}

export interface ConfigProviderConstructorI<T extends ConfigProviderI> {
  new (): T;
}

export function isValidEnv(env: string): env is ConfigI['env'] {
  return ['local', 'dev', 'stage', 'prod'].includes(env);
}

//export const secretConfigPropertyNames = ['botToken', 'gServiceAccount'];
