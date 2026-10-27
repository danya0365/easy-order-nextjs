import type { Customer, CustomerStampCardView } from "@/src/domain/entities";
import { buildStampCardView } from "@/src/domain/services/loyalty-card-view";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";
import type { ILoyaltyStampCardRepository } from "@/src/application/repositories/ILoyaltyStampCardRepository";
import type { ILoyaltyStampBalanceRepository } from "@/src/application/repositories/ILoyaltyStampBalanceRepository";

export interface StampCardViewDeps {
  stampTypes: ILoyaltyStampTypeRepository;
  cards: ILoyaltyStampCardRepository;
  balances: ILoyaltyStampBalanceRepository;
}

export async function loadStampCardView(
  deps: StampCardViewDeps,
  shopId: string,
  customer: Customer,
): Promise<CustomerStampCardView> {
  const types = await deps.stampTypes.listByShop(shopId, { activeOnly: true });
  const card = await deps.cards.findOrCreate(shopId, customer.id);
  const balances = await deps.balances.listByCard(card.id);
  return buildStampCardView(types, customer, balances);
}
