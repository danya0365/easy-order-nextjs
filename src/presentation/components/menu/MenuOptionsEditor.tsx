"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Save, Trash2 } from "lucide-react";

import type { MenuOptionGroup } from "@/src/domain/entities";
import {
  addOptionChoiceAction,
  createOptionGroupAction,
  deleteOptionChoiceAction,
  deleteOptionGroupAction,
  updateOptionChoiceAction,
  updateOptionGroupAction,
  type OptionActionState,
} from "@/src/presentation/actions/menu-option-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";

function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  function run(fn: () => Promise<OptionActionState>, after?: () => void) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }
  return { pending, run };
}

/** Owner modal: manage option groups + choices for one menu item. */
export function MenuOptionsEditor({
  open,
  onClose,
  itemId,
  itemName,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  groups: MenuOptionGroup[];
}) {
  const t = useTranslations("menuOptions");
  const { pending, run } = useRun();
  const [name, setName] = useState("");
  const [required, setRequired] = useState(false);
  const [maxSelect, setMaxSelect] = useState("1");

  return (
    <Modal open={open} onClose={onClose} title={t("editorTitle", { name: itemName })}>
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" data-testid="menu-options-editor">
        {groups.length === 0 && <p className="text-sm text-muted">{t("noGroups")}</p>}
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}

        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
          <p className="text-sm font-semibold text-foreground">{t("addGroup")}</p>
          <Input
            placeholder={t("groupNamePlaceholder")}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="new-group-name"
          />
          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="size-4 accent-[var(--color-brand-500)]"
                data-testid="new-group-required"
              />
              {t("required")}
            </label>
            <label className="flex items-center gap-2">
              {t("maxSelect")}
              <Input
                type="number"
                min={1}
                max={20}
                value={maxSelect}
                onChange={(e) => setMaxSelect(e.target.value)}
                className="w-20"
                data-testid="new-group-max"
              />
            </label>
          </div>
          <Button
            size="sm"
            loading={pending}
            disabled={!name.trim()}
            data-testid="new-group-submit"
            onClick={() =>
              run(
                () =>
                  createOptionGroupAction(itemId, {
                    name,
                    isRequired: required,
                    minSelect: required ? 1 : 0,
                    maxSelect: Number(maxSelect) || 1,
                  }),
                () => {
                  setName("");
                  setRequired(false);
                  setMaxSelect("1");
                },
              )
            }
          >
            <Plus className="size-4" />
            {t("addGroup")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function GroupCard({ group }: { group: MenuOptionGroup }) {
  const t = useTranslations("menuOptions");
  const confirm = useConfirm();
  const { pending, run } = useRun();
  const [name, setName] = useState(group.name);
  const [required, setRequired] = useState(group.isRequired);
  const [minSelect, setMinSelect] = useState(String(group.minSelect));
  const [maxSelect, setMaxSelect] = useState(String(group.maxSelect));
  const [choiceName, setChoiceName] = useState("");
  const [choicePrice, setChoicePrice] = useState("0");

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3" data-testid="option-group">
      <div className="flex items-center gap-2">
        <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <button
          type="button"
          aria-label={t("deleteGroup")}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-error hover:bg-error/5"
          onClick={async () => {
            const ok = await confirm({ title: t("deleteGroupConfirm"), message: group.name, confirmLabel: t("deleteGroup"), tone: "danger" });
            if (ok) run(() => deleteOptionGroupAction(group.id));
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="size-4 accent-[var(--color-brand-500)]" />
          {t("required")}
        </label>
        {required && (
          <label className="flex items-center gap-2">
            {t("minSelect")}
            <Input type="number" min={1} max={20} value={minSelect} onChange={(e) => setMinSelect(e.target.value)} className="w-16" />
          </label>
        )}
        <label className="flex items-center gap-2">
          {t("maxSelect")}
          <Input type="number" min={1} max={20} value={maxSelect} onChange={(e) => setMaxSelect(e.target.value)} className="w-16" />
        </label>
        <Button
          size="sm"
          variant="outline"
          loading={pending}
          onClick={() =>
            run(() =>
              updateOptionGroupAction(group.id, {
                name,
                isRequired: required,
                minSelect: required ? Number(minSelect) || 1 : 0,
                maxSelect: Number(maxSelect) || 1,
              }),
            )
          }
        >
          <Save className="size-4" />
          {t("save")}
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {group.choices.map((c) => (
          <ChoiceRow key={c.id} groupId={group.id} choice={c} />
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Input placeholder={t("choiceNamePlaceholder")} maxLength={60} value={choiceName} onChange={(e) => setChoiceName(e.target.value)} data-testid="new-choice-name" />
        <Input type="number" min={0} step="1" value={choicePrice} onChange={(e) => setChoicePrice(e.target.value)} className="w-24" aria-label={t("priceDelta")} data-testid="new-choice-price" />
        <Button
          size="sm"
          loading={pending}
          disabled={!choiceName.trim()}
          data-testid="new-choice-submit"
          onClick={() =>
            run(
              () => addOptionChoiceAction(group.id, choiceName, choicePrice),
              () => {
                setChoiceName("");
                setChoicePrice("0");
              },
            )
          }
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <p className="text-xs text-muted">{t("priceDeltaHint")}</p>
    </div>
  );
}

function ChoiceRow({
  groupId,
  choice,
}: {
  groupId: string;
  choice: MenuOptionGroup["choices"][number];
}) {
  const t = useTranslations("menuOptions");
  const { pending, run } = useRun();
  const [name, setName] = useState(choice.name);
  const [price, setPrice] = useState(String(choice.priceDeltaSatang / 100));
  const [avail, setAvail] = useState(choice.isAvailable);
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1" />
      <span className="text-sm text-muted">+฿</span>
      <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-20" aria-label={t("priceDelta")} />
      <label className="flex items-center gap-1 text-xs text-foreground">
        <input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} className="size-4 accent-[var(--color-brand-500)]" />
        {t("available")}
      </label>
      <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => updateOptionChoiceAction(groupId, choice.id, name, price, avail))} aria-label={t("save")}>
        <Save className="size-4" />
      </Button>
      <button
        type="button"
        aria-label={t("deleteChoice")}
        className="inline-flex size-8 items-center justify-center rounded-lg text-error hover:bg-error/5"
        onClick={() => run(() => deleteOptionChoiceAction(groupId, choice.id))}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
