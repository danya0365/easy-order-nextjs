import { redirect } from "next/navigation";

/** Old per-shop daily-fee page retired — the shop's credit wallet + daily settlements replace it. */
export default async function AdminShopBillingRedirect({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  redirect(`/admin/credit/shops/${shopId}`);
}
