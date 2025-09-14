import { Markup, Scenes } from 'telegraf';
import type { BotContextI } from '../../BotContextI.js';
import { parseNumber } from '../../../utils/parseNumber.js';

export const addSpendingWizard = new Scenes.WizardScene<BotContextI>(
  'add_spending_wizard',
  /** Ask amount */

  (ctx) => {
    getSheetIdOrLeaveScene(ctx);

    ctx.reply(`Enter the amount of spending`, Markup.removeKeyboard());
    ctx.wizard.next();
  },

  /** Process amount, ask description */

  async (ctx) => {
    let amount: string;
    if (ctx.message && 'text' in ctx.message) {
      amount = ctx.message.text;
    } else {
      return ctx.reply('Amount is required');
    }

    const result = parseNumber(amount);
    if (result === null) {
      return ctx.reply('Amount must be a number');
    }
    ctx.wizard.state.amount = result;

    ctx.reply(`Now specify the description`);
    ctx.wizard.next();
  },

  /** Process description */

  async (ctx) => {
    let desc: string;
    if (ctx.message && 'text' in ctx.message) {
      desc = ctx.message.text;
    } else {
      return ctx.reply('Description is required');
    }

    const userSettings = ctx.getUserSettingsOrThrow();
    const sheetId = getSheetIdOrLeaveScene(ctx);

    const manager = ctx.appContainer.spendingSheetManager(
      userSettings,
      sheetId,
    );
    await manager.addSpending(ctx.wizard.state.amount as number, desc);

    return ctx.leaveSceneAndReply('Spending was added');
  },
);

addSpendingWizard.command('cancel', async (ctx) => {
  return ctx.leaveSceneAndReply('❌ Wizard cancelled');
});

function getSheetIdOrLeaveScene(ctx: BotContextI): string {
  const userSettings = ctx.getUserSettingsOrThrow();
  const sheetId = userSettings.active_sheet_id;
  if (sheetId === undefined) {
    ctx.leaveSceneAndReply(
      `You don't have an active/selected sheet, select the sheet first`,
    );
    throw new Error('No sheet selected'); // throw error to prevent further execution
  }

  return sheetId;
}
