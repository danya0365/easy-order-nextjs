import type { Metadata } from "next";
import Link from "next/link";
import {
  Store,
  Camera,
  Target,
  Gift,
  Banknote,
  Bell,
  Users,
  ShoppingBag,
  Smartphone,
  Zap,
  PartyPopper,
  Wallet,
  Coffee,
  Ticket,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { StampDots } from "@/src/presentation/components/ui/StampDots";
import { BRAND } from "@/src/config/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description:
    "บัตรสะสมแสตมป์ออนไลน์สำหรับร้านค้าหลายสาขา — ลูกค้าสะสมแต้มไม่ต้องพกบัตร ร้านค้าจัดการง่ายในที่เดียว",
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
    icon: Camera,
    title: "เพิ่มแต้มเร็ว",
    blurb: "สแกน QR จากมือถือลูกค้า ไม่ต้องพิมพ์เบอร์ทุกครั้ง กดเพิ่มแต้มได้ทันที",
    badge: "สแกนแล้วจบ",
    tone: "success",
  },
  {
    icon: Target,
    title: "ตั้งเกณฑ์ + รางวัลเอง",
    blurb: "กำหนดจำนวนดวงที่ต้องสะสมและของรางวัลได้เองในแต่ละร้าน",
    badge: "ยืดหยุ่น",
    tone: "brand",
  },
  {
    icon: Gift,
    title: "แลกรางวัล + ประวัติ",
    blurb: "กดปุ่มแลกรางวัลเมื่อลูกค้าสะสมครบ เก็บประวัติการให้/แลกแต้มทุกครั้ง",
    badge: "มี ledger",
    tone: "neutral",
  },
  {
    icon: Banknote,
    title: "ค่าบริการรายเดือน",
    blurb: "จ่ายผ่าน PromptPay QR แล้วอัปโหลดสลิป แอดมินตรวจสอบและเปิดใช้งานให้",
    badge: "PromptPay",
    tone: "success",
  },
  {
    icon: Bell,
    title: "เตือนค้างชำระอัตโนมัติ",
    blurb: "แจ้งเตือนในแอปเมื่อใกล้/เลยกำหนด และระงับการใช้งานอัตโนมัติหลัง 7 วัน",
    badge: "อัตโนมัติ",
    tone: "warning",
  },
  {
    icon: Users,
    title: "3 บทบาทผู้ใช้",
    blurb: "แอดมินดูแลระบบ · เจ้าของร้านจัดการร้าน · พนักงานสาขาเพิ่ม/แลกแต้ม",
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
    icon: ShoppingBag,
    title: "ซื้อของที่ร้าน",
    detail: "พนักงานเพิ่มแต้มให้ตามยอดซื้อ — คุณไม่ต้องพกบัตรหรือสมัครอะไร",
  },
  {
    icon: Smartphone,
    title: "สแกน QR ครั้งแรก",
    detail:
      "สแกน QR ที่ร้านด้วยกล้องมือถือ เพื่อผูกบัตรกับเครื่องของคุณ (กันคนอื่นสวมสิทธิ)",
  },
  {
    icon: Zap,
    title: "กลับมาอีกครั้ง แค่สแกน",
    detail: "ครั้งต่อไปแค่สแกน QR ที่ร้าน บัตรเปิดทันที ไม่ต้องติดตั้งหรือจำ URL",
  },
  {
    icon: PartyPopper,
    title: "สะสมครบ แลกรางวัล",
    detail: "เมื่อแต้มครบตามเกณฑ์ แจ้งพนักงานเพื่อแลกของรางวัลได้เลย",
  },
  {
    icon: Wallet,
    title: "ใช้หลายร้าน รวมที่เดียว",
    detail: 'หน้า "บัตรของฉัน" รวมบัตรทุกร้านบนเครื่องนี้ และเพิ่มลงหน้าจอหลักได้',
  },
];

export default function InfoPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-4 py-10">
      {/* Hero */}
      <header className="flex flex-col items-center gap-4 text-center">
        <Coffee className="size-10 text-brand-500" />
        <h1 className="text-3xl font-bold text-brand-700">{BRAND.name}</h1>
        <p className="max-w-md text-muted">
          บัตรสะสมแสตมป์ออนไลน์สำหรับร้านค้าหลายสาขา — ลูกค้าสะสมแต้มไม่ต้องพกบัตร
          ร้านค้าจัดการง่ายในที่เดียว
        </p>
        <div className="mt-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
          <p className="mb-2 text-sm font-medium text-brand-700">ตัวอย่างบัตร</p>
          <StampDots current={7} threshold={10} size="md" />
          <p className="mt-2 text-xs text-muted">สะสม 7/10 · อีก 3 ดวงครบรางวัล</p>
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
            วิธีสะสมแต้ม
            <Ticket className="size-5 text-brand-500" />
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
          <Wallet className="size-4" />
          ดูบัตรสะสมแต้มของฉัน
        </Link>
        <Link href="/privacy" className="text-xs text-muted hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </footer>
    </main>
  );
}
