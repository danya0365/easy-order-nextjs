import { redirect } from "next/navigation";

/** The old top-up / daily-fee billing page is retired — billing is the prepaid credit wallet. */
export default function ShopBillingRedirect() {
  redirect("/shop/credit");
}
