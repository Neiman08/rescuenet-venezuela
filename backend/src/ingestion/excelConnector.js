import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";

export function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }).map((row, index) => ({
      ...row,
      sourceSheet: sheetName,
      sourceRowNumber: index + 2,
    }));
  });
}

export async function parseExcelFile(path) {
  return parseExcelBuffer(await readFile(path));
}

export async function fetchExcel(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Excel source returned ${response.status}`);
  return parseExcelBuffer(Buffer.from(await response.arrayBuffer()));
}
