import type { UserSettingsI } from '../../persistence/UserSettingsRepositoryI.js';
import type { GoogleSheetsHelper } from '../../integrations/GoogleSheetsHelper.js';
import type { SheetsRepositoryI } from '../../persistence/SheetsRepositoryI.js';
import { throwIfUserIsNotParticipant } from '../throwIfUserIsNotParticipant.js';

const RESERVED_COLUMNS_IN_FIRST_ROW = 2; // columns reserved for date or description

export class SpendingSheetManager {
  private userSettings: UserSettingsI;
  private sheetId: string;
  private sheetsRepository: SheetsRepositoryI;
  private gSheetsHelper: GoogleSheetsHelper;

  constructor(
    userSettings: UserSettingsI,
    sheetId: string,
    sheetsRepository: SheetsRepositoryI,
    gSheetsHelper: GoogleSheetsHelper,
  ) {
    this.userSettings = userSettings;
    this.sheetId = sheetId;
    this.sheetsRepository = sheetsRepository;
    this.gSheetsHelper = gSheetsHelper;
  }

  public async addSpending(amount: number, description: string): Promise<void> {
    const sheet = await this.sheetsRepository.getSheet(this.sheetId);
    throwIfUserIsNotParticipant(sheet, this.userSettings.user_id);

    let header = await this.gSheetsHelper.readRowUntilFirstEmptyCell(
      this.sheetId,
      0,
    );
    if (header.length === 0) {
      header = ['Date', 'Description'];
      await this.gSheetsHelper.fillCells(this.sheetId, [header], 0, 0);
    }

    const userColIndex = await this.locateOrAddUserColumn(header);

    const insertRowIndex = await this.gSheetsHelper.findVacantSectionRowIndex(
      this.sheetId,
      Math.max(sheet.last_record_index, 1),
      0,
      header.length - 1,
      5,
    );

    const rowData: Array<number | string> = new Array(header.length).fill('');
    rowData[0] = this.getCurrentDateFormatted();
    rowData[1] = description;
    rowData[userColIndex] = amount;

    await this.gSheetsHelper.fillCells(
      this.sheetId,
      [rowData],
      insertRowIndex,
      0,
    );

    await this.sheetsRepository.updateLastRecordIndex(
      sheet.sheet_id,
      insertRowIndex,
    );
  }

  private async locateOrAddUserColumn(header: string[]): Promise<number> {
    const userColIndex = header.indexOf(this.userSettings.username);
    if (userColIndex !== -1) {
      return userColIndex;
    }

    await this.gSheetsHelper.insertCol(
      this.sheetId,
      RESERVED_COLUMNS_IN_FIRST_ROW,
      [this.userSettings.username],
    );
    header[RESERVED_COLUMNS_IN_FIRST_ROW] = this.userSettings.username;

    return RESERVED_COLUMNS_IN_FIRST_ROW;
  }

  private getCurrentDateFormatted(): string {
    let currentDate = new Date();
    const offset = currentDate.getTimezoneOffset();
    currentDate = new Date(currentDate.getTime() - offset * 60 * 1000);

    return currentDate.toISOString().split('T')[0];
  }
}
