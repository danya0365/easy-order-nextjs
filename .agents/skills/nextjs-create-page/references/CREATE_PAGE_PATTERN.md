# Create Page Template - Clean Architecture Pattern

## Prompt Template for Creating New Pages

Use this prompt template to create new pages following Clean Architecture and SOLID principles

## Pattern Overview

This template follows the established Clean Architecture pattern with:

1. **Server Component** for SEO optimization (`app/[page-path]/page.tsx`)
2. **Repository Interface** for data access abstraction (`src/application/repositories/I[PageItem]Repository.ts`)
3. **Mock Repository** for development (`src/infrastructure/repositories/mock/Mock[PageItem]Repository.ts`)
4. **Presenter Pattern** for business logic separation (`src/presentation/presenters/[page-name]/[PageName]Presenter.ts`)
5. **Custom Hook** for state management (`src/presentation/presenters/[page-name]/use[PageName]Presenter.ts`)
6. **View Component** for UI rendering (`src/presentation/components/[page-name]/[PageName]View.tsx`)

---

## 0. Pattern: Repository Interface & Mock Repository

### 0A. Repository Interface (`src/application/repositories/I[PageItem]Repository.ts`)

```typescript
/**
 * I[PageItem]Repository
 * Repository interface for [PageItem] data access
 * Following Clean Architecture - this is in the Application layer
 */

export interface [PageItem] {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Add your item fields here
}

export interface [PageStats] {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  // Add your stats fields here
}

export interface Create[PageItem]Data {
  name: string;
  description?: string;
  // Add your create fields here
}

export interface Update[PageItem]Data {
  name?: string;
  description?: string;
  isActive?: boolean;
  // Add your update fields here
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface I[PageItem]Repository {
  /**
   * Get item by ID
   */
  getById(id: string): Promise<[PageItem] | null>;

  /**
   * Get all items
   */
  getAll(): Promise<[PageItem][]>;

  /**
   * Get paginated items
   */
  getPaginated(page: number, perPage: number): Promise<PaginatedResult<[PageItem]>>;

  /**
   * Get items by user ID (if applicable)
   */
  getByUserId(userId: string): Promise<[PageItem][]>;

  /**
   * Create a new item
   */
  create(data: Create[PageItem]Data): Promise<[PageItem]>;

  /**
   * Update an existing item
   */
  update(id: string, data: Update[PageItem]Data): Promise<[PageItem]>;

  /**
   * Delete an item
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get statistics
   */
  getStats(): Promise<[PageStats]>;
}
```

### 0B. Mock Repository (`src/infrastructure/repositories/mock/Mock[PageItem]Repository.ts`)

```typescript
/**
 * Mock[PageItem]Repository
 * Mock implementation for development and testing
 * Following Clean Architecture - this is in the Infrastructure layer
 */

import {
  I[PageItem]Repository,
  [PageItem],
  [PageStats],
  Create[PageItem]Data,
  Update[PageItem]Data,
  PaginatedResult,
} from '@/src/application/repositories/I[PageItem]Repository';

// Mock data for development
const MOCK_[PAGE_ITEMS]: [PageItem][] = [
  {
    id: 'item-001',
    name: 'Sample Item 1',
    description: 'This is a sample description',
    isActive: true,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  },
  {
    id: 'item-002',
    name: 'Sample Item 2',
    description: 'Another sample description',
    isActive: true,
    createdAt: '2024-01-14T09:00:00.000Z',
    updatedAt: '2024-01-14T09:00:00.000Z',
  },
  {
    id: 'item-003',
    name: 'Sample Item 3',
    description: 'Inactive item',
    isActive: false,
    createdAt: '2024-01-13T08:00:00.000Z',
    updatedAt: '2024-01-13T08:00:00.000Z',
  },
  // Add more mock items as needed
];

export class Mock[PageItem]Repository implements I[PageItem]Repository {
  private items: [PageItem][] = [...MOCK_[PAGE_ITEMS]];

  async getById(id: string): Promise<[PageItem] | null> {
    // Simulate network delay
    await this.delay(100);
    return this.items.find((item) => item.id === id) || null;
  }

  async getAll(): Promise<[PageItem][]> {
    await this.delay(100);
    return [...this.items];
  }

  async getPaginated(page: number, perPage: number): Promise<PaginatedResult<[PageItem]>> {
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

  async getByUserId(userId: string): Promise<[PageItem][]> {
    await this.delay(100);
    // In mock, return all items (or filter by userId if you have userId field)
    return [...this.items];
  }

  async create(data: Create[PageItem]Data): Promise<[PageItem]> {
    await this.delay(200);
    
    const newItem: [PageItem] = {
      id: `item-${Date.now()}`,
      ...data,
      description: data.description || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.items.unshift(newItem);
    return newItem;
  }

  async update(id: string, data: Update[PageItem]Data): Promise<[PageItem]> {
    await this.delay(200);
    
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('[PageItem] not found');
    }

    const updatedItem: [PageItem] = {
      ...this.items[index],
      ...data,
      updatedAt: new Date().toISOString(),
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

  async getStats(): Promise<[PageStats]> {
    await this.delay(100);
    
    const totalItems = this.items.length;
    const activeItems = this.items.filter((item) => item.isActive).length;
    const inactiveItems = totalItems - activeItems;

    return {
      totalItems,
      activeItems,
      inactiveItems,
    };
  }

  // Helper method to simulate network delay
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance for convenience
export const mock[PageItem]Repository = new Mock[PageItem]Repository();
```

### 0C. Supabase Repository (`src/infrastructure/repositories/supabase/Supabase[PageItem]Repository.ts`)

```typescript
/**
 * Supabase[PageItem]Repository
 * Implementation of I[PageItem]Repository using Supabase
 * Following Clean Architecture - this is in the Infrastructure layer
 */

import {
  I[PageItem]Repository,
  [PageItem],
  [PageStats],
  Create[PageItem]Data,
  Update[PageItem]Data,
  PaginatedResult,
} from '@/src/application/repositories/I[PageItem]Repository';
import { Database } from '@/src/domain/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export class Supabase[PageItem]Repository implements I[PageItem]Repository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getById(id: string): Promise<[PageItem] | null> {
    const { data, error } = await this.supabase
      .from('[page-items]')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToDomain(data);
  }

  async getAll(): Promise<[PageItem][]> {
    const { data, error } = await this.supabase
      .from('[page-items]')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(this.mapToDomain);
  }

  async getPaginated(page: number, perPage: number): Promise<PaginatedResult<[PageItem]>> {
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    const { data, error, count } = await this.supabase
      .from('[page-items]')
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

  async getByUserId(userId: string): Promise<[PageItem][]> {
    const { data, error } = await this.supabase
      .from('[page-items]')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(this.mapToDomain);
  }

  async create(data: Create[PageItem]Data): Promise<[PageItem]> {
    const { data: created, error } = await this.supabase
      .from('[page-items]')
      .insert({
        name: data.name,
        description: data.description,
        // map other fields
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(created);
  }

  async update(id: string, data: Update[PageItem]Data): Promise<[PageItem]> {
    const { data: updated, error } = await this.supabase
      .from('[page-items]')
      .update({
        name: data.name,
        description: data.description,
        is_active: data.isActive,
        // map other fields
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('[page-items]')
      .delete()
      .eq('id', id);

    return !error;
  }

  async getStats(): Promise<[PageStats]> {
    // This can be an RPC call for better performance
    const { data, error } = await this.supabase
      .from('[page-items]')
      .select('is_active');

    if (error || !data) {
      return { totalItems: 0, activeItems: 0, inactiveItems: 0 };
    }

    const total = data.length;
    const active = data.filter(i => i.is_active).length;

    return {
      totalItems: total,
      activeItems: active,
      inactiveItems: total - active,
    };
  }

  /**
   * Helper to map DB record to domain model
   */
  private mapToDomain(raw: any): [PageItem] {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      isActive: raw.is_active,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      // map other fields
    };
  }
}
```


### Key Features:

- **Repository Interface** - Abstracts data access, enabling easy switching between Mock and Real implementations
- **Mock Repository** - For development without requiring backend
- **CRUD operations** - All standard operations with proper typing
- **Pagination support** - Built-in paginated queries
- **Stats calculation** - Automatic statistics from data
- **Network delay simulation** - Realistic async behavior

---

## 1. Pattern: `app/[page-path]/page.tsx`

```typescript
import { [PageName]View } from "@/src/presentation/components/[page-name]/[PageName]View";
import { createServer[PageName]Presenter } from "@/src/presentation/presenters/[page-name]/[PageName]PresenterServerFactory";
import type { Metadata } from "next";
import Link from "next/link";

// Tell Next.js this is a dynamic page
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface [PageName]PageProps {
  params: Promise<{ [paramName]: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({
  params,
}: [PageName]PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const presenter = createServer[PageName]Presenter();

  try {
    return presenter.generateMetadata(resolvedParams.[paramName]);
  } catch (error) {
    console.error("Error generating metadata:", error);

    // Fallback metadata
    return {
      title: "จัดการ[PageThaiName] | App Name",
      description: "ระบบจัดการ[PageThaiDescription]",
    };
  }
}

/**
 * [PageName] Management page - Server Component for SEO optimization
 * Uses presenter pattern following Clean Architecture
 */
export default async function [PageName]Page({ params }: [PageName]PageProps) {
  const resolvedParams = await params;
  const presenter = createServer[PageName]Presenter();

  try {
    // Get view model from presenter
    const viewModel = await presenter.getViewModel(resolvedParams.[paramName]);

    return (
      <[PageName]View [paramName]={resolvedParams.[paramName]} initialViewModel={viewModel} />
    );
  } catch (error) {
    console.error("Error fetching [page-name] data:", error);

    // Fallback UI
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            เกิดข้อผิดพลาด
          </h1>
          <p className="text-muted mb-4">ไม่สามารถโหลดข้อมูล[PageThaiName]ได้</p>
          <Link
            href="/"
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }
}
```

### Key Features:

- **Server Component** for SEO optimization
- **Dynamic page** configuration for proper data fetching
- **Metadata generation** with fallback handling
- **Error handling** with user-friendly fallback UI
- **Presenter pattern** for clean separation of concerns
- **Dependency injection** through factory pattern

---

## 2. Pattern: `src/presentation/presenters/[page-name]/[PageName]Presenter.ts`

```typescript
/**
 * [PageName]Presenter
 * Handles business logic for [PageName] management
 * Receives repository via dependency injection
 */

import { Metadata } from 'next';
import {
  I[PageItem]Repository,
  [PageItem],
  [PageStats],
  Create[PageItem]Data,
  Update[PageItem]Data,
} from '@/src/application/repositories/I[PageItem]Repository';

export interface [PageName]ViewModel {
  items: [PageItem][];
  stats: [PageStats];
  totalCount: number;
  page: number;
  perPage: number;
}

/**
 * Presenter for [PageName] management
 * ✅ Receives repository via constructor injection (not Supabase directly)
 * ✅ Serves as the Single Source of Truth for both UI Views and API Routes
 */
export class [PageName]Presenter {
  constructor(
    private readonly repository: I[PageItem]Repository
  ) {}

  // ============================================================
  // VIEW MODEL METHODS (For Client/Server Components)
  // ============================================================

  /**
   * Get view model for the page
   * ⚠️ Use this ONLY for rendering UI views, NOT for API route responses
   */
  async getViewModel(page: number = 1, perPage: number = 10): Promise<[PageName]ViewModel> {
    try {
      // Get data in parallel for better performance
      const [paginatedResult, stats] = await Promise.all([
        this.repository.getPaginated(page, perPage),
        this.repository.getStats(),
      ]);

      return {
        items: paginatedResult.data,
        stats,
        totalCount: paginatedResult.total,
        page,
        perPage,
      };
    } catch (error) {
      console.error('Error getting view model:', error);
      throw error;
    }
  }

  /**
   * Generate metadata for the page
   */
  generateMetadata(id?: string): Metadata {
    return {
      title: "จัดการ[PageThaiName] | App Name",
      description: "ระบบจัดการ[PageThaiDescription]",
    };
  }

  // ============================================================
  // GRANULAR DATA METHODS (For API Routes & Individual Actions)
  // ============================================================
  // ⚠️ API Routes MUST call these methods individually rather than using getViewModel()

  /**
   * Create a new item
   */
  async create[PageItem](data: Create[PageItem]Data): Promise<[PageItem]> {
    try {
      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating [page-item]:', error);
      throw error;
    }
  }

  /**
   * Update an existing item
   */
  async update[PageItem](id: string, data: Update[PageItem]Data): Promise<[PageItem]> {
    try {
      return await this.repository.update(id, data);
    } catch (error) {
      console.error('Error updating [page-item]:', error);
      throw error;
    }
  }

  /**
   * Delete an item
   */
  async delete[PageItem](id: string): Promise<boolean> {
    try {
      return await this.repository.delete(id);
    } catch (error) {
      console.error('Error deleting [page-item]:', error);
      throw error;
    }
  }

  /**
   * Get item by ID
   */
  async get[PageItem]ById(id: string): Promise<[PageItem] | null> {
    try {
      return await this.repository.getById(id);
    } catch (error) {
      console.error('Error getting [page-item]:', error);
      throw error;
    }
  }

  /**
   * Get all items
   */
  async getAll[PageItems](): Promise<[PageItem][]> {
    try {
      return await this.repository.getAll();
    } catch (error) {
      console.error('Error getting all [page-items]:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<[PageStats]> {
    try {
      return await this.repository.getStats();
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}
```

---

## 2B. Pattern: `src/presentation/presenters/[page-name]/[PageName]PresenterServerFactory.ts`

```typescript
/**
 * [PageName]PresenterServerFactory
 * Factory for creating [PageName]Presenter instances on the server side
 * ✅ Injects the appropriate repository (Mock or Real)
 */

import { [PageName]Presenter } from './[PageName]Presenter';
import { Mock[PageItem]Repository } from '@/src/infrastructure/repositories/mock/Mock[PageItem]Repository';
// import { Supabase[PageItem]Repository } from '@/src/infrastructure/repositories/supabase/Supabase[PageItem]Repository';
// import { createServerSupabaseClient } from '@/src/infrastructure/supabase/server';

export class [PageName]PresenterServerFactory {
  static create(): [PageName]Presenter {
    // ✅ Use Mock Repository for development
    const repository = new Mock[PageItem]Repository();
    
    // ⏳ TODO: Switch to Supabase Repository when backend is ready
    // const supabase = createServerSupabaseClient();
    // const repository = new Supabase[PageItem]Repository(supabase);

    return new [PageName]Presenter(repository);
  }
}



export function createServer[PageName]Presenter(): [PageName]Presenter {
  return [PageName]PresenterServerFactory.create();
}
```

---

## 2C. Pattern: `src/presentation/presenters/[page-name]/[PageName]PresenterClientFactory.ts`

```typescript
/**
 * [PageName]PresenterClientFactory
 * Factory for creating [PageName]Presenter instances on the client side
 * ✅ Injects the appropriate repository (Mock or Real)
 */

'use client';

import { [PageName]Presenter } from './[PageName]Presenter';
import { Mock[PageItem]Repository } from '@/src/infrastructure/repositories/mock/Mock[PageItem]Repository';
// import { Supabase[PageItem]Repository } from '@/src/infrastructure/repositories/supabase/Supabase[PageItem]Repository';
// import { supabase } from '@/src/infrastructure/supabase/client';

export class [PageName]PresenterClientFactory {
  static create(): [PageName]Presenter {
    // ✅ Use Mock Repository for development
    const repository = new Mock[PageItem]Repository();
    
    // ⏳ TODO: Switch to Supabase Repository when backend is ready
    // const supabase = createClientSupabaseClient();
    // const repository = new Supabase[PageItem]Repository(supabase);

    return new [PageName]Presenter(repository);
  }
}



export function createClient[PageName]Presenter(): [PageName]Presenter {
  return [PageName]PresenterClientFactory.create();
}
```

### Key Features:

- **Clean Architecture** with proper separation of concerns
- **Repository injection** - Presenter receives repository, not Supabase
- **Easy switching** between Mock and Real repositories
- **Factory pattern** for dependency injection
- **Server and client factories** for different environments

---

## 3. Pattern: `src/presentation/presenters/[page-name]/use[PageName]Presenter.ts`

### 3A. Pattern with Parameters (e.g., courseId, shopId)

```typescript
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { [PageName]ViewModel, [PageName]Presenter } from "./[PageName]Presenter";
import { createClient[PageName]Presenter } from "./[PageName]PresenterClientFactory";
import type { [PageItem], Create[PageItem]Data, Update[PageItem]Data } from "@/src/application/repositories/I[PageItem]Repository";


export interface [PageName]PresenterState {
  viewModel: [PageName]ViewModel | null;
  loading: boolean;
  error: string | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  selectedItemId: string | null;
}

export interface [PageName]PresenterActions {
  loadData: () => Promise<void>;
  create[PageItem]: (data: Create[PageItem]Data) => Promise<void>;
  update[PageItem]: (data: Update[PageItem]Data) => Promise<void>;
  delete[PageItem]: (id: string) => Promise<void>;
  get[PageItem]ById: (id: string) => Promise<[PageItem] | null>;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (itemId: string) => void;
  closeEditModal: () => void;
  openDeleteModal: (itemId: string) => void;
  closeDeleteModal: () => void;
  setError: (error: string | null) => void;
}

/**
 * Custom hook for [PageName] presenter
 * Provides state management and actions for [PageName] operations
 */
export function use[PageName]Presenter(
  [paramName]: string,
  initialViewModel?: [PageName]ViewModel,
  presenterOverride?: [PageName]Presenter
): [[PageName]PresenterState, [PageName]PresenterActions] {
  // ✅ Create presenter inside hook with useMemo
  // Accept override for easier testing (Dependency Injection)
  const presenter = useMemo(
    () => presenterOverride ?? createClient[PageName]Presenter(),
    [presenterOverride]
  );
  
  // ✅ Track mounted state for memory leak protection
  const isMountedRef = useRef(true);
  
  // ✅ AbortController ref for canceling ongoing requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const [viewModel, setViewModel] = useState<[PageName]ViewModel | null>(
    initialViewModel || null
  );
  const [loading, setLoading] = useState(!initialViewModel);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);


  /**
   * Load data from presenter
   */
  const loadData = useCallback(async () => {
    // ✅ Cancel any previous pending request
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const newViewModel = await presenter.getViewModel();
      if (isMountedRef.current) {
        setViewModel(newViewModel);
      }
    } catch (err) {
      // ✅ Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;
      
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error loading [page-name] data:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [presenter]);

  /**
   * Create a new item
   */
  const create[PageItem] = useCallback(async (data: Create[PageItem]Data) => {
    setLoading(true);
    setError(null);

    try {
      await presenter.create[PageItem](data);
      if (isMountedRef.current) {
        setIsCreateModalOpen(false);
      }
      await loadData();
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error creating [page-item]:", err);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadData, presenter]);

  /**
   * Update an existing item
   */
  const update[PageItem] = useCallback(async (data: Update[PageItem]Data & { id: string }) => {
    setLoading(true);
    setError(null);

    try {
      await presenter.update[PageItem](data.id, data);
      if (isMountedRef.current) {
        setIsEditModalOpen(false);
        setSelectedItemId(null);
      }
      await loadData();
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error updating [page-item]:", err);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadData, presenter]);

  const delete[PageItem] = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await presenter.delete[PageItem](id);
      if (isMountedRef.current) {
        setIsDeleteModalOpen(false);
        setSelectedItemId(null);
      }
      await loadData();
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error deleting [page-item]:", err);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadData, presenter]);

  const get[PageItem]ById = useCallback(async (id: string) => {
    try {
      return await presenter.get[PageItem]ById(id);
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error getting [page-item]:", err);
      }
      throw err;
    }
  }, [presenter]);

  // Modal actions
  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
    setError(null);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setError(null);
  }, []);

  const openEditModal = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setIsEditModalOpen(true);
    setError(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedItemId(null);
    setError(null);
  }, []);

  const openDeleteModal = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setIsDeleteModalOpen(true);
    setError(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setSelectedItemId(null);
    setError(null);
  }, []);

  // Load data on mount or when paramName/loadData changes
  useEffect(() => {
    if (!initialViewModel) {
      loadData();
    }
  }, [loadData, [paramName]]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return [
    {
      viewModel,
      loading,
      error,
      isCreateModalOpen,
      isEditModalOpen,
      isDeleteModalOpen,
      selectedItemId,
    },
    {
      loadData,
      create[PageItem],
      update[PageItem],
      delete[PageItem],
      get[PageItem]ById,
      openCreateModal,
      closeCreateModal,
      openEditModal,
      closeEditModal,
      openDeleteModal,
      closeDeleteModal,
      setError,
    },
  ];
}
```

### 3B. Pattern with userId (Authentication Required)

**⚠️ IMPORTANT: ใช้ Zustand Store ดึง userId ใน Custom Hook, ไม่ส่งเป็น parameter**

```typescript
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/src/presentation/stores/auth-store";
import { [PageName]ViewModel, [PageName]Presenter } from "./[PageName]Presenter";
import { createClient[PageName]Presenter } from "./[PageName]PresenterClientFactory";
import type { [PageItem], Create[PageItem]Data, Update[PageItem]Data } from "@/src/application/repositories/I[PageItem]Repository";


export interface [PageName]PresenterState {
  viewModel: [PageName]ViewModel | null;
  loading: boolean;
  error: string | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  selectedItemId: string | null;
}

export interface [PageName]PresenterActions {
  loadData: () => Promise<void>;
  create[PageItem]: (data: Create[PageItem]Data) => Promise<void>;
  update[PageItem]: (data: Update[PageItem]Data) => Promise<void>;
  delete[PageItem]: (id: string) => Promise<void>;
  get[PageItem]ById: (id: string) => Promise<[PageItem] | null>;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (itemId: string) => void;
  closeEditModal: () => void;
  openDeleteModal: (itemId: string) => void;
  closeDeleteModal: () => void;
  setError: (error: string | null) => void;
}

/**
 * Custom hook for [PageName] presenter with authentication
 * ✅ ใช้ useAuthStore() ดึง userId แทนการรับเป็น parameter
 */
export function use[PageName]Presenter(
  initialViewModel?: [PageName]ViewModel,
  presenterOverride?: [PageName]Presenter
): [[PageName]PresenterState, [PageName]PresenterActions] {
  // ✅ Create presenter inside hook with useMemo
  const presenter = useMemo(
    () => presenterOverride ?? createClient[PageName]Presenter(),
    [presenterOverride]
  );
  
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { user } = useAuthStore();
  const [viewModel, setViewModel] = useState<[PageName]ViewModel | null>(
    initialViewModel || null
  );
  const [loading, setLoading] = useState(!initialViewModel);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);


  /**
   * Load data from presenter using userId from store
   */
  const loadData = useCallback(async () => {
    if (!user?.id) {
      if (isMountedRef.current) setError("User not authenticated");
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const newViewModel = await presenter.getViewModel();
      if (isMountedRef.current) {
        setViewModel(newViewModel);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error loading [page-name] data:", err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, presenter]);

  // Load data on mount or when dependencies change
  useEffect(() => {
    if (!initialViewModel && user?.id) {
      loadData();
    }
  }, [user?.id, initialViewModel, loadData]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // ... return statement (same as 3A pattern)
}
```

### Key Features:

- **Dependency Injection**: รับ `presenterOverride` เป็น parameter สำหรับการทดสอบ (Mocking)
- **Stable References**: ใช้ `useMemo` และ `useCallback` เพื่อป้องกัน infinite loop และการ re-render พุ่มเฟือย
- **Memory Leak Protection**: ใช้ `isMountedRef` เพื่อตรวจสอบสถานะก่อนอัปเดต state
- **Request Cancellation**: ใช้ `AbortController` เพื่อยกเลิก network request เก่าเมื่อ unmount หรือมีการโหลดใหม่
- **No Global Side Effects**: ลบ Singleton นอก hook เพื่อความปลอดภัยใน SSR
- **Correct Dependencies**: ทำตามกฎ `exhaustive-deps` 100% เพื่อป้องกัน Stale Closures
- **Thai language localization** และ Error Handling จัดเต็ม



---

## 4. Pattern: `src/presentation/components/[page-name]/[PageName]View.tsx`

### Rules for View Components:
- **100% logic-free**: The View should only be responsible for rendering JSX.
- **No local state, no effects, no refs**: Move all `useState`, `useEffect`, and `useRef` to the custom hook (`use[PageName]Presenter`).
- **Thin Presentation Layer**: All data and actions must come from the `[state, actions]` tuple.

```typescript
"use client";

import { [PageName]ViewModel } from "@/src/presentation/presenters/[page-name]/[PageName]Presenter";
import { use[PageName]Presenter } from "@/src/presentation/presenters/[page-name]/use[PageName]Presenter";
import { useState } from "react";

interface [PageName]ViewProps {
  [paramName]: string;
  initialViewModel?: [PageName]ViewModel;
}

export function [PageName]View({ [paramName], initialViewModel }: [PageName]ViewProps) {
  // ✅ Hook receives paramName and initialViewModel
  // ✅ EVERYTHING (state, actions, helpers, refs) comes from this hook
  const [state, actions] = use[PageName]Presenter([paramName], initialViewModel);

  const viewModel = state.viewModel;

  // Show loading only on initial load or when explicitly loading
  if (state.loading && !viewModel) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                กำลังโหลดข้อมูล[PageThaiName]...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error but we have no data
  if (state.error && !viewModel) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                เกิดข้อผิดพลาด
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {state.error}
              </p>
              <button
                onClick={actions.loadData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we have no view model and not loading, show empty state
  if (!viewModel) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                ยังไม่มีข้อมูล[PageThaiName]
              </p>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                ข้อมูล[PageThaiName]จะแสดงที่นี่เมื่อมีการสร้าง[PageThaiName]
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            จัดการ[PageThaiName]
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            ระบบจัดการ[PageThaiDescription]
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={actions.openCreateModal}
            className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            เพิ่ม[PageThaiName]
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                ทั้งหมด
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {viewModel.stats.totalItems}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                ใช้งาน
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {viewModel.stats.activeItems}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                ไม่ใช้งาน
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {viewModel.stats.inactiveItems}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              รายการ[PageThaiName]
            </h2>
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="ค้นหา..."
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                value={state.searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ชื่อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  รายละเอียด
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  วันที่สร้าง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {viewModel.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.description || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${actions.getStatusColor(
                        item.isActive ? "active" : "inactive"
                      )}`}
                    >
                      {actions.formatStatus(item.isActive ? "active" : "inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {actions.formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => actions.openEditModal(item.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => actions.openDeleteModal(item.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {viewModel.items.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              ยังไม่มีข้อมูล[PageThaiName]
            </p>
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              ข้อมูล[PageThaiName]จะแสดงที่นี่เมื่อมีการสร้าง[PageThaiName]
            </p>
          </div>
        )}
      </div>

      {/* Error Toast */}
      {state.error && viewModel && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            <span>{state.error}</span>
            <button
              onClick={() => actions.setError(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Key Features:

- **Client component** with "use client" directive
- **100% logic-free**: JSX only, no hooks like `useState`, `useEffect`, or `useRef`
- **Presenter hook integration** for state and actions
- **Loading, error, and empty states** with proper UX
- **Statistics cards** for data overview
- **Data table** with sorting and filtering
- **Pagination** support
- **Modal triggers** for CRUD operations
- **Responsive design** with Tailwind CSS
- **Thai language localization**
- **Error handling** with toast notifications

---

## Usage Instructions

### 1. Mock-First Workflow (Highly Recommended)

เพื่อความรวดเร็วในการพัฒนา UI และการทดสอบ:
1.  **สร้าง Interface** ใน Application Layer (`I[PageItem]Repository`)
2.  **สร้าง Mock Repository** พร้อมข้อมูลสมมติ (`Mock[PageItem]Repository`)
3.  **เชื่อมต่อ Factory** โดยใช้ Mock เป็นค่าเริ่มต้น (ทำตาม Template ด้านบน)
4.  **พัฒนา UI & Presenter** จนกว่าจะนิ่ง
5.  **เมื่อ UI พร้อม** ค่อยสร้าง `Supabase[PageItem]Repository` และสลับใน Factory

### 2. Replace Placeholders

- `[PageName]` - PascalCase page name (e.g., `Customers`)
- `[page-name]` - kebab-case page name (e.g., `customers`)
- `[PageItem]` - PascalCase item name (e.g., `Customer`)
- `[page-item]` - kebab-case item name (e.g., `customer`)
- `[PAGE_ITEMS]` - SCREAMING_SNAKE_CASE for constants (e.g., `CUSTOMERS`)
- `[PageThaiName]` - Thai name for the page (e.g., `ลูกค้า`)
- `[PageThaiDescription]` - Thai description (e.g., `จัดการข้อมูลลูกค้าในระบบ`)
- `[PageStats]` - Stats interface name (e.g., `CustomerStats`)
- `[paramName]` - URL parameter name (e.g., `customerId`)

### 2. Create Required Files

Create the following files in their respective directories:

```
src/application/repositories/I[PageItem]Repository.ts
src/infrastructure/repositories/mock/Mock[PageItem]Repository.ts
app/[page-path]/page.tsx
src/presentation/presenters/[page-name]/[PageName]Presenter.ts
src/presentation/presenters/[page-name]/[PageName]PresenterServerFactory.ts
src/presentation/presenters/[page-name]/[PageName]PresenterClientFactory.ts
src/presentation/presenters/[page-name]/use[PageName]Presenter.ts
src/presentation/components/[page-name]/[PageName]View.tsx
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  page.tsx ──► PresenterFactory ──► Presenter ──► View.tsx       │
│                        │                │                        │
│                        │                │                        │
│                        ▼                ▼                        │
│               usePresenter Hook    ViewModel                     │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Dependency Injection
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                          │
├─────────────────────────────────────────────────────────────────┤
│              IRepository Interface (Contract)                    │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Implementation
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  MockRepository (Dev)  │  SupabaseRepository (Prod)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Best Practices

### 1. Clean Architecture

- Follow the established layer separation
- **Use repository injection instead of direct Supabase access**
- Keep business logic in the Presenter
- Use interfaces for all dependencies

### 2. Repository Pattern

- Define interfaces in Application layer
- Implement Mock in Infrastructure layer
- Easy to switch between Mock and Real implementations
- Enables unit testing without database

### 3. Error Handling

- Implement comprehensive error handling
- Provide user-friendly error messages
- Use fallback UI when needed

### 4. Performance

- Use parallel data fetching with `Promise.all`
- Implement proper loading states
- Use dynamic imports for code splitting
- Optimize re-renders with proper state management

### 5. User Experience

- Provide loading indicators
- Show empty states with helpful messages
- Implement proper error recovery
- Use consistent Thai language localization
- Ensure responsive design

### 6. Type Safety

- Use TypeScript interfaces for all data structures
- Implement proper validation
- Use enums for status values
- Ensure type safety throughout the application

---

This pattern ensures consistency across all pages while maintaining Clean Architecture principles with proper Repository injection for easy switching between Mock and Real implementations.
