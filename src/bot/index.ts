import { Scenes, Telegraf } from 'telegraf';
import type { BotContextConstructor, BotContextI } from './BotContextI.js';
import { urlWizard } from './flows/addSheet/urlWizard.js';
import { menuScene } from './mainMenu/index.js';
import { sheetSelectionMenuScene } from './selectSheetMenu/index.js';
import { addSpendingWizard } from './flows/addSpending/addSpendingWizard.js';
import { joinSheet } from './flows/joinSheet/index.js';
import { shareActiveSheet } from './flows/shareSheet/index.js';
import { welcomeMessage } from './welcomeMessage.js';

// DynamoDB-backed session middleware
function dynamoSession() {
  return async (ctx: BotContextI, next: () => Promise<void>) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return next();

    if (!ctx.userHasUsernameOrFirstName()) {
      ctx.reply('You must have a username or first name to use this bot');
      return;
    }
    await ctx.loadSession();
    await next();
    await ctx.saveSession();
  };
}

export function createBot(
  botToken: string,
  botContextConstructor: BotContextConstructor,
): Telegraf<BotContextI> {
  const bot = new Telegraf<BotContextI>(botToken, {
    contextType: botContextConstructor,
  });

  bot.use(dynamoSession());

  const stage = new Scenes.Stage<BotContextI>(
    [menuScene, urlWizard, sheetSelectionMenuScene, addSpendingWizard],
    { default: menuScene.id },
  );
  bot.use(stage.middleware());

  bot.command('add_sheet', (ctx) => ctx.scene.enter(urlWizard.id));
  bot.command('add_spending', (ctx) => ctx.scene.enter(addSpendingWizard.id));
  bot.command('select_sheet', (ctx) =>
    ctx.scene.enter(sheetSelectionMenuScene.id),
  );
  bot.command('share_sheet', shareActiveSheet);
  bot.command('help', (ctx) => ctx.reply(welcomeMessage));
  bot.command('menu', (ctx) => ctx.scene.enter('menu'));

  bot.start(async (ctx) => {
    if (ctx.payload) {
      await joinSheet(ctx, ctx.payload);
    } else {
      ctx.reply(welcomeMessage);
    }
  });

  // Global error handler
  bot.catch((err, ctx) => {
    console.error(`Global error handler caught an error:`, err);
    ctx.reply('Oops! Something went wrong 😢');
  });

  return bot;
}
