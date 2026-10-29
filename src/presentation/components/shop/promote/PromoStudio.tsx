"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Info, QrCode, RefreshCw, Store, UserPlus } from "lucide-react";

import {
  buildTemplateCopy,
  getPosterSize,
  type PromoCopyContext,
  type PromoGoal,
  type PosterSize,
} from "@/src/domain/services/promo-poster";
import { cn } from "@/src/presentation/components/ui/cn";
import { Input } from "@/src/presentation/components/ui/Input";
import { TabSelect } from "@/src/presentation/components/ui/TabSelect";
import { PromoGoalSelector } from "./PromoGoalSelector";
import { PosterSizeSwitcher } from "./PosterSizeSwitcher";
import { TemplatePosterPanel } from "./TemplatePosterPanel";
import { AiPromptPanel } from "./AiPromptPanel";
import { UploadBgPanel } from "./UploadBgPanel";
import { QrCardPanel } from "./QrCardPanel";
import type {
  PromoPageSeed,
  PromoPath,
  PromoQrMode,
  PromoSeedData,
} from "./types";

const PATHS: {
  id: PromoPath;
  labelKey: "pathTemplate" | "pathCard" | "pathAiPrompt" | "pathUpload";
}[] = [
  { id: "template", labelKey: "pathTemplate" },
  { id: "card", labelKey: "pathCard" },
  { id: "ai_prompt", labelKey: "pathAiPrompt" },
  { id: "upload", labelKey: "pathUpload" },
];

/** Client orchestrator for the 3 promo paths; shares goal/size/reward state. */
export function PromoStudio({ seed: pageSeed }: { seed: PromoPageSeed }) {
  const t = useTranslations("promote");
  const paths = PATHS.map((p) => ({ id: p.id, label: t(p.labelKey) }));
  const [goal, setGoal] = useState<PromoGoal>("new_customer");
  const [sizeId, setSizeId] = useState<PosterSize>("ig_square");
  const [highlight, setHighlight] = useState("");
  const [path, setPath] = useState<PromoPath>("template");
  // Lifted so the uploaded background survives switching path tabs.
  const [uploadBg, setUploadBg] = useState<string | null>(null);

  const joinAvailable = pageSeed.joinQrDataUrl !== null;
  const [qrMode, setQrMode] = useState<PromoQrMode>(
    joinAvailable ? "join" : "shop",
  );
  const effectiveMode: PromoQrMode =
    qrMode === "join" && joinAvailable ? "join" : "shop";
  const seed: PromoSeedData = {
    shopName: pageSeed.shopName,
    publicUrl: pageSeed.publicUrl,
    profileImageDataUrl: pageSeed.profileImageDataUrl,
    qrMode: effectiveMode,
    qrDataUrl:
      effectiveMode === "join" && pageSeed.joinQrDataUrl
        ? pageSeed.joinQrDataUrl
        : pageSeed.shopQrDataUrl,
  };
  const qrOptions: { id: PromoQrMode; label: string; Icon: typeof Store }[] = [
    { id: "join", label: t("qrModeJoin"), Icon: UserPlus },
    { id: "shop", label: t("qrModeShop"), Icon: Store },
  ];

  const size = getPosterSize(sizeId);
  const ctx: PromoCopyContext = { shopName: seed.shopName, highlight };
  const copy = buildTemplateCopy(goal, ctx);

  return (
    <div className="flex flex-col gap-5">
      <PromoGoalSelector value={goal} onChange={setGoal} />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="promoHighlight"
          className="text-sm font-medium text-foreground"
        >
          {t("highlightLabel")}
        </label>
        <Input
          id="promoHighlight"
          value={highlight}
          maxLength={60}
          placeholder={t("highlightPlaceholder")}
          onChange={(e) => setHighlight(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2" data-testid="promo-qr-mode">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <QrCode className="size-4" />
          {t("qrModeLabel")}
        </span>
        <div className="flex gap-1 rounded-full bg-muted-surface p-1">
          {qrOptions.map(({ id, label, Icon }) => {
            const active = id === effectiveMode;
            const disabled = id === "join" && !joinAvailable;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                data-qr-mode={id}
                onClick={() => setQrMode(id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "bg-card text-brand-700 shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
        {joinAvailable ? (
          <p className="flex items-start gap-2 text-xs text-muted">
            <RefreshCw className="mt-0.5 size-3.5 shrink-0" />
            {t("qrModeRotateNote")}
          </p>
        ) : (
          <p className="flex items-start gap-2 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {t("qrModeJoinOff")}{" "}
              <Link
                href="/shop/settings/members"
                className="font-medium text-brand-700 underline"
              >
                {t("qrModeJoinOffLink")}
              </Link>
            </span>
          </p>
        )}
      </div>

      {path !== "card" && (
        <PosterSizeSwitcher value={sizeId} onChange={setSizeId} />
      )}

      {/* Path tabs — dropdown on phones, pill toggle on sm+. */}
      <div className="sm:hidden">
        <TabSelect
          ariaLabel={t("posterMethodAria")}
          options={paths}
          value={path}
          onChange={(id) => setPath(id as PromoPath)}
        />
      </div>
      <div className="hidden gap-1 rounded-full bg-muted-surface p-1 sm:flex">
        {paths.map((p) => {
          const active = p.id === path;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPath(p.id)}
              aria-pressed={active}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-card text-brand-700 shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="border-t border-border pt-5">
        {path === "template" && (
          <TemplatePosterPanel size={size} copy={copy} seed={seed} />
        )}
        {path === "card" && <QrCardPanel seed={seed} />}
        {path === "ai_prompt" && (
          <AiPromptPanel key={goal} goal={goal} size={sizeId} ctx={ctx} />
        )}
        {path === "upload" && (
          <UploadBgPanel
            size={size}
            copy={copy}
            seed={seed}
            bgDataUrl={uploadBg}
            onBgChange={setUploadBg}
          />
        )}
      </div>
    </div>
  );
}
