"use client";

import { useState, useTransition } from "react";
import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Role } from "@/src/domain/types/roles";
import { ROLE_LABEL_KEY } from "@/src/domain/types/roles";
import { devLoginAsAction } from "@/src/presentation/actions/auth-actions";

export interface DevUser {
  id: string;
  email: string;
  role: Role;
}

/**
 * DEV ONLY switcher — one-click login as any seeded user (no password). Rendered
 * only when `isDevLoginEnabled` (see login page); the underlying action is
 * independently gated server-side with the same flag.
 */
export function DevLoginPanel({ users }: { users: DevUser[] }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  function loginAs(id: string) {
    setActiveId(id);
    startTransition(async () => {
      await devLoginAsAction(id);
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-dashed border-amber-400/60 bg-amber-50/50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Wrench className="size-3.5" />
        {t("devQuickLogin")}
      </p>
      {users.length === 0 ? (
        <p className="text-xs text-muted">{t("devNoUsers")}</p>
      ) : (
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => loginAs(u.id)}
                disabled={pending}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-left text-sm ring-1 ring-border transition hover:ring-brand-300 disabled:opacity-60"
              >
                <span className="min-w-0 truncate text-foreground">{u.email}</span>
                <span className="shrink-0 rounded-full bg-muted-surface px-2 py-0.5 text-[11px] text-muted">
                  {pending && activeId === u.id ? t("devLoggingIn") : tc(ROLE_LABEL_KEY[u.role])}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
