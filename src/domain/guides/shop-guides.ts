/**
 * Printable shop guides — content as data, shared by every shop.
 * Screenshots live in /public/guides (captured from staging, callouts baked in).
 * The QR on each printed guide deep-links to `targetPath` on the current host;
 * logged-out scans go through /login?next=… and come back (see safe-next.ts).
 */
export type GuideText = { th: string; en: string };
export type GuideAudience = "owner" | "staff";
export type GuideStep = { image?: string; text: GuideText };
export type ShopGuide = {
  slug: string;
  title: GuideText;
  purpose: GuideText;
  audience: GuideAudience[];
  targetPath: string;
  updated: string; // YYYY-MM-DD
  steps: GuideStep[];
  tips: GuideText[];
};

export const SHOP_GUIDES: ShopGuide[] = [
  {
    slug: "open-close-shop",
    title: { th: "เปิด / ปิดร้าน", en: "Open / close the shop" },
    purpose: {
      th: "เปิดหรือหยุดรับออเดอร์ออนไลน์ และปิดร้านชั่วคราวเมื่อหยุดขาย",
      en: "Turn online ordering on/off and pause the shop when you stop selling",
    },
    audience: ["owner"],
    targetPath: "/shop/settings",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/open-close-1.png", text: { th: "ไปที่ เพิ่มเติม → ตั้งค่า แล้วติ๊ก “เปิดรับสั่งออนไลน์” เพื่อให้ลูกค้าสั่งจากหน้าร้านบนเว็บได้ (เอาติ๊กออก = หยุดรับออนไลน์)", en: "Go to More → Settings and tick “Accept online orders” (untick to stop)." } },
      { image: "/guides/open-close-2.png", text: { th: "กด “บันทึก” ทุกครั้งหลังเปลี่ยนการตั้งค่า", en: "Tap “Save” after every change." } },
      { image: "/guides/open-close-3.png", text: { th: "หยุดขายหลายวัน? เลื่อนลงไปที่ส่วน “ปิดร้านชั่วคราว” — ระหว่างปิด ระบบหยุดนับวันใช้งาน (มีจำนวนครั้งที่ปิดได้ต่อเดือน)", en: "Closing for days? Scroll to “Pause shop” — usage days stop counting while paused (limited times per month)." } },
      { image: "/guides/open-close-4.png", text: { th: "กด “ปิดร้านชั่วคราว” และยืนยัน เมื่อพร้อมขายอีกครั้ง กด “เปิดร้าน” ในส่วนเดียวกัน", en: "Tap “Pause shop” and confirm; tap “Open shop” in the same section to reopen." } },
    ],
    tips: [
      { th: "ลูกค้าเห็น “ร้านปิดรับออเดอร์ชั่วคราว”? ตรวจว่าติ๊กเปิดรับสั่งออนไลน์และกดบันทึกแล้ว", en: "Customers see “temporarily closed”? Check online ordering is ticked and saved." } ,
      { th: "ปุ่มปิดร้านกดไม่ได้ = ใช้สิทธิ์ปิดครบตามโควตาเดือนนี้แล้ว", en: "Pause button disabled = monthly pause quota used up." },
    ],
  },
  {
    slug: "manage-menu",
    title: { th: "จัดการเมนู", en: "Manage the menu" },
    purpose: {
      th: "เพิ่ม/แก้ไขเมนู เปิด–ปิดการขาย และแก้หลายเมนูพร้อมกัน",
      en: "Add/edit items, toggle availability and bulk-edit many items",
    },
    audience: ["owner", "staff"],
    targetPath: "/shop/menu",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/menu-1.png", text: { th: "เปิดแท็บ “เมนู” พิมพ์ชื่อหมวด แล้วกด “เพิ่มหมวด” (ต้องมีหมวดก่อนจึงเพิ่มเมนูได้)", en: "Open the Menu tab, type a category name and tap “Add category”." } },
      { image: "/guides/menu-2.png", text: { th: "กดไอคอนดินสอ “แก้ไข” เพื่อเปลี่ยนชื่อ ราคา รูป หรือหมวดของเมนู", en: "Tap the pencil “Edit” icon to change name, price, photo or category." } },
      { image: "/guides/menu-3.png", text: { th: "ของหมด? กดปุ่ม “พร้อมขาย” เพื่อสลับเป็นหมด ลูกค้าจะสั่งเมนูนั้นไม่ได้ทันที", en: "Sold out? Tap “Available” to toggle it off instantly." } },
      { image: "/guides/menu-4.png", text: { th: "แก้หลายเมนูพร้อมกัน: กด “แก้ไขหลายรายการ” ค้นหา/กรองหมวด แล้วติ๊กเลือกเมนู", en: "Bulk edit: tap “Edit multiple”, search/filter, then tick items." } },
      { image: "/guides/menu-5.png", text: { th: "เลือกคำสั่งในแถบล่าง (หมด/ขาย, ราคา, ย้ายหมวด, แนะนำ, ลบ) ตรวจตัวอย่าง แล้วยืนยัน — กด “เลิกทำ” ได้ถ้าผิด", en: "Pick an action in the bar, check the preview, confirm — tap “Undo” if wrong." } },
    ],
    tips: [
      { th: "ลบหลายเมนู ต้องพิมพ์จำนวนรายการให้ตรงก่อนปุ่มยืนยันจะกดได้", en: "Bulk delete requires typing the exact item count first." },
      { th: "ราคาปรับเป็น % แล้วติดลบหรือผิด ระบบจะแจ้งเตือนและไม่ให้ยืนยัน", en: "Invalid/negative price changes are blocked with a warning." },
      { th: "รับเฉพาะเมนูฮาลาล — ห้ามหมู แฮม เบคอน หรือแอลกอฮอล์", en: "Halal menus only — no pork, ham, bacon or alcohol." },
    ],
  },
  {
    slug: "loyalty",
    title: { th: "ระบบสะสมแต้ม", en: "Loyalty (stamps & points)" },
    purpose: {
      th: "ให้ลูกค้าสะสมแสตมป์/แต้มด้วยเบอร์โทร และแลกรางวัลที่เคาน์เตอร์",
      en: "Let customers collect stamps/points by phone and redeem at the counter",
    },
    audience: ["owner", "staff"],
    targetPath: "/shop/loyalty",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/loyalty-1.png", text: { th: "เปิดแท็บ “สะสม” (สถานีสะสม) ถ้าขึ้นว่าโมดูลยังไม่เปิด ต้องขอสิทธิ์จากแอดมินก่อน", en: "Open the Loyalty tab; if the module is off, ask the admin for access first." } },
      { image: "/guides/loyalty-3.png", text: { th: "ขอสิทธิ์: ตั้งค่า → “ติดต่อผู้ดูแล” แจ้งว่าต้องการใช้ระบบสะสม", en: "Request access: Settings → “Contact admin”." } },
      { image: "/guides/loyalty-2.png", text: { th: "เมื่อได้สิทธิ์ ไปที่ตั้งค่าร้าน ติ๊ก “เปิดโมดูลสะสมของร้าน” เลือกบัตรแสตมป์และ/หรือแต้ม แล้วบันทึก", en: "Once allowed, in Settings tick “Enable loyalty”, choose stamps and/or points, save." } },
      { text: { th: "ตั้งค่า: “จัดการประเภทแสตมป์” (จำนวนดวง + รางวัล) หรือ “ตั้งค่าแต้มและรางวัล” (กี่บาท = 1 แต้ม)", en: "Set up stamp types (count + reward) or points rate and rewards." } },
      { text: { th: "หน้าเคาน์เตอร์: ที่สถานีสะสม พิมพ์เบอร์ลูกค้า → “ค้นหา” → “เพิ่มแสตมป์/เพิ่มแต้ม” หรือ “แลกรางวัล”", en: "At the counter: enter phone → Search → Add stamps/points or Redeem." } },
    ],
    tips: [
      { th: "ค้นหาไม่เจอ? ตรวจเบอร์ให้ครบ 10 หลัก ไม่มีขีด", en: "Not found? Use the full 10-digit phone, no dashes." },
      { th: "ลูกค้าดูแต้มของตัวเองได้หลังสแกน QR สมาชิกที่ร้าน", en: "Customers see their balance after scanning the member QR." },
    ],
  },
  {
    slug: "promotions",
    title: { th: "โปรโมชั่น", en: "Promotions" },
    purpose: {
      th: "สร้างการ์ดโปรโมชันที่ลูกค้าเห็นในหน้าร้าน พร้อมกำหนดช่วงวันที่",
      en: "Create promo cards customers see on your storefront, with date ranges",
    },
    audience: ["owner"],
    targetPath: "/shop/promotions",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/loyalty-3.png", text: { th: "ขอสิทธิ์โมดูลโปรโมชันจากแอดมิน: ตั้งค่า → “ติดต่อผู้ดูแล”", en: "Ask the admin to allow promotions: Settings → “Contact admin”." } },
      { image: "/guides/promotions-1.png", text: { th: "ถ้าหน้าโปรโมชันขึ้นว่า “แอดมินยังไม่อนุญาต” แปลว่ายังรอสิทธิ์อยู่", en: "“Admin hasn’t allowed promotions” means access is still pending." } },
      { text: { th: "ได้สิทธิ์แล้ว: ตั้งค่า → ติ๊ก “เปิดโมดูลโปรโมชันของร้าน” → บันทึก → “จัดการโปรโมชัน”", en: "Once allowed: Settings → tick “Enable promotions” → Save → “Manage promotions”." } },
      { text: { th: "กรอกหัวข้อ คำอธิบาย รูป (ลิงก์ https) และวันที่เริ่ม/สิ้นสุด (ว่าง = แสดงตลอด) แล้วกด “เพิ่มโปรโมชัน”", en: "Fill title, description, image link and dates (blank = always), tap “Add promotion”." } },
      { text: { th: "กด “ปิดใช้งาน/เปิดใช้งาน” เพื่อซ่อน–แสดง หรือ “ลบ” เมื่อหมดโปร", en: "Use Deactivate/Activate to hide/show, or Delete when it ends." } },
    ],
    tips: [
      { th: "โปรไม่ขึ้นหน้าร้าน? ตรวจว่าสถานะ “เปิดอยู่” และอยู่ในช่วงวันที่", en: "Not showing? Check it is active and within its dates." },
      { th: "รูปต้องเป็นลิงก์ https เท่านั้น", en: "Image must be an https link." },
    ],
  },
];

export const GUIDES_PAGE_SIZE = 6;

export function findGuide(slug: string): ShopGuide | undefined {
  return SHOP_GUIDES.find((g) => g.slug === slug);
}

export function pageGuides(page: number, size = GUIDES_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(SHOP_GUIDES.length / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  return { items: SHOP_GUIDES.slice((p - 1) * size, p * size), page: p, totalPages };
}
