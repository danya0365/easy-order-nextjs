/**
 * Extract the customer's opaque code from a scanned QR value. Accepts either a
 * full URL (…/s/<slug>?c=<code>) or a bare code string.
 */
export function extractCustomerCode(scanned: string): string {
  const text = scanned.trim();
  try {
    const url = new URL(text);
    const c = url.searchParams.get("c");
    if (c) return c.trim();
  } catch {
    // not a URL — fall through
  }
  return text;
}
