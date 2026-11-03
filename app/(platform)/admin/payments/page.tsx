import { redirect } from "next/navigation";

/** Old subscription payment-slip queue retired — credit top-ups are reviewed in /admin/credit/topups. */
export default function AdminPaymentsRedirect() {
  redirect("/admin/credit/topups");
}
