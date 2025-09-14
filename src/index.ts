import type { APIGatewayProxyEventV2, Handler } from 'aws-lambda';
import http from 'serverless-http';
import { ConfigProviderAws } from './config/ConfigProviderAws.js';
import { createBot } from './bot/index.js';
import { AppContainer } from './appContainer/AppContainer.js';
import { loadConfigAndExposePublicPart } from './config/index.js';
import { createBotContextClass } from './bot/BotContextBase.js';
import type { ConfigI } from './config/ConfigI.js';

type ResultType = object;

const WEBHOOK_PATH = '/telegraf' as const;
const SERVERLESS_PROVIDER = 'aws' as const;

let cachedConfig: ConfigI | null = null;

async function loadRuntimeConfig(): Promise<ConfigI> {
  if (cachedConfig) return cachedConfig;
  const cfg = await loadConfigAndExposePublicPart(ConfigProviderAws);
  if (cfg.env === 'local') {
    throw new Error(
      "ENV cannot be set to 'local' when starting the app through this entrypoint",
    );
  }
  cachedConfig = cfg;

  return cfg;
}

function createWebhookHandler(config: ConfigI) {
  return http(
    createBot(
      config.secrets.botToken,
      createBotContextClass(new AppContainer(config)),
    ).webhookCallback(WEBHOOK_PATH),
    { provider: SERVERLESS_PROVIDER },
  );
}

export const handler: Handler<APIGatewayProxyEventV2, ResultType> = async (
  event,
  context,
) => {
  try {
    const config = await loadRuntimeConfig();
    return createWebhookHandler(config)(event, context);
  } catch (err) {
    console.error('Webhook handler failed:', err);
    return {};
  }
};
