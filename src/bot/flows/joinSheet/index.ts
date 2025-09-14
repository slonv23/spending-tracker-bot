import type { BotContextI } from '../../BotContextI.js';

export async function joinSheet(ctx: BotContextI, payload: string) {
  const sheetsRepository = ctx.appContainer.sheetsRepository();
  const sheet = await sheetsRepository.findByOtp(payload);
  if (!sheet) {
    return ctx.reply('Invalid link');
  }

  await sheetsRepository.removeOtp(sheet.sheet_id);

  await sheetsRepository.addParticipant(sheet.sheet_id, ctx.getUserId());

  return ctx.reply('You have joined the sheet, use /menu to select it');
}
