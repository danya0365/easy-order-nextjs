import type { ShopProfile } from "@/src/domain/entities";
import type {
  IShopProfileRepository,
  ShopProfileInput,
} from "@/src/application/repositories/IShopProfileRepository";

export interface UpdateShopProfileInput {
  description?: string | null;
  openingHours?: string | null;
  phone?: string | null;
  lineUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
}

const MAX_DESCRIPTION = 2000;
const MAX_HOURS = 500;
const MAX_FIELD = 300;

/** Trim, length-check, and normalize a URL field (prepend https:// if missing). */
function normalizeUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (v.length > MAX_FIELD) throw new Error("ลิงก์ยาวเกินไป");
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function normalizeText(
  raw: string | null | undefined,
  max: number,
  label: string,
): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (v.length > max) throw new Error(`${label}ยาวเกินไป`);
  return v;
}

/** Save the shop's public profile (about / hours / contact links). */
export class UpdateShopProfileUseCase {
  constructor(private readonly profiles: IShopProfileRepository) {}

  async execute(
    shopId: string,
    input: UpdateShopProfileInput,
  ): Promise<ShopProfile> {
    const data: ShopProfileInput = {
      description: normalizeText(input.description, MAX_DESCRIPTION, "คำอธิบาย"),
      openingHours: normalizeText(input.openingHours, MAX_HOURS, "เวลาทำการ"),
      phone: normalizeText(input.phone, MAX_FIELD, "เบอร์โทร"),
      lineUrl: normalizeUrl(input.lineUrl),
      facebookUrl: normalizeUrl(input.facebookUrl),
      instagramUrl: normalizeUrl(input.instagramUrl),
      websiteUrl: normalizeUrl(input.websiteUrl),
    };
    return this.profiles.upsert(shopId, data);
  }
}
