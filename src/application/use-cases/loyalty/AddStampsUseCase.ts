import type { CustomerStampCardView } from "@/src/domain/entities";
import { normalizePhone, isValidThaiPhone } from "@/src/domain/services/phone";
import { isStampCardOn } from "@/src/domain/services/loyalty-gates";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ILoyaltyStampCardRepository } from "@/src/application/repositories/ILoyaltyStampCardRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";
import type { ILoyaltyStampBalanceRepository } from "@/src/application/repositories/ILoyaltyStampBalanceRepository";
import type { ILoyaltyStampTransactionRepository } from "@/src/application/repositories/ILoyaltyStampTransactionRepository";
import { loadStampCardView } from "./loadCardView";

export interface AddStampsInput {
  shopId: string;
  branchId?: string | null;
  phone: string;
  stampTypeId: string;
  quantity: number;
  performedBy: string;
  displayName?: string | null;
  note?: string | null;
}

const MAX_PER_TX = 50;

export class AddStampsUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly cards: ILoyaltyStampCardRepository,
    private readonly stampTypes: ILoyaltyStampTypeRepository,
    private readonly balances: ILoyaltyStampBalanceRepository,
    private readonly transactions: ILoyaltyStampTransactionRepository,
  ) {}

  async execute(input: AddStampsInput): Promise<CustomerStampCardView> {
    const quantity = Math.floor(input.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_PER_TX) {
      throw new Error(`จำนวนแสตมป์ต้องอยู่ระหว่าง 1–${MAX_PER_TX}`);
    }
    const phone = normalizePhone(input.phone);
    if (!isValidThaiPhone(phone)) {
      throw new Error("เบอร์โทรไม่ถูกต้อง");
    }

    const shop = await this.shops.findById(input.shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!isStampCardOn(shop)) {
      throw new Error("ระบบแสตมป์ยังไม่เปิดใช้งานสำหรับร้านนี้");
    }

    const type = await this.stampTypes.findById(input.stampTypeId);
    if (!type || type.shopId !== input.shopId || !type.isActive) {
      throw new Error("ไม่พบประเภทแสตมป์ หรือถูกปิดใช้งาน");
    }

    const customer = await this.customers.findOrCreate(
      input.shopId,
      phone,
      input.displayName,
    );
    const card = await this.cards.findOrCreate(input.shopId, customer.id);
    const balance = await this.balances.findOrCreate(card.id, type.id);
    await this.balances.addStamps(balance.id, quantity);

    await this.transactions.create({
      shopId: input.shopId,
      branchId: input.branchId ?? null,
      customerId: customer.id,
      cardId: card.id,
      stampTypeId: type.id,
      type: "earn",
      quantity,
      performedBy: input.performedBy,
      note: input.note ?? null,
    });

    return loadStampCardView(
      {
        stampTypes: this.stampTypes,
        cards: this.cards,
        balances: this.balances,
      },
      input.shopId,
      customer,
    );
  }
}
