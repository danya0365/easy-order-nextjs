import type { ContactRequest } from "@/src/domain/entities";
import type { IContactRequestRepository } from "@/src/application/repositories/IContactRequestRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { NotificationService } from "@/src/application/services/NotificationService";

export interface SubmitOwnerContactRequestInput {
  shopId: string;
  userId: string;
  subject: string;
  message: string;
  contactChannel: string;
}

/** Anti-spam: must wait this long after the previous request before sending again. */
const CONTACT_COOLDOWN_MS = 5 * 60_000; // 5 นาที

/**
 * Shop owner sends a contact request to the platform admin. Server-side anti-spam
 * (one open request per shop + a cooldown between submissions), then notify admins.
 */
export class SubmitOwnerContactRequestUseCase {
  constructor(
    private readonly contacts: IContactRequestRepository,
    private readonly shops: IShopRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(
    input: SubmitOwnerContactRequestInput,
  ): Promise<ContactRequest> {
    // Anti-spam (server-side, covers every entry point): one open request per
    // shop, plus a short cooldown between submissions.
    const latest = await this.contacts.findLatestByShop(input.shopId);
    if (latest?.status === "open") {
      throw new Error(
        "คุณมีคำขอที่รอผู้ดูแลตอบกลับอยู่แล้ว กรุณารอการติดต่อกลับก่อนส่งใหม่",
      );
    }
    if (latest) {
      // Here the latest is resolved (open case returned above). Measure cooldown
      // from the resolution time, so a quick admin resolve doesn't block a
      // legitimate follow-up sooner than intended.
      const since = new Date(latest.resolvedAt ?? latest.createdAt).getTime();
      const elapsed = Date.now() - since;
      if (elapsed < CONTACT_COOLDOWN_MS) {
        const mins = Math.ceil((CONTACT_COOLDOWN_MS - elapsed) / 60_000);
        throw new Error(`กรุณารออีกประมาณ ${mins} นาที ก่อนส่งคำขอใหม่`);
      }
    }

    const request = await this.contacts.create({
      shopId: input.shopId,
      createdBy: input.userId,
      subject: input.subject,
      message: input.message,
      contactChannel: input.contactChannel,
    });

    const shop = await this.shops.findById(input.shopId);
    await this.notifications.notifyAdmins({
      type: "contact_request",
      title: `คำขอติดต่อจากร้าน ${shop?.name ?? "-"}`,
      body: `${input.subject} — ติดต่อกลับ: ${input.contactChannel}`,
      linkUrl: "/admin/contacts",
    });

    return request;
  }
}
