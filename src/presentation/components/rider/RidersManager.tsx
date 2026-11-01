"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, Copy, Link2, Pencil, Plus, RefreshCw } from "lucide-react";

import type { Rider, RiderCommissionType } from "@/src/domain/entities";
import {
  regenerateRiderLinkAction,
  saveRiderAction,
} from "@/src/presentation/actions/rider-actions";
import { Card } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Input } from "@/src/presentation/components/ui/Input";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { useToast } from "@/src/presentation/components/ui/Toast";

const TYPE_LABEL: Record<RiderCommissionType, string> = {
  per_trip: "ต่อเที่ยว (บาท)",
  percent_fee: "% ของค่าส่ง",
  full_fee: "ได้ค่าส่งเต็ม",
};

function commissionText(r: Rider): string {
  if (r.commissionType === "per_trip") return `${(r.commissionValue / 100).toLocaleString("th-TH")} บาท/เที่ยว`;
  if (r.commissionType === "percent_fee") return `${r.commissionValue}% ของค่าส่ง`;
  return "ค่าส่งเต็มจำนวน";
}

interface FormState {
  id: string | null;
  name: string;
  phone: string;
  commissionType: RiderCommissionType;
  commissionValue: string;
  active: boolean;
}

const EMPTY: FormState = {
  id: null,
  name: "",
  phone: "",
  commissionType: "per_trip",
  commissionValue: "",
  active: true,
};

export function RidersManager({ riders }: { riders: Rider[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [link, setLink] = useState<{ riderId: string; url: string } | null>(null);

  function edit(r: Rider) {
    setForm({
      id: r.id,
      name: r.name,
      phone: r.phone,
      commissionType: r.commissionType,
      commissionValue:
        r.commissionType === "per_trip" ? String(r.commissionValue / 100) : String(r.commissionValue),
      active: r.active,
    });
  }

  function save() {
    if (!form) return;
    start(async () => {
      const res = await saveRiderAction(form.id, {
        name: form.name,
        phone: form.phone,
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue) || 0,
        active: form.active,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("บันทึกแล้ว");
        setForm(null);
        router.refresh();
      }
    });
  }

  function regenerate(r: Rider) {
    if (r.hasLink && !confirm("สร้างลิงก์ใหม่? ลิงก์เดิมจะใช้ไม่ได้ทันที")) return;
    start(async () => {
      const res = await regenerateRiderLinkAction(r.id);
      if (res.error || !res.url) toast.error(res.error ?? "เกิดข้อผิดพลาด");
      else {
        setLink({ riderId: r.id, url: res.url });
        router.refresh();
      }
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("คัดลอกลิงก์แล้ว");
    } catch {
      toast.error("คัดลอกไม่ได้ กรุณากดค้างที่ลิงก์เพื่อคัดลอก");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button onClick={() => setForm({ ...EMPTY })} disabled={pending}>
          <Plus className="size-4" />
          เพิ่มไรเดอร์
        </Button>
      </div>

      {form && (
        <Card>
          <p className="mb-3 font-semibold text-foreground">
            {form.id ? "แก้ไขไรเดอร์" : "เพิ่มไรเดอร์"}
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-foreground">
              ชื่อ
              <Input name="riderName" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              เบอร์โทร
              <Input name="riderPhone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              รูปแบบค่าตอบแทน
              <select
                name="commissionType"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                value={form.commissionType}
                onChange={(e) => setForm({ ...form, commissionType: e.target.value as RiderCommissionType })}
              >
                {(Object.keys(TYPE_LABEL) as RiderCommissionType[]).map((k) => (
                  <option key={k} value={k}>{TYPE_LABEL[k]}</option>
                ))}
              </select>
            </label>
            {form.commissionType !== "full_fee" && (
              <label className="flex flex-col gap-1 text-sm text-foreground">
                {form.commissionType === "per_trip" ? "บาทต่อเที่ยว" : "เปอร์เซ็นต์ของค่าส่ง"}
                <Input name="commissionValue" type="number" min={0} inputMode="decimal" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: e.target.value })} />
              </label>
            )}
            {form.id && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                เปิดใช้งาน (ปิด = ลิงก์ของไรเดอร์ใช้ไม่ได้)
              </label>
            )}
            <div className="flex gap-2">
              <Button onClick={save} disabled={pending}>บันทึก</Button>
              <Button variant="ghost" onClick={() => setForm(null)} disabled={pending}>ยกเลิก</Button>
            </div>
          </div>
        </Card>
      )}

      {riders.length === 0 ? (
        <EmptyState icon={<Bike />} title="ยังไม่มีไรเดอร์" description="เพิ่มไรเดอร์ของร้าน แล้วส่งลิงก์ส่วนตัวให้เขาเปิดดูงาน" />
      ) : (
        riders.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{r.name}</p>
                <p className="text-sm text-muted">{r.phone} · {commissionText(r)}</p>
              </div>
              <Badge tone={r.active ? "success" : "neutral"}>{r.active ? "ใช้งาน" : "ปิดใช้งาน"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(r)} disabled={pending}>
                <Pencil className="size-4" />
                แก้ไข
              </Button>
              {r.active && (
                <Button size="sm" variant="outline" onClick={() => regenerate(r)} disabled={pending}>
                  {r.hasLink ? <RefreshCw className="size-4" /> : <Link2 className="size-4" />}
                  {r.hasLink ? "สร้างลิงก์ใหม่" : "สร้างลิงก์ไรเดอร์"}
                </Button>
              )}
            </div>
            {link?.riderId === r.id && (
              <div className="mt-3 rounded-lg bg-muted-surface p-3 text-sm">
                <p className="mb-1 text-muted">ลิงก์ส่วนตัว (แสดงครั้งเดียว — ส่งให้ไรเดอร์ทางไลน์):</p>
                <p data-testid="rider-link" className="break-all font-mono text-xs text-foreground">{link.url}</p>
                <Button size="sm" className="mt-2" onClick={() => copy(link.url)}>
                  <Copy className="size-4" />
                  คัดลอกลิงก์
                </Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
