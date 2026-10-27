import type { LoyaltyStampCard } from "@/src/domain/entities";

export interface ILoyaltyStampCardRepository {
  findByCustomer(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyStampCard | null>;
  findOrCreate(shopId: string, customerId: string): Promise<LoyaltyStampCard>;
}
