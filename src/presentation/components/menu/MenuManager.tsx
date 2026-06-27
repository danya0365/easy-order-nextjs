"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";

import type { MenuCategory, MenuItem } from "@/src/domain/entities";
import {
  createCategoryAction,
  renameCategoryAction,
  toggleCategoryAction,
  deleteCategoryAction,
  createItemAction,
  updateItemAction,
  toggleItemAvailableAction,
  deleteItemAction,
  type FormState,
} from "@/src/presentation/actions/menu-actions";
import { satangToBaht } from "@/src/presentation/lib/money";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function MenuManager({
  categories,
  items,
}: {
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const t = useTranslations("menu");
  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const item of items) {
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <AddCategoryForm />

      {categories.length === 0 ? (
        <EmptyState
          title={t("noCategoriesTitle")}
          description={t("noCategoriesDesc")}
        />
      ) : (
        categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            items={itemsByCategory.get(category.id) ?? []}
          />
        ))
      )}

      {categories.length > 0 && (
        <AddItemForm categories={categories} />
      )}
    </div>
  );
}

function AddCategoryForm() {
  const t = useTranslations("menu");
  const [state, action, pending] = useActionState<FormState, FormData>(
    createCategoryAction,
    {},
  );
  return (
    <Card>
      <CardHeader title={t("addCategoryTitle")} />
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <Input
          name="name"
          placeholder={t("addCategoryPlaceholder")}
          maxLength={60}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? t("addingCategory") : t("addCategoryButton")}
        </Button>
      </form>
      {state.error && <p className="mt-2 text-sm text-error">{state.error}</p>}
    </Card>
  );
}

function CategoryCard({
  category,
  items,
}: {
  category: MenuCategory;
  items: MenuItem[];
}) {
  const t = useTranslations("menu");
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState(false);

  function toggle() {
    start(async () => {
      const res = await toggleCategoryAction(category.id, !category.isActive);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const ok = await confirm({
        title: t("deleteCategoryConfirmTitle"),
        message: t("deleteCategoryConfirmMessage"),
        confirmLabel: t("deleteCategoryConfirmLabel"),
        tone: "danger",
      });
      if (!ok) return;
      const res = await deleteCategoryAction(category.id);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <Card className={category.isActive ? undefined : "opacity-60"}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {category.name}
            {!category.isActive && (
              <Badge tone="neutral">{t("categoryInactiveBadge")}</Badge>
            )}
          </span>
        }
        action={
          <span className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRenaming(true)}
              disabled={pending}
            >
              <Pencil className="size-4" />
              {t("renameCategory")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              disabled={pending}
            >
              {category.isActive ? t("deactivate") : t("activate")}
            </Button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={t("deleteCategory")}
              title={t("deleteCategory")}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-muted-surface hover:text-error disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </span>
        }
      />

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("noItemsInCategory")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      <RenameCategoryModal
        open={renaming}
        onClose={() => setRenaming(false)}
        category={category}
      />
    </Card>
  );
}

function RenameCategoryModal({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category: MenuCategory;
}) {
  const t = useTranslations("menu");
  const [state, action, pending] = useActionState<FormState, FormData>(
    renameCategoryAction,
    {},
  );
  useEffect(() => {
    if (state.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <Modal open={open} onClose={onClose} title={t("renameCategoryTitle")}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="categoryId" value={category.id} />
        <FormField label={t("categoryNameLabel")} htmlFor="renameName">
          <Input
            id="renameName"
            name="name"
            defaultValue={category.name}
            maxLength={60}
            required
          />
        </FormField>
        {state.error && <p className="text-sm text-error">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ItemRow({ item }: { item: MenuItem }) {
  const t = useTranslations("menu");
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  function toggleAvail() {
    start(async () => {
      const res = await toggleItemAvailableAction(item.id, !item.isAvailable);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const ok = await confirm({
        title: t("deleteItemConfirmTitle"),
        message: t("deleteItemConfirmMessage"),
        confirmLabel: t("deleteItemConfirmLabel"),
        tone: "danger",
      });
      if (!ok) return;
      const res = await deleteItemAction(item.id);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{item.name}</p>
        {item.description && (
          <p className="truncate text-sm text-muted">{item.description}</p>
        )}
        <p className="text-sm text-muted">
          {t("baht", { amount: satangToBaht(item.priceSatang) })}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1">
        <Button
          variant={item.isAvailable ? "ghost" : "outline"}
          size="sm"
          onClick={toggleAvail}
          disabled={pending}
        >
          {item.isAvailable ? t("available") : t("soldOut")}
        </Button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          aria-label={t("editItem")}
          title={t("editItem")}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-muted-surface hover:text-foreground disabled:opacity-50"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={t("deleteItem")}
          title={t("deleteItem")}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-muted-surface hover:text-error disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      </span>

      <EditItemModal
        open={editing}
        onClose={() => setEditing(false)}
        item={item}
      />
    </li>
  );
}

function EditItemModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: MenuItem;
}) {
  const t = useTranslations("menu");
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateItemAction,
    {},
  );
  useEffect(() => {
    if (state.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <Modal open={open} onClose={onClose} title={t("editItemTitle")}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="categoryId" value={item.categoryId} />
        <FormField label={t("itemNameLabel")} htmlFor="editName">
          <Input
            id="editName"
            name="name"
            defaultValue={item.name}
            maxLength={80}
            required
          />
        </FormField>
        <FormField label={t("itemPriceLabel")} htmlFor="editPrice">
          <Input
            id="editPrice"
            name="priceBaht"
            type="number"
            min={0}
            step="0.01"
            defaultValue={item.priceSatang / 100}
            required
          />
        </FormField>
        <FormField label={t("itemDescLabel")} htmlFor="editDesc">
          <Textarea
            id="editDesc"
            name="description"
            rows={2}
            maxLength={200}
            defaultValue={item.description ?? ""}
          />
        </FormField>
        {state.error && <p className="text-sm text-error">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddItemForm({ categories }: { categories: MenuCategory[] }) {
  const t = useTranslations("menu");
  const [state, action, pending] = useActionState<FormState, FormData>(
    createItemAction,
    {},
  );

  return (
    <Card>
      <CardHeader title={t("addItemTitle")} />
      <form action={action} className="flex flex-col gap-3">
        <FormField label={t("itemCategoryLabel")} htmlFor="newCategoryId">
          <select
            id="newCategoryId"
            name="categoryId"
            required
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("itemNameLabel")} htmlFor="newName">
          <Input
            id="newName"
            name="name"
            placeholder={t("itemNamePlaceholder")}
            maxLength={80}
            required
          />
        </FormField>
        <FormField label={t("itemPriceLabel")} htmlFor="newPrice">
          <Input
            id="newPrice"
            name="priceBaht"
            type="number"
            min={0}
            step="0.01"
            required
          />
        </FormField>
        <FormField label={t("itemDescLabel")} htmlFor="newDesc">
          <Textarea
            id="newDesc"
            name="description"
            rows={2}
            maxLength={200}
            placeholder={t("itemDescPlaceholder")}
          />
        </FormField>
        {state.error && <p className="text-sm text-error">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? t("addingItem") : t("addItemButton")}
        </Button>
      </form>
    </Card>
  );
}
