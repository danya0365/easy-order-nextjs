import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { RiderPayoutSummaryUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { RidersManager } from "@/src/presentation/components/rider/RidersManager";
import { Card } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { satangToBaht } from "@/src/presentation/lib/money";

export const dynamic = "force-dynamic";

/** YYYY-MM-DD (Bangkok) for an instant. */
function bkkDate(d: Date): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}
/** 00:00 Bangkok of a YYYY-MM-DD as UTC ISO. */
function bkkStartISO(ymd: string): string {
  return new Date(`${ymd}T00:00:00+07:00`).toISOString();
}
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function ShopRidersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { shopId } = await requireShopAccess();
  const sp = await searchParams;
  const today = bkkDate(new Date());
  const from = sp.from && YMD.test(sp.from) ? sp.from : today;
  const to = sp.to && YMD.test(sp.to) && sp.to >= from ? sp.to : from;
  const toExclusive = new Date(new Date(bkkStartISO(to)).getTime() + 86400_000).toISOString();

  const [riders, payouts] = await Promise.all([
    container.riderRepository.listByShop(shopId),
    new RiderPayoutSummaryUseCase(container.riderRepository).execute(
      shopId,
      bkkStartISO(from),
      toExclusive,
    ),
  ]);
  const total = payouts.reduce(
    (s, r) => ({
      trips: s.trips + r.trips,
      commission: s.commission + r.commissionSatang,
      cod: s.cod + r.codCollectedSatang,
    }),
    { trips: 0, commission: 0, cod: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">ไรเดอร์ของร้าน</h1>
        <p className="mt-0.5 text-sm text-muted">
          จัดการคนส่งของร้าน ส่งลิงก์ส่วนตัวให้ไรเดอร์เปิดดูงานได้โดยไม่ต้องล็อกอิน
        </p>
      </div>

      <RidersManager riders={riders} />

      <Card>
        <h2 className="font-semibold text-foreground">สรุปค่าตอบแทนไรเดอร์</h2>
        <p className="text-xs text-muted">เพื่อดูยอดเท่านั้น — ร้านจ่ายเงินไรเดอร์เอง</p>
        <form method="get" className="mt-3 flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1 text-muted">
            ตั้งแต่
            <input type="date" name="from" defaultValue={from} className="rounded-lg border border-border bg-card px-2 py-1 text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-muted">
            ถึง
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-border bg-card px-2 py-1 text-foreground" />
          </label>
          <Button type="submit" size="sm" variant="outline">ดูสรุป</Button>
        </form>
        {payouts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">ยังไม่มีงานที่ส่งสำเร็จในช่วงนี้</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table data-testid="rider-payouts" className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 pr-2">ไรเดอร์</th>
                  <th className="py-1 pr-2 text-right">เที่ยว</th>
                  <th className="py-1 pr-2 text-right">ค่าตอบแทน</th>
                  <th className="py-1 text-right">เก็บเงินปลายทาง</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.riderId} className="border-t border-border text-foreground">
                    <td className="py-1.5 pr-2">{p.riderName}</td>
                    <td className="py-1.5 pr-2 text-right">{p.trips}</td>
                    <td className="py-1.5 pr-2 text-right">{satangToBaht(p.commissionSatang)}</td>
                    <td className="py-1.5 text-right">{satangToBaht(p.codCollectedSatang)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border font-semibold text-foreground">
                  <td className="py-1.5 pr-2">รวม</td>
                  <td className="py-1.5 pr-2 text-right">{total.trips}</td>
                  <td className="py-1.5 pr-2 text-right">{satangToBaht(total.commission)}</td>
                  <td className="py-1.5 text-right">{satangToBaht(total.cod)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
