import type { SheetI } from '../persistence/SheetsRepositoryI.js';

export function throwIfUserIsNotParticipant(
  sheet: SheetI,
  userId: number,
): void {
  if (!sheet.participant_ids.includes(userId)) {
    throw new Error(
      `User ${userId} is not a participant of the sheet ${sheet.sheet_id}`,
    );
  }
}
