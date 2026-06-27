import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <FileQuestion className="size-14 text-brand-400" />
      <div>
        <h1 className="text-2xl font-bold text-brand-700">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("description")}</p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-brand-500 px-6 py-2.5 font-medium text-on-brand shadow-sm transition hover:bg-brand-600"
      >
        {t("home")}
      </Link>
    </main>
  );
}
