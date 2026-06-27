"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { adminResetOwnerPasswordAction } from "@/src/presentation/actions/admin-actions";
import { resetStaffPasswordAction } from "@/src/presentation/actions/shop-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { genPassword } from "@/src/presentation/lib/gen-password";

/**
 * Lets a privileged user (admin → shop owner, owner → staff) set a NEW password
 * for someone who forgot theirs, then shows it to read out over the phone.
 */
export function ResetPasswordControl({
  kind,
  userId,
}: {
  kind: "owner" | "staff";
  userId: string;
}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  function toggle() {
    setError(null);
    setDone(null);
    setOpen((o) => {
      const next = !o;
      if (next && !pwd) setPwd(genPassword());
      return next;
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      const res =
        kind === "owner"
          ? await adminResetOwnerPasswordAction(userId, pwd)
          : await resetStaffPasswordAction(userId, pwd);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setDone(pwd);
        setOpen(false);
        toast.success(t("resetPwSuccess"));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={toggle}
        className="rounded-full bg-muted-surface px-2.5 py-1 text-xs font-medium text-muted transition hover:opacity-80"
      >
        {t("resetPassword")}
      </button>

      {open && (
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <Input
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-32"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPwd(genPassword())}
              disabled={pending}
            >
              {tc("randomize")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submit}
              loading={pending}
              disabled={pwd.length < 6}
            >
              {tc("confirm")}
            </Button>
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
        </div>
      )}

      {done && (
        <p className="text-right text-xs text-success">
          {t("resetPwDoneLabel")} <strong className="text-sm">{done}</strong>
          <br />
          {t("resetPwDoneHint")}
        </p>
      )}
    </div>
  );
}
