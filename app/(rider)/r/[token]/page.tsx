import type { Metadata } from "next";
import { Banknote, Bike, CheckCircle2, MapPin, Package, Phone } from "lucide-react";

import { container } from "@/src/infrastructure/di/container";
import { GetRiderDashboardUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { satangToBaht } from "@/src/presentation/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "งานส่งของ",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const ERR: Record<string, string> = {
  failed: "ทำรายการไม่สำเร็จ กรุณาลองใหม่",
};

/** Rider's personal job page — no login; the URL token is the credential. */
export default async function RiderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { token } = await params;
  const { e } = await searchParams;
  const dash = await new GetRiderDashboardUseCase(
    container.riderRepository,
    container.orderRepository,
  ).execute(token);
  const shop = dash ? await container.shopRepository.findById(dash.rider.shopId) : null;

  if (!dash) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-2 px-4 text-center">
        <Bike className="size-10 text-muted" />
        <h1 className="text-lg font-bold text-foreground">ลิงก์ไม่ถูกต้องหรือถูกยกเลิกแล้ว</h1>
        <p className="text-sm text-muted">กรุณาขอลิงก์ใหม่จากร้าน</p>
      </main>
    );
  }

  const action = `/r/${token}/update`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-5">
      <header>
        <p className="text-xs text-muted">{shop?.name}</p>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Bike className="size-5" /> งานส่งของ · {dash.rider.name}
        </h1>
      </header>

      {e && ERR[e] && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{ERR[e]}</p>
      )}

      <section className="grid grid-cols-3 gap-2 rounded-xl bg-card p-3 text-center ring-1 ring-border" data-testid="rider-today">
        <div>
          <p className="text-xs text-muted">ส่งวันนี้</p>
          <p className="text-lg font-bold text-foreground">{dash.today.trips}</p>
        </div>
        <div>
          <p className="text-xs text-muted">รายได้วันนี้</p>
          <p className="text-lg font-bold text-foreground">{satangToBaht(dash.today.commissionSatang)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">เงินสดที่เก็บ</p>
          <p className="text-lg font-bold text-foreground">{satangToBaht(dash.today.codCollectedSatang)}</p>
        </div>
      </section>

      {dash.jobs.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">ยังไม่มีงานที่ต้องส่ง</p>
      ) : (
        dash.jobs.map((o) => {
          const cod = o.paymentMethod === "cash" && o.paymentStatus !== "paid";
          return (
            <article key={o.id} className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-border" data-testid="rider-job">
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-foreground">#{o.orderNo}</p>
                <span className="rounded-full bg-muted-surface px-2 py-0.5 text-xs text-foreground">
                  {o.deliveryStatus === "picked_up" ? "กำลังไปส่ง" : "รอรับของที่ร้าน"}
                </span>
              </div>
              <ul className="text-sm text-foreground">
                {o.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-1">
                    <Package className="size-3.5 shrink-0 text-muted" /> {it.nameSnapshot} ×{it.quantity}
                  </li>
                ))}
              </ul>
              {o.note && <p className="text-sm text-muted">หมายเหตุ: {o.note}</p>}
              <div className="text-sm text-foreground">
                <p>{o.customerName ?? "ลูกค้า"}</p>
                {o.customerPhone && (
                  <a href={`tel:${o.customerPhone}`} className="inline-flex items-center gap-1 font-medium text-brand-700 underline">
                    <Phone className="size-4" /> {o.customerPhone}
                  </a>
                )}
              </div>
              {o.deliveryAddress && (
                <div className="text-sm text-foreground">
                  <p>{o.deliveryAddress}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.deliveryAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand-700 underline"
                  >
                    <MapPin className="size-4" /> เปิดใน Google Maps
                  </a>
                </div>
              )}
              <p className="text-sm font-semibold text-foreground">
                ยอด {satangToBaht(o.totalSatang)} ·{" "}
                {o.paymentStatus === "paid" ? "จ่ายแล้ว" : o.paymentMethod === "cash" ? "เก็บเงินปลายทาง" : "ยังไม่จ่าย (โอน)"}
              </p>
              <div className="flex flex-wrap gap-2">
                {o.deliveryStatus === "assigned" && (
                  <form method="post" action={action}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="do" value="picked_up" />
                    <button className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-on-brand">
                      <Package className="size-4" /> รับของแล้ว
                    </button>
                  </form>
                )}
                {o.deliveryStatus === "picked_up" && (
                  <form method="post" action={action}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="do" value="delivered" />
                    <button className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-on-brand">
                      <CheckCircle2 className="size-4" /> ส่งแล้ว
                    </button>
                  </form>
                )}
                {cod && !o.codCollected && (
                  <form method="post" action={action}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="do" value="cod" />
                    <button className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 font-semibold text-foreground">
                      <Banknote className="size-4" /> เก็บเงินแล้ว
                    </button>
                  </form>
                )}
                {o.codCollected && (
                  <span className="inline-flex items-center gap-1 text-sm text-foreground">
                    <Banknote className="size-4" /> เก็บเงินแล้ว
                  </span>
                )}
              </div>
            </article>
          );
        })
      )}
    </main>
  );
}
