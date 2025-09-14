import './localConfig.js';
import { ConfigProviderEnv } from '../config/ConfigProviderEnv.js';
import { createBot } from '../bot/index.js';
import { createBotContextClass } from '../bot/BotContextBase.js';
import { loadConfigAndExposePublicPart } from '../config/index.js';
import { AppContainer } from '../appContainer/AppContainer.js';

(async () => {
  const config = await loadConfigAndExposePublicPart(ConfigProviderEnv);
  if (config.env !== 'local') {
    throw new Error(`When running locally, ENV is expected to be 'local'`);
  }

  const appContainer = new AppContainer(config);
  await appContainer.userRepository().createTableIfNotExists();
  await appContainer.sheetsRepository().createTableIfNotExists();

  const bot = createBot(
    config.secrets.botToken,
    createBotContextClass(appContainer),
  );
  bot.launch();

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
})();
