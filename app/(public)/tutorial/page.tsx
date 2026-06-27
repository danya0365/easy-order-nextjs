import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Store,
  UserCog,
  ShoppingBag,
  Smartphone,
  Zap,
  PartyPopper,
  Wallet,
  Target,
  QrCode,
  Building2,
  Banknote,
  BarChart3,
  Settings,
  Search,
  Stamp,
  Gift,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/src/presentation/components/ui/Card";
import { StampDots } from "@/src/presentation/components/ui/StampDots";
import { Logo } from "@/src/presentation/components/layout/Logo";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { BRAND } from "@/src/config/brand";

export const metadata: Metadata = {
  title: `วิธีใช้งาน | ${BRAND.name}`,
  description: `คู่มือใช้งาน ${BRAND.name} แยกตามผู้ใช้ — ลูกค้าสะสมแต้ม, เจ้าของร้านตั้งค่าร้าน, และพนักงานกดแสตมป์/แลกรางวัล`,
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
    intro: "สะสมแต้มง่ายๆ ไม่ต้องพกบัตร ไม่ต้องติดตั้งแอป",
    steps: [
      {
        icon: ShoppingBag,
        title: "ซื้อของที่ร้าน",
        detail: "พนักงานเพิ่มแต้มให้ตามยอดซื้อหรือเงื่อนไขของร้าน",
      },
      {
        icon: Smartphone,
        title: "สแกน QR ครั้งแรก เพื่อผูกบัตร",
        detail:
          "สแกนป้าย QR ที่ร้านด้วยกล้องมือถือ เพื่อผูกบัตรกับเครื่องของคุณ (กันคนอื่นสวมสิทธิ)",
      },
      {
        icon: Zap,
        title: "กลับมาอีกครั้ง แค่สแกน",
        detail:
          "ครั้งต่อไปเปิดบัตรง่ายๆ แค่สแกน QR ที่ร้าน บัตรเปิดทันที ไม่ต้องติดตั้งหรือจำ URL",
      },
      {
        icon: PartyPopper,
        title: "สะสมครบ แลกรางวัล",
        detail:
          'เมื่อแต้มครบเกณฑ์ บัตรขึ้นป้าย "ครบ แลกได้" แจ้งพนักงานเพื่อรับของรางวัลได้เลย',
      },
      {
        icon: Wallet,
        title: "รวมบัตรทุกร้านที่เดียว",
        detail: 'เปิดหน้า "บัตรของฉัน" ดูทุกร้านที่คุณสะสมอยู่บนเครื่องนี้',
      },
    ],
    cta: { href: "/me", label: "ดูบัตรของฉัน" },
  },
  {
    id: "owner",
    label: "เจ้าของร้าน",
    title: "สำหรับเจ้าของร้าน",
    icon: Store,
    intro: "ตั้งค่าร้านให้พร้อมรับลูกค้าใน 6 ขั้นตอน แล้วดูแลร้านได้จากที่เดียว",
    steps: [
      {
        icon: Target,
        title: "ตั้งประเภทแสตมป์ & ของรางวัล",
        detail:
          'ที่ ตั้งค่า › "แสตมป์ & ร้านค้า" กำหนดจำนวนดวงที่ครบและของรางวัล (รองรับหลายประเภท)',
      },
      {
        icon: QrCode,
        title: "พิมพ์ป้าย QR ติดหน้าร้าน",
        detail:
          'เปิด "ป้าย QR ร้าน" แล้วพิมพ์ติดที่เคาน์เตอร์ ให้ลูกค้าสแกนสมัครและเช็กแต้มเอง',
      },
      {
        icon: UserCog,
        title: "เพิ่มพนักงาน",
        detail: "สร้างบัญชีพนักงานสาขา ให้ช่วยกดแสตมป์/แลกรางวัลที่เคาน์เตอร์",
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
        icon: BarChart3,
        title: "ดูสถิติร้าน",
        detail: "ยอดแสตมป์ ลูกค้าใหม่ และอัตราการแลกรางวัล เลือกช่วง 7/30/90 วัน",
      },
      {
        icon: Settings,
        title: "เกร็ดเพิ่มเติม",
        detail:
          "ปิดร้านชั่วคราวได้โดยวันใช้งานไม่ถูกหัก และเชื่อม LINE เพื่อรับการแจ้งเตือน + เข้าสู่ระบบด้วย OTP",
      },
    ],
    cta: { href: "/login", label: "เข้าสู่ระบบเจ้าของร้าน" },
  },
  {
    id: "staff",
    label: "พนักงาน",
    title: "สำหรับพนักงาน",
    icon: UserCog,
    intro: "กดแสตมป์และแลกรางวัลให้ลูกค้าที่เคาน์เตอร์ ทำได้ในไม่กี่วินาที",
    steps: [
      {
        icon: Search,
        title: "ค้นหาลูกค้า",
        detail: 'กรอกเบอร์โทรแล้วกด "ค้นหา" หรือกดสแกน QR ของลูกค้าด้วยกล้อง',
      },
      {
        icon: Stamp,
        title: "เพิ่มแสตมป์",
        detail:
          'เลือกประเภท (ถ้ามีหลายแบบ) ใส่จำนวน แล้วกด "เพิ่มแสตมป์"',
      },
      {
        icon: Smartphone,
        title: "ลูกค้าใหม่ไม่ต้องสมัครก่อน",
        detail: 'ถ้ายังไม่มีบัตร แค่กด "เพิ่มแสตมป์" ระบบจะสร้างบัตรให้อัตโนมัติ',
      },
      {
        icon: QrCode,
        title: "ออก QR ผูกบัตร",
        detail:
          'กด "ออก QR ผูกบัตร" ให้ลูกค้าสแกนด้วยมือถือภายใน 5 นาที เพื่อดูแต้มเอง',
      },
      {
        icon: Gift,
        title: "แลกรางวัล",
        detail: 'เมื่อบัตรขึ้น "ครบ แลกได้" กดปุ่ม "แลกรางวัล" ตามประเภทที่ครบ',
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

      {/* Sample card visual */}
      <div className="mx-auto rounded-2xl bg-card p-4 text-center shadow-sm ring-1 ring-border">
        <p className="mb-2 text-sm font-medium text-brand-700">ตัวอย่างบัตรสะสมแต้ม</p>
        <StampDots current={7} threshold={10} size="md" />
        <p className="mt-2 text-xs text-muted">สะสม 7/10 · อีก 3 ดวงครบรางวัล</p>
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
