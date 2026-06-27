import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Card } from "@/src/presentation/components/ui/Card";
import { BRAND } from "@/src/config/brand";

export const metadata: Metadata = {
  title: `นโยบายความเป็นส่วนตัว · ${BRAND.name}`,
  description: `ข้อมูลส่วนบุคคลที่ ${BRAND.name} เก็บ วัตถุประสงค์ และสิทธิ์ของเจ้าของข้อมูลตาม PDPA`,
};

interface Section {
  heading: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    heading: "ข้อมูลที่เราเก็บ",
    body: [
      "เบอร์โทรศัพท์ และชื่อ (ถ้าให้ไว้) ของลูกค้า เพื่อใช้ระบุตัวตนและผูกประวัติการสั่ง",
      "ประวัติการสั่งอาหาร (รายการ ยอดเงิน และสถานะ) และร้านที่ผูกอุปกรณ์ไว้",
    ],
  },
  {
    heading: "วัตถุประสงค์",
    body: [
      "ใช้เพื่อให้บริการสั่งอาหารของร้านค้าเท่านั้น เช่น บันทึกออเดอร์ และแสดงประวัติการสั่ง",
      "เราไม่ขายหรือเปิดเผยข้อมูลของคุณให้บุคคลภายนอกเพื่อการตลาด",
    ],
  },
  {
    heading: "การเก็บรักษาและความปลอดภัย",
    body: [
      "ข้อมูลถูกเก็บแยกตามร้าน และเข้าถึงได้เฉพาะร้านค้าที่คุณเป็นสมาชิก",
      "ประวัติบนอุปกรณ์ผูกด้วยรหัสลับเฉพาะเครื่อง เพื่อป้องกันผู้อื่นสวมสิทธิ",
    ],
  },
  {
    heading: "สิทธิ์ของคุณ (ตาม PDPA)",
    body: [
      "คุณมีสิทธิ์ขอเข้าถึง แก้ไข หรือขอลบข้อมูลส่วนบุคคลของคุณได้",
      "ติดต่อร้านค้าที่คุณเป็นสมาชิกเพื่อใช้สิทธิ์ดังกล่าว",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <ShieldCheck className="mx-auto size-9 text-brand-500" />
        <h1 className="mt-2 text-2xl font-bold text-brand-700">
          นโยบายความเป็นส่วนตัว
        </h1>
        <p className="mt-1 text-sm text-muted">
          {BRAND.name} เคารพข้อมูลส่วนบุคคลของคุณตาม พ.ร.บ.
          คุ้มครองข้อมูลส่วนบุคคล (PDPA)
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

      <footer className="text-center">
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
