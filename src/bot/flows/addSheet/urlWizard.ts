import { Markup, Scenes } from 'telegraf';
import type { BotContextI } from '../../BotContextI.js';
import { GoogleSheetsHelper } from '../../../integrations/GoogleSheetsHelper.js';
import { getPublicConfig } from '../../../config/index.js';

export const urlWizard = new Scenes.WizardScene<BotContextI>(
  'url_wizard',
  /** Ask url */

  (ctx) => {
    ctx.reply(
      `Create a google sheet document and share it with ${getPublicConfig().gServiceAccountEmail}. Then send me the URL`,
      Markup.removeKeyboard(),
    );
    ctx.wizard.next();
  },

  /** Process url, ask name */

  async (ctx) => {
    let url: string;
    if (ctx.message && 'text' in ctx.message) {
      url = ctx.message.text;
    } else {
      return ctx.reply('URL is required');
    }

    const googleSheetId = GoogleSheetsHelper.extractSheetIdFromUrl(url);
    if (!googleSheetId) {
      return ctx.reply("That doesn't look like a valid URL, try again");
    }

    const helper = ctx.appContainer.googleSheetsHelper();
    if (await helper.canAccessSheet(googleSheetId)) {
      ctx.wizard.state.googleSheetId = googleSheetId;

      ctx.reply(
        `Got your sheet: ${googleSheetId}. Now specify the name of the sheet`,
      );
      ctx.wizard.next();
    } else {
      ctx.reply(
        "I can't access that sheet, ensure you have shared the document and try again",
      );
    }
  },

  /** Save or reject */

  async (ctx) => {
    let name: string;
    if (ctx.message && 'text' in ctx.message) {
      name = ctx.message.text;
    } else {
      return ctx.reply('Name is required');
    }

    // add sheet
    const sheetId = ctx.wizard.state.googleSheetId as string;
    const sheet = await ctx.appContainer.sheetsRepository().addSheet({
      sheet_id: sheetId,
      name,
      owner_id: ctx.getUserId(),
      participant_ids: [ctx.getUserId()],
      last_record_index: 0,
    });

    // add sheet info to list of sheets in user settings
    const sheetHeader = { name: sheet.name, sheet_id: sheet.sheet_id };
    const userSettings = ctx.getUserSettingsOrThrow();
    if (userSettings.added_sheet_ids) {
      const existingSheet = userSettings.added_sheet_ids.find(
        (sheet) => sheet.sheet_id === sheetId,
      );
      if (existingSheet) {
        return ctx.leaveSceneAndReply(
          'Sheet was already added before, you can select the sheet using /select command',
        );
      }
      userSettings.added_sheet_ids = [
        ...userSettings.added_sheet_ids,
        sheetHeader,
      ];
    } else {
      userSettings.added_sheet_ids = [sheetHeader];
    }

    return ctx.leaveSceneAndReply(
      'Sheet was added, you can select the sheet using /select command',
    );
  },
);

urlWizard.command('cancel', async (ctx) => {
  return ctx.leaveSceneAndReply('❌ Wizard cancelled');
});
