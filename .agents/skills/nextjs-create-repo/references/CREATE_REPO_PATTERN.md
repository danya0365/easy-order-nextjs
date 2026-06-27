# Create Repository Pattern - Clean Architecture

## Overview

เอกสารนี้อธิบายวิธีสร้าง Repository ตาม Clean Architecture Pattern สำหรับโปรเจค Next.js + Supabase

### Repository Types ที่ต้องสร้าง

โปรเจคนี้มี **4 ประเภท** ของ Repository Implementation:

| ประเภท | ตำแหน่ง | ใช้เมื่อ |
|--------|---------|----------|
| **Interface** | `src/application/repositories/I[Entity]Repository.ts` | กำหนด Contract สำหรับ data access |
| **Mock** | `src/infrastructure/repositories/mock/Mock[Entity]Repository.ts` | Development, Testing, Prototype |
| **Supabase** | `src/infrastructure/repositories/supabase/Supabase[Entity]Repository.ts` | Server-side access, API Routes |
| **API** | `src/infrastructure/repositories/api/Api[Entity]Repository.ts` | Client-side access (ผ่าน API Routes) |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                                │
│  (Components, Presenters, Hooks)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Client Components ────────────────────► ApiRepository                   │
│         │                                      │                         │
│         │                                      │ HTTP Calls              │
│         │                                      ▼                         │
│         │                              ┌───────────────┐                 │
│         │                              │  API Routes   │                  │
│         │                              │  /api/[...]   │                  │
│         │                              └───────────────┘                 │
│         │                                      │                         │
│         │                                      │ Uses                    │
│         │                                      ▼                         │
│  Server Components ────────────────────► SupabaseRepository              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Implements
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Application Layer                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                    IRepository Interface                                 │
│                    (Contract/Abstraction)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Implements
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐     │
│  │ MockRepository  │  │SupabaseRepository│  │   ApiRepository     │     │
│  │ (Dev/Testing)   │  │ (Server-side)    │  │   (Client-side)     │     │
│  └─────────────────┘  └──────────────────┘  └─────────────────────┘     │
│                                │                       │                 │
│                                ▼                       ▼                 │
│                           Supabase DB            Next.js API Routes      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Repository Interface (Application Layer)

### ตำแหน่ง: `src/application/repositories/I[Entity]Repository.ts`

Interface เป็น **Contract** ที่กำหนดว่า Repository ต้องมี method อะไรบ้าง

### Template

```typescript
/**
 * I[Entity]Repository
 * Repository interface for [Entity] data access
 * Following Clean Architecture - Application layer
 */

// ============================================================
// TYPES
// ============================================================

export type [Entity]Status = 'active' | 'inactive' | 'pending';

/**
 * Main entity model
 */
export interface [Entity] {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  status: [Entity]Status;
  createdAt: string;
  updatedAt: string;
  // Add entity-specific fields
}

/**
 * Statistics summary
 */
export interface [Entity]Stats {
  total[Entities]: number;
  active[Entities]: number;
  inactive[Entities]: number;
  // Add entity-specific stats
}

/**
 * Data required to create a new entity (full server-side DTO)
 */
export interface Create[Entity]Data {
  ownerId: string;       // 🔒 Server-injected — ห้าม client ส่งเอง
  name: string;
  description?: string;
  // Add create-specific fields
}

/**
 * Client-safe payload — ตัด auth ID ออกด้วย Omit<>
 * ใช้ใน interface method + client-side repositories
 */
export type Create[Entity]Payload = Omit<Create[Entity]Data, 'ownerId'>;

/**
 * Data for updating an existing entity
 */
export interface Update[Entity]Data {
  name?: string;
  description?: string;
  isActive?: boolean;
  status?: [Entity]Status;
  // Add update-specific fields
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

// ============================================================
// REPOSITORY INTERFACE
// ============================================================

export interface I[Entity]Repository {
  /**
   * Get entity by ID
   */
  getById(id: string): Promise<[Entity] | null>;

  /**
   * Get multiple entities by IDs
   */
  getByIds(ids: string[]): Promise<[Entity][]>;

  /**
   * Get all entities
   */
  getAll(): Promise<[Entity][]>;

  /**
   * Get paginated entities
   */
  getPaginated(page: number, perPage: number): Promise<PaginatedResult<[Entity]>>;

  /**
   * Create a new entity
   * 🔒 Client sends Payload (ไม่มี auth ID), Server inject เอง
   */
  create(data: Create[Entity]Payload): Promise<[Entity]>;

  /**
   * Update an existing entity
   */
  update(id: string, data: Update[Entity]Data): Promise<[Entity]>;

  /**
   * Delete an entity
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get statistics
   */
  getStats(): Promise<[Entity]Stats>;

  // Add entity-specific methods
}
```

### ตัวอย่าง: `IProductRepository.ts`

```typescript
export type ProductStatus = 'available' | 'out_of_stock' | 'discontinued';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  status: ProductStatus;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStats {
  totalProducts: number;
  availableProducts: number;
  outOfStockProducts: number;
}

export interface IProductRepository {
  getById(id: string): Promise<Product | null>;
  getByIds(ids: string[]): Promise<Product[]>;
  getAll(): Promise<Product[]>;
  getByCategory(categoryId: string): Promise<Product[]>;
  create(data: CreateProductData): Promise<Product>;
  update(id: string, data: UpdateProductData): Promise<Product>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<ProductStats>;
  updateStatus(id: string, status: ProductStatus): Promise<Product>;
}
```

---

## 2. Mock Repository (Infrastructure Layer)

### ตำแหน่ง: `src/infrastructure/repositories/mock/Mock[Entity]Repository.ts`

### ใช้เมื่อไหร่?

- ✅ **Development** - พัฒนา UI โดยไม่ต้องต่อ Database
- ✅ **Testing** - Unit tests ไม่ต้องการ external dependencies
- ✅ **Prototyping** - สร้าง demo หรือ mockup
- ✅ **Offline Mode** - เมื่อ backend ยังไม่พร้อม

### Template

```typescript
/**
 * Mock[Entity]Repository
 * Mock implementation for development and testing
 * Following Clean Architecture - Infrastructure layer
 * 
 * ✅ For development without database
 * ✅ For unit testing
 * ✅ No external dependencies
 */

import {
  Create[Entity]Data,
  I[Entity]Repository,
  [Entity],
  [Entity]Stats,
  PaginatedResult,
  Update[Entity]Data,
} from '@/src/application/repositories/I[Entity]Repository';
import dayjs from 'dayjs';

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_[ENTITIES]: [Entity][] = [
  {
    id: '[entity]-001',
    name: 'Sample [Entity] 1',
    description: 'This is a sample description',
    isActive: true,
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '[entity]-002',
    name: 'Sample [Entity] 2',
    description: 'Another sample description',
    isActive: true,
    status: 'active',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: '[entity]-003',
    name: 'Inactive [Entity]',
    description: 'This one is inactive',
    isActive: false,
    status: 'inactive',
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
];

// ============================================================
// MOCK REPOSITORY IMPLEMENTATION
// ============================================================

export class Mock[Entity]Repository implements I[Entity]Repository {
  private items: [Entity][] = [...MOCK_[ENTITIES]];

  async getById(id: string): Promise<[Entity] | null> {
    await this.delay(100);
    return this.items.find((item) => item.id === id) || null;
  }

  async getByIds(ids: string[]): Promise<[Entity][]> {
    await this.delay(100);
    return this.items.filter((item) => ids.includes(item.id));
  }

  async getAll(): Promise<[Entity][]> {
    await this.delay(100);
    return [...this.items];
  }

  async getPaginated(page: number, perPage: number): Promise<PaginatedResult<[Entity]>> {
    await this.delay(100);
    
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedItems = this.items.slice(start, end);

    return {
      data: paginatedItems,
      total: this.items.length,
      page,
      perPage,
    };
  }

  async create(data: Create[Entity]Data): Promise<[Entity]> {
    await this.delay(200);

    const newItem: [Entity] = {
      id: `[entity]-${dayjs().valueOf()}`,
      ...data,
      description: data.description || '',
      isActive: true,
      status: 'active',
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };

    this.items.push(newItem);
    return newItem;
  }

  async update(id: string, data: Update[Entity]Data): Promise<[Entity]> {
    await this.delay(200);

    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('[Entity] not found');
    }

    const updatedItem: [Entity] = {
      ...this.items[index],
      ...data,
      updatedAt: dayjs().toISOString(),
    };

    this.items[index] = updatedItem;
    return updatedItem;
  }

  async delete(id: string): Promise<boolean> {
    await this.delay(200);

    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }

    this.items.splice(index, 1);
    return true;
  }

  async getStats(): Promise<[Entity]Stats> {
    await this.delay(100);

    const activeItems = this.items.filter((item) => item.isActive);
    const total = this.items.length;
    const active = activeItems.length;

    return {
      total[Entities]: total,
      active[Entities]: active,
      inactive[Entities]: total - active,
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

/**
 * Export singleton instance for convenience
 * Use this in Presenter Factories
 */
export const mock[Entity]Repository = new Mock[Entity]Repository();
```

### Key Features

- ✅ **Simulated Network Delay** - ใช้ `delay()` เพื่อจำลอง latency
- ✅ **In-memory Storage** - เก็บข้อมูลใน array
- ✅ **Full CRUD** - รองรับ Create, Read, Update, Delete
- ✅ **Singleton Export** - ง่ายต่อการใช้งาน

---

## 3. Supabase Repository (Infrastructure Layer)

### ตำแหน่ง: `src/infrastructure/repositories/supabase/Supabase[Entity]Repository.ts`

### ใช้เมื่อไหร่?

- ✅ **API Routes** (`/api/[...]`) - Server-side data access
- ✅ **Server Components** - SSR data fetching
- ✅ **Server Actions** - Form submissions
- ✅ **Cron Jobs** - Background tasks

### ⚠️ ห้ามใช้ใน Client Components โดยตรง!

เพราะจะเกิดปัญหา **Connection Pool Exhaustion** - ทุก client จะสร้าง connection ใหม่

### Template

```typescript
/**
 * Supabase[Entity]Repository
 * Implementation of I[Entity]Repository using Supabase
 * Following Clean Architecture - Infrastructure layer
 * 
 * ✅ For SERVER-SIDE use only (API Routes, Server Components)
 * ❌ Do NOT use in Client Components directly
 */

import {
  Create[Entity]Payload,
  I[Entity]Repository,
  [Entity],
  [Entity]Stats,
  [Entity]Status,
  PaginatedResult,
  Update[Entity]Data,
} from '@/src/application/repositories/I[Entity]Repository';
import { Database } from '@/src/domain/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Type alias for the database row
type [Entity]Row = Database['public']['Tables']['[entities]']['Row'];

export class Supabase[Entity]Repository implements I[Entity]Repository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  // ============================================================
  // READ OPERATIONS
  // ============================================================

  async getById(id: string): Promise<[Entity] | null> {
    const { data, error } = await this.supabase
      .from('[entities]')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToDomain(data);
  }

  async getByIds(ids: string[]): Promise<[Entity][]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.supabase
      .from('[entities]')
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Error fetching [entities] by IDs:', error);
      return [];
    }

    return (data || []).map(this.mapToDomain);
  }

  async getAll(): Promise<[Entity][]> {
    const { data, error } = await this.supabase
      .from('[entities]')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching [entities]:', error);
      return [];
    }

    return data.map(this.mapToDomain);
  }

  async getPaginated(page: number, perPage: number): Promise<PaginatedResult<[Entity]>> {
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    const { data, error, count } = await this.supabase
      .from('[entities]')
      .select('*', { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: (data || []).map(this.mapToDomain),
      total: count || 0,
      page,
      perPage,
    };
  }

  // ============================================================
  // WRITE OPERATIONS
  // ============================================================

  // 🔒 Server-Injected Identity Pattern:
  // ownerId ถูกส่งเป็น parameter แยก โดย API Route (ไม่อยู่ใน payload)
  async create(data: Create[Entity]Payload, ownerId?: string): Promise<[Entity]> {
    const resolvedOwnerId = ownerId || '';

    const { data: created, error } = await this.supabase
      .from('[entities]')
      .insert({
        owner_id: resolvedOwnerId,  // 🔒 Server-injected
        name: data.name,
        description: data.description,
        // Map other fields from Create[Entity]Payload to snake_case
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(created);
  }

  async update(id: string, data: Update[Entity]Data): Promise<[Entity]> {
    const { data: updated, error } = await this.supabase
      .from('[entities]')
      .update({
        name: data.name,
        description: data.description,
        is_active: data.isActive,
        status: data.status,
        // Map other fields
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('[entities]')
      .delete()
      .eq('id', id);

    return !error;
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  async getStats(): Promise<[Entity]Stats> {
    // Option 1: Use RPC for better performance
    // const { data, error } = await this.supabase.rpc('get_[entity]_stats');

    // Option 2: Calculate from data
    const { data, error } = await this.supabase
      .from('[entities]')
      .select('is_active, status');

    if (error || !data) {
      return {
        total[Entities]: 0,
        active[Entities]: 0,
        inactive[Entities]: 0,
      };
    }

    const total = data.length;
    const active = data.filter((item) => item.is_active).length;

    return {
      total[Entities]: total,
      active[Entities]: active,
      inactive[Entities]: total - active,
    };
  }

  // ============================================================
  // DOMAIN MAPPING
  // ============================================================

  /**
   * Map database row (snake_case) to domain model (camelCase)
   */
  private mapToDomain = (raw: [Entity]Row): [Entity] => {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description || '',
      isActive: raw.is_active,
      status: raw.status as [Entity]Status,
      createdAt: raw.created_at || '',
      updatedAt: raw.updated_at || '',
      // Map other fields
    };
  };
}
```

### Key Features

- ✅ **ใช้ Supabase Client** ที่ inject เข้ามา (ไม่สร้างเอง)
- ✅ **Domain Mapping** - แปลง snake_case → camelCase
- ✅ **Error Handling** - จัดการ errors อย่างเหมาะสม
- ✅ **RPC Support** - รองรับ stored procedures

### การใช้งานใน API Routes (Server-side)

**⚠️ สำคัญ:** ห้ามเรียกใช้ `Supabase[Entity]Repository` โดยตรงใน API Routes เพื่อป้องกันรหัสซ้ำซ้อนและละเมิด Single Source of Truth! **ต้องเรียกผ่าน `[Entity]PresenterServerFactory` เสมอ** 

```typescript
// app/api/[entities]/route.ts
import { createServer[Entity]Presenter } from '@/src/presentation/presenters/[entity]/[Entity]PresenterServerFactory';

export async function GET() {
  // 1. เรียกใช้งานผ่าน Factory ฝั่ง Server
  const presenter = await createServer[Entity]Presenter();
  
  // 2. ดึงข้อมูลผ่าน Presenter เท่านั้น 
  // (ห้ามลัดไปเรียก Repository โดยตรงเด็ดขาด)
  const entities = await presenter.getAll[Entities]();
  
  return Response.json(entities);
}
```

---

## 4. API Repository (Infrastructure Layer)

### ตำแหน่ง: `src/infrastructure/repositories/api/Api[Entity]Repository.ts`

### ใช้เมื่อไหร่?

- ✅ **Client Components** - ทุก component ที่มี `'use client'`
- ✅ **Custom Hooks** - `use[Something]` hooks
- ✅ **Presenters (Client-side)** - PresenterClientFactory
- ✅ **Interactive Features** - real-time updates, forms

### ทำไมต้องใช้ API Repository แทน Supabase โดยตรง?

| ปัญหา | วิธีแก้ |
|-------|--------|
| Connection Pool Exhaustion | API Routes จัดการ connection แบบ centralized |
| Security | Supabase credentials ไม่หลุดไป client |
| Rate Limiting | ควบคุม requests ได้ที่ server |
| Caching | สามารถ cache responses ได้ |

### Template

```typescript
/**
 * Api[Entity]Repository
 * Implements I[Entity]Repository using API calls instead of direct Supabase connection
 * 
 * ✅ For use in CLIENT-SIDE components only
 * ✅ No connection pool issues - calls go through Next.js API routes
 * ✅ Secure - no Supabase credentials exposed to client
 */

'use client';

import {
  Create[Entity]Payload,
  I[Entity]Repository,
  [Entity],
  [Entity]Stats,
  PaginatedResult,
  Update[Entity]Data,
} from '@/src/application/repositories/I[Entity]Repository';

export class Api[Entity]Repository implements I[Entity]Repository {
  private baseUrl = '/api/[entities]';

  // ============================================================
  // READ OPERATIONS
  // ============================================================

  async getById(id: string): Promise<[Entity] | null> {
    const res = await fetch(`${this.baseUrl}/${id}`);
    
    if (res.status === 404) return null;
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถโหลดข้อมูลได้');
    }
    
    return res.json();
  }

  async getByIds(ids: string[]): Promise<[Entity][]> {
    if (ids.length === 0) return [];
    
    const res = await fetch(`${this.baseUrl}?ids=${ids.join(',')}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถโหลดข้อมูลได้');
    }
    
    return res.json();
  }

  async getAll(): Promise<[Entity][]> {
    const res = await fetch(this.baseUrl);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถโหลดข้อมูลได้');
    }
    
    return res.json();
  }

  async getPaginated(page: number, perPage: number): Promise<PaginatedResult<[Entity]>> {
    const res = await fetch(`${this.baseUrl}?page=${page}&perPage=${perPage}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถโหลดข้อมูลได้');
    }
    
    return res.json();
  }

  // ============================================================
  // WRITE OPERATIONS
  // ============================================================

  // 🔒 Client ส่ง Payload เท่านั้น (ไม่มี auth ID)
  // API Route จะ inject ownerId จาก session ให้
  async create(data: Create[Entity]Payload): Promise<[Entity]> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถสร้างข้อมูลได้');
    }
    
    return res.json();
  }

  async update(id: string, data: Update[Entity]Data): Promise<[Entity]> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถอัปเดตข้อมูลได้');
    }
    
    return res.json();
  }

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถลบข้อมูลได้');
    }
    
    return true;
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  async getStats(): Promise<[Entity]Stats> {
    const res = await fetch(`${this.baseUrl}/stats`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถโหลดสถิติได้');
    }
    
    return res.json();
  }

  // ============================================================
  // CUSTOM METHODS (Entity-specific)
  // ============================================================

  /**
   * Example: Search with query parameters
   */
  async search(query: string): Promise<[Entity][]> {
    const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถค้นหาได้');
    }
    
    return res.json();
  }

  /**
   * Example: Action with POST body
   */
  async customAction(id: string, action: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'ไม่สามารถดำเนินการได้');
    }
  }
}
```

### Key Features

- ✅ **'use client'** directive - ใช้ได้เฉพาะ client-side
- ✅ **HTTP Error Handling** - ตรวจสอบ `res.ok` ทุกครั้ง
- ✅ **Thai Error Messages** - แสดง error ภาษาไทย
- ✅ **JSON Body** - ใช้ `Content-Type: application/json`

---

## 5. Repository Factory

### ตำแหน่ง: `src/infrastructure/repositories/RepositoryFactory.ts`

Factory สำหรับสร้าง Repository instances แบบ centralized

### Template

```typescript
/**
 * RepositoryFactory
 * Factory for creating repository instances on the client side
 * 
 * ✅ Uses API-based repositories to avoid Supabase connection pool issues
 * ✅ Centralized repository creation for client-side components
 */

'use client';

import { I[Entity]Repository } from '@/src/application/repositories/I[Entity]Repository';
import { Api[Entity]Repository } from '@/src/infrastructure/repositories/api/Api[Entity]Repository';

/**
 * Creates [entity] repository for client-side use
 */
export function create[Entity]Repository(): I[Entity]Repository {
  return new Api[Entity]Repository();
}

/**
 * Creates all common repositories
 */
export function createAllRepositories(): {
  [entity]Repo: I[Entity]Repository;
  // Add other repositories
} {
  return {
    [entity]Repo: new Api[Entity]Repository(),
    // Add other repositories
  };
}
```

---

## Development Workflow

### 1. Mock-First Development (แนะนำ)

```
1. สร้าง Interface (I[Entity]Repository.ts)
   ↓
2. สร้าง Mock Repository พร้อม mock data
   ↓
3. เชื่อมต่อกับ Presenter → พัฒนา UI
   ↓
4. เมื่อ UI พร้อม → สร้าง Supabase Repository
   ↓
5. สร้าง API Routes
   ↓
6. สร้าง API Repository
   ↓
7. สลับ Factory ให้ใช้ API Repository
```

### 2. การสลับระหว่าง Mock กับ Real

```typescript
// src/presentation/presenters/[page]/[Page]PresenterClientFactory.ts

export function createClient[Page]Presenter(): [Page]Presenter {
  // ✅ Development: Use Mock
  const repository = new Mock[Entity]Repository();
  
  // ⏳ Production: Switch to API
  // const repository = new Api[Entity]Repository();

  return new [Page]Presenter(repository);
}
```

---

## Entity-Specific Patterns

### Pattern A: Simple CRUD Entity

Entity พื้นฐานที่มีแค่ CRUD operations:

```typescript
export interface IProductRepository {
  // Basic CRUD
  getById(id: string): Promise<Product | null>;
  getAll(): Promise<Product[]>;
  create(data: CreateProductData): Promise<Product>;
  update(id: string, data: UpdateProductData): Promise<Product>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<ProductStats>;
}
```

### Pattern B: Query-Heavy Entity

Entity ที่มี methods สำหรับ query หลายแบบ:

```typescript
export interface IOrderRepository {
  // Basic CRUD
  getById(id: string): Promise<Order | null>;
  create(data: CreateOrderData): Promise<Order>;
  update(id: string, data: UpdateOrderData): Promise<Order>;
  
  // Query methods
  getByCustomerId(customerId: string): Promise<Order[]>;
  getByStatus(status: OrderStatus): Promise<Order[]>;
  getByDateRange(startDate: string, endDate: string): Promise<Order[]>;
  searchByOrderNumber(orderNumber: string): Promise<Order[]>;
  
  // Status methods
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
  cancel(id: string, reason?: string): Promise<boolean>;
  
  // Aggregation methods
  getStats(dateRange?: { start: string; end: string }): Promise<OrderStats>;
  getTotalRevenue(dateRange?: { start: string; end: string }): Promise<number>;
}
```

### Pattern C: Timezone-Aware Entity

Entity ที่ต้องจัดการ timezone:

```typescript
export interface IScheduleRepository {
  // Timezone-aware schedule
  getDaySchedule(
    resourceId: string, 
    date: string, 
    timezone: string,
    referenceTime?: string
  ): Promise<DaySchedule>;
  
  // Available time slots
  getAvailableSlots(
    resourceId: string,
    date: string,
    timezone: string
  ): Promise<TimeSlot[]>;
  
  // Cross-midnight support
  getByDateRange(
    resourceId: string, 
    startDate: string, 
    endDate: string,
    timezone: string
  ): Promise<Schedule[]>;
}
```

### Pattern D: Privacy-Aware Entity

Entity ที่ต้องจำกัดการเข้าถึงข้อมูล:

```typescript
export interface IBookingRepository {
  // Privacy-aware: only owner sees full data
  getMyBookings(customerId: string): Promise<Booking[]>;
  
  // Public view: masked sensitive data
  getByResourceAndDate(
    resourceId: string, 
    date: string, 
    customerId?: string  // Used to unmask owner's data
  ): Promise<Booking[]>;
  
  // Cancel with ownership verification
  cancel(id: string, customerId?: string): Promise<boolean>;
}
```

---

## Placeholder Reference

เมื่อสร้าง Repository ใหม่ ให้แทนที่ placeholders ต่อไปนี้:

| Placeholder | คำอธิบาย | ตัวอย่าง |
|-------------|---------|----------|
| `[Entity]` | PascalCase entity name | `Product`, `Order`, `Customer` |
| `[entity]` | camelCase entity name | `product`, `order`, `customer` |
| `[entities]` | Plural form (for table name) | `products`, `orders`, `customers` |
| `[ENTITIES]` | SCREAMING_SNAKE_CASE | `PRODUCTS`, `ORDERS`, `CUSTOMERS` |

---

## Checklist สำหรับสร้าง Repository ใหม่

- [ ] สร้าง Interface ใน `src/application/repositories/`
- [ ] กำหนด Types ทั้งหมด (Entity, Stats, Create, Update)
- [ ] ถ้ามี auth-sensitive field → สร้าง `Payload` type ด้วย `Omit<>` (🔒 Server-Injected Identity)
- [ ] สร้าง Mock Repository พร้อม mock data
- [ ] Export singleton instance จาก Mock
- [ ] สร้าง Supabase Repository
- [ ] สร้าง API Routes ที่เกี่ยวข้อง
- [ ] สร้าง API Repository
- [ ] เพิ่มเข้า RepositoryFactory
- [ ] อัปเดต Presenter Factories
- [ ] ทดสอบกับ Mock ก่อน
- [ ] ทดสอบกับ Supabase/API

---

## Best Practices

### 1. Interface First

กำหนด Interface ก่อนเสมอ - ทำให้ implementation ทั้งหมด consistent

### 2. Snake Case ↔ Camel Case

- Database: `snake_case`
- Domain Model: `camelCase`
- ใช้ `mapToDomain()` function ในการแปลง

### 3. Error Handling

```typescript
// ❌ Bad
throw new Error(error.message);

// ✅ Good - User-friendly messages
throw new Error(error.error || 'ไม่สามารถโหลดข้อมูลได้');
```

### 4. Immutability

```typescript
// ❌ Bad - Mutating internal state
return this.items;

// ✅ Good - Return copy
return [...this.items];
```

### 5. Null Handling

```typescript
// ❌ Bad
async getById(id: string): Promise<[Entity]> { ... }

// ✅ Good - Explicit null
async getById(id: string): Promise<[Entity] | null> { ... }
```

### 6. Empty Array Handling

```typescript
// ✅ Always check for empty arrays before querying
async getByIds(ids: string[]): Promise<[Entity][]> {
  if (ids.length === 0) return [];
  // ... rest of implementation
}
```

### 7. Server-Injected Identity Pattern (🔒)

Authenticated user ID (เช่น `studentId`, `instructorId`, `ownerId`) **ต้องถูก inject จาก server เสมอ** ห้ามรับจาก client

**หลักการ:**
- `Create[Entity]Data` = Full DTO (มี auth ID) ใช้ internal เท่านั้น
- `Create[Entity]Payload` = `Omit<Create[Entity]Data, 'ownerId'>` ← ใช้ใน interface + client
- API Route inject auth ID จาก session แล้วส่งเป็น parameter แยก

```typescript
// ❌ Bad - Client ส่ง auth ID เอง (IDOR vulnerability)
await repository.create({ ownerId: 'user-123', name: 'Test' });

// ✅ Good - API Route inject auth ID
const body: Create[Entity]Payload = await request.json(); // ไม่มี ownerId
const result = await repository.create(body, profile.id);  // inject แยก
```

**Convention:**
- Field ที่เป็น auth ID ต้องมี comment `// 🔒 Server-injected`
- Supabase repo: รับ auth ID เป็น optional parameter ตัวที่ 2
- API repo: ส่งแค่ Payload (ไม่มี auth ID)
- Mock repo: auto-assign dummy ID ภายใน

---

## Related Documents

- [CREATE_PAGE_PATTERN.md](./CREATE_PAGE_PATTERN.md) - วิธีสร้างหน้าใหม่ตาม Clean Architecture
