import type {
  ConfigI,
  ConfigProviderConstructorI,
  ConfigProviderI,
  PublicConfigI,
} from './ConfigI.js';

let publicConfig: PublicConfigI;

export async function loadConfigAndExposePublicPart<T extends ConfigProviderI>(
  ConfigProviderClass: ConfigProviderConstructorI<T>,
): Promise<ConfigI> {
  const config = await new ConfigProviderClass().loadConfig();

  publicConfig = Object.freeze({
    ...config,
    secrets: undefined,
  });

  return config;
}

export function getPublicConfig(): PublicConfigI {
  if (!publicConfig) throw new Error('Public config not loaded yet');
  return publicConfig;
}
