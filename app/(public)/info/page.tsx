import type { Metadata } from "next";
import Link from "next/link";
import {
  Store,
  UtensilsCrossed,
  Smartphone,
  QrCode,
  ListOrdered,
  Users,
  History,
  ShoppingCart,
  CreditCard,
  Receipt,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { BRAND } from "@/src/config/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description:
    "ระบบสั่งอาหารหน้าร้านบนแท็บเล็ต — ลูกค้ากดเลือกเมนูและสั่งเอง จ่ายด้วย PromptPay QR หรือเงินสด ร้านจัดการคิวออเดอร์ง่ายในที่เดียว",
};

interface Feature {
  icon: LucideIcon;
  title: string;
  blurb: string;
  badge: string;
  tone: "brand" | "success" | "warning" | "neutral";
}

const SHOP_FEATURES: Feature[] = [
  {
    icon: Store,
    title: "หลายร้าน หลายสาขา",
    blurb: "เปิดได้หลายร้านในระบบเดียว แต่ละร้านมีสาขาของตัวเอง แยกข้อมูลชัดเจน",
    badge: "Multi-shop",
    tone: "brand",
  },
  {
    icon: UtensilsCrossed,
    title: "จัดการเมนูเอง",
    blurb: "เพิ่มหมวดและรายการอาหาร พร้อมราคาและรูปภาพ แก้ไขได้ตลอดเวลา",
    badge: "เมนู",
    tone: "success",
  },
  {
    icon: Smartphone,
    title: "ลูกค้าสั่งเองบนแท็บเล็ต",
    blurb: "วางแท็บเล็ตโหมด kiosk ที่เคาน์เตอร์ ลูกค้ากดสั่งเองได้ ไม่ต้องรอพนักงาน",
    badge: "Self-order",
    tone: "brand",
  },
  {
    icon: QrCode,
    title: "จ่าย PromptPay หรือเงินสด",
    blurb: "โชว์ QR พร้อมเพย์ให้ลูกค้าสแกนจ่าย แล้วกดยืนยันรับเงิน หรือรับเงินสดก็ได้",
    badge: "PromptPay",
    tone: "success",
  },
  {
    icon: ListOrdered,
    title: "คิวออเดอร์แบบสด",
    blurb: "เห็นออเดอร์เข้าใหม่ทันที อัปเดตสถานะ รับออเดอร์ → กำลังทำ → พร้อมเสิร์ฟ → เสร็จ",
    badge: "Live queue",
    tone: "neutral",
  },
  {
    icon: Users,
    title: "3 บทบาทผู้ใช้",
    blurb: "แอดมินดูแลระบบ · เจ้าของร้านจัดการร้าน · พนักงานสาขาเปิดออเดอร์",
    badge: "แยกสิทธิ์",
    tone: "brand",
  },
];

interface Step {
  icon: LucideIcon;
  title: string;
  detail: string;
}

const CUSTOMER_STEPS: Step[] = [
  {
    icon: Smartphone,
    title: "แตะแท็บเล็ตที่ร้าน",
    detail: "เปิดเมนูบนแท็บเล็ตที่เคาน์เตอร์ — ไม่ต้องโหลดแอปหรือสมัครอะไร",
  },
  {
    icon: ShoppingCart,
    title: "เลือกเมนูใส่ตะกร้า",
    detail: "แตะ + เพื่อเพิ่มจำนวน ปรับรายการในตะกร้าได้ตามต้องการ",
  },
  {
    icon: CreditCard,
    title: "ชำระเงิน",
    detail: "เลือกจ่ายด้วย PromptPay QR หรือเงินสด ตามที่ร้านรองรับ",
  },
  {
    icon: Receipt,
    title: "รับหมายเลขคิว",
    detail: "ได้เลขคิวทันทีหลังสั่ง รอเรียกรับอาหารได้เลย",
  },
  {
    icon: History,
    title: "เก็บประวัติได้ (ถ้าต้องการ)",
    detail: "ใส่ชื่อ+เบอร์แล้วสแกน QR บนจอ เพื่อดูประวัติการสั่งบนมือถือตัวเอง",
  },
];

export default function InfoPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-4 py-10">
      {/* Hero */}
      <header className="flex flex-col items-center gap-4 text-center">
        <UtensilsCrossed className="size-10 text-brand-500" />
        <h1 className="text-3xl font-bold text-brand-700">{BRAND.name}</h1>
        <p className="max-w-md text-muted">
          ระบบสั่งอาหารหน้าร้านบนแท็บเล็ต — ลูกค้ากดเลือกเมนูและสั่งเอง
          จ่ายด้วย PromptPay QR หรือเงินสด ร้านจัดการคิวออเดอร์ง่ายในที่เดียว
        </p>
        <div className="mt-2 flex flex-col items-center rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
          <p className="mb-1 text-sm font-medium text-brand-700">ตัวอย่างบัตรคิว</p>
          <p className="text-5xl font-extrabold text-brand-600">12</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <ListOrdered className="size-3.5" />
            กำลังเตรียมอาหาร
          </p>
        </div>
        <Link
          href="/tutorial"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-muted-surface"
        >
          <BookOpen className="size-4" />
          ดูคู่มือการใช้งานแบบละเอียด
        </Link>
      </header>

      {/* Section A — for shops */}
      <section className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            สำหรับร้านค้า
            <Store className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">
            ทุกอย่างที่ร้านต้องใช้ ครบในระบบเดียว
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SHOP_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Icon className="size-7 text-brand-500" />
                  <Badge tone={f.tone}>{f.badge}</Badge>
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted">{f.blurb}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section B — for customers */}
      <section className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            วิธีสั่งอาหาร
            <Receipt className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">สำหรับลูกค้า — ง่ายใน 5 ขั้นตอน</p>
        </div>
        <ol className="flex flex-col gap-3">
          {CUSTOMER_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title}>
                <Card className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-on-brand shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Icon className="size-4 text-brand-500" />
                      {s.title}
                    </h3>
                    <p className="text-sm text-muted">{s.detail}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* CTAs */}
      <footer className="flex flex-col items-center gap-3 pb-4">
        <Link
          href="/login"
          className="w-full max-w-xs rounded-full bg-brand-500 px-6 py-3 text-center font-medium text-on-brand shadow-sm transition hover:bg-brand-600"
        >
          เข้าสู่ระบบผู้ดูแล
        </Link>
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <History className="size-4" />
          ดูประวัติการสั่งของฉัน
        </Link>
        <Link href="/privacy" className="text-xs text-muted hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </footer>
    </main>
  );
}
