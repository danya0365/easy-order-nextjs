"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Frown } from "lucide-react";
import { useTranslations } from "next-intl";

import { reportClientError } from "@/src/presentation/lib/report-client-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  useEffect(() => {
    // Browser devtools for local dev + a beacon to server logs/error tracking.
    console.error(error);
    reportClientError(error, { digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <Frown className="size-14 text-brand-400" />
      <div>
        <h1 className="text-2xl font-bold text-brand-700">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("description")}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-brand-500 px-6 py-2.5 font-medium text-on-brand shadow-sm transition hover:bg-brand-600"
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
