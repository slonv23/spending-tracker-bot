import type { BotContextI } from '../../BotContextI.js';
import { getPublicConfig } from '../../../config/index.js';
import { randomBytes } from 'node:crypto';
import { throwIfUserIsNotParticipant } from '../../../utils/throwIfUserIsNotParticipant.js';

export async function shareActiveSheet(ctx: BotContextI): Promise<void> {
  const userSettings = ctx.getUserSettingsOrThrow();
  const sheetId = userSettings.active_sheet_id;
  if (sheetId === undefined) {
    ctx.reply(
      `You don't have an active/selected sheet, select the sheet first`,
    );
    return;
  }

  const sheetRepository = ctx.appContainer.sheetsRepository();
  const sheet = await sheetRepository.getSheet(sheetId);
  throwIfUserIsNotParticipant(sheet, ctx.getUserId());

  const otp = generateSheetOtp();

  await sheetRepository.addOtp(sheetId, otp);

  const url = `https://t.me/${getPublicConfig().botName}?start=${otp}`;
  ctx.reply(
    `Send this url to share the sheet (url can be used only once): ${url}`,
  );
}

function generateSheetOtp(): string {
  return randomBytes(16).toString('hex');
}
