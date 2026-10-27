import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ClipboardList,
  Contact,
  MapPinned,
  UtensilsCrossed,
  MonitorSmartphone,
  Smartphone,
  Package,
  MessageCircleHeart,
  type LucideIcon,
  ListOrdered,
  QrCode,
  ShieldCheck,
  History,
  TabletSmartphone,
  WifiOff,
  UserCog,
  Scale,
  Play,
  BookOpen,
  LogIn,
  Plus,
} from "lucide-react";

import { Card } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { BRAND } from "@/src/config/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} · คู่มือขายสำหรับทีมขาย`,
  description:
    "Playbook สำหรับทีมขาย — เช็กลิสต์เตรียมตัว บทสนทนาเปิดใจ จุดเจ็บของร้าน สคริปต์สาธิต และคำตอบข้อโต้แย้งที่เจอบ่อย",
};

const NAV_ITEMS = [
  "prepare",
  "open",
  "pains",
  "demo",
  "faq",
  "close",
  "links",
] as const;

type NavId = (typeof NAV_ITEMS)[number];

interface CheckItem {
  icon: LucideIcon;
  text: string;
}

interface ScriptItem {
  icon: LucideIcon;
  text: string;
}

interface PainItem {
  icon: LucideIcon;
  pain: string;
  fix: string;
}

interface DemoStep {
  icon: LucideIcon;
  title: string;
  detail: string;
}

interface FaqItem {
  icon: LucideIcon;
  q: string;
  a: string;
}

interface CloseStep {
  icon: LucideIcon;
  text: string;
}

interface QuickLink {
  icon: LucideIcon;
  href: string;
  label: string;
  linkPrimary?: boolean;
}

export default async function SellPage() {
  const t = await getTranslations("sell");

  const prepareItems: CheckItem[] = [
    { icon: Smartphone, text: t("prepare.item1") },
    { icon: MonitorSmartphone, text: t("prepare.item2") },
    { icon: QrCode, text: t("prepare.item3") },
    { icon: ClipboardList, text: t("prepare.item4") },
    { icon: MessageCircleHeart, text: t("prepare.item5") },
    { icon: Contact, text: t("prepare.item6") },
  ];

  const openScripts: ScriptItem[] = [
    { icon: UtensilsCrossed, text: t("open.script1") },
    { icon: TabletSmartphone, text: t("open.script2") },
  ];

  const pains: PainItem[] = [
    { icon: ListOrdered, pain: t("pains.pain1"), fix: t("pains.fix1") },
    { icon: QrCode, pain: t("pains.pain2"), fix: t("pains.fix2") },
    { icon: ShieldCheck, pain: t("pains.pain3"), fix: t("pains.fix3") },
    { icon: History, pain: t("pains.pain4"), fix: t("pains.fix4") },
  ];

  const demoSteps: DemoStep[] = [
    {
      icon: TabletSmartphone,
      title: t("demo.step1"),
      detail: t("demo.step1Detail"),
    },
    {
      icon: Package,
      title: t("demo.step2"),
      detail: t("demo.step2Detail"),
    },
    {
      icon: QrCode,
      title: t("demo.step3"),
      detail: t("demo.step3Detail"),
    },
    {
      icon: ListOrdered,
      title: t("demo.step4"),
      detail: t("demo.step4Detail"),
    },
    {
      icon: History,
      title: t("demo.step5"),
      detail: t("demo.step5Detail"),
    },
  ];

  const faqs: FaqItem[] = [
    { icon: Scale, q: t("faq.q1"), a: t("faq.a1") },
    { icon: TabletSmartphone, q: t("faq.q2"), a: t("faq.a2") },
    { icon: WifiOff, q: t("faq.q3"), a: t("faq.a3") },
    { icon: UserCog, q: t("faq.q4"), a: t("faq.a4") },
    { icon: MonitorSmartphone, q: t("faq.q5"), a: t("faq.a5") },
  ];

  const closeSteps: CloseStep[] = [
    { icon: UtensilsCrossed, text: t("close.step1") },
    { icon: Plus, text: t("close.step2") },
    { icon: ClipboardList, text: t("close.step3") },
  ];

  const quickLinks: QuickLink[] = [
    { icon: MonitorSmartphone, href: "/info", label: t("links.info") },
    { icon: BookOpen, href: "/tutorial", label: t("links.tutorial") },
    { icon: MapPinned, href: "/admin/leads", label: t("links.leads") },
    { icon: LogIn, href: "/login", label: t("links.login") },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-4 py-10">
      {/* Sticky section nav */}
      <nav className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto py-1">
          {NAV_ITEMS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 rounded-full bg-muted-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-brand-100 hover:text-brand-700"
            >
              {t(`nav.${id as NavId}` as const)}
            </a>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <header className="flex flex-col items-center gap-4 text-center">
        <UtensilsCrossed className="size-10 text-brand-500" />
        <h1 className="text-3xl font-bold text-brand-700">{BRAND.name}</h1>
        <p className="max-w-md text-muted">
          {t("heroTagline")}
        </p>
        <Badge tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList className="size-3.5" />
            {t("heroBadge")}
          </span>
        </Badge>
      </header>

      {/* Section 1 — prepare */}
      <section id="prepare" className="flex scroll-mt-16 flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            {t("prepare.title")}
            <Package className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">{t("prepare.subtitle")}</p>
        </div>
        <ol className="flex flex-col gap-2">
          {prepareItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={i}>
                <Card className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-sm text-foreground">{item.text}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Section 2 — opening script */}
      <section id="open" className="flex scroll-mt-16 flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            {t("open.title")}
            <MessageCircleHeart className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">{t("open.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-3">
          {openScripts.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="flex items-start gap-3 border-l-4 border-l-brand-500">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-500" />
                <p className="text-sm text-foreground">{s.text}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 3 — pains */}
      <section id="pains" className="flex scroll-mt-16 flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            {t("pains.title")}
            <ShieldCheck className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">{t("pains.subtitle")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {pains.map((p, i) => {
            const Icon = p.icon;
            return (
              <Card key={i} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Icon className="size-7 text-brand-500" />
                </div>
                <h3 className="font-semibold text-foreground">{p.pain}</h3>
                <p className="text-sm text-muted">{p.fix}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 4 — demo */}
      <section id="demo" className="flex scroll-mt-16 flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            {t("demo.title")}
            <Play className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">{t("demo.subtitle")}</p>
        </div>
        <ol className="flex flex-col gap-3">
          {demoSteps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={i}>
                <Card className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-on-brand shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Icon className="size-4 shrink-0 text-brand-500" />
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

      {/* Section 5 — FAQ */}
      <section id="faq" className="flex scroll-mt-16 flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            {t("faq.title")}
            <MessageCircleHeart className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">{t("faq.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} className="flex flex-col gap-1.5">
                <h3 className="flex items-start gap-2 font-semibold text-foreground">
                  <Icon className="mt-0.5 size-4 shrink-0 text-brand-500" />
                  {f.q}
                </h3>
                <p className="text-sm text-muted">{f.a}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 6 — closing */}
      <section id="close" className="flex scroll-mt-16 flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            {t("close.title")}
            <ListOrdered className="size-5 text-brand-500" />
          </h2>
          <p className="text-sm text-muted">{t("close.subtitle")}</p>
        </div>
        <Card className="items-start gap-2">
          <p className="text-sm text-foreground">{t("close.script")}</p>
        </Card>
        <ol className="flex flex-col gap-3">
          {closeSteps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={i}>
                <Card className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-on-brand shadow-sm">
                    {i + 1}
                  </div>
                  <p className="flex items-start gap-2 text-sm text-foreground">
                    <Icon className="mt-0.5 size-4 shrink-0 text-brand-500" />
                    {s.text}
                  </p>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Section 7 — quick links */}
      <section id="links" className="flex scroll-mt-16 flex-col gap-4">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-foreground">
            {t("links.title")}
            <MapPinned className="size-5 text-brand-500" />
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  l.linkPrimary
                    ? "flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-center font-medium text-on-brand shadow-sm transition hover:bg-brand-600"
                    : "flex items-center justify-center gap-2 rounded-full px-5 py-3 text-center font-medium text-brand-700 shadow-sm ring-1 ring-border transition hover:bg-brand-50"
                }
              >
                <Icon className="size-4 shrink-0" />
                {l.label}
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-col items-center gap-2 pb-4 pt-2">
        <p className="text-xs text-muted">
          {t("footerNote", { brand: BRAND.name })}
        </p>
      </footer>
    </main>
  );
}
