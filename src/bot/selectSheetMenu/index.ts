import type { BotContextI } from '../BotContextI.js';
import { Markup, Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import { selectSheet } from '../flows/selectSheet/index.js';

enum MenuAction {
  CLOSE = '❎ Close',
}

async function showMenu(ctx: BotContextI) {
  const sheetsRepository = ctx.appContainer.sheetsRepository();

  ctx.scene.state.page = '0';
  const sheets = await sheetsRepository.listSheets(ctx.getUserId(), 5);

  const menuOptions = [
    sheets.items.map((sheet) => {
      return `${sheet.name} ${sheet.sheet_id}`;
    }),
  ];
  if (menuOptions[0].length === 0) {
    return ctx.leaveSceneAndReply("You haven't added any sheets");
  }

  menuOptions.push([MenuAction.CLOSE]);

  await ctx.reply(
    'Choose an option:',
    Markup.keyboard(menuOptions).oneTime().resize(),
  );
}

async function closeMenu(ctx: BotContextI) {
  // if (ctx.scene.current?.id !== 'mainMenu') {
  //   return;
  // }

  return ctx.leaveSceneAndReply('Menu closed');
}

export const sheetSelectionMenuScene = new Scenes.BaseScene<BotContextI>(
  'sheet-selection-mainMenu',
);

sheetSelectionMenuScene.enter(showMenu);
sheetSelectionMenuScene.hears(MenuAction.CLOSE, closeMenu);
sheetSelectionMenuScene.on(message('text'), selectSheet);
