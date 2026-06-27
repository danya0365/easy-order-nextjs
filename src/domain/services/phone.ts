/** Strip everything except digits — the stored, canonical phone form. */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

/** Basic Thai mobile/landline sanity check (9–10 digits). */
export function isValidThaiPhone(input: string): boolean {
  const digits = normalizePhone(input);
  return digits.length >= 9 && digits.length <= 10;
}

/** Pretty form for display: 081-234-5678. */
export function formatPhone(input: string): string {
  const d = normalizePhone(input);
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return d;
}
