import type { Lead } from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";
import {
  extForContentType,
  leadPhotoKey,
} from "@/src/application/services/slip-media";
import { isSupportedImage } from "@/src/domain/services/image-signature";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic"];

export interface SaveLeadPhotoInput {
  leadId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

/** Upload (or replace) a lead's shop photo. */
export class SaveLeadPhotoUseCase {
  constructor(
    private readonly leads: ILeadRepository,
    private readonly storage: ISlipStorage,
  ) {}

  async execute(input: SaveLeadPhotoInput): Promise<Lead> {
    if (!ALLOWED_TYPES.includes(input.contentType)) {
      throw new Error("รองรับเฉพาะรูปภาพ (PNG/JPG/WEBP)");
    }
    if (input.bytes.byteLength === 0) throw new Error("ไม่พบไฟล์รูป");
    if (input.bytes.byteLength > MAX_PHOTO_BYTES) {
      throw new Error("ไฟล์ใหญ่เกิน 5MB");
    }
    if (!isSupportedImage(input.bytes)) {
      throw new Error("ไฟล์ไม่ใช่รูปภาพที่รองรับ (PNG/JPG/WEBP/HEIC)");
    }

    const lead = await this.leads.findById(input.leadId);
    if (!lead) throw new Error("ไม่พบลีด");

    const key = leadPhotoKey(
      lead.id,
      extForContentType(input.contentType, input.filename),
    );
    const { url } = await this.storage.saveObject({
      key,
      contentType: input.contentType,
      bytes: input.bytes,
    });
    return this.leads.setPhoto(lead.id, url);
  }
}
