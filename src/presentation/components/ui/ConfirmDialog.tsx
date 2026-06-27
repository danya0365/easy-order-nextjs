"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Imperative confirm dialog: `const ok = await confirm({...})`. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

/**
 * App-wide confirmation host. Mounted once (in the root layout). Replaces native
 * `confirm()` with a themed Modal and gives a promise-based API for both plain
 * onClick handlers (via useConfirm) and the ConfirmSubmitButton wrapper.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        setPending({ opts, resolve });
      }),
    [],
  );

  function settle(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  const opts = pending?.opts;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => settle(false)}
        title={opts?.title}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? t("cancel")}
            </Button>
            <Button
              variant={opts?.tone === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={() => settle(true)}
            >
              {opts?.confirmLabel ?? t("confirm")}
            </Button>
          </>
        }
      >
        {opts?.message && <p className="text-sm text-muted">{opts.message}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

/**
 * Confirmation wrapper for a server-action `<form action={...}>` button. Renders
 * the real form (so progressive enhancement + revalidate/redirect stay intact);
 * the visible button is type="button" and only `requestSubmit()`s the form after
 * the user confirms — we never invoke the server action manually.
 */
export function ConfirmSubmitButton({
  action,
  title,
  message,
  confirmLabel,
  tone = "danger",
  className,
  buttonTitle,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  className?: string;
  buttonTitle?: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  async function onClick() {
    const ok = await confirm({ title, message, confirmLabel, tone });
    if (ok) formRef.current?.requestSubmit();
  }

  return (
    <form action={action} ref={formRef}>
      <button
        type="button"
        onClick={onClick}
        title={buttonTitle}
        className={className}
      >
        {children}
      </button>
    </form>
  );
}
