import type { DocumentI } from './DocumentI.js';

export interface SheetI extends DocumentI {
  sheet_id: string; // Google sheet id
  name: string;
  owner_id: number;
  participant_ids: number[];
  last_record_index: number;
  otp?: ShareOtp;
}

export interface ShareOtp {
  expires_at: number;
  otp: string;
}

export interface SheetsRepositoryI {
  getSheet(sheetId: string): Promise<SheetI>;
  addSheet(sheet: SheetI): Promise<SheetI>;
  listSheets(
    participantId: number,
    limit: number,
    lastEvaluatedKey?: Record<string, unknown>,
  ): Promise<{
    items: SheetI[];
    lastEvaluatedKey: Record<string, unknown> | undefined;
  }>;
  updateLastRecordIndex(
    sheetId: string,
    lastRecordIndex: number,
  ): Promise<void>;
  addOtp(sheetId: string, otpCode: string): Promise<void>;
  removeOtp(sheetId: string): Promise<void>;
  findByOtp(otpCode: string): Promise<SheetI | null>;
  addParticipant(sheetId: string, userId: number): Promise<void>;
}
