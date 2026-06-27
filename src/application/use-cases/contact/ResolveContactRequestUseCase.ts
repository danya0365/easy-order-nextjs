import type { ContactRequest } from "@/src/domain/entities";
import type { IContactRequestRepository } from "@/src/application/repositories/IContactRequestRepository";
import type { NotificationService } from "@/src/application/services/NotificationService";

/**
 * Admin marks a contact request resolved and closes the loop by notifying the
 * owner who raised it. Public (login-page) requests have no account → skip notify.
 */
export class ResolveContactRequestUseCase {
  constructor(
    private readonly contacts: IContactRequestRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(id: string, resolvedBy: string): Promise<ContactRequest | null> {
    const resolved = await this.contacts.resolve(id, resolvedBy);

    if (resolved && resolved.createdBy) {
      await this.notifications.notify(resolved.createdBy, {
        type: "contact_resolved",
        title: "ผู้ดูแลรับเรื่องของคุณแล้ว",
        body: `คำขอ "${resolved.subject}" ได้รับการดำเนินการแล้ว`,
        linkUrl: "/shop/contact",
      });
    }

    return resolved;
  }
}
