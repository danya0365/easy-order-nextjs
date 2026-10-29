import { requireCrmView } from "@/src/infrastructure/auth/crm-access";
import { CustomerDetailView } from "@/src/presentation/views/customers/CustomerDetailView";

export const dynamic = "force-dynamic";

// NOTE: no loading.tsx may wrap this segment — notFound() must run before the
// response streams so cross-shop / unknown ids get a real HTTP 404.
export default async function StaffCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const access = await requireCrmView("staff");
  return <CustomerDetailView access={access} id={id} sp={sp} />;
}
