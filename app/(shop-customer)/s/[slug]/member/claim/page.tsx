import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, Link2, TriangleAlert } from "lucide-react";

import { container } from "@/src/infrastructure/di/container";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { verifyCustomerClaimSig } from "@/src/infrastructure/auth/customer-claim";
import { ClaimCustomerCardUseCase } from "@/src/application/use-cases/member/ClaimCustomerCardUseCase";
import { maskPhone } from "@/src/domain/services/customer-crm";
import { confirmCustomerClaimAction } from "@/src/presentation/actions/member-claim-actions";
import { Card } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";

export const dynamic = "force-dynamic";

/**
 * Customer-card claim page — the target of the QR on the staff customer page.
 * Shows who the card belongs to and links this device after ONE confirm tap
 * (GET never mutates; the bind happens in a server action).
 */
export default async function CustomerClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const t = await getTranslations("memberClaim");
  const code = (sp.code ?? "").trim();
  const sig = (sp.sig ?? "").trim();

  const valid = !sp.error && verifyCustomerClaimSig(slug, code, sig);
  const found = valid
    ? await new ClaimCustomerCardUseCase(
        container.shopRepository,
        container.customerRepository,
        container.customerDeviceRepository,
      ).lookup(slug, code)
    : null;

  const shell = (children: React.ReactNode) => (
    <main data-testid="member-claim" className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 p-4">
      <Card className="flex flex-col items-center gap-3 py-6 text-center">
        {children}
      </Card>
    </main>
  );

  if (!found || !found.ok) {
    return shell(
      <>
        <TriangleAlert className="size-10 text-warning" />
        <h1 className="text-lg font-bold text-foreground">
          {found && !found.ok && found.reason === "blocked" ? t("blockedTitle") : t("invalidTitle")}
        </h1>
        <p className="text-sm text-muted">{t("invalidDesc")}</p>
        <Link href={`/s/${slug}`} className="text-sm font-medium text-brand-700 hover:underline">
          {t("backToShop")}
        </Link>
      </>,
    );
  }

  const { customer } = found;
  const token = await getMemberToken(slug);
  const bound = token ? await container.customerDeviceRepository.findByToken(token) : null;
  const already = bound?.customer.id === customer.id;
  const shop = await container.shopRepository.findBySlug(slug);

  return shell(
    <>
      {already ? (
        <BadgeCheck className="size-10 text-success" />
      ) : (
        <Link2 className="size-10 text-brand-500" />
      )}
      <h1 className="text-lg font-bold text-foreground">
        {already ? t("alreadyTitle") : t("title", { shop: shop?.name ?? slug })}
      </h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-left text-sm">
        <dt className="text-muted">{t("name")}</dt>
        <dd className="font-medium text-foreground">{customer.displayName || "-"}</dd>
        <dt className="text-muted">{t("phone")}</dt>
        <dd className="font-medium text-foreground">{maskPhone(customer.phone)}</dd>
      </dl>
      {already ? (
        <Link
          href={`/s/${slug}/orders`}
          className="mt-2 block w-full rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-on-brand"
        >
          {t("openOrders")}
        </Link>
      ) : (
        <form action={confirmCustomerClaimAction} className="mt-2 flex w-full flex-col gap-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="sig" value={sig} />
          <p className="text-sm text-muted">{t("desc")}</p>
          <Button type="submit" size="lg" fullWidth data-testid="member-claim-confirm">
            <BadgeCheck className="size-5" />
            {t("confirm")}
          </Button>
        </form>
      )}
    </>,
  );
}
