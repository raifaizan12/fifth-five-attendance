import Papa from "papaparse";

export function parseCsv<T = Record<string, string>>(text: string): T[] {
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows);
}
