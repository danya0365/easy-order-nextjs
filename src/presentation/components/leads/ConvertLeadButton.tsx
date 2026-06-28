"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  convertLeadToShopAction,
  type LeadFormState,
} from "@/src/presentation/actions/lead-actions";
import type { Lead } from "@/src/domain/entities";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { GeneratedPasswordField } from "@/src/presentation/components/ui/GeneratedPasswordField";
import { ShopCredentialsHandoff } from "@/src/presentation/components/admin/ShopCredentialsHandoff";

/** Suggest a URL slug from the lead name (latin/number only). */
function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Badge + public link shown once a lead is (or has been) converted. */
function ConvertedBadge({ slug }: { slug: string }) {
  const t = useTranslations("leads");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="success">{t("convertedBadge")}</Badge>
      <Link
        href={`/s/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <Store size={14} />/s/{slug}
      </Link>
    </div>
  );
}

export function ConvertLeadButton({
  lead,
  convertedSlug,
}: {
  lead: Lead;
  /** Set once this lead has a shop — the page stays mounted across conversion. */
  convertedSlug: string | null;
}) {
  const t = useTranslations("leads");
  const [open, setOpen] = useState(false);
  const [handoffDismissed, setHandoffDismissed] = useState(false);
  const [state, action, pending] = useActionState<LeadFormState, FormData>(
    convertLeadToShopAction,
    {},
  );

  // Just converted in this session → show the credentials handoff. This branch
  // must win even after the page refreshes `convertedSlug` in, because the
  // plaintext password lives only in this component's action state (shown once).
  if (state.handoff && !handoffDismissed) {
    return (
      <Modal
        open
        onClose={() => setHandoffDismissed(true)}
        title={t("shopCreatedTitle", { name: lead.name })}
      >
        <div className="flex flex-col gap-4">
          <ShopCredentialsHandoff handoff={state.handoff} />
          <Button type="button" onClick={() => setHandoffDismissed(true)}>
            {t("done")}
          </Button>
        </div>
      </Modal>
    );
  }

  if (convertedSlug) return <ConvertedBadge slug={convertedSlug} />;

  if (lead.status !== "won") {
    return (
      <p className="text-sm text-muted">{t("convertNeedWon")}</p>
    );
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Store size={16} />
        {t("convertButton")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("convertModalTitle", { name: lead.name })}
      >
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <p className="text-xs text-muted">{t("convertHint")}</p>
          <FormField label={t("slugLabel")} htmlFor="slug">
            <Input
              id="slug"
              name="slug"
              defaultValue={suggestSlug(lead.name)}
              placeholder="coffee-shop"
              required
            />
          </FormField>
          <FormField label={t("ownerEmail")} htmlFor="ownerEmail">
            <Input id="ownerEmail" name="ownerEmail" type="email" required />
          </FormField>
          <FormField label={t("ownerPassword")} htmlFor="ownerPassword">
            <GeneratedPasswordField />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("pricePerDay")} htmlFor="pricePerDayBaht">
              <Input
                id="pricePerDayBaht"
                name="pricePerDayBaht"
                type="number"
                min={1}
                step="0.5"
                defaultValue={10}
                required
              />
            </FormField>
            <FormField label={t("stampThreshold")} htmlFor="stampThreshold">
              <Input
                id="stampThreshold"
                name="stampThreshold"
                type="number"
                min={1}
                max={100}
                defaultValue={10}
              />
            </FormField>
          </div>
          <FormField label={t("rewardText")} htmlFor="rewardText">
            <Input
              id="rewardText"
              name="rewardText"
              placeholder={t("rewardPlaceholder")}
            />
          </FormField>

          {state.error && <p className="text-sm text-error">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? t("converting") : t("convertConfirm")}
          </Button>
        </form>
      </Modal>
    </>
  );
}
