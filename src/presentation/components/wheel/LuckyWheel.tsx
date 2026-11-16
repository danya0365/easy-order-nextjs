"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Coins, Gift, Heart, Sparkles, Ticket, UtensilsCrossed } from "lucide-react";

import { spinWheelAction } from "@/src/presentation/actions/wheel-actions";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { useToast } from "@/src/presentation/components/ui/Toast";

export interface WheelSegment {
  id: string;
  name: string;
  type: "points" | "free_item" | "gift" | "thanks";
}

const COLORS = ["#f97316", "#fde68a", "#10b981", "#fef3c7", "#3b82f6", "#fed7aa", "#a855f7", "#d1fae5", "#ef4444", "#e0e7ff", "#0ea5e9", "#fce7f3"];
const DARK = new Set(["#f97316", "#10b981", "#3b82f6", "#a855f7", "#ef4444", "#0ea5e9"]);
const SPIN_MS = 4800;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(i: number, n: number) {
  const seg = 360 / n;
  const a = polar(150, 150, 140, i * seg);
  const b = polar(150, 150, 140, (i + 1) * seg);
  const large = seg > 180 ? 1 : 0;
  return `M150 150 L${a.x} ${a.y} A140 140 0 ${large} 1 ${b.x} ${b.y} Z`;
}

function short(name: string) {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

function PrizeIcon({ type, className }: { type: WheelSegment["type"]; className?: string }) {
  if (type === "points") return <Coins className={className} />;
  if (type === "free_item") return <UtensilsCrossed className={className} />;
  if (type === "gift") return <Gift className={className} />;
  return <Heart className={className} />;
}

/**
 * Animated lucky wheel. The server picks the prize (crypto random); the disc
 * just animates to land on the segment it returned.
 */
export function LuckyWheel({
  slug,
  segments,
  tickets,
  rewardsHref,
}: {
  slug: string;
  segments: WheelSegment[];
  tickets: number;
  rewardsHref: string;
}) {
  const t = useTranslations("wheel");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [left, setLeft] = useState(tickets);
  const [syncedTickets, setSyncedTickets] = useState(tickets);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    name: string;
    type: WheelSegment["type"];
    resultId?: string;
  } | null>(null);

  // The disc keeps the segments it was drawn with until the result is closed —
  // a refresh after a win can drop an out-of-stock prize, which would otherwise
  // shift the slices under the pointer while the result is still showing.
  const [shown, setShown] = useState(segments);
  const freshKey = segments.map((s) => s.id).join(",");

  // Adopt fresh server ticket counts (e.g. monthly ticket after refresh).
  if (tickets !== syncedTickets && !spinning) {
    setSyncedTickets(tickets);
    setLeft(tickets);
  }

  function closeResult() {
    setResult(null);
    if (freshKey !== shown.map((s) => s.id).join(",")) {
      setShown(segments);
      setRotation(0);
    }
  }

  const n = Math.max(shown.length, 1);
  const seg = 360 / n;

  function spin() {
    if (spinning || pending || left <= 0) return;
    startTransition(async () => {
      const res = await spinWheelAction(slug);
      if (res.error || !res.prizeType) {
        toast.error(res.error ?? "error");
        return;
      }
      let idx = shown.findIndex((s) => s.id === res.prizeId);
      if (idx < 0) idx = shown.findIndex((s) => s.type === "thanks");
      if (idx < 0) idx = 0;
      const jitter = (Math.random() - 0.5) * seg * 0.6;
      const target = 360 - (idx + 0.5) * seg + jitter;
      const base = rotation - (rotation % 360);
      setRotation(base + 360 * 6 + ((target % 360) + 360) % 360);
      setSpinning(true);
      window.setTimeout(() => {
        setSpinning(false);
        setLeft(res.ticketsLeft ?? 0);
        setResult({ name: res.prizeName ?? "", type: res.prizeType!, resultId: res.resultId });
        router.refresh();
      }, SPIN_MS + 150);
    });
  }

  const busy = spinning || pending;
  const needsRedeem = result && (result.type === "gift" || result.type === "free_item");

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-square w-full max-w-[340px]">
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 drop-shadow-md">
          <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden>
            <path d="M17 40 L2 8 A16 16 0 1 1 32 8 Z" fill="#111827" />
            <circle cx="17" cy="14" r="6" fill="#fff" />
          </svg>
        </div>
        <div
          data-testid="wheel-disc"
          className="size-full rounded-full shadow-xl ring-8 ring-brand-500/90"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)` : "none",
          }}
        >
          <svg viewBox="0 0 300 300" className="size-full">
            {shown.map((s, i) => {
              const color = COLORS[i % COLORS.length];
              const mid = (i + 0.5) * seg;
              const p = polar(150, 150, 92, mid);
              return (
                <g key={s.id}>
                  <path d={slicePath(i, n)} fill={color} stroke="#fff" strokeWidth="2" />
                  <text
                    x={p.x}
                    y={p.y}
                    fill={DARK.has(color) ? "#fff" : "#1f2937"}
                    fontSize={n > 8 ? 10 : 12}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${mid > 180 ? mid + 90 : mid - 90} ${p.x} ${p.y})`}
                    style={{ fontFamily: "inherit" }}
                  >
                    {short(s.name)}
                  </text>
                </g>
              );
            })}
            <circle cx="150" cy="150" r="26" fill="#fff" stroke="#f97316" strokeWidth="5" />
          </svg>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-brand-600">
          <Sparkles className="size-6" />
        </div>
      </div>

      <p
        data-testid="wheel-tickets"
        className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700"
      >
        <Ticket className="size-4" />
        {t("ticketsLeft", { count: left })}
      </p>

      <button
        type="button"
        data-testid="wheel-spin"
        onClick={spin}
        disabled={busy || left <= 0 || shown.length === 0}
        className="w-full max-w-xs rounded-2xl bg-brand-500 px-6 py-4 text-lg font-bold text-on-brand shadow-lg transition hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? t("spinning") : t("spin")}
      </button>
      {left <= 0 && !busy && <p className="text-center text-sm text-muted">{t("noTickets")}</p>}

      <Modal
        open={!!result}
        onClose={closeResult}
        title={t("resultTitle")}
        footer={
          <div className="flex w-full flex-col gap-2">
            {needsRedeem && result?.resultId && (
              <Link
                href={`${rewardsHref}/${result.resultId}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-600"
              >
                <Gift className="size-4" />
                {t("viewReward")}
              </Link>
            )}
            {left > 0 ? (
              <button
                type="button"
                onClick={closeResult}
                className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
              >
                {t("spinAgain")}
              </button>
            ) : (
              <button
                type="button"
                onClick={closeResult}
                className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
              >
                {t("close")}
              </button>
            )}
          </div>
        }
      >
        {result && (
          <div data-testid="wheel-result" className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <PrizeIcon type={result.type} className="size-8" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {result.type === "thanks" ? t("resultThanks") : t("resultWin", { name: result.name })}
            </p>
            {result.type === "points" && <p className="text-sm text-muted">{t("resultPoints")}</p>}
            {needsRedeem && <p className="text-sm text-muted">{t("resultPending")}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

export { PrizeIcon };
