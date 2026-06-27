/** Format satang (integer THB cents) as a baht string, e.g. 29900 -> "299.00". */
export function satangToBaht(satang: number): string {
  return (satang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a baht input string/number into integer satang. */
export function bahtToSatang(baht: number): number {
  return Math.round(baht * 100);
}
