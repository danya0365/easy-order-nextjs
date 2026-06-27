import "server-only";

import QRCode from "qrcode";

// EMVCo TLV field: 2-digit id + 2-digit length + value.
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// CRC-16/CCITT-FALSE over the payload (incl. the "6304" CRC tag prefix).
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// PromptPay Merchant Account Info (tag 29) sub-tags per the Thai QR standard:
//   01 = mobile number (13 digits, 0066xxxxxxxxx)
//   02 = national ID / tax ID (13 digits)
//   03 = e-wallet ID (15 digits)
function formatTarget(id: string): { tag: string; value: string } {
  const numbers = id.replace(/[^0-9]/g, "");
  if (numbers.length >= 15) return { tag: "03", value: numbers }; // e-wallet
  if (numbers.length >= 13) return { tag: "02", value: numbers }; // national/tax id
  // mobile: 0812345678 -> 0066812345678
  const value = ("0000000000000" + numbers.replace(/^0/, "66")).slice(-13);
  return { tag: "01", value };
}

/** Build the EMVCo PromptPay payload string for a target + amount (baht). */
export function buildPromptPayPayload(
  target: string,
  amountBaht?: number,
): string {
  const dynamic = typeof amountBaht === "number" && amountBaht > 0;
  const { tag, value } = formatTarget(target);

  const merchant = tlv(
    "29",
    tlv("00", "A000000677010111") + tlv(tag, value),
  );

  let payload =
    tlv("00", "01") +
    tlv("01", dynamic ? "12" : "11") +
    merchant +
    tlv("53", "764") +
    (dynamic ? tlv("54", amountBaht!.toFixed(2)) : "") +
    tlv("58", "TH");

  payload += "6304";
  return payload + crc16(payload);
}

/** Render a PromptPay QR for a target + amount (satang) as a PNG data URL. */
export function renderPromptPayQR(
  target: string,
  amountSatang: number,
): Promise<string> {
  const payload = buildPromptPayPayload(target, amountSatang / 100);
  return QRCode.toDataURL(payload, { margin: 1, width: 256 });
}
