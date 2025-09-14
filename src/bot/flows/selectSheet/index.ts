import type { BotContextI } from '../../BotContextI.js';

export function selectSheet(ctx: BotContextI) {
  let item: string;
  if (ctx.message && 'text' in ctx.message) {
    item = ctx.message.text;
  } else {
    return ctx.reply('Invalid input');
  }

  const match = item.match(/(\S+)$/);
  if (!match) {
    return ctx.reply('Invalid input');
  }
  const sheetId = match[1];
  const sheetName = item.slice(0, item.length - sheetId.length - 1);
  const userSettings = ctx.getUserSettingsOrThrow();
  userSettings.active_sheet_id = sheetId;
  ctx.userSettingsRepository.saveUserSettings(userSettings);

  return ctx.leaveSceneAndReplyWithHtml(
    `Sheet <u>${makeSheetLabel(sheetName, sheetId)}</u> is selected`,
  );
}

function makeSheetLabel(sheetName: string, sheetId: string) {
  return `${sheetName} ${sheetId.slice(0, 10) + '...'}`;
}
