import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { Customer } from "@/src/domain/entities";

export class RejectOnlineMemberUseCase {
  constructor(private readonly customers: ICustomerRepository) {}

  async execute(
    shopId: string,
    customerId: string,
    reviewerId: string,
  ): Promise<Customer> {
    const existing = await this.customers.findById(shopId, customerId);
    if (!existing) throw new Error("ไม่พบลูกค้า");
    if (existing.onlineOrderStatus !== "pending") {
      throw new Error("ลูกค้าไม่อยู่ในสถานะรออนุมัติ");
    }
    const updated = await this.customers.setOnlineOrderStatus(
      shopId,
      customerId,
      "rejected",
      reviewerId,
      new Date().toISOString(),
    );
    if (!updated) throw new Error("ปฏิเสธไม่สำเร็จ");
    return updated;
  }
}
