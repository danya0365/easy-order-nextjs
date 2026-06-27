# Use Case Pattern — Hybrid Clean Architecture for Next.js

เพิ่ม Use Case layer ระหว่าง Repository และ Presenter เพื่อแก้ปัญหา:
- Presenter โตขึ้นเรื่อยๆ กลายเป็น god object
- Business logic ซ้ำซ้อนระหว่างหน้าที่แตกต่างกัน (StoreBackend vs Public)
- Presenter ชื่อกว้างเกินไป ไม่บอก context

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  Presentation (View + Presenter)        │  ← page-specific, thin
│  [StoreBackend]CustomersPresenter       │
│  [Public]CustomerLoyaltyPresenter       │
├─────────────────────────────────────────┤
│  Application Use Cases                │  ← shared, reusable
│  GetCustomerUseCase                     │
│  GivePointsUseCase                      │
│  CreateTransactionUseCase             │
├─────────────────────────────────────────┤
│  Repository Interfaces                  │  ← อยู่แล้ว
│  ICustomerRepository, ITransactionRepo  │
├─────────────────────────────────────────┤
│  Infrastructure (Mock/Supabase)         │  ← อยู่แล้ว
└─────────────────────────────────────────┘
```

---

## 1. When to Use This Pattern

ใช้เมื่อพบสัญญาณเหล่านี้:

- **Presenter มี >10 methods** — น่าจะมี business logic ที่ควรแยกออกมา
- **หลายหน้าใช้ logic เหมือนกัน** — เช่น "ให้แต้ม" ใช้ทั้ง StoreBackend และ Admin
- **Presenter ชื่อกว้างไม่บอก context** — `CustomerDetailPresenter` ไม่รู้ว่าใช้ที่ไหน
- **จะทำ public-facing page ในอนาคต** — ที่ใช้ข้อมูลเดียวกันกับ backend

---

## 2. Folder Structure

```
src/
├── application/
│   ├── repositories/        ← อยู่แล้ว
│   └── use-cases/           ← เพิ่มใหม่
│       ├── customer/
│       │   ├── GetCustomerUseCase.ts
│       │   └── ListCustomersUseCase.ts
│       └── transaction/
│           ├── GivePointsUseCase.ts
│           └── CreateTransactionUseCase.ts
├── presentation/
│   └── presenters/
│       ├── store-backend/
│       │   ├── StoreBackendCustomersPresenter.ts
│       │   └── StoreBackendCustomerDetailPresenter.ts
│       └── public/
│           └── PublicCustomerLoyaltyPresenter.ts
```

---

## 3. Pattern: Use Case

### 3A. Use Case Interface

```typescript
// src/application/use-cases/IUseCase.ts
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
```

### 3B. Concrete Use Case

```typescript
// src/application/use-cases/transaction/GivePointsUseCase.ts
import type { ITransactionRepository } from "@/application/repositories/ITransactionRepository";
import type { ICampaignRepository } from "@/application/repositories/ICampaignRepository";
import type { PointTransaction } from "@/domain/entities";
import type { IUseCase } from "../IUseCase";

export interface GivePointsInput {
  storeId: string;
  customerId: string;
  campaignId: string | null;
  points: number;
  note: string | null;
  performedBy: string;
}

export class GivePointsUseCase implements IUseCase<GivePointsInput, PointTransaction> {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly campaignRepo: ICampaignRepository,
  ) {}

  async execute(input: GivePointsInput): Promise<PointTransaction> {
    // Validation business rules
    if (input.points <= 0) throw new Error("แต้มต้องมากกว่า 0");

    // Check campaign exists if provided
    if (input.campaignId) {
      const campaign = await this.campaignRepo.getCampaignById(input.campaignId);
      if (!campaign || campaign.status !== "active") {
        throw new Error("แคมเปญไม่พร้อมใช้งาน");
      }
    }

    // Create transaction
    return this.transactionRepo.createTransaction(input.storeId, {
      customer_id: input.customerId,
      campaign_id: input.campaignId,
      branch_id: null,
      type: "earn",
      points: input.points,
      note: input.note,
    });
  }
}
```

### 3C. Another Use Case Example

```typescript
// src/application/use-cases/customer/GetCustomerWithHistoryUseCase.ts
import type { ICustomerRepository } from "@/application/repositories/ICustomerRepository";
import type { ITransactionRepository } from "@/application/repositories/ITransactionRepository";
import type { Customer, PointTransaction } from "@/domain/entities";
import type { IUseCase } from "../IUseCase";

export interface GetCustomerWithHistoryInput {
  customerId: string;
  transactionLimit?: number;
}

export interface GetCustomerWithHistoryOutput {
  customer: Customer;
  transactions: PointTransaction[];
  totalTransactions: number;
}

export class GetCustomerWithHistoryUseCase
  implements IUseCase<GetCustomerWithHistoryInput, GetCustomerWithHistoryOutput>
{
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(input: GetCustomerWithHistoryInput): Promise<GetCustomerWithHistoryOutput> {
    const customer = await this.customerRepo.getCustomerById(input.customerId);
    if (!customer) throw new Error("ไม่พบลูกค้า");

    const txResult = await this.transactionRepo.getTransactions(
      input.customerId,
      { page: 1, pageSize: input.transactionLimit ?? 10 }
    );

    return {
      customer,
      transactions: txResult.data,
      totalTransactions: txResult.total,
    };
  }
}
```

---

## 4. Pattern: Thin Presenter with Context Prefix

### 4A. StoreBackend Presenter (admin page)

```typescript
// src/presentation/presenters/store-backend/StoreBackendCustomerDetailPresenter.ts
import type { GetCustomerWithHistoryUseCase } from "@/application/use-cases/customer/GetCustomerWithHistoryUseCase";
import type { GivePointsUseCase } from "@/application/use-cases/transaction/GivePointsUseCase";
import type { RedeemRewardUseCase } from "@/application/use-cases/redemption/RedeemRewardUseCase";
import type { Customer, RewardCampaign, PointTransaction, RewardRedemption } from "@/domain/entities";

export interface StoreBackendCustomerDetailViewModel {
  customer: Customer;
  campaigns: RewardCampaign[];
  transactions: PointTransaction[];
  redemptions: RewardRedemption[];
  transactionTotal: number;
  redemptionTotal: number;
}

export class StoreBackendCustomerDetailPresenter {
  constructor(
    private readonly getCustomerUC: GetCustomerWithHistoryUseCase,
    private readonly givePointsUC: GivePointsUseCase,
    private readonly redeemRewardUC: RedeemRewardUseCase,
    private readonly campaignRepo: ICampaignRepository,  // thin read-only access
    private readonly redemptionRepo: IRedemptionRepository, // thin read-only access
  ) {}

  async getViewModel(customerId: string): Promise<StoreBackendCustomerDetailViewModel | null> {
    const history = await this.getCustomerUC.execute({
      customerId,
      transactionLimit: 10,
    });

    // Additional data only needed by admin view
    const [campaigns, redemptionResult] = await Promise.all([
      this.campaignRepo.getCampaigns(history.customer.store_id, { status: "active" }),
      this.redemptionRepo.getRedemptions(customerId, { page: 1, pageSize: 10 }),
    ]);

    return {
      customer: history.customer,
      campaigns,
      transactions: history.transactions,
      redemptions: redemptionResult.data,
      transactionTotal: history.totalTransactions,
      redemptionTotal: redemptionResult.total,
    };
  }

  async givePoints(storeId: string, payload: GivePointsInput): Promise<PointTransaction> {
    return this.givePointsUC.execute({ ...payload, storeId });
  }

  async redeemReward(storeId: string, payload: CreateRedemptionPayload): Promise<RewardRedemption> {
    return this.redeemRewardUC.execute({ ...payload, storeId });
  }
}
```

### 4B. Public Presenter (customer-facing page)

```typescript
// src/presentation/presenters/public/PublicCustomerLoyaltyPresenter.ts
import type { GetCustomerWithHistoryUseCase } from "@/application/use-cases/customer/GetCustomerWithHistoryUseCase";
import type { Customer, PointTransaction } from "@/domain/entities";

export interface PublicCustomerLoyaltyViewModel {
  customer: Customer;
  recentTransactions: PointTransaction[];
  totalPoints: number;
  nextTierProgress: number; // คำนวณเฉพาะ public view
}

export class PublicCustomerLoyaltyPresenter {
  constructor(
    private readonly getCustomerUC: GetCustomerWithHistoryUseCase,
  ) {}

  async getViewModel(customerId: string): Promise<PublicCustomerLoyaltyViewModel | null> {
    const history = await this.getCustomerUC.execute({
      customerId,
      transactionLimit: 5, // public โชว์แค่ 5 รายการล่าสุด
    });

    // Calculate tier progress — logic เฉพาะ public view
    const totalPoints = history.customer.total_points;
    const nextTierThreshold = 500; // could come from config
    const progress = Math.min((totalPoints / nextTierThreshold) * 100, 100);

    return {
      customer: history.customer,
      recentTransactions: history.transactions,
      totalPoints,
      nextTierProgress: progress,
    };
  }
}
```

**สังเกต**: `GetCustomerWithHistoryUseCase` ถูกใช้ทั้ง 2 Presenter แต่แต่ละ Presenter shape ViewModel ต่างกัน

---

## 5. Pattern: Factory (with Use Cases)

### 5A. Server Factory

```typescript
// src/presentation/presenters/store-backend/StoreBackendCustomerDetailPresenterServerFactory.ts
import { StoreBackendCustomerDetailPresenter } from "./StoreBackendCustomerDetailPresenter";
import { GetCustomerWithHistoryUseCase } from "@/application/use-cases/customer/GetCustomerWithHistoryUseCase";
import { GivePointsUseCase } from "@/application/use-cases/transaction/GivePointsUseCase";
import { RedeemRewardUseCase } from "@/application/use-cases/redemption/RedeemRewardUseCase";
import { MockCustomerRepository } from "@/infrastructure/repositories/mock/MockCustomerRepository";
import { MockTransactionRepository } from "@/infrastructure/repositories/mock/MockTransactionRepository";
import { MockCampaignRepository } from "@/infrastructure/repositories/mock/MockCampaignRepository";
import { MockRedemptionRepository } from "@/infrastructure/repositories/mock/MockRedemptionRepository";

export function createStoreBackendCustomerDetailPresenter(): StoreBackendCustomerDetailPresenter {
  const customerRepo = new MockCustomerRepository();
  const transactionRepo = new MockTransactionRepository();
  const campaignRepo = new MockCampaignRepository();
  const redemptionRepo = new MockRedemptionRepository();

  return new StoreBackendCustomerDetailPresenter(
    new GetCustomerWithHistoryUseCase(customerRepo, transactionRepo),
    new GivePointsUseCase(transactionRepo, campaignRepo),
    new RedeemRewardUseCase(redemptionRepo, transactionRepo),
    campaignRepo,
    redemptionRepo,
  );
}
```

### 5B. Public Factory

```typescript
// src/presentation/presenters/public/PublicCustomerLoyaltyPresenterServerFactory.ts
import { PublicCustomerLoyaltyPresenter } from "./PublicCustomerLoyaltyPresenter";
import { GetCustomerWithHistoryUseCase } from "@/application/use-cases/customer/GetCustomerWithHistoryUseCase";
import { MockCustomerRepository } from "@/infrastructure/repositories/mock/MockCustomerRepository";
import { MockTransactionRepository } from "@/infrastructure/repositories/mock/MockTransactionRepository";

export function createPublicCustomerLoyaltyPresenter(): PublicCustomerLoyaltyPresenter {
  const customerRepo = new MockCustomerRepository();
  const transactionRepo = new MockTransactionRepository();

  return new PublicCustomerLoyaltyPresenter(
    new GetCustomerWithHistoryUseCase(customerRepo, transactionRepo),
  );
}
```

**สังเกต**: Factory ทำหน้าที่ "wire dependencies" — สร้าง Use Cases แล้ว inject เข้า Presenter

---

## 6. Migration Guide: จาก Presenter หนัก → Thin Presenter + Use Cases

### Before (Presenter หนัก)

```typescript
// ❌ CustomerDetailPresenter.ts — 200+ lines, god object
class CustomerDetailPresenter {
  constructor(
    private customerRepo,
    private campaignRepo,
    private transactionRepo,
    private redemptionRepo,
  ) {}

  async getViewModel(customerId) {
    const customer = await this.customerRepo.getCustomerById(customerId);
    const campaigns = await this.campaignRepo.getCampaigns(...);
    const tx = await this.transactionRepo.getTransactions(...);
    const rdm = await this.redemptionRepo.getRedemptions(...);
    // คำนวณ, validate, transform หมดอยู่นี่
    return { customer, campaigns, tx, rdm };
  }

  async givePoints(storeId, payload) {
    if (payload.points <= 0) throw new Error("...");
    const campaign = await this.campaignRepo.getCampaignById(...);
    if (!campaign || campaign.status !== "active") throw new Error("...");
    return this.transactionRepo.createTransaction(...);
  }

  async redeemReward(storeId, payload) {
    // validation logic
    // create redemption
    // create transaction
    // update customer points
  }
  // ... อีก 10 methods
}
```

### After (Thin Presenter + Use Cases)

```typescript
// ✅ GetCustomerWithHistoryUseCase.ts — reusable
// ✅ GivePointsUseCase.ts — reusable
// ✅ RedeemRewardUseCase.ts — reusable

// StoreBackendCustomerDetailPresenter.ts — 50 lines, orchestrate only
class StoreBackendCustomerDetailPresenter {
  constructor(
    private getCustomerUC,
    private givePointsUC,
    private redeemRewardUC,
    private campaignRepo,  // read-only
    private redemptionRepo, // read-only
  ) {}

  async getViewModel(customerId) {
    const history = await this.getCustomerUC.execute({ customerId });
    const [campaigns, rdm] = await Promise.all([
      this.campaignRepo.getCampaigns(...),
      this.redemptionRepo.getRedemptions(...),
    ]);
    return {
      customer: history.customer,
      campaigns,
      transactions: history.transactions,
      redemptions: rdm.data,
      transactionTotal: history.totalTransactions,
      redemptionTotal: rdm.total,
    };
  }

  async givePoints(storeId, payload) {
    return this.givePointsUC.execute({ ...payload, storeId });
  }

  async redeemReward(storeId, payload) {
    return this.redeemRewardUC.execute({ ...payload, storeId });
  }
}
```

---

## 7. Naming Convention

| Layer | Naming | Example |
|-------|--------|---------|
| Use Case | `[Action][Domain]UseCase` | `GivePointsUseCase`, `GetCustomerWithHistoryUseCase` |
| Presenter (StoreBackend) | `StoreBackend[Feature]Presenter` | `StoreBackendCustomerDetailPresenter` |
| Presenter (Public) | `Public[Feature]Presenter` | `PublicCustomerLoyaltyPresenter` |
| Presenter (Admin) | `Platform[Feature]Presenter` | `PlatformStatsPresenter` |
| Factory | `create[Context][Feature]Presenter` | `createStoreBackendCustomerDetailPresenter` |
| Hook | `use[Context][Feature]Presenter` | `useStoreBackendCustomerDetailPresenter` |

---

## 8. Key Principles

1. **Use Case = Reusable Business Logic** — validation, calculation, cross-entity coordination
2. **Presenter = Context-Specific Orchestration** — เรียก Use Cases, รวม data, shape ViewModel
3. **Repository stays the same** — Use Case รับ Repository ผ่าน constructor
4. **Factory does the wiring** — สร้าง Use Cases + inject เข้า Presenter
5. **One Presenter per page/context** — ถ้า 2 หน้าใช้ logic เดียวกัน แต่ ViewModel ต่างกัน → แยก Presenter, แต่ share Use Cases

---

## 9. When NOT to Use

- **โปรเจคมี 1-2 หน้า** — over-engineer, keep simple Presenter
- **Presenter มี <5 methods** — ยังไม่คุ้มที่จะแยก
- **ไม่มี plan ทำ public page** — ถ้าจะใช้ backend-only ตลอดชีวิต ไม่ต้องแยก
- **Proof of concept / MVP** — refactor ตอน scale จริงๆ ก็ได้
