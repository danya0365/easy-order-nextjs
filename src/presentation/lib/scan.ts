/**
 * Extract the customer's opaque code from a scanned QR value. Accepts a full
 * claim URL (…/member/claim?code=<code>&sig=…), the legacy …/s/<slug>?c=<code>
 * form, or a bare code string.
 */
export { extractCustomerCode } from "@/src/domain/services/customer-claim";
