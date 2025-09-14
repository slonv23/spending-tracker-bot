import type { sheets_v4 } from 'googleapis';
import { google } from 'googleapis';
import type { JWTInput } from 'google-auth-library/build/src/auth/credentials.js';

export class GoogleSheetsHelper {
  private sheets: sheets_v4.Sheets;

  constructor(serviceAccount: JWTInput) {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'], // read/write access
    });

    // Create client
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  public async canAccessSheet(spreadsheetId: string): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'spreadsheetId', // only fetch minimal metadata
      });

      return true;
    } catch (err) {
      if (GoogleSheetsHelper.isGoogleApiError(err)) {
        const status =
          typeof err.code === 'string'
            ? parseInt(err.code, 10)
            : (err.code ?? err?.response?.status);

        if (status === 403) {
          console.error(
            'No permission: Sheet is not shared with this account.',
          );
        } else if (status === 404) {
          console.error('Sheet not found: Wrong ID or no visibility.');
        } else {
          console.error('Google API error:', err);
        }
      } else {
        console.error('Unexpected error:', err);
      }

      return false;
    }
  }

  public async readRowUntilFirstEmptyCell(
    spreadsheetId: string,
    rowIndex: number,
  ): Promise<string[]> {
    const range = `Sheet1!${rowIndex + 1}:${rowIndex + 1}`; // whole row
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const row = response.data.values?.[0] ?? [];
    const firstEmptyIndex = row.findIndex(
      (cell) => cell === '' || cell == null,
    );
    return firstEmptyIndex === -1 ? row : row.slice(0, firstEmptyIndex);
  }

  public async findVacantSectionRowIndex(
    spreadsheetId: string,
    startRowIndex: number,
    startColIndex: number,
    endColIndex: number,
    consecutiveEmptyRows: number,
    batchSize = 100,
  ): Promise<number> {
    let currentRowIndex = startRowIndex;
    let emptyCount = 0;

    let nonEmptyRowIndex: number | null = null;
    const columnRange = new Array(endColIndex - startColIndex + 1)
      .fill(0)
      .map((val, index) => this.colIndexToLetter(startColIndex + index));
    while (true) {
      const range = `Sheet1!${columnRange[0]}${currentRowIndex + 1}:${columnRange[columnRange.length - 1]}${currentRowIndex + batchSize}`;
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const values = res.data.values || [];
      const numRows = Math.max(values.length, batchSize); // treat missing rows as empty

      for (let i = 0; i < numRows; i++) {
        let isEmpty = true;

        for (let colIndex = 0; colIndex < columnRange.length; colIndex++) {
          const cell = values[i]?.[colIndex] ?? '';
          if (cell !== '') {
            isEmpty = false;
            break;
          }
        }

        if (isEmpty) {
          emptyCount++;
          if (
            nonEmptyRowIndex !== null &&
            emptyCount === consecutiveEmptyRows
          ) {
            return nonEmptyRowIndex + 1;
          }
        } else {
          nonEmptyRowIndex = currentRowIndex + i;
          emptyCount = 0;
        }
      }

      const iterateBackwards = !nonEmptyRowIndex; // all rows in the batch are empty
      if (iterateBackwards && currentRowIndex === 0) {
        return 0; // already checked the first batch
      }
      currentRowIndex = iterateBackwards
        ? Math.max(0, currentRowIndex - batchSize)
        : currentRowIndex + batchSize;
    }
  }

  public async insertCol(
    spreadsheetId: string,
    colIndex: number,
    values?: string[],
  ): Promise<void> {
    const requests: sheets_v4.Schema$Request[] = [
      {
        insertDimension: {
          range: {
            sheetId: 0, // ID of the sheet (not name). 0 usually = first sheet
            dimension: 'COLUMNS',
            startIndex: colIndex,
            endIndex: colIndex + 1,
          },
          inheritFromBefore: true,
        },
      },
    ];

    if (values !== undefined) {
      requests.push({
        updateCells: {
          rows: [
            {
              values: values.map((val) => ({
                userEnteredValue: { stringValue: val },
              })),
            },
          ],
          fields: 'userEnteredValue',
          start: {
            sheetId: 0,
            rowIndex: 0,
            columnIndex: colIndex,
          },
        },
      });
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  public async fillCell(
    spreadsheetId: string,
    value: unknown,
    rowIndex: number,
    colIndex: number,
  ): Promise<void> {
    const cell = `Sheet1!${this.colIndexToLetter(colIndex)}${rowIndex + 1}`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: cell,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });
  }

  public async fillCells(
    spreadsheetId: string,
    values: unknown[][],
    startRowIndex: number,
    startColIndex: number,
  ): Promise<void> {
    // Normalize to make sure all rows have the same number of columns
    const maxCols = values.reduce(
      (m, r) => Math.max(m, Array.isArray(r) ? r.length : 0),
      0,
    );
    const normalized = values.map((row) =>
      Array.from({ length: maxCols }, (_, i) => row?.[i] ?? ''),
    );

    const endRow = startRowIndex + normalized.length - 1;
    const endCol = startColIndex + (normalized[0]?.length ?? 1) - 1;
    const range = `Sheet1!${this.colIndexToLetter(startColIndex)}${startRowIndex + 1}:${this.colIndexToLetter(endCol)}${endRow + 1}`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: normalized,
      },
    });
  }

  public static isGoogleApiError(err: unknown): err is {
    code?: number | string;
    message?: string;
    response?: { status?: number };
  } {
    return (
      typeof err === 'object' &&
      err !== null &&
      ('code' in err || 'response' in err || 'message' in err)
    );
  }

  public static extractSheetIdFromUrl(url: string): string | null {
    const regex =
      /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)(?:\/[^\s]*)?$/;
    const match = url.match(regex);

    if (match) {
      return match[1]; // the sheet ID
    }

    return null; // not a valid Google Sheets URL
  }

  /**
   * Helper: convert 0-based column index to letter (0 -> A, 1 -> B)
   */
  private colIndexToLetter(index: number): string {
    let letter = '';
    let temp = index;
    do {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    return letter;
  }
}
