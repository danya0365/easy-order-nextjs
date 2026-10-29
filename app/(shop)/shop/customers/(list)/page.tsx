import { requireCrmView } from "@/src/infrastructure/auth/crm-access";
import { CustomersListView } from "@/src/presentation/views/customers/CustomersListView";

export const dynamic = "force-dynamic";

export default async function ShopCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const access = await requireCrmView("owner");
  return <CustomersListView access={access} sp={await searchParams} />;
}
