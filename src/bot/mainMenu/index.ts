import { Markup, Scenes } from 'telegraf';
import type { BotContextI } from '../BotContextI.js';
import { urlWizard } from '../flows/addSheet/urlWizard.js';
import { addSpendingWizard } from '../flows/addSpending/addSpendingWizard.js';
import { sheetSelectionMenuScene } from '../selectSheetMenu/index.js';
import { shareActiveSheet } from '../flows/shareSheet/index.js';

enum MenuAction {
  ADD_SPENDING = '💸 Add spending',
  ADD_SHEET = '🗂️ Add sheet',
  SELECT_SHEET = '👉 Select sheet',
  SHOW_ACTIVE_SHEET_STATS = '📊 Active sheet stats',
  SHARE_ACTIVE_SHEET = '📤 Share active sheet',
  CLOSE = '❎ Close',
}

export function createMainMenu(ctx: BotContextI) {
  const menuOptions: MenuAction[][] = [];

  const activeSheetId = ctx.userSettings?.active_sheet_id;
  if (activeSheetId) {
    menuOptions.push([MenuAction.ADD_SPENDING]);
    menuOptions.push([
      MenuAction.SHOW_ACTIVE_SHEET_STATS,
      MenuAction.SHARE_ACTIVE_SHEET,
    ]);
  }

  menuOptions.push([MenuAction.ADD_SHEET, MenuAction.SELECT_SHEET]);
  menuOptions.push([MenuAction.CLOSE]);

  return Markup.keyboard(menuOptions).persistent().resize();
}

async function showMenu(ctx: BotContextI) {
  await ctx.reply('Choose an option:', createMainMenu(ctx));
}

async function closeMenu(ctx: BotContextI) {
  // if (ctx.scene.current?.id !== 'mainMenu') {
  //   return;
  // }

  ctx.reply('Menu closed', Markup.removeKeyboard());
  return ctx.scene.leave();
}

export const menuScene = new Scenes.BaseScene<BotContextI>('menu');

menuScene.enter(showMenu);
menuScene.hears(MenuAction.ADD_SPENDING, (ctx) =>
  ctx.scene.enter(addSpendingWizard.id),
);
menuScene.hears(MenuAction.ADD_SHEET, (ctx) => ctx.scene.enter(urlWizard.id));
menuScene.hears(MenuAction.SELECT_SHEET, (ctx) =>
  ctx.scene.enter(sheetSelectionMenuScene.id),
);
menuScene.hears(MenuAction.SHOW_ACTIVE_SHEET_STATS, async (ctx) =>
  ctx.reply('Not implemented yet'),
);
menuScene.hears(MenuAction.SHARE_ACTIVE_SHEET, shareActiveSheet);
menuScene.hears(MenuAction.CLOSE, (ctx) => closeMenu(ctx));
//menuScene.on(message('text'), (ctx) => closeMenu(ctx));
