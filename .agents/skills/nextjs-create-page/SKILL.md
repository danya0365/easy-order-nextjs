---
name: nextjs-create-page
description: >
  สร้าง page ใหม่ใน Next.js ตาม Clean Architecture pattern
  (Repository Interface → Mock → Presenter → View).
  ใช้เมื่อต้องสร้าง page, feature, หรือ module ใหม่ในโปรเจค.
version: "1.0"
metadata:
  author: dan
  stack: next.js, typescript, supabase, tailwind
  pattern: clean-architecture
---

## วิธีสร้าง Page ใหม่

อ่าน reference หลักก่อนเสมอ:

```
references/CREATE_PAGE_PATTERN.md
```

## ขั้นตอนสรุป

1. **Repository Interface** — กำหนด contract ใน `src/application/repositories/I[PageItem]Repository.ts`
2. **Mock Repository** — implement ใน `src/infrastructure/repositories/mock/Mock[PageItem]Repository.ts`
3. **Server Page** — สร้าง `app/[page-path]/page.tsx` (Server Component)
4. **Presenter** — business logic ใน `src/presentation/presenters/[page-name]/[PageName]Presenter.ts`
5. **Presenter Factories** — แยก Server/Client factory
6. **usePresenter Hook** — state management สำหรับ client
7. **View Component** — UI ใน `src/presentation/components/[page-name]/[PageName]View.tsx`

## Placeholder ที่ต้องแทนที่

| Placeholder      | รูปแบบ          | ตัวอย่าง    |
| ---------------- | --------------- | ----------- |
| `[PageName]`     | PascalCase      | `Customers` |
| `[page-name]`    | kebab-case      | `customers` |
| `[PageItem]`     | PascalCase      | `Customer`  |
| `[PAGE_ITEMS]`   | SCREAMING_SNAKE | `CUSTOMERS` |
| `[PageThaiName]` | ภาษาไทย         | `ลูกค้า`    |

## Mock-First Workflow (แนะนำ)

ให้พัฒนา UI กับ Mock ก่อนเสมอ จนกว่า UI จะ stable
แล้วค่อย switch ไป Supabase Repository

ดูรายละเอียดทั้งหมดใน `references/CREATE_PAGE_PATTERN.md`
