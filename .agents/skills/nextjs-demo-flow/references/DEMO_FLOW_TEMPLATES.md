# Demo Flow Templates — Generic Code

> ทุก template ใช้ placeholder ที่ระบุใน SKILL.md
> แทนที่ `[ProjectName]`, `[FlowId]`, `[FlowTitle]` ฯลฯ ตาม business domain ของ user

---

## Template 1: layout.tsx

```tsx
// app/demo-flow/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo Flow",
};

export default function DemoFlowLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-screen landing-bg">{children}</div>;
}
```

---

## Template 2: flow-data.ts

```typescript
// app/demo-flow/_components/flow-data.ts

export interface FlowItem {
  id: string;
  group: string;
  title: string;
  description: string;
  steps: string[];
  roles: string[];
  badge?: string;
  isWow?: boolean;
  mockRoute?: string;
}

export interface FlowGroup {
  id: string;
  title: string;
  subtitle: string;
  color: string;
}

export const flowGroups: FlowGroup[] = [
  // ตัวอย่าง:
  // {
  //   id: "A",
  //   title: "การขาย & ใบเสนอราคา",
  //   subtitle: "ตั้งแต่สร้าง Quote จนลูกค้าอนุมัติ",
  //   color: "from-orange-500 to-amber-500",
  // },
];

export const flowItems: FlowItem[] = [
  // ตัวอย่าง:
  // {
  //   id: "create-quote",
  //   group: "A",
  //   title: "สร้างใบเสนอราคา",
  //   description: "PM กรอกรายละเอียดงาน → ระบบคำนวณราคา → สร้าง PDF",
  //   steps: [
  //     "กรอก Brief: ประเภทงาน, ขนาด, จำนวน",
  //     "ระบบคำนวณราคาอัตโนมัติ",
  //     "Preview PDF ก่อนส่ง",
  //     "ส่งให้ลูกค้าผ่าน Line/Email",
  //   ],
  //   roles: ["PM", "Sales"],
  //   badge: "Core",
  //   isWow: false,
  //   mockRoute: "/demo-flow/mock/create-quote",
  // },
];
```

---

## Template 3: scenarios-data.ts

```typescript
// app/demo-flow/_components/scenarios-data.ts

export interface ScenarioStep {
  flowId: string;
  title: string;
  description: string;
  mockRoute: string;
  isOptional?: boolean;
}

export interface UseCase {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: ScenarioStep[];
  estimatedTime: string;
  targetAudience: string[];
}

export const useCases: UseCase[] = [
  // ตัวอย่าง:
  // {
  //   id: "new-customer-full-flow",
  //   title: "ลูกค้าใหม่ — จบครบวงจร",
  //   description: "ตั้งแต่สร้าง Quote จนปิด Job เก็บเงิน",
  //   icon: "Briefcase",
  //   color: "from-blue-500 to-cyan-500",
  //   steps: [
  //     {
  //       flowId: "create-quote",
  //       title: "สร้างใบเสนอราคา",
  //       description: "PM กรอก Brief → สร้าง Quote PDF",
  //       mockRoute: "/demo-flow/mock/create-quote",
  //     },
  //   ],
  //   estimatedTime: "5-8 นาที",
  //   targetAudience: ["เจ้าของร้าน", "PM"],
  // },
];
```

---

## Template 4: journey-data.ts

```typescript
// app/demo-flow/_components/journey-data.ts

export interface JourneyStep {
  flowId: string;
  title: string;
  description: string;
  mockRoute: string;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: JourneyStep[];
  estimatedTime: string;
}

export const journeys: Journey[] = [
  // ตัวอย่าง:
  // {
  //   id: "standard-job",
  //   title: "งานมาตรฐาน (Standard Job)",
  //   description: "ลูกค้าสั่ง → ผลิต → ติดตั้ง → เก็บเงิน → ปิด Job",
  //   icon: "Briefcase",
  //   color: "from-blue-500 to-cyan-500",
  //   steps: [...],
  //   estimatedTime: "8-10 นาที",
  // },
];
```

---

## Template 5: journey-icons.tsx

```tsx
// app/demo-flow/_components/journey-icons.tsx
"use client";

import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Headphones,
  Layers,
  Package,
  Star,
} from "lucide-react";

export const journeyIconMap = {
  Briefcase,
  FileText,
  Clock,
  Package,
  Star,
  AlertTriangle,
  Headphones,
  Layers,
  Building2,
  CalendarDays,
} as const;

export type JourneyIconName = keyof typeof journeyIconMap;

export function getJourneyIcon(name: JourneyIconName, className = "h-6 w-6") {
  const Icon = journeyIconMap[name];
  return <Icon className={className} />;
}
```

> **หมายเหตุ**: เพิ่ม/ลด icons ตาม journeys ที่ user ต้องการ

---

## Template 6: flow-card.tsx

```tsx
// app/demo-flow/_components/flow-card.tsx
"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { FlowItem } from "./flow-data";

interface FlowCardProps {
  flow: FlowItem;
  groupColor: string;
}

export function FlowCard({ flow, groupColor }: FlowCardProps) {
  const isWow = flow.isWow;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border landing-border-subtle landing-card-bg transition-all duration-300 hover:border-landing-primary/30 ${
        isWow ? "ring-1 ring-landing-primary/20" : ""
      }`}
    >
      {isWow && (
        <div
          className={`absolute left-0 top-0 h-full w-1 bg-linear-to-b ${groupColor}`}
        />
      )}

      <div className="p-5">
        {/* Header: ID + Badge */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                isWow
                  ? "bg-linear-to-br text-white"
                  : "bg-landing-bg-secondary text-landing-fg-muted"
              } ${groupColor}`}
            >
              {flow.group}
            </span>
            {flow.badge && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isWow
                    ? "bg-landing-primary/10 text-landing-primary"
                    : "bg-landing-bg-secondary text-landing-fg-muted"
                }`}
              >
                {isWow && <Sparkles className="mr-1 inline h-3 w-3" />}
                {flow.badge}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-base font-semibold leading-snug landing-fg">
          {flow.title}
        </h3>

        {/* Description */}
        <p className="mb-4 text-sm leading-relaxed landing-fg-muted">
          {flow.description}
        </p>

        {/* Steps preview (first 2) */}
        <div className="mb-4 space-y-1.5">
          {flow.steps.slice(0, 2).map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-landing-fg-subtle" />
              <span className="landing-fg-subtle line-clamp-1">{step}</span>
            </div>
          ))}
          {flow.steps.length > 2 && (
            <p className="text-xs text-landing-fg-subtle/70 pl-3.5">
              +{flow.steps.length - 2} ขั้นตอนอื่นๆ...
            </p>
          )}
        </div>

        {/* Footer: Roles + CTA */}
        <div className="flex items-center justify-between gap-3 border-t landing-border-subtle pt-3">
          <div className="flex flex-wrap gap-1.5">
            {flow.roles.map((role) => (
              <span
                key={role}
                className="rounded-md bg-landing-bg-secondary px-2 py-0.5 text-xs font-medium landing-fg-muted"
              >
                {role}
              </span>
            ))}
          </div>

          {flow.mockRoute ? (
            <Link
              href={flow.mockRoute}
              className="group/btn flex items-center gap-1 rounded-lg bg-landing-primary px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
            >
              ดูตัวอย่าง
              <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          ) : (
            <span className="rounded-lg bg-landing-bg-secondary px-3 py-1.5 text-xs landing-fg-subtle">
              Coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Template 7: demo-flow-mock-layout.tsx

```tsx
// app/demo-flow/_components/demo-flow-mock-layout.tsx
"use client";

import { cn } from "@/src/presentation/lib/cn";
import { ReactNode, Suspense } from "react";
import { ScenarioBreadcrumb } from "./scenario-breadcrumb";
import { SmartBackButton } from "./smart-back-button";

interface DemoFlowMockLayoutProps {
  children: ReactNode;
  flowId: string;
  title: string;
  badge?: ReactNode;
  maxWidth?: "md" | "2xl" | "5xl";
  backButtonFallback?: {
    href: string;
    label: string;
  };
}

export function DemoFlowMockLayout({
  children,
  flowId,
  title,
  badge,
  maxWidth = "md",
  backButtonFallback,
}: DemoFlowMockLayoutProps) {
  const maxWidthClass = {
    md: "max-w-md",
    "2xl": "max-w-2xl",
    "5xl": "max-w-5xl",
  }[maxWidth];

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b landing-border-subtle landing-glass">
        <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <Suspense
              fallback={
                <span className="text-sm landing-fg-muted">← กลับ</span>
              }
            >
              {backButtonFallback ? (
                <SmartBackButton
                  fallbackHref={backButtonFallback.href}
                  fallbackLabel={backButtonFallback.label}
                />
              ) : (
                <SmartBackButton />
              )}
            </Suspense>
            <span className="text-sm font-medium landing-fg">{title}</span>
          </div>
          {badge}
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-3">
        <Suspense fallback={null}>
          <ScenarioBreadcrumb currentFlowId={flowId} />
        </Suspense>
      </div>

      {/* Main Content */}
      <main className={cn("mx-auto px-4 py-4", maxWidthClass)}>{children}</main>
    </>
  );
}
```

---

## Template 8: smart-back-button.tsx

```tsx
// app/demo-flow/_components/smart-back-button.tsx
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { journeys } from "./journey-data";
import { useCases } from "./scenarios-data";

interface SmartBackButtonProps {
  fallbackHref?: string;
  fallbackLabel?: string;
}

export function SmartBackButton({
  fallbackHref = "/demo-flow",
  fallbackLabel = "กลับไปดู Flows อื่น",
}: SmartBackButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const scenarioId = searchParams.get("scenario");
  const journeyId = searchParams.get("journey");

  // Hide button when in Presentation Mode
  const isInJourneyDetailMode =
    pathname?.startsWith("/demo-flow/journey/") &&
    pathname !== "/demo-flow/journey";
  const isInScenarioDetailMode =
    pathname?.startsWith("/demo-flow/scenarios/") &&
    pathname !== "/demo-flow/scenarios";

  if (isInJourneyDetailMode || isInScenarioDetailMode) {
    return null;
  }

  // If coming from scenarios
  if (from === "scenarios" && scenarioId) {
    const scenario = useCases.find((s) => s.id === scenarioId);
    if (scenario) {
      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/demo-flow/scenarios?highlight=${scenarioId}`}
            className="inline-flex items-center gap-1.5 text-sm landing-fg-subtle transition-colors hover:landing-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไป{scenario.title}
          </Link>
          <span className="text-landing-fg-subtle">|</span>
          <Link
            href="/demo-flow/scenarios"
            className="text-sm landing-fg-subtle transition-colors hover:landing-fg"
          >
            Scenarios
          </Link>
        </div>
      );
    }
  }

  // If coming from journey
  if (from === "journey" && journeyId) {
    const journey = journeys.find((j) => j.id === journeyId);
    if (journey) {
      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/demo-flow/journey?highlight=${journeyId}`}
            className="inline-flex items-center gap-1.5 text-sm landing-fg-subtle transition-colors hover:landing-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไป{journey.title}
          </Link>
          <span className="text-landing-fg-subtle">|</span>
          <Link
            href="/demo-flow/journey"
            className="text-sm landing-fg-subtle transition-colors hover:landing-fg"
          >
            Journey
          </Link>
        </div>
      );
    }
  }

  // Default fallback
  return (
    <Link
      href={fallbackHref}
      className="inline-flex items-center gap-2 text-sm landing-fg-subtle transition-colors hover:landing-fg"
    >
      <ArrowLeft className="h-4 w-4" />
      {fallbackLabel}
    </Link>
  );
}
```

---

## Template 9: scenario-breadcrumb.tsx

```tsx
// app/demo-flow/_components/scenario-breadcrumb.tsx
"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { flowItems } from "./flow-data";
import { useCases } from "./scenarios-data";

interface ScenarioBreadcrumbProps {
  currentFlowId: string;
}

export function ScenarioBreadcrumb({ currentFlowId }: ScenarioBreadcrumbProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const scenarioId = searchParams.get("scenario");

  if (from !== "scenarios" || !scenarioId) {
    return null;
  }

  const scenario = useCases.find((s) => s.id === scenarioId);
  const currentFlow = flowItems.find((f) => f.id === currentFlowId);

  if (!scenario || !currentFlow) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-xs">
      <Link
        href="/demo-flow/scenarios"
        className="landing-fg-subtle transition-colors hover:landing-fg"
      >
        Scenarios
      </Link>
      <ChevronRight className="h-3 w-3 text-landing-fg-subtle" />
      <Link
        href={`/demo-flow/scenarios?highlight=${scenarioId}`}
        className="landing-fg-subtle transition-colors hover:landing-fg"
      >
        {scenario.title}
      </Link>
      <ChevronRight className="h-3 w-3 text-landing-fg-subtle" />
      <span className="landing-fg font-medium">
        {currentFlow.id} {currentFlow.title.split(" — ")[0]}
      </span>
    </nav>
  );
}
```

---

## Template 10: journey-store.ts

```typescript
// src/presentation/stores/journey-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import localforage from "localforage";

interface JourneyState {
  expandedJourneyId: string | null;
  expandJourney: (id: string) => void;
  collapseJourney: () => void;
  toggleJourney: (id: string) => void;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      expandedJourneyId: null,

      expandJourney: (id: string) => set({ expandedJourneyId: id }),

      collapseJourney: () => set({ expandedJourneyId: null }),

      toggleJourney: (id: string) => {
        const current = get().expandedJourneyId;
        if (current === id) {
          set({ expandedJourneyId: null });
        } else {
          set({ expandedJourneyId: id });
        }
      },
    }),
    {
      name: "journey-expanded",
      storage: createJSONStorage(() => localforage),
    },
  ),
);
```

---

## Template 11: cn.ts (utility)

```typescript
// src/presentation/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Template 12: Hub Page (demo-flow/page.tsx)

```tsx
// app/demo-flow/page.tsx
import Link from "next/link";
import { flowGroups, flowItems } from "./_components/flow-data";
import { FlowCard } from "./_components/flow-card";
import { useCases } from "./_components/scenarios-data";
import { journeys } from "./_components/journey-data";

export default function DemoFlowPage() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b landing-border-subtle landing-glass">
        <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <span className="text-sm font-medium landing-fg">
            [ProjectName] Demo
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold landing-fg mb-2">
            [ProjectName] — Demo Flow
          </h1>
          <p className="text-sm landing-fg-muted max-w-xl mx-auto">
            ทดลองใช้งานทุก flow ก่อนเริ่มพัฒนาจริง — กดดูตัวอย่างแต่ละ flow
            หรือเลือก Scenario/Journey เพื่อดูแบบเต็มวงจร
          </p>
        </div>

        {/* Quick Links */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/demo-flow/scenarios"
            className="group rounded-2xl landing-card-bg border landing-border-subtle p-5 transition-all hover:border-landing-primary/30"
          >
            <h3 className="font-semibold landing-fg mb-1">
              Demo Scenarios ({useCases.length})
            </h3>
            <p className="text-sm landing-fg-muted">
              สถานการณ์ตัวอย่าง — จับ flows มาเรียงเป็นลำดับ
            </p>
          </Link>
          <Link
            href="/demo-flow/journey"
            className="group rounded-2xl landing-card-bg border landing-border-subtle p-5 transition-all hover:border-landing-primary/30"
          >
            <h3 className="font-semibold landing-fg mb-1">
              Demo Journey ({journeys.length})
            </h3>
            <p className="text-sm landing-fg-muted">
              End-to-End flow ครบวงจร — จากต้นจนจบ
            </p>
          </Link>
        </div>

        {/* Flow Groups */}
        <div className="space-y-10">
          {flowGroups.map((group) => {
            const groupFlows = flowItems.filter((f) => f.group === group.id);
            return (
              <section key={group.id} id={`group-${group.id.toLowerCase()}`}>
                <div className="mb-4 flex items-center gap-3 border-b landing-border-subtle pb-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${group.color} text-lg font-bold text-white shadow-lg`}
                  >
                    {group.id}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold landing-fg">
                      กลุ่ม {group.id} — {group.title}
                    </h2>
                    <p className="text-xs landing-fg-subtle">
                      {group.subtitle}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupFlows.map((flow) => (
                    <FlowCard
                      key={flow.id}
                      flow={flow}
                      groupColor={group.color}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
```

---

## Template 13: Scenarios List (scenarios/page.tsx)

```tsx
// app/demo-flow/scenarios/page.tsx
"use client";

import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  Clock,
  Presentation,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCases } from "../_components/scenarios-data";

// เพิ่ม icons ตามที่ scenarios ใช้
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase,
  // ... เพิ่มตาม useCases[].icon
};

export default function ScenariosPage() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b landing-border-subtle landing-glass">
        <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/demo-flow"
              className="landing-fg-muted hover:landing-fg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <span className="text-sm font-medium landing-fg">
                Demo Scenarios
              </span>
              <p className="text-xs landing-fg-muted">
                {useCases.length} สถานการณ์ใช้งานจริง
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Intro */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold landing-fg">
            เลือกสถานการณ์ Demo
          </h1>
          <p className="text-sm landing-fg-muted max-w-lg mx-auto">
            แต่ละ scenario แสดง flow ที่เกี่ยวข้องเป็นลำดับ
            ช่วยให้ลูกค้าเห็นภาพการใช้งานจริง
          </p>
        </div>

        {/* Use Cases */}
        <div className="space-y-4">
          {useCases.map((useCase) => {
            const IconComponent = iconMap[useCase.icon];
            return (
              <div
                key={useCase.id}
                className="rounded-2xl landing-card-bg border landing-border-subtle overflow-hidden"
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl bg-linear-to-br ${useCase.color} flex items-center justify-center shrink-0`}
                    >
                      {IconComponent && (
                        <IconComponent className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold landing-fg">
                        {useCase.title}
                      </h3>
                      <p className="text-sm landing-fg-muted mt-0.5">
                        {useCase.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 landing-fg-muted">
                          <Clock className="h-3.5 w-3.5" />
                          {useCase.estimatedTime}
                        </span>
                        <span className="flex items-center gap-1 landing-fg-muted">
                          <Users className="h-3.5 w-3.5" />
                          {useCase.targetAudience.join(", ")}
                        </span>
                        <Link
                          href={`/demo-flow/scenarios/${useCase.id}`}
                          className="flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-600 transition-colors ml-auto"
                        >
                          <Presentation className="h-3.5 w-3.5" />
                          Presentation Mode
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="border-t landing-border-subtle bg-landing-bg-secondary/30">
                  <div className="p-3">
                    <p className="text-xs landing-fg-muted mb-2 px-1">
                      ลำดับ Flow:
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      {useCase.steps.map((step, idx) => (
                        <div key={step.flowId} className="flex items-center">
                          <Link
                            href={`${step.mockRoute}?from=scenarios&scenario=${useCase.id}`}
                            className="group flex items-center gap-2 rounded-lg bg-landing-card-bg border landing-border-subtle px-3 py-1.5 text-xs transition-all hover:border-landing-primary"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-landing-primary/10 text-[10px] font-bold text-landing-primary">
                              {idx + 1}
                            </span>
                            <span className="landing-fg">{step.title}</span>
                            {step.isOptional && (
                              <span className="text-[10px] landing-fg-muted">
                                (optional)
                              </span>
                            )}
                            <ChevronRight className="h-3 w-3 text-landing-fg-subtle group-hover:text-landing-primary" />
                          </Link>
                          {idx < useCase.steps.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-landing-fg-subtle mx-0.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back */}
        <div className="mt-8 text-center">
          <Link
            href="/demo-flow"
            className="inline-flex items-center gap-2 text-sm landing-fg-subtle transition-colors hover:landing-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้า Flows ทั้งหมด
          </Link>
        </div>
      </main>
    </>
  );
}
```

---

## Template 14: Scenario Detail — Presentation Mode (scenarios/[id]/page.tsx)

```tsx
// app/demo-flow/scenarios/[id]/page.tsx
"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Home,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useCases } from "../../_components/scenarios-data";

// === Import mock page components ===
// import FlowAContent from "@/app/demo-flow/mock/flow-a/page";
// ... import ทุก mock page ที่ใช้ใน scenarios

// === Icon mapping (ตาม useCases[].icon) ===
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Briefcase,
  // ... เพิ่มตามที่ใช้
};

// === Map flowId → Component ===
const flowComponents: Record<string, React.ComponentType> = {
  // "flow-a": FlowAContent,
  // ... map ทุก flow
};

// Theme Toggle
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timeoutId);
  }, []);

  if (!mounted) return <div className="h-8 w-8" />;

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="p-1.5 rounded-lg hover:bg-landing-bg-secondary transition-colors"
    >
      {currentTheme === "dark" ? (
        <Sun className="h-5 w-5 landing-fg-subtle" />
      ) : (
        <Moon className="h-5 w-5 landing-fg-subtle" />
      )}
    </button>
  );
}

function ScenarioDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const scenarioId = params.id as string;
  const scenario = useCases.find((s) => s.id === scenarioId);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarItemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const currentStepIndex = Math.max(
    0,
    Math.min(
      parseInt(searchParams.get("step") || "0", 10),
      (scenario?.steps.length || 1) - 1,
    ),
  );

  const currentStep = scenario?.steps[currentStepIndex];

  useEffect(() => {
    const activeElement = sidebarItemRefs.current.get(currentStepIndex);
    if (activeElement) {
      setTimeout(() => {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback(
    (index: number) => {
      if (!scenario) return;
      const clampedIndex = Math.max(
        0,
        Math.min(index, scenario.steps.length - 1),
      );
      router.replace(`/demo-flow/scenarios/${scenarioId}?step=${clampedIndex}`);
    },
    [scenario, scenarioId, router],
  );

  const goPrev = () => goToStep(currentStepIndex - 1);
  const goNext = () => goToStep(currentStepIndex + 1);

  if (!scenario) {
    return (
      <div className="flex h-screen items-center justify-center landing-fg">
        <div className="text-center">
          <p className="text-lg font-medium">ไม่พบ Scenario</p>
          <Link
            href="/demo-flow/scenarios"
            className="mt-4 inline-flex items-center gap-2 text-landing-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้า Scenarios
          </Link>
        </div>
      </div>
    );
  }

  const ActiveFlowComponent = currentStep
    ? flowComponents[currentStep.flowId]
    : null;

  const progress = ((currentStepIndex + 1) / scenario.steps.length) * 100;
  const IconComponent = iconMap[scenario.icon];

  return (
    <div className="flex h-screen bg-landing-bg">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } shrink-0 border-r landing-border-subtle bg-landing-card-bg transition-all duration-300 overflow-hidden`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="border-b landing-border-subtle p-4">
            <Link
              href="/demo-flow/scenarios"
              className="inline-flex items-center gap-2 text-sm landing-fg-subtle hover:landing-fg transition-colors"
            >
              <Home className="h-4 w-4" />
              กลับไปหน้า Scenarios
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg bg-linear-to-br ${scenario.color} flex items-center justify-center text-white`}
              >
                {IconComponent && <IconComponent className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold landing-fg text-sm truncate">
                  {scenario.title}
                </h2>
                <p className="text-xs landing-fg-muted">
                  {scenario.steps.length} steps · {scenario.estimatedTime}
                </p>
              </div>
            </div>
          </div>

          {/* Steps Tree */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {scenario.steps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                return (
                  <button
                    key={step.flowId}
                    ref={(el) => {
                      if (el) sidebarItemRefs.current.set(index, el);
                    }}
                    onClick={() => goToStep(index)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                      isActive
                        ? "bg-landing-primary/10 border border-landing-primary/30"
                        : isCompleted
                          ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "hover:bg-landing-bg-secondary"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isActive
                            ? "bg-landing-primary text-white"
                            : isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-landing-bg-tertiary landing-fg-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${isActive ? "text-landing-primary" : "landing-fg"}`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs landing-fg-muted line-clamp-2 mt-0.5">
                          {step.description}
                        </p>
                        {step.isOptional && (
                          <span className="text-[10px] landing-fg-subtle mt-1 inline-block">
                            (optional)
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress */}
          <div className="border-t landing-border-subtle p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="landing-fg-subtle">ความคืบหน้า</span>
              <span className="font-medium landing-fg">
                {currentStepIndex + 1} / {scenario.steps.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-landing-bg-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full bg-linear-to-r ${scenario.color} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b landing-border-subtle bg-landing-card-bg px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-landing-bg-secondary transition-colors"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5 landing-fg-subtle" />
              ) : (
                <PanelLeftOpen className="h-5 w-5 landing-fg-subtle" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm landing-fg-subtle">Step</span>
              <span className="text-sm font-medium landing-fg">
                {currentStepIndex + 1}
              </span>
              <span className="text-sm landing-fg-subtle">of</span>
              <span className="text-sm landing-fg-subtle">
                {scenario.steps.length}
              </span>
            </div>
            {currentStep && (
              <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l landing-border-subtle">
                <span className="text-sm font-medium landing-fg">
                  {currentStep.title}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={goPrev}
              disabled={currentStepIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-landing-bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">ก่อนหน้า</span>
            </button>
            <button
              onClick={goNext}
              disabled={currentStepIndex === scenario.steps.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-landing-primary text-white hover:bg-landing-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">ถัดไป</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Flow Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">
            {ActiveFlowComponent ? (
              <div className="rounded-2xl landing-card-bg border landing-border-subtle overflow-hidden">
                {currentStep && (
                  <div className="border-b landing-border-subtle px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg bg-linear-to-br ${scenario.color} flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {currentStepIndex + 1}
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold landing-fg">
                          {currentStep.title}
                        </h1>
                        <p className="text-sm landing-fg-muted">
                          {currentStep.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <ActiveFlowComponent />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 landing-fg-muted">
                <p className="text-lg font-medium landing-fg">
                  ไม่พบ Flow สำหรับ step นี้
                </p>
                <p className="text-sm mt-2">Flow ID: {currentStep?.flowId}</p>
              </div>
            )}
          </div>
        </main>

        {/* Bottom Progress Bar */}
        <div className="h-1 bg-landing-bg-tertiary">
          <div
            className={`h-full bg-linear-to-r ${scenario.color} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ScenarioDetailPage() {
  return (
    <Suspense fallback={null}>
      <ScenarioDetailContent />
    </Suspense>
  );
}
```

---

## Template 15: Journey List (journey/page.tsx)

```tsx
// app/demo-flow/journey/page.tsx
"use client";

import { useJourneyStore } from "@/src/presentation/stores/journey-store";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Presentation,
  Route,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";
import { journeys } from "../_components/journey-data";
import { getJourneyIcon } from "../_components/journey-icons";

function JourneyPageContent() {
  const { expandedJourneyId, toggleJourney } = useJourneyStore();
  const journeyRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (expandedJourneyId) {
      const element = journeyRefs.current.get(expandedJourneyId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [expandedJourneyId]);

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b landing-border-subtle landing-glass">
        <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/demo-flow"
              className="landing-fg-muted hover:landing-fg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <span className="text-sm font-medium landing-fg">
                Demo Journey
              </span>
              <p className="text-xs landing-fg-muted">
                End-to-End Flow แบบเต็มวงจร
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold landing-fg">
            เลือก Journey ที่ต้องการ Demo
          </h1>
          <p className="text-sm landing-fg-muted max-w-lg mx-auto">
            แต่ละ Journey แสดง flow ครบวงจรจากต้นจนจบ
          </p>
        </div>

        <div className="space-y-3">
          {journeys.map((journey) => {
            const isExpanded = expandedJourneyId === journey.id;
            return (
              <div
                key={journey.id}
                ref={(el) => {
                  if (el) journeyRefs.current.set(journey.id, el);
                }}
                className={`rounded-2xl landing-card-bg border landing-border-subtle overflow-hidden transition-all ${
                  isExpanded ? "shadow-lg" : "hover:border-landing-fg-subtle/30"
                }`}
              >
                {/* Header - Clickable */}
                <div
                  onClick={() => toggleJourney(journey.id)}
                  className="p-4 cursor-pointer transition-colors hover:bg-landing-bg-secondary/30"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl bg-linear-to-br ${journey.color} flex items-center justify-center shrink-0 text-white`}
                    >
                      {getJourneyIcon(journey.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold landing-fg">
                        {journey.title}
                      </h3>
                      <p className="text-sm landing-fg-muted mt-0.5">
                        {journey.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 landing-fg-muted">
                          <Clock className="h-3.5 w-3.5" />
                          {journey.estimatedTime}
                        </span>
                        <span className="flex items-center gap-1 landing-fg-muted">
                          <Route className="h-3.5 w-3.5" />
                          {journey.steps.length} steps
                        </span>
                        <span
                          className={`flex items-center gap-1 text-xs font-medium ${
                            isExpanded
                              ? "text-landing-primary"
                              : "landing-fg-subtle"
                          }`}
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                          {isExpanded ? "ซ่อน" : "ดูรายละเอียด"}
                        </span>
                        <Link
                          href={`/demo-flow/journey/${journey.id}`}
                          onClick={() => toggleJourney(journey.id)}
                          className="flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-600 transition-colors ml-auto"
                        >
                          <Presentation className="h-3.5 w-3.5" />
                          Presentation Mode
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steps Timeline - Collapsible */}
                {isExpanded && (
                  <div className="border-t landing-border-subtle bg-landing-bg-secondary/30 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-3">
                      <p className="text-xs landing-fg-muted mb-3 px-1">
                        ลำดับการทำงาน:
                      </p>
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-landing-border-subtle" />
                        <div className="space-y-2">
                          {journey.steps.map((step, idx) => (
                            <div
                              key={`${step.flowId}-${idx}`}
                              className="flex items-start gap-3"
                            >
                              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-landing-primary text-[10px] font-bold text-white">
                                {idx + 1}
                              </div>
                              <Link
                                href={`${step.mockRoute}?from=journey&journey=${journey.id}&step=${idx + 1}`}
                                className="group flex flex-1 items-center gap-2 rounded-lg bg-landing-card-bg border landing-border-subtle px-3 py-2 text-xs transition-all hover:border-landing-primary"
                              >
                                <span className="font-medium landing-fg">
                                  {step.title}
                                </span>
                                <span className="landing-fg-subtle hidden sm:inline">
                                  — {step.description}
                                </span>
                                <ChevronRight className="h-3 w-3 text-landing-fg-subtle ml-auto group-hover:text-landing-primary" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/demo-flow"
            className="inline-flex items-center gap-2 text-sm landing-fg-subtle transition-colors hover:landing-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้า Flows ทั้งหมด
          </Link>
        </div>
      </main>
    </>
  );
}

export default function JourneyPage() {
  return (
    <Suspense fallback={null}>
      <JourneyPageContent />
    </Suspense>
  );
}
```

---

## Template 16: Journey Detail — Presentation Mode (journey/[id]/page.tsx)

> โครงสร้างเหมือน scenarios/[id]/page.tsx แต่:
>
> - ใช้ `journeys` แทน `useCases`
> - ใช้ `getJourneyIcon` แทน `iconMap`
> - ใช้ `useJourneyStore` เพื่อ store expanded state
> - Route: `/demo-flow/journey/[id]?step=0`

```tsx
// app/demo-flow/journey/[id]/page.tsx
"use client";

import { journeys } from "@/app/demo-flow/_components/journey-data";
import { getJourneyIcon } from "@/app/demo-flow/_components/journey-icons";
import { useJourneyStore } from "@/src/presentation/stores/journey-store";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Home,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

// === Import mock page components ===
// import FlowAContent from "@/app/demo-flow/mock/flow-a/page";
// ... import ทุก mock page

// === Map flowId → Component ===
const flowComponents: Record<string, React.ComponentType> = {
  // "flow-a": FlowAContent,
  // ... map ทุก flow
};

// Placeholder for missing flows
function PlaceholderFlow({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-landing-bg-secondary flex items-center justify-center mb-4">
        <svg
          className="h-8 w-8 landing-fg-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium landing-fg">{title}</h3>
      <p className="text-sm landing-fg-muted mt-2">
        Flow นี้ยังไม่มี Mock Page
      </p>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timeoutId = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timeoutId);
  }, []);
  if (!mounted) return <div className="h-8 w-8" />;
  const currentTheme = theme === "system" ? resolvedTheme : theme;
  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="p-1.5 rounded-lg hover:bg-landing-bg-secondary transition-colors"
    >
      {currentTheme === "dark" ? (
        <Sun className="h-5 w-5 landing-fg-subtle" />
      ) : (
        <Moon className="h-5 w-5 landing-fg-subtle" />
      )}
    </button>
  );
}

function JourneyDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { expandJourney } = useJourneyStore();

  const journeyId = params.id as string;
  const journey = journeys.find((j) => j.id === journeyId);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarItemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const currentStepIndex = Math.max(
    0,
    Math.min(
      parseInt(searchParams.get("step") || "0", 10),
      (journey?.steps.length || 1) - 1,
    ),
  );

  const currentStep = journey?.steps[currentStepIndex];

  useEffect(() => {
    if (journeyId) expandJourney(journeyId);
  }, [journeyId, expandJourney]);

  useEffect(() => {
    const activeElement = sidebarItemRefs.current.get(currentStepIndex);
    if (activeElement) {
      setTimeout(() => {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback(
    (index: number) => {
      if (!journey) return;
      const clampedIndex = Math.max(
        0,
        Math.min(index, journey.steps.length - 1),
      );
      router.replace(`/demo-flow/journey/${journeyId}?step=${clampedIndex}`);
    },
    [journey, journeyId, router],
  );

  const goPrev = () => goToStep(currentStepIndex - 1);
  const goNext = () => goToStep(currentStepIndex + 1);

  if (!journey) {
    return (
      <div className="flex h-screen items-center justify-center landing-fg">
        <div className="text-center">
          <p className="text-lg font-medium">ไม่พบ Journey</p>
          <Link
            href="/demo-flow/journey"
            className="mt-4 inline-flex items-center gap-2 text-landing-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้า Journey
          </Link>
        </div>
      </div>
    );
  }

  const ActiveFlowComponent = currentStep
    ? flowComponents[currentStep.flowId]
    : null;
  const progress = ((currentStepIndex + 1) / journey.steps.length) * 100;

  return (
    <div className="flex h-screen bg-landing-bg">
      {/* Sidebar — เหมือน scenario detail แต่ใช้ journey data */}
      <aside
        className={`${sidebarOpen ? "w-80" : "w-0"} shrink-0 border-r landing-border-subtle bg-landing-card-bg transition-all duration-300 overflow-hidden`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b landing-border-subtle p-4">
            <Link
              href="/demo-flow/journey"
              className="inline-flex items-center gap-2 text-sm landing-fg-subtle hover:landing-fg transition-colors"
            >
              <Home className="h-4 w-4" />
              กลับไปหน้า Journey
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg bg-linear-to-br ${journey.color} flex items-center justify-center text-white`}
              >
                {getJourneyIcon(journey.icon)}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold landing-fg text-sm truncate">
                  {journey.title}
                </h2>
                <p className="text-xs landing-fg-muted">
                  {journey.steps.length} steps · {journey.estimatedTime}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {journey.steps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                return (
                  <button
                    key={step.flowId}
                    ref={(el) => {
                      if (el) sidebarItemRefs.current.set(index, el);
                    }}
                    onClick={() => goToStep(index)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                      isActive
                        ? "bg-landing-primary/10 border border-landing-primary/30"
                        : isCompleted
                          ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "hover:bg-landing-bg-secondary"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isActive
                            ? "bg-landing-primary text-white"
                            : isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-landing-bg-tertiary landing-fg-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${isActive ? "text-landing-primary" : "landing-fg"}`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs landing-fg-muted line-clamp-2 mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t landing-border-subtle p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="landing-fg-subtle">ความคืบหน้า</span>
              <span className="font-medium landing-fg">
                {currentStepIndex + 1} / {journey.steps.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-landing-bg-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full bg-linear-to-r ${journey.color} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b landing-border-subtle bg-landing-card-bg px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-landing-bg-secondary transition-colors"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5 landing-fg-subtle" />
              ) : (
                <PanelLeftOpen className="h-5 w-5 landing-fg-subtle" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm landing-fg-subtle">Step</span>
              <span className="text-sm font-medium landing-fg">
                {currentStepIndex + 1}
              </span>
              <span className="text-sm landing-fg-subtle">of</span>
              <span className="text-sm landing-fg-subtle">
                {journey.steps.length}
              </span>
            </div>
            {currentStep && (
              <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l landing-border-subtle">
                <span className="text-sm font-medium landing-fg">
                  {currentStep.title}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={goPrev}
              disabled={currentStepIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-landing-bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">ก่อนหน้า</span>
            </button>
            <button
              onClick={goNext}
              disabled={currentStepIndex === journey.steps.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-landing-primary text-white hover:bg-landing-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">ถัดไป</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">
            {ActiveFlowComponent ? (
              <div className="rounded-2xl landing-card-bg border landing-border-subtle overflow-hidden">
                {currentStep && (
                  <div className="border-b landing-border-subtle px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg bg-linear-to-br ${journey.color} flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {currentStepIndex + 1}
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold landing-fg">
                          {currentStep.title}
                        </h1>
                        <p className="text-sm landing-fg-muted">
                          {currentStep.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <ActiveFlowComponent />
                </div>
              </div>
            ) : (
              <PlaceholderFlow title={currentStep?.title || "Unknown Flow"} />
            )}
          </div>
        </main>

        <div className="h-1 bg-landing-bg-tertiary">
          <div
            className={`h-full bg-linear-to-r ${journey.color} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function JourneyDetailPage() {
  return (
    <Suspense fallback={null}>
      <JourneyDetailContent />
    </Suspense>
  );
}
```

---

## Template 17: Mock Page (ตัวอย่าง generic)

```tsx
// app/demo-flow/mock/[flow-id]/page.tsx
"use client";

import { CheckCircle2 } from "lucide-react";
import { Suspense, useState } from "react";
import { DemoFlowMockLayout } from "../../_components/demo-flow-mock-layout";

function [FlowName]Content() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <DemoFlowMockLayout
      flowId="[flow-id]"
      title="[FlowTitle]"
      badge={
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          isSuccess
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-blue-500/10 text-blue-600"
        }`}>
          {isSuccess ? "สำเร็จ ✓" : "กำลังดำเนินการ"}
        </span>
      }
      maxWidth="md"
      backButtonFallback={{ href: "/demo-flow", label: "กลับไปดู Flows" }}
    >
      {!isSuccess ? (
        <>
          {/* Mock form / content */}
          <div className="space-y-4">
            <div className="rounded-xl landing-card-bg border landing-border-subtle p-4">
              <h3 className="text-sm font-medium landing-fg mb-2">[Section Title]</h3>
              <p className="text-sm landing-fg-muted">[Mock content here]</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-landing-primary text-white hover:bg-landing-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "ยืนยัน"
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold landing-fg mb-2">สำเร็จ!</h2>
          <p className="text-sm landing-fg-muted">[Success message]</p>
        </div>
      )}
    </DemoFlowMockLayout>
  );
}

export default function [FlowName]Mock() {
  return (
    <Suspense fallback={null}>
      <[FlowName]Content />
    </Suspense>
  );
}
```

---

## Template 18: CSS Landing Theme Variables

```css
/* เพิ่มใน globals.css */

:root {
  /* Landing Theme (Light) */
  --landing-bg: #fafaf9;
  --landing-bg-secondary: #f5f5f4;
  --landing-fg: #1c1917;
  --landing-fg-muted: #78716c;
  --landing-fg-subtle: #a8a29e;
  --landing-primary: #f97316; /* ← เปลี่ยนตาม brand */
  --landing-primary-light: #fb923c;
  --landing-primary-dark: #ea580c;
  --landing-accent: #f59e0b;
  --landing-card-bg: rgba(255, 255, 255, 0.8);
  --landing-border-subtle: rgba(0, 0, 0, 0.05);
  --landing-glass: rgba(255, 255, 255, 0.7);
}

.dark {
  /* Landing Theme (Dark) */
  --landing-bg: #0c0c14;
  --landing-bg-secondary: #14141f;
  --landing-fg: #fafaf9;
  --landing-fg-muted: #a8a29e;
  --landing-fg-subtle: #78716c;
  --landing-card-bg: rgba(255, 255, 255, 0.02);
  --landing-border-subtle: rgba(255, 255, 255, 0.05);
  --landing-glass: rgba(255, 255, 255, 0.05);
}

/* Tailwind v4 theme mapping */
@theme inline {
  --color-landing-bg: var(--landing-bg);
  --color-landing-bg-secondary: var(--landing-bg-secondary);
  --color-landing-fg: var(--landing-fg);
  --color-landing-fg-muted: var(--landing-fg-muted);
  --color-landing-fg-subtle: var(--landing-fg-subtle);
  --color-landing-primary: var(--landing-primary);
}

/* Utility classes */
@layer utilities {
  .landing-bg {
    background-color: var(--landing-bg);
  }
  .landing-bg-secondary {
    background-color: var(--landing-bg-secondary);
  }
  .landing-fg {
    color: var(--landing-fg);
  }
  .landing-fg-muted {
    color: var(--landing-fg-muted);
  }
  .landing-fg-subtle {
    color: var(--landing-fg-subtle);
  }
  .landing-card-bg {
    background-color: var(--landing-card-bg);
  }
  .landing-border-subtle {
    border-color: var(--landing-border-subtle);
  }
  .landing-glass {
    background-color: var(--landing-glass);
    backdrop-filter: blur(8px);
  }
}
```

---

## Template 19: Shared Presentation Component (demo-flow-presentation.tsx)

Extract sidebar, top bar, mobile bottom stepper bar, and steps drawer into a reusable `DemoFlowPresentation` component. Both `journey/[id]/page.tsx` and `scenarios/[id]/page.tsx` become thin wrappers.

> See the actual `demo-flow-presentation.tsx` in the project for the full ~350-line component.
>
> Key props:
>
> - `item`: `{ id, title, color, estimatedTime, steps[] }`
> - `renderIcon`: `(sizeClass) => ReactNode`
> - `backHref`, `backLabel`
> - `baseRoute`: for step URL navigation
> - `flowComponents`: `Record<string, React.ComponentType>`
> - `onOpen?`: optional callback when mounted

### Thin wrapper example (scenarios/[id]/page.tsx):

```tsx
"use client";

import { DemoFlowPresentation } from "@/app/demo-flow/_components/demo-flow-presentation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { useCases } from "../../_components/scenarios-data";

// Import all mock components + build flowComponents map ...

function ScenarioDetailContent() {
  const params = useParams();
  const scenarioId = params.id as string;
  const scenario = useCases.find((s) => s.id === scenarioId);

  if (!scenario) {
    return (
      <div className="flex h-screen items-center justify-center landing-fg">
        <div className="text-center">
          <p className="text-lg font-medium">ไม่พบ Scenario</p>
          <Link
            href="/demo-flow/scenarios"
            className="mt-4 inline-flex items-center gap-2 text-landing-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้า Scenarios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DemoFlowPresentation
      item={{
        id: scenario.id,
        title: scenario.title,
        color: scenario.color,
        estimatedTime: scenario.estimatedTime,
        steps: scenario.steps.map((s) => ({
          flowId: s.flowId,
          title: s.title,
          description: s.description,
          isOptional: s.isOptional,
        })),
      }}
      renderIcon={(size) =>
        IconComponent ? <IconComponent className={size} /> : null
      }
      backHref="/demo-flow/scenarios"
      backLabel="กลับไปหน้า Scenarios"
      baseRoute={`/demo-flow/scenarios/${scenarioId}`}
      flowComponents={flowComponents}
    />
  );
}

export default function ScenarioDetailPage() {
  return (
    <Suspense fallback={null}>
      <ScenarioDetailContent />
    </Suspense>
  );
}
```

### Mobile-first changes included in DemoFlowPresentation:

- Sidebar hidden on mobile (`hidden md:block`)
- Bottom stepper bar with prev/next + step counter (`md:hidden`)
- Steps drawer as bottom sheet (`max-h-[80vh]`, `rounded-t-2xl`)
- Progress bar in both desktop footer and mobile bottom bar
- All `bg-landing-bg-tertiary` replaced with `bg-landing-bg-secondary`
