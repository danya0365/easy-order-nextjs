---
name: nextjs-create-repo
description: >
  สร้าง Repository ตาม Clean Architecture pattern สำหรับ Next.js + Supabase.
  ใช้เมื่อต้องสร้าง data layer ใหม่ หรือเพิ่ม entity ใหม่เข้าระบบ.
version: "1.0"
metadata:
  author: dan
  stack: next.js, typescript, supabase
  pattern: repository-pattern
---

## วิธีสร้าง Repository ใหม่

อ่าน reference หลักก่อนเสมอ:

```
references/CREATE_REPO_PATTERN.md
```

## Repository 4 ประเภทที่ต้องสร้าง

| ประเภท        | ที่อยู่                                                                  | ใช้เมื่อ       |
| ------------- | ------------------------------------------------------------------------ | -------------- |
| **Interface** | `src/application/repositories/I[Entity]Repository.ts`                    | กำหนด contract |
| **Mock**      | `src/infrastructure/repositories/mock/Mock[Entity]Repository.ts`         | dev/testing    |
| **Supabase**  | `src/infrastructure/repositories/supabase/Supabase[Entity]Repository.ts` | server-side    |
| **API**       | `src/infrastructure/repositories/api/Api[Entity]Repository.ts`           | client-side    |

## ลำดับการสร้าง

1. Interface → 2. Mock → 3. UI stable → 4. Supabase → 5. API Routes → 6. API Repository

## Security Pattern สำคัญ 🔒

`ownerId` และ auth ID ทุกตัว **ต้องถูก inject จาก server เท่านั้น**

```ts
// Client ส่งแค่ Payload (ไม่มี ownerId)
type CreateEntityPayload = Omit<CreateEntityData, "ownerId">;
```

## Placeholder

| Placeholder  | รูปแบบ          | ตัวอย่าง   |
| ------------ | --------------- | ---------- |
| `[Entity]`   | PascalCase      | `Product`  |
| `[entity]`   | camelCase       | `product`  |
| `[entities]` | plural          | `products` |
| `[ENTITIES]` | SCREAMING_SNAKE | `PRODUCTS` |

ดูรายละเอียดทั้งหมดใน `references/CREATE_REPO_PATTERN.md`
