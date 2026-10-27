import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { ConfirmOrderPaymentUseCase } from "@/src/application/use-cases/order/ConfirmOrderPaymentUseCase";
import { CreateStampTypeUseCase } from "./CreateStampTypeUseCase";
import { AddStampsUseCase } from "./AddStampsUseCase";
import { RedeemStampRewardUseCase } from "./RedeemStampRewardUseCase";
import { UpdateLoyaltyModuleSettingsUseCase } from "./UpdateLoyaltyModuleSettingsUseCase";
import { UpdatePointsSettingsUseCase } from "./UpdatePointsSettingsUseCase";
import { UpsertPointsRewardUseCase } from "./UpsertPointsRewardUseCase";
import { AddPointsUseCase } from "./AddPointsUseCase";
import { RedeemPointsRewardUseCase } from "./RedeemPointsRewardUseCase";
import { EarnPointsFromOrderUseCase } from "./EarnPointsFromOrderUseCase";

before(async () => {
  await migrateTestDb();
});

const shops = () => container.shopRepository;
const customers = () => container.customerRepository;
const stampTypes = () => container.loyaltyStampTypeRepository;
const cards = () => container.loyaltyStampCardRepository;
const balances = () => container.loyaltyStampBalanceRepository;
const stampTx = () => container.loyaltyStampTransactionRepository;
const redemptions = () => container.loyaltyStampRedemptionRepository;
const pointsSettings = () => container.loyaltyPointsSettingsRepository;
const pointsBalances = () => container.loyaltyPointsBalanceRepository;
const pointsTx = () => container.loyaltyPointsTransactionRepository;
const pointsRewards = () => container.loyaltyPointsRewardRepository;

async function enableFullLoyalty(shopId: string, kinds: {
  stamp?: boolean;
  points?: boolean;
} = { stamp: true, points: true }) {
  await shops().setLoyaltyAllowedByAdmin(shopId, true);
  await new UpdateLoyaltyModuleSettingsUseCase(shops(), stampTypes()).execute(
    shopId,
    {
      loyaltyEnabled: true,
      stampCardEnabled: kinds.stamp ?? false,
      spendPointsEnabled: kinds.points ?? false,
    },
  );
}

test("admin off blocks stamp earn", async () => {
  const { shop, ownerId } = await seedShop("loy-admin-off");
  // Even with a type created after allow, revoke then earn should fail.
  await shops().setLoyaltyAllowedByAdmin(shop.id, true);
  const type = await new CreateStampTypeUseCase(shops(), stampTypes()).execute({
    shopId: shop.id,
    name: "ทั่วไป",
    threshold: 5,
    rewardText: "กาแฟฟรี",
  });
  await new UpdateLoyaltyModuleSettingsUseCase(shops(), stampTypes()).execute(
    shop.id,
    { loyaltyEnabled: true, stampCardEnabled: true },
  );
  await shops().setLoyaltyAllowedByAdmin(shop.id, false);

  await assert.rejects(
    new AddStampsUseCase(
      shops(),
      customers(),
      cards(),
      stampTypes(),
      balances(),
      stampTx(),
    ).execute({
      shopId: shop.id,
      phone: "0812345678",
      stampTypeId: type.id,
      quantity: 1,
      performedBy: ownerId,
    }),
    /ยังไม่เปิดใช้งาน|ไม่อนุญาต|แสตมป์/,
  );
});

test("kind off blocks stamp earn even when module on", async () => {
  const { shop, ownerId } = await seedShop("loy-kind-off");
  await enableFullLoyalty(shop.id, { stamp: false, points: true });
  // Create type while allowed
  const type = await new CreateStampTypeUseCase(shops(), stampTypes()).execute({
    shopId: shop.id,
    name: "ทั่วไป",
    threshold: 5,
    rewardText: "ของรางวัล",
  });

  await assert.rejects(
    new AddStampsUseCase(
      shops(),
      customers(),
      cards(),
      stampTypes(),
      balances(),
      stampTx(),
    ).execute({
      shopId: shop.id,
      phone: "0812345678",
      stampTypeId: type.id,
      quantity: 1,
      performedBy: ownerId,
    }),
    /ยังไม่เปิดใช้งาน/,
  );
});

test("stamp earn and redeem when kind on", async () => {
  const { shop, ownerId } = await seedShop("loy-stamp-flow");
  await enableFullLoyalty(shop.id, { stamp: true, points: false });
  const type = await new CreateStampTypeUseCase(shops(), stampTypes()).execute({
    shopId: shop.id,
    name: "กาแฟ",
    threshold: 3,
    rewardText: "ฟรี 1 แก้ว",
  });

  const add = new AddStampsUseCase(
    shops(),
    customers(),
    cards(),
    stampTypes(),
    balances(),
    stampTx(),
  );
  let view = await add.execute({
    shopId: shop.id,
    phone: "0899999999",
    stampTypeId: type.id,
    quantity: 2,
    performedBy: ownerId,
  });
  const progress = view.types.find((t) => t.type.id === type.id)!;
  assert.equal(progress.currentStamps, 2);
  assert.equal(progress.eligibleToRedeem, false);

  view = await add.execute({
    shopId: shop.id,
    phone: "0899999999",
    stampTypeId: type.id,
    quantity: 1,
    performedBy: ownerId,
  });
  assert.equal(
    view.types.find((t) => t.type.id === type.id)!.eligibleToRedeem,
    true,
  );

  view = await new RedeemStampRewardUseCase(
    shops(),
    customers(),
    cards(),
    stampTypes(),
    balances(),
    stampTx(),
    redemptions(),
  ).execute({
    shopId: shop.id,
    phone: "0899999999",
    stampTypeId: type.id,
    performedBy: ownerId,
  });
  const after = view.types.find((t) => t.type.id === type.id)!;
  assert.equal(after.currentStamps, 0);
  assert.equal(after.rewardsEarned, 1);
});

test("points staff add + redeem catalog", async () => {
  const { shop, ownerId } = await seedShop("loy-points-flow");
  await enableFullLoyalty(shop.id, { stamp: false, points: true });

  await new UpdatePointsSettingsUseCase(shops(), pointsSettings()).execute(
    shop.id,
    { satangPerPoint: 10000, minRedeemPoints: null },
  );

  const reward = await new UpsertPointsRewardUseCase(
    shops(),
    pointsRewards(),
  ).create(shop.id, {
    name: "น้ำเปล่า",
    pointsCost: 5,
    description: "ฟรี",
  });

  const bal = await new AddPointsUseCase(
    shops(),
    customers(),
    pointsBalances(),
    pointsTx(),
  ).execute({
    shopId: shop.id,
    phone: "0811111111",
    quantity: 10,
    performedBy: ownerId,
  });
  assert.equal(bal.currentPoints, 10);
  assert.equal(bal.lifetimeEarned, 10);

  const after = await new RedeemPointsRewardUseCase(
    shops(),
    customers(),
    pointsSettings(),
    pointsBalances(),
    pointsTx(),
    pointsRewards(),
  ).execute({
    shopId: shop.id,
    phone: "0811111111",
    rewardId: reward.id,
    performedBy: ownerId,
  });
  assert.equal(after.currentPoints, 5);
  assert.equal(after.lifetimeRedeemed, 5);
});

test("earn points from paid order is idempotent", async () => {
  const { shop, ownerId } = await seedShop("loy-earn-order");
  await enableFullLoyalty(shop.id, { stamp: false, points: true });
  await new UpdatePointsSettingsUseCase(shops(), pointsSettings()).execute(
    shop.id,
    { satangPerPoint: 5000 }, // ฿50 = 1 pt
  );

  const cat = await new CreateMenuCategoryUseCase(
    container.menuCategoryRepository,
  ).execute(shop.id, "ดื่ม");
  const item = await new CreateMenuItemUseCase(
    container.menuItemRepository,
    container.menuCategoryRepository,
  ).execute({
    shopId: shop.id,
    categoryId: cat.id,
    name: "กาแฟ",
    priceSatang: 12000, // ฿120 → floor(12000/5000)=2 pts
  });

  const order = await new PlaceOrderUseCase(
    container.orderRepository,
    container.menuItemRepository,
    customers(),
    shops(),
  ).execute({
    shopId: shop.id,
    paymentMethod: "cash",
    cart: [{ menuItemId: item.id, quantity: 1 }],
    customerPhone: "0822222222",
    customerName: "ทดสอบ",
  });
  assert.ok(order.customerId);

  const earn = new EarnPointsFromOrderUseCase(
    shops(),
    pointsSettings(),
    pointsBalances(),
    pointsTx(),
  );
  const paid = await new ConfirmOrderPaymentUseCase(
    container.orderRepository,
    earn,
  ).execute(shop.id, order.id);

  const bal = await pointsBalances().findByCustomer(
    shop.id,
    order.customerId!,
  );
  assert.ok(bal);
  assert.equal(bal!.currentPoints, 2);

  // Second confirm must not double-earn
  await new ConfirmOrderPaymentUseCase(
    container.orderRepository,
    earn,
  ).execute(shop.id, paid.id);
  const bal2 = await pointsBalances().findByCustomer(
    shop.id,
    order.customerId!,
  );
  assert.equal(bal2!.currentPoints, 2);

  // Kind off blocks staff add
  await new UpdateLoyaltyModuleSettingsUseCase(shops(), stampTypes()).execute(
    shop.id,
    { spendPointsEnabled: false },
  );
  await assert.rejects(
    new AddPointsUseCase(
      shops(),
      customers(),
      pointsBalances(),
      pointsTx(),
    ).execute({
      shopId: shop.id,
      phone: "0822222222",
      quantity: 1,
      performedBy: ownerId,
    }),
    /ยังไม่เปิดใช้งาน/,
  );
});

test("shop can enable stamp only, points only, or both", async () => {
  const { shop } = await seedShop("loy-kinds");
  await shops().setLoyaltyAllowedByAdmin(shop.id, true);

  let s = await new UpdateLoyaltyModuleSettingsUseCase(
    shops(),
    stampTypes(),
  ).execute(shop.id, {
    loyaltyEnabled: true,
    stampCardEnabled: true,
    spendPointsEnabled: false,
  });
  assert.equal(s.stampCardEnabled, true);
  assert.equal(s.spendPointsEnabled, false);
  assert.ok((await stampTypes().countActive(shop.id)) >= 1);

  s = await new UpdateLoyaltyModuleSettingsUseCase(shops(), stampTypes()).execute(
    shop.id,
    { stampCardEnabled: false, spendPointsEnabled: true },
  );
  assert.equal(s.stampCardEnabled, false);
  assert.equal(s.spendPointsEnabled, true);

  s = await new UpdateLoyaltyModuleSettingsUseCase(shops(), stampTypes()).execute(
    shop.id,
    { stampCardEnabled: true, spendPointsEnabled: true },
  );
  assert.equal(s.stampCardEnabled, true);
  assert.equal(s.spendPointsEnabled, true);
});
