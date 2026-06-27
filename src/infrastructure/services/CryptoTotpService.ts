import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { ITotpService } from "@/src/application/services/ITotpService";
import { BRAND } from "@/src/config/brand";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648 base32
const PERIOD = 30;
const DIGITS = 6;
const ISSUER = BRAND.totpIssuer;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue; // skip stray chars
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** HMAC-SHA1 dynamic-truncation code for a given counter (RFC 4226/6238). */
function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  // 8-byte big-endian counter (safe for ~285M years of 30s steps).
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** The TOTP code for a secret at a given unix time (exported for testing). */
export function totpAt(secretBase32: string, unixSeconds: number): string {
  return hotp(base32Decode(secretBase32), Math.floor(unixSeconds / PERIOD));
}

export class CryptoTotpService implements ITotpService {
  /** Allow ±1 step (30s) of clock drift between server and authenticator. */
  private readonly window = 1;

  generateSecret(): string {
    return base32Encode(randomBytes(20)); // 160-bit, RFC-recommended
  }

  keyUri(secret: string, accountLabel: string): string {
    const label = encodeURIComponent(`${ISSUER}:${accountLabel}`);
    const params = new URLSearchParams({
      secret,
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: String(DIGITS),
      period: String(PERIOD),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  verify(secret: string, token: string): boolean {
    const code = token.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) return false;
    const key = base32Decode(secret);
    if (key.length === 0) return false;
    const counter = Math.floor(Date.now() / 1000 / PERIOD);
    for (let i = -this.window; i <= this.window; i++) {
      const expected = hotp(key, counter + i);
      // constant-time compare to avoid leaking via timing
      if (
        expected.length === code.length &&
        timingSafeEqual(Buffer.from(expected), Buffer.from(code))
      ) {
        return true;
      }
    }
    return false;
  }
}
