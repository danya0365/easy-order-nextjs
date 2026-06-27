---
name: supabase-repo-pattern
description: >
  Design and implement Supabase repository classes using the abstract base + role-split pattern.
  Use this skill whenever the user asks to design, scaffold, or refactor a repository layer that
  needs to support both auth (RLS-active) and admin (service role / RLS-bypassed) access patterns
  with Supabase. Triggers include: "สร้าง repo", "ออกแบบ repository", "supabase repository pattern",
  "UserRepo / AdminRepo", "auth instance vs admin instance", "self auth data", or any request to
  build typed data-access classes on top of Supabase in TypeScript/Next.js projects.
version: "1.0"
metadata:
  author: dan
  stack: next.js, supabase
  pattern: supabase-repo-pattern
---

# Supabase Repository Pattern (Abstract Base + Role Split)

## Core Concept

แยก concern ของ **who is allowed to do what** ออกจาก **how to query the data**:

- `Base` → query logic ที่ใช้ร่วมกัน (ไม่สนใจ role)
- `UserXxxRepository` → auth instance, RLS active, รู้จัก "ตัวเอง" ผ่าน JWT
- `AdminXxxRepository` → service role, RLS bypassed, ใช้ใน server-side เท่านั้น

---

## File Structure

```
src/
└── repositories/
    └── posts/
        ├── base.repository.ts        ← abstract base
        ├── user.repository.ts        ← auth instance (RLS)
        ├── admin.repository.ts       ← service role (bypass RLS)
        └── index.ts                  ← export + factory
```

---

## Step-by-Step Implementation

### 1. Base Repository

```ts
// base.repository.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

export abstract class BasePostRepository {
  constructor(protected client: SupabaseClient<Database>) {}

  async getAllPosts() {
    const { data, error } = await this.client
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async getPostById(id: string) {
    const { data, error } = await this.client
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }
}
```

> ใส่เฉพาะ method ที่ทั้ง user และ admin ใช้ร่วมกัน

---

### 2. User Repository (Auth Instance)

```ts
// user.repository.ts
import { BasePostRepository } from "./base.repository";

export class UserPostRepository extends BasePostRepository {
  // getMyPosts: ไม่ต้องส่ง userId เข้ามา
  // RLS + JWT handle ให้เอง → ปลอดภัยกว่า manual filter
  async getMyPosts() {
    const { data, error } = await this.client
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async createPost(payload: { title: string; content: string }) {
    const { data, error } = await this.client
      .from("posts")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMyPost(
    id: string,
    payload: Partial<{ title: string; content: string }>,
  ) {
    const { data, error } = await this.client
      .from("posts")
      .update(payload)
      .eq("id", id) // RLS จะ block ถ้าไม่ใช่ owner
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

---

### 3. Admin Repository (Service Role)

```ts
// admin.repository.ts
import { BasePostRepository } from "./base.repository";

export class AdminPostRepository extends BasePostRepository {
  // admin ต้องส่ง userId ให้ชัดเจน เพราะ RLS ไม่ทำงาน
  async getPostsByUser(userId: string) {
    const { data, error } = await this.client
      .from("posts")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data;
  }

  async deleteAnyPost(id: string) {
    const { error } = await this.client.from("posts").delete().eq("id", id);

    if (error) throw error;
  }

  async bulkUpdateStatus(ids: string[], status: string) {
    const { data, error } = await this.client
      .from("posts")
      .update({ status })
      .in("id", ids)
      .select();

    if (error) throw error;
    return data;
  }
}
```

---

### 4. Factory + Export

```ts
// index.ts
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { UserPostRepository } from "./user.repository";
import { AdminPostRepository } from "./admin.repository";

// User repo: ต้องใช้ใน Server Component หรือ Route Handler ที่มี cookie
export function createUserPostRepository() {
  const cookieStore = cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  return new UserPostRepository(client);
}

// Admin repo: ใช้ได้เฉพาะ server-side เท่านั้น (service role key ห้าม expose)
export function createAdminPostRepository() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return new AdminPostRepository(client);
}

export { UserPostRepository, AdminPostRepository };
```

---

## Usage Patterns

### Server Component / Route Handler

```ts
// app/posts/page.tsx (Server Component)
import { createUserPostRepository } from '@/repositories/posts'

export default async function PostsPage() {
  const repo = createUserPostRepository()
  const myPosts = await repo.getMyPosts()
  return <PostList posts={myPosts} />
}
```

```ts
// app/api/admin/posts/route.ts (Admin API)
import { createAdminPostRepository } from "@/repositories/posts";

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const repo = createAdminPostRepository();
  await repo.deleteAnyPost(id);
  return Response.json({ ok: true });
}
```

---

## Design Rules (สำคัญ)

| Rule                                        | เหตุผล                                |
| ------------------------------------------- | ------------------------------------- |
| `UserRepo.getMyPosts()` ห้ามรับ `userId`    | ให้ RLS + JWT จัดการ → ป้องกัน IDOR   |
| `AdminRepo` method ต้องรับ `userId` ชัดเจน  | เพราะ RLS ไม่ทำงาน ต้องระบุ scope เอง |
| `SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะ server | ห้าม expose ใน client bundle          |
| Base method ควร read-only เป็นหลัก          | Write logic มัก specific ต่อ role     |
| แต่ละ repo file = 1 entity                  | ง่ายต่อการ test และ mock              |

---

## When to Use Which Repo

```
Request มาจาก logged-in user (Next.js Server Component, Server Action)
  → createUserPostRepository()

Background job, webhook, cron, admin panel
  → createAdminPostRepository()

Unit test / mock
  → new UserPostRepository(mockClient) หรือ new AdminPostRepository(mockClient)
```

---

## Extending to Other Entities

ทำซ้ำ pattern เดิมกับ entity อื่น:

```
repositories/
├── posts/        ← posts pattern (ตัวอย่างนี้)
├── users/        ← base / user / admin
├── comments/
└── orders/
```

Base class ของแต่ละ entity ไม่จำเป็นต้อง inherit จากกันข้ามระดับ — แยก base ต่อ entity ดีกว่า มี global base ที่ abstract เกินไป
