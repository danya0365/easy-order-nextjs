"use client";

import { useRef, useState } from "react";
import { Copy, Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  buildAiPromptSegments,
  composeAiPrompt,
  type PromoCopyContext,
  type PromoGoal,
  type PosterSize,
} from "@/src/domain/services/promo-poster";
import { Button } from "@/src/presentation/components/ui/Button";

/**
 * Path B — generate an image-gen prompt seeded from the shop + goal. LOCKED
 * segments (style/mood/aspect/no-text) keep results on-concept; the owner only
 * edits the subject + vibe. Output is copy-to-clipboard; we never call an LLM.
 *
 * The parent remounts this via `key={goal}`, so the editable fields reseed from
 * the new goal's defaults without a setState-in-effect.
 */
export function AiPromptPanel({
  goal,
  size,
  ctx,
}: {
  goal: PromoGoal;
  size: PosterSize;
  ctx: PromoCopyContext;
}) {
  const t = useTranslations("promote");
  const seeded = buildAiPromptSegments(goal, ctx, size);
  const [subject, setSubject] = useState(seeded.editable.subject);
  const [vibe, setVibe] = useState(seeded.editable.vibe);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Locked segments track the live size (aspect changes without remount).
  const locked = buildAiPromptSegments(goal, ctx, size).locked;
  const prompt = composeAiPrompt({ locked, editable: { subject, vibe } });

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Insecure context / permission denied → fall back to selecting the text.
      outputRef.current?.select();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("aiIntro")}</p>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {t("aiSubjectLabel")}
        </label>
        <textarea
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-brand-400"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {t("aiVibeLabel")}
        </label>
        <textarea
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-brand-400"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <Lock className="size-3.5" />
          {t("aiLockedLabel")}
        </p>
        <p className="rounded-xl bg-muted-surface p-3 text-xs text-muted">
          {locked.style}, {locked.mood}, {locked.aspect}, {locked.noText}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{t("aiPromptOutput")}</label>
        <textarea
          ref={outputRef}
          value={prompt}
          readOnly
          rows={4}
          className="w-full rounded-xl border border-border bg-muted-surface p-3 text-sm text-foreground outline-none"
        />
        <div>
          <Button variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t("copied") : t("copyPrompt")}
          </Button>
        </div>
      </div>
    </div>
  );
}
