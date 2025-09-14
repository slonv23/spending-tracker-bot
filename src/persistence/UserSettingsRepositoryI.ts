import type { SheetI } from './SheetsRepositoryI.js';
import type { DocumentI } from './DocumentI.js';
import type { BotSession } from '../bot/BotContextI.js';

export interface UserSettingsI extends DocumentI {
  user_id: number;
  username: string;
  active_sheet_id?: string;
  added_sheet_ids?: Pick<SheetI, 'sheet_id' | 'name'>[];
  session: BotSession;
}

export interface UserSettingsRepositoryI {
  getUserSettings(userId: number): Promise<UserSettingsI | null>;
  saveUserSettings(
    userSettings: UserSettingsI,
    ttlSeconds?: number,
  ): Promise<UserSettingsI>;
}
