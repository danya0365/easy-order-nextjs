import type { CustomerStampCardView } from "@/src/domain/entities";
import { normalizePhone, isValidThaiPhone } from "@/src/domain/services/phone";
import { isStampCardOn } from "@/src/domain/services/loyalty-gates";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";
import type { ILoyaltyStampCardRepository } from "@/src/application/repositories/ILoyaltyStampCardRepository";
import type { ILoyaltyStampBalanceRepository } from "@/src/application/repositories/ILoyaltyStampBalanceRepository";
import { loadStampCardView } from "./loadCardView";

export class GetCustomerStampCardUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly stampTypes: ILoyaltyStampTypeRepository,
    private readonly cards: ILoyaltyStampCardRepository,
    private readonly balances: ILoyaltyStampBalanceRepository,
  ) {}

  async execute(
    shopId: string,
    phone: string,
  ): Promise<CustomerStampCardView | null> {
    const shop = await this.shops.findById(shopId);
    if (!shop || !isStampCardOn(shop)) return null;
    const normalized = normalizePhone(phone);
    if (!isValidThaiPhone(normalized)) return null;
    const customer = await this.customers.findByPhone(shopId, normalized);
    if (!customer) return null;
    return loadStampCardView(
      {
        stampTypes: this.stampTypes,
        cards: this.cards,
        balances: this.balances,
      },
      shopId,
      customer,
    );
  }

  async byCustomerId(
    shopId: string,
    customerId: string,
  ): Promise<CustomerStampCardView | null> {
    const shop = await this.shops.findById(shopId);
    if (!shop || !isStampCardOn(shop)) return null;
    const customer = await this.customers.findById(shopId, customerId);
    if (!customer) return null;
    return loadStampCardView(
      {
        stampTypes: this.stampTypes,
        cards: this.cards,
        balances: this.balances,
      },
      shopId,
      customer,
    );
  }
}
