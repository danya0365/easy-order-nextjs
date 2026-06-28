import { container } from "@/src/infrastructure/di/container";
import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { ExportCustomerDataUseCase } from "@/src/application/use-cases/customer/ExportCustomerDataUseCase";

/**
 * PDPA data export: download everything the shop holds about ONE of its
 * customers as JSON. Auth-gated to the shop (the use case scopes every read by
 * the session's shopId, so a shop can only export its own customers).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const { shopId } = await requireShopAccess();

  try {
    const data = await new ExportCustomerDataUseCase(
      container.shopRepository,
      container.customerRepository,
      container.orderRepository,
    ).execute(shopId, customerId);

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="customer-${customerId}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
