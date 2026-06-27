import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Store,
  UserCog,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  QrCode,
  Banknote,
  CreditCard,
  Receipt,
  ListOrdered,
  History,
  UtensilsCrossed,
  Building2,
  Search,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/src/presentation/components/ui/Card";
import { Logo } from "@/src/presentation/components/layout/Logo";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { BRAND } from "@/src/config/brand";

export const metadata: Metadata = {
  title: `วิธีใช้งาน | ${BRAND.name}`,
  description: `คู่มือใช้งาน ${BRAND.name} แยกตามผู้ใช้ — ลูกค้าสั่งอาหารเองที่ร้าน, เจ้าของร้านตั้งค่าร้านและดูคิวออเดอร์, และพนักงานเปิดออเดอร์แทนลูกค้า`,
};

interface Step {
  icon: LucideIcon;
  title: string;
  detail: string;
}

interface Journey {
  id: string;
  label: string;
  title: string;
  icon: LucideIcon;
  intro: string;
  steps: Step[];
  cta?: { href: string; label: string };
}

const JOURNEYS: Journey[] = [
  {
    id: "customer",
    label: "ลูกค้า",
    title: "สำหรับลูกค้า",
    icon: Users,
    intro: "สั่งอาหารเองที่ร้านบนแท็บเล็ต — ไม่ต้องโหลดแอป ไม่ต้องสมัคร",
    steps: [
      {
        icon: Smartphone,
        title: "แตะแท็บเล็ตที่เคาน์เตอร์",
        detail: "เปิดเมนูร้านบนแท็บเล็ตที่ร้านวางไว้ แตะเพื่อดูรายการอาหาร",
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
        title: "อยากเก็บประวัติ? ใส่เบอร์มือถือ",
        detail:
          "ใส่ชื่อ+เบอร์ตอนสั่ง แล้วสแกน QR บนจอด้วยมือถือตัวเอง เพื่อเปิดดูประวัติการสั่งย้อนหลังได้",
      },
    ],
    cta: { href: "/me", label: "ดูประวัติการสั่งของฉัน" },
  },
  {
    id: "owner",
    label: "เจ้าของร้าน",
    title: "สำหรับเจ้าของร้าน",
    icon: Store,
    intro: "ตั้งค่าร้านให้พร้อมรับออเดอร์ แล้วดูแลคิวได้จากที่เดียว",
    steps: [
      {
        icon: UtensilsCrossed,
        title: "สร้างเมนู",
        detail:
          'ที่หน้า "เมนู" เพิ่มหมวดและรายการอาหาร พร้อมราคาและรูปภาพ',
      },
      {
        icon: QrCode,
        title: "ตั้ง PIN แล้วเปิดโหมด kiosk",
        detail:
          "ตั้งรหัส PIN ของเครื่อง แล้วเปิดโหมด kiosk บนแท็บเล็ตที่จะวางหน้าร้าน — ออกจากโหมดต้องใช้ PIN (กันออเดอร์ปลอม)",
      },
      {
        icon: Banknote,
        title: "ตั้งพร้อมเพย์รับเงิน",
        detail:
          "ใส่เบอร์/พร้อมเพย์ของร้าน ระบบจะสร้าง QR ให้ลูกค้าสแกนจ่ายอัตโนมัติ",
      },
      {
        icon: UserCog,
        title: "เพิ่มพนักงาน",
        detail: "สร้างบัญชีพนักงานสาขา ให้ช่วยเปิดออเดอร์แทนลูกค้าที่เคาน์เตอร์ได้",
      },
      {
        icon: Building2,
        title: "เพิ่มสาขา & ปักหมุดแผนที่",
        detail: "เพิ่มสาขาและตำแหน่ง เพื่อให้ลูกค้าเจอร้านบนแผนที่หน้าแรก",
      },
      {
        icon: Banknote,
        title: "เติมวันใช้งาน",
        detail:
          "ชำระผ่านพร้อมเพย์แล้วแนบสลิป รอผู้ดูแลอนุมัติ (ระบบคิดแบบเติมวัน วันที่เหลือไม่หมดอายุ)",
      },
      {
        icon: ListOrdered,
        title: "ดูคิวออเดอร์",
        detail:
          'ที่หน้า "ออเดอร์" ติดตามออเดอร์เข้าใหม่และอัปเดตสถานะ (รับออเดอร์ → กำลังทำ → พร้อมเสิร์ฟ → เสร็จ)',
      },
    ],
    cta: { href: "/login", label: "เข้าสู่ระบบเจ้าของร้าน" },
  },
  {
    id: "staff",
    label: "พนักงาน",
    title: "สำหรับพนักงาน",
    icon: UserCog,
    intro: "เปิดออเดอร์แทนลูกค้าที่เคาน์เตอร์ ทำได้ในไม่กี่วินาที",
    steps: [
      {
        icon: Search,
        title: "ค้นหา / เพิ่มลูกค้า",
        detail:
          "พิมพ์เบอร์หรือชื่อเพื่อเลือกลูกค้าเก่า หรือเพิ่มลูกค้าใหม่ — หรือข้ามไปเลยถ้าเป็นลูกค้าขาจร",
      },
      {
        icon: ShoppingBag,
        title: "เลือกเมนูใส่ตะกร้า",
        detail: "แตะรายการอาหารและปรับจำนวนในตะกร้าให้ตรงกับที่ลูกค้าสั่ง",
      },
      {
        icon: CreditCard,
        title: "รับชำระเงิน",
        detail: "เลือกพร้อมเพย์ QR หรือเงินสด แล้วยืนยันเมื่อรับเงินเรียบร้อย",
      },
      {
        icon: Receipt,
        title: "ส่งเลขคิวให้ลูกค้า",
        detail: "ระบบออกเลขคิวให้อัตโนมัติ แจ้งลูกค้ารอรับอาหารได้เลย",
      },
      {
        icon: QrCode,
        title: "ออก QR ประวัติ (ถ้าลูกค้าต้องการ)",
        detail:
          'ถ้าลูกค้าใส่เบอร์ไว้ ให้สแกน QR บนจอเพื่อผูกอุปกรณ์ ลูกค้าจะดูประวัติการสั่งบนมือถือเองได้',
      },
    ],
  },
];

export default function TutorialPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-10">
      {/* Hero */}
      <header className="flex flex-col items-center gap-3 text-center">
        <Logo className="size-14 rounded-2xl" />
        <h1 className="text-2xl font-bold text-brand-700 sm:text-3xl">
          วิธีใช้งาน {BRAND.name}
        </h1>
        <p className="max-w-md text-sm text-muted">
          คู่มือใช้งานแยกตามผู้ใช้ — เลือกหัวข้อที่ตรงกับคุณได้เลย
        </p>
        {/* Jump menu */}
        <nav className="mt-1 flex flex-wrap justify-center gap-2">
          {JOURNEYS.map((j) => {
            const Icon = j.icon;
            return (
              <a
                key={j.id}
                href={`#${j.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-brand-100 hover:text-brand-700"
              >
                <Icon className="size-4" />
                {j.label}
              </a>
            );
          })}
        </nav>
      </header>

      {/* Sample queue ticket visual */}
      <div className="mx-auto flex flex-col items-center rounded-2xl bg-card p-5 text-center shadow-sm ring-1 ring-border">
        <p className="mb-1 text-sm font-medium text-brand-700">ตัวอย่างบัตรคิว</p>
        <p className="text-6xl font-extrabold text-brand-600">12</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <ListOrdered className="size-3.5" />
          กำลังเตรียมอาหาร
        </p>
      </div>

      {/* Journeys */}
      {JOURNEYS.map((j) => {
        const Icon = j.icon;
        return (
          <section
            key={j.id}
            id={j.id}
            className="flex scroll-mt-4 flex-col gap-4"
          >
            <div>
              <h2 className="inline-flex items-center gap-2 text-xl font-bold text-foreground">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon className="size-5" />
                </span>
                {j.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{j.intro}</p>
            </div>

            <ol className="flex flex-col gap-3">
              {j.steps.map((s, i) => {
                const StepIcon = s.icon;
                return (
                  <li key={s.title}>
                    <Card className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-on-brand shadow-sm">
                        {i + 1}
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                          <StepIcon className="size-4 shrink-0 text-brand-500" />
                          {s.title}
                        </h3>
                        <p className="text-sm text-muted">{s.detail}</p>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ol>

            {j.cta && (
              <Link
                href={j.cta.href}
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-on-brand shadow-sm transition hover:bg-brand-600"
              >
                {j.cta.label}
                <ArrowRight className="size-4" />
              </Link>
            )}
          </section>
        );
      })}

      {/* Footer */}
      <footer className="flex flex-col items-center gap-2 pb-4 pt-2">
        <Link
          href="/info"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          เกี่ยวกับ {BRAND.name}
        </Link>
        <AppVersion />
      </footer>
    </main>
  );
}
