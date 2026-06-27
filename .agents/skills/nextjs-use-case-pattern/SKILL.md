---
name: nextjs-use-case-pattern
description: >
  เพิ่ม Use Case layer ตรงกลางระหว่าง Repository และ Presenter
  เพื่อให้ business logic ร่วมใช้ได้หลาย page/context (StoreBackend, Public, Admin).
  Presenter กลายเป็น thin orchestrator ที่ page-specific จริงๆ
  ใช้เมื่อต้องการ refactor presenter ที่มี business logic หนัก หรือต้องการ share logic ระหว่างหน้า
version: "1.0"
metadata:
  author: dan
  stack: next.js, typescript, clean-architecture
  pattern: use-case-orchestrator
---

## วิธีใช้ Use Case Pattern

อ่าน reference หลักก่อนเสมอ:

```
references/USE_CASE_PATTERN.md
```

## สรุปสั้นๆ

- **Use Case** = Reusable business logic (`src/application/use-cases/`)
- **Presenter** = Thin orchestrator + ViewModel shaping (`src/presentation/presenters/`)
- **Context prefix** = `StoreBackend`, `Public`, `Admin`, `Platform` ตามหน้าที่เรียกใช้

## ขั้นตอนใช้

1. **Identify shared logic** — ดูว่า Presenter ไหนมี method ที่ใช้ซ้ำได้
2. **Extract Use Case** — ย้าย shared logic ไป `src/application/use-cases/[Domain][Action]UseCase.ts`
3. **Refactor Presenter** — ให้ Presenter รับ Use Case แทน Repository โดยตรง
4. **Context prefix** — Rename Presenter เป็น `[Context][Feature]Presenter`

## Mock-First ยังคงใช้ได้

Use Case สามารถรับ Mock Repository ได้เช่นกัน — mock-first workflow ไม่เปลี่ยน

ดูรายละเอียดทั้งหมดใน `references/USE_CASE_PATTERN.md`
