import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";

import { Card } from "@/src/presentation/components/ui/Card";
import { BRAND } from "@/src/config/brand";

export const metadata: Metadata = {
  title: `ข้อกำหนดการใช้งาน · ${BRAND.name}`,
  description: `ข้อกำหนดและเงื่อนไขการใช้บริการ ${BRAND.name}`,
};

interface Section {
  heading: string;
  body: string[];
}

// NOTE (template): this is starter boilerplate — review/replace with your own
// terms (and have a lawyer check it) before launch. Prose is per-clone content,
// like the privacy/tutorial pages.
const SECTIONS: Section[] = [
  {
    heading: "การยอมรับข้อกำหนด",
    body: [
      `การสมัครหรือใช้บริการ ${BRAND.name} ถือว่าคุณยอมรับข้อกำหนดและเงื่อนไขนี้`,
      "หากไม่ยอมรับ กรุณางดใช้บริการ",
    ],
  },
  {
    heading: "การใช้บริการ",
    body: [
      "คุณต้องให้ข้อมูลที่ถูกต้องและเป็นปัจจุบัน และรับผิดชอบในการรักษาความปลอดภัยของบัญชี",
      "ห้ามใช้บริการเพื่อการที่ผิดกฎหมาย ละเมิดสิทธิผู้อื่น หรือรบกวนการทำงานของระบบ",
    ],
  },
  {
    heading: "การชำระเงินและการคืนเงิน",
    body: [
      "ค่าบริการเป็นแบบเติมวันใช้งานล่วงหน้า ตามอัตราที่แสดงในหน้าชำระเงิน",
      "วันใช้งานที่เติมแล้วโดยทั่วไปไม่สามารถขอคืนเงินได้ เว้นแต่กรณีที่กฎหมายกำหนด",
    ],
  },
  {
    heading: "การระงับและการยกเลิก",
    body: [
      "เราขอสงวนสิทธิ์ระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนด หรือเมื่อวันใช้งานหมดอายุ",
      "คุณสามารถหยุดใช้บริการได้ทุกเมื่อ ข้อมูลจะถูกจัดการตามนโยบายความเป็นส่วนตัว",
    ],
  },
  {
    heading: "ข้อจำกัดความรับผิด",
    body: [
      `${BRAND.name} ให้บริการตามสภาพ (as-is) และไม่รับประกันว่าบริการจะไม่มีข้อขัดข้องใด ๆ`,
      "เราจะพยายามอย่างเต็มที่ในการรักษาความต่อเนื่องและความปลอดภัยของบริการ",
    ],
  },
  {
    heading: "การเปลี่ยนแปลงข้อกำหนด",
    body: [
      "เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว และจะแจ้งให้ทราบผ่านบริการเมื่อมีการเปลี่ยนแปลงสำคัญ",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <ScrollText className="mx-auto size-9 text-brand-500" />
        <h1 className="mt-2 text-2xl font-bold text-brand-700">
          ข้อกำหนดการใช้งาน
        </h1>
        <p className="mt-1 text-sm text-muted">
          เงื่อนไขการใช้บริการ {BRAND.name}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {SECTIONS.map((s) => (
          <Card key={s.heading} className="flex flex-col gap-2">
            <h2 className="font-semibold text-foreground">{s.heading}</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <footer className="flex flex-wrap justify-center gap-4">
        <Link
          href="/privacy"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          นโยบายความเป็นส่วนตัว
        </Link>
        <Link
          href="/info"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
        >
          <ArrowLeft className="size-4" />
          กลับไปหน้าเกี่ยวกับระบบ
        </Link>
      </footer>
    </main>
  );
}
