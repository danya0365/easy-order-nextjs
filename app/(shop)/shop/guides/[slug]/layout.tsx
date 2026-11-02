import { notFound } from "next/navigation";

import { findGuide } from "@/src/domain/guides/shop-guides";

/** 404 gate (vinext probes layouts before streaming → real 404) so ../loading.tsx can stream. */
export default async function GuideGateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  if (!findGuide((await params).slug)) notFound();
  return children;
}
