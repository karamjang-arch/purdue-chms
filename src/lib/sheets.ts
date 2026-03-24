import { google, sheets_v4 } from "googleapis";

const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID!;

function getAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

function getSheetsClient(accessToken: string): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth(accessToken) });
}

export async function readSheet(
  accessToken: string,
  tab: string,
  range?: string
): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken);
  const fullRange = range ? `${tab}!${range}` : tab;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: fullRange,
  });
  return (res.data.values as string[][]) || [];
}

export async function appendRow(
  accessToken: string,
  tab: string,
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: tab,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export async function updateCell(
  accessToken: string,
  tab: string,
  range: string,
  value: string
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!${range}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

export async function updateRow(
  accessToken: string,
  tab: string,
  rowIndex: number,
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export function indexToColumnLetter(index: number): string {
  let result = "";
  let i = index;
  while (true) {
    result = String.fromCharCode(65 + (i % 26)) + result;
    i = Math.floor(i / 26) - 1;
    if (i < 0) break;
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowsToObjects<T = Record<string, any>>(
  rows: string[][],
  headers?: string[]
): T[] {
  if (rows.length === 0) return [];
  const keys = headers || rows[0];
  const dataRows = headers ? rows : rows.slice(1);
  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      obj[key] = row[i] || "";
    });
    return obj as T;
  });
}
