/**
 * Printable shop guides — content as data, shared by every shop.
 * Screenshots live in /public/guides (captured from staging, callouts baked in).
 * The QR on each printed guide deep-links to `targetPath` on the current host;
 * logged-out scans go through /login?next=… and come back (see safe-next.ts).
 */
export type GuideText = { th: string; en: string };
export type GuideAudience = "owner" | "staff" | "customer" | "rider";
export type GuideStep = { image?: string; text: GuideText };
export type ShopGuide = {
  slug: string;
  title: GuideText;
  purpose: GuideText;
  audience: GuideAudience[];
  targetPath: string;
  /** "none": no QR (rider personal links must never be printed). "order-enter": QR is the shop's HMAC order-claim link (/s/<slug>/enter?t=…), minted per render. */
  qr?: "order-enter" | "none";
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
  {
    slug: "manage-orders",
    title: { th: "จัดการออเดอร์ลูกค้า ตั้งแต่ต้นจนจบ", en: "Handle customer orders, start to finish" },
    purpose: {
      th: "รับออเดอร์ใหม่ เลื่อนสถานะ ส่งให้ลูกค้า/ไรเดอร์ รับเงิน และยกเลิกเมื่อจำเป็น",
      en: "Take new orders, move them through statuses, hand off, take payment and cancel when needed",
    },
    audience: ["owner", "staff"],
    targetPath: "/shop/orders",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/orders-1.png", text: { th: "ออเดอร์ใหม่เข้าแท็บ “ออเดอร์” (คิวออเดอร์) ในกลุ่ม “รอรับ” — หน้าอัปเดตเองทุก 15 วินาที กด “รีเฟรช” ได้ และมีแจ้งเตือนที่ไอคอนกระดิ่ง (ไม่มีเสียง)", en: "New orders land in Orders → “Pending”; the page refreshes every 15 s (or tap Refresh) and the bell shows a notification (no sound)." } },
      { image: "/guides/orders-2.png", text: { th: "อ่านการ์ด: เลขออเดอร์ #, ช่องทาง (kiosk/เคาน์เตอร์/ออนไลน์), ทานที่ร้าน/รับเอง/ส่งถึงบ้าน, จ่ายแล้วหรือยัง, รายการและหมายเหตุ", en: "Read the card: order #, channel, dine-in/pickup/delivery, paid or not, items and notes." } },
      { image: "/guides/orders-3.png", text: { th: "กด “เริ่มทำ” (→ กำลังทำ) ทำเสร็จกด “พร้อมเสิร์ฟ” เรียกเลข # ส่งให้ลูกค้า แล้วกด “เสร็จสิ้น” — ย้อนสถานะไม่ได้", en: "Tap “Start” (→ Preparing), then “Ready”, call the # and hand over, then “Complete”. Statuses can’t go back." } },
      { image: "/guides/orders-4.png", text: { th: "ส่งถึงบ้าน: กด “มอบหมาย” ที่ไรเดอร์ (เปลี่ยนได้จนกว่าไรเดอร์รับของ) ไรเดอร์อัปเดตในลิงก์ของตัวเอง เมื่อ “ส่งถึงแล้ว” ออเดอร์จะเสร็จสิ้นเอง", en: "Delivery: tap “Assign” on a rider (changeable until pickup). When the rider marks delivered, the order completes itself." } },
      { image: "/guides/orders-5.png", text: { th: "ได้รับเงิน (สแกน QR หรือเงินสด) แล้วกด “ยืนยันรับเงิน” — เก็บเงินปลายทางที่ไรเดอร์กดรับแล้ว ระบบตั้งเป็นจ่ายแล้วให้เอง", en: "After receiving payment (QR or cash) tap “Confirm payment”; rider-collected COD is marked paid automatically." } },
      { image: "/guides/orders-6.png", text: { th: "ยกเลิก: กด “ยกเลิก” ใส่เหตุผล แล้วกด “ยกเลิกออเดอร์” (กู้คืนไม่ได้, ทำได้ก่อนเสร็จสิ้นเท่านั้น) — ออเดอร์ที่ปิดแล้วดูได้ใน “ประวัติออเดอร์”", en: "Cancel: tap “Cancel”, enter a reason, confirm (irreversible, only before Complete). Closed orders are in Order history." } },
    ],
    tips: [
      { th: "ออเดอร์ไม่ขึ้น? กด “รีเฟรช” ตรวจว่าเปิดรับสั่งออนไลน์ และลูกค้าสแกน QR สั่งอาหารของร้านแล้ว", en: "Order missing? Tap Refresh; check online ordering is on and the customer scanned the shop’s order QR." },
      { th: "สั่งผิด/ลูกค้าเปลี่ยนใจ: แก้รายการในออเดอร์ไม่ได้ — ยกเลิกพร้อมเหตุผล แล้ว “เปิดออเดอร์” ใหม่ให้", en: "Wrong order: items can’t be edited — cancel with a reason and open a new order." },
      { th: "ลูกค้าถามสถานะ: ดูจากเลข # ในคิว ลูกค้าออนไลน์ดูเองได้ที่ “ออเดอร์ของฉัน”", en: "Customer asks for status: find their # in the queue; online customers can check “My orders”." },
    ],
  },
  {
    slug: "customer-order",
    title: { th: "วิธีสั่งอาหาร", en: "How to order" },
    purpose: {
      th: "สแกน QR แล้วสั่งอาหารจากมือถือของคุณได้เลย",
      en: "Scan the QR and order from your own phone",
    },
    audience: ["customer"],
    targetPath: "/s/[slug]/enter",
    qr: "order-enter",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/order-1.png", text: { th: "สแกน QR นี้ด้วยกล้องมือถือ จะเข้าหน้าสั่งอาหารของร้าน", en: "Scan this QR with your phone camera to open the order page." } },
      { image: "/guides/order-2.png", text: { th: "เลือกหมวดด้านบน เพื่อดูเมนูที่ต้องการ", en: "Pick a category to browse the menu." } },
      { image: "/guides/order-3.png", text: { th: "แตะเมนู เลือกตัวเลือก (ถ้ามี) แล้วกด “ใส่ตะกร้า”", en: "Tap a dish, choose options, add to cart." } },
      { image: "/guides/order-4.png", text: { th: "ตรวจจำนวนและยอดรวมในตะกร้า แถบด้านล่าง (กด + / − เพื่อแก้)", en: "Check items and total in the cart bar (use + / −)." } },
      { image: "/guides/order-5.png", text: { th: "กรอกข้อมูลที่ขอ (ถ้ามี) แล้วกด “เปิดออเดอร์” เพื่อส่งให้ร้าน", en: "Fill in any requested details, then tap “Place order”." } },
      { image: "/guides/order-6.png", text: { th: "สั่งแล้วจะเห็นเลขออเดอร์และสถานะ ดูย้อนหลังที่ “ออเดอร์ของฉัน”", en: "See your order number and status; history is under “My orders”." } },
    ],
    tips: [
      { th: "สแกนแล้วไม่เปิด? เปิดอินเทอร์เน็ต แล้วสแกนใหม่ด้วยกล้องมือถือ", en: "QR won’t open? Turn on internet and scan again with the camera." },
      { th: "เมนูขึ้นว่า “หมด” = สั่งไม่ได้ตอนนี้ เลือกเมนูอื่นแทน", en: "Item shows “Sold out”? Please choose another dish." },
      { th: "สั่งไม่ได้ หรือต้องการแก้ออเดอร์? เรียกพนักงานได้เลย", en: "Can’t order or need to change it? Call our staff." },
    ],
  },
  {
    slug: "getting-started",
    title: { th: "เริ่มต้นใช้งานร้าน", en: "Getting started" },
    purpose: { th: "เข้าสู่ระบบ ติดตั้งบนมือถือ และกรอกข้อมูลร้านให้ครบก่อนเปิดขาย", en: "Log in, install on your phone and fill in shop info before selling" },
    audience: ["owner"],
    targetPath: "/shop/settings",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/gs-1.png", text: { th: "เปิดหน้าเข้าสู่ระบบ ใส่อีเมลร้าน กด “ดำเนินการต่อ” แล้วใส่รหัสผ่าน (หรือเข้าด้วย Google / LINE ถ้าผูกไว้)", en: "Open the login page, enter the shop email, tap Continue, then the password (or Google / LINE if linked)." } },
      { text: { th: "เพิ่มลงหน้าจอหลัก: Android กดเมนู ⋮ → “เพิ่มไปยังหน้าจอหลัก” · iPhone (Safari) กดปุ่มแชร์ → “เพิ่มไปยังหน้าจอโฮม”", en: "Add to home screen: Android menu ⋮ → Add to Home screen · iPhone Safari Share → Add to Home Screen." } },
      { image: "/guides/gs-3.png", text: { th: "ตั้งค่า → แท็บ “ร้าน”: ชื่อร้าน หมวด พร้อมเพย์ (เบอร์/เลขบัตร ปชช.) เปิดรับสั่งออนไลน์ รับเอง/ส่งถึงบ้าน แล้วกด “บันทึก”", en: "Settings → Shop tab: name, category, PromptPay, online ordering, pickup/delivery, then Save." } },
      { image: "/guides/gs-4.png", text: { th: "แท็บ “รายละเอียด”: คำอธิบาย เวลาทำการ เบอร์โทร ลิงก์ LINE / Facebook / Instagram / เว็บไซต์ (แสดงบนหน้าร้าน) แล้วบันทึก", en: "Details tab: description, opening hours, phone, LINE / Facebook / Instagram / website links, then save." } },
      { image: "/guides/gs-5.png", text: { th: "แท็บ “รูปภาพ” ใส่โลโก้และรูปปก แล้วเปิดหน้าร้าน /s/ชื่อร้าน ตรวจว่าข้อมูลถูกต้อง", en: "Images tab: logo and cover, then open your storefront to check everything." } },
    ],
    tips: [
      { th: "ลืมรหัสผ่าน / เข้าไม่ได้? ติดต่อผู้ดูแลระบบเพื่อขอลิงก์เข้าสู่ระบบ", en: "Can’t log in? Contact the admin for a login link." },
      { th: "ลูกค้าจ่ายพร้อมเพย์ไม่ได้ = ยังไม่ได้กรอกพร้อมเพย์ หรือยังไม่กดบันทึก", en: "PromptPay missing at checkout = not filled in or not saved." },
      { th: "เมนูเพิ่มลงหน้าจอหลักไม่ขึ้น? เปิดด้วย Chrome (Android) หรือ Safari (iPhone)", en: "No “Add to home” option? Use Chrome (Android) or Safari (iPhone)." },
    ],
  },
  {
    slug: "print-qr",
    title: { th: "พิมพ์ QR และเมนู", en: "Print QR codes & menus" },
    purpose: { th: "พิมพ์ QR สั่งอาหาร QR ดูเมนู และเมนูแผ่นเดียว แล้ววางให้ลูกค้าเห็นง่าย", en: "Print the order QR, menu QR and one-sheet menu and place them where customers see them" },
    audience: ["owner"],
    targetPath: "/shop/settings",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/pq-1.png", text: { th: "QR สั่งอาหาร: ตั้งค่า → แท็บ “ร้าน” → การ์ด “QR พิมพ์สด / หมุนเวียน” กด “พิมพ์ QR” (ต้องเปิดรับสั่งออนไลน์ก่อน)", en: "Order QR: Settings → Shop tab → “Printable / rotating QR” → Print QR (online ordering must be on)." } },
      { image: "/guides/pq-2.png", text: { th: "QR ดูเมนู (ถาวร ดูได้อย่างเดียว สั่งไม่ได้): แท็บ “เมนู” → “QR เมนู” เลือกขนาด A6/A5/A4 สี และข้อความ แล้วพิมพ์", en: "Menu QR (permanent, view-only): Menu tab → “Menu QR”, pick A6/A5/A4, colour and caption, then print." } },
      { image: "/guides/pq-3.png", text: { th: "เมนูแผ่นเดียว: เปิดหน้าเมนูของร้าน กด “เมนูแผ่นเดียว”", en: "One-sheet menu: open your public menu and tap “One-sheet menu”." } },
      { image: "/guides/pq-4.png", text: { th: "เลือกกระดาษ A4 แนวตั้ง/นอน จำนวนคอลัมน์ แล้วกด “พิมพ์ / บันทึก PDF” (ปิด Headers and footers)", en: "Choose A4, orientation and columns, then “Print / Save PDF” (turn off headers and footers)." } },
      { text: { th: "วาง QR สั่งอาหารที่โต๊ะ/เคาน์เตอร์ในร้านเท่านั้น · QR ดูเมนูและเมนูแผ่นเดียว วางหน้าร้าน ประตู หรือแชร์ออนไลน์ได้", en: "Put the order QR only on tables/counter inside the shop; the menu QR and one-sheet menu can go outside or online." } },
    ],
    tips: [
      { th: "QR สั่งอาหารมีอายุ 14 วัน — พิมพ์ใหม่ทุก 2 สัปดาห์ (หรือเมื่อลูกค้าสแกนแล้วขึ้นว่าให้สแกน QR ที่ร้าน)", en: "The order QR expires after 14 days — reprint every 2 weeks." },
      { th: "ไม่เห็นการ์ด QR สั่งอาหาร = ยังไม่ได้ติ๊ก “เปิดรับสั่งออนไลน์” และบันทึก", en: "No order QR card = online ordering is off." },
      { th: "QR ดูเมนูสั่งอาหารไม่ได้ — ใช้คู่กับ QR สั่งอาหารเสมอ", en: "The menu QR can’t place orders — use it with the order QR." },
    ],
  },
  {
    slug: "delivery-riders",
    title: { th: "ไรเดอร์ส่งของของร้าน", en: "Delivery riders" },
    purpose: { th: "เพิ่มไรเดอร์ ส่งลิงก์ส่วนตัว มอบหมายงาน และเคลียร์เงินสดที่ไรเดอร์เก็บมา", en: "Add riders, send their personal link, assign jobs and settle cash they collected" },
    audience: ["owner"],
    targetPath: "/shop/riders",
    updated: "2026-11-02",
    steps: [
      { image: "/guides/dr-1.png", text: { th: "เพิ่มเติม → “ไรเดอร์” → กด “เพิ่มไรเดอร์” ใส่ชื่อ เบอร์ LINE ID และค่าตอบแทน (ต่อเที่ยว / % ค่าส่ง / ค่าส่งเต็ม) แล้วบันทึก", en: "More → Riders → “Add rider”: name, phone, LINE ID and pay (per trip / % of fee / full fee), save." } },
      { image: "/guides/dr-2.png", text: { th: "กด “สร้างลิงก์ไรเดอร์” คัดลอกลิงก์ (แสดงครั้งเดียว) ส่งให้ไรเดอร์ทาง LINE — “สร้างลิงก์ใหม่” จะทำให้ลิงก์เดิมใช้ไม่ได้ทันที", en: "Tap “Create rider link”, copy it (shown once) and send via LINE — regenerating kills the old link." } },
      { image: "/guides/orders-4.png", text: { th: "ออเดอร์ส่งถึงบ้าน: ในคิวออเดอร์ กด “มอบหมาย” ที่ไรเดอร์ (ดูว่าง/งานค้างได้) เปลี่ยนคนได้จนกว่าไรเดอร์กดรับของ", en: "Delivery order: in the queue tap “Assign” on a rider; you can change until pickup." } },
      { text: { th: "ไรเดอร์กด “รับของแล้ว” → “ส่งแล้ว” ในแอปของตน ออเดอร์จะเสร็จสิ้นเอง ถ้าเก็บเงินปลายทาง ไรเดอร์กด “เก็บเงินแล้ว” ออเดอร์เป็นจ่ายแล้ว", en: "Rider taps Picked up → Delivered; the order completes itself. COD: rider taps “Cash collected” → paid." } },
      { image: "/guides/dr-4.png", text: { th: "เคลียร์เงิน: “สรุปค่าตอบแทนไรเดอร์” เลือกช่วงวันที่ → ดูเที่ยว ค่าตอบแทน และเงินสดที่เก็บ รับเงินสดคืน แล้วจ่ายค่าตอบแทนเอง (ระบบแสดงยอดเท่านั้น)", en: "Settle: “Rider payout summary” by date → trips, pay and cash collected; collect cash, pay riders yourself (display only)." } },
    ],
    tips: [
      { th: "ไรเดอร์เปิดลิงก์ไม่ได้? ตรวจว่า “เปิดใช้งาน” อยู่ หรือสร้างลิงก์ใหม่แล้วส่งให้อีกครั้ง", en: "Rider link fails? Check the rider is active, or regenerate and resend." },
      { th: "มอบหมายใหม่ไม่ได้ = ไรเดอร์รับของไปแล้ว", en: "Can’t reassign = rider already picked up." },
      { th: "อย่าส่งลิงก์ไรเดอร์ในกลุ่ม — เป็นลิงก์ส่วนตัวที่เข้าแอปได้ทันที", en: "Never post a rider link in groups — it logs straight in." },
    ],
  },
  {
    slug: "rider-guide",
    title: { th: "คู่มือไรเดอร์", en: "Rider guide" },
    purpose: { th: "รับงาน ไปส่ง และดูรายได้จากลิงก์ส่วนตัวที่ร้านส่งให้", en: "Take jobs, deliver and see earnings from the personal link your shop sends" },
    audience: ["rider"],
    targetPath: "/rider",
    qr: "none",
    updated: "2026-11-02",
    steps: [
      { text: { th: "ขอลิงก์ส่วนตัวจากร้าน (ส่งทาง LINE) แล้วแตะเปิด — ไม่ต้องล็อกอิน ไม่ต้องมีรหัสผ่าน แนะนำเพิ่มลงหน้าจอหลัก", en: "Get your personal link from the shop (via LINE) and open it — no login. Add it to your home screen." } },
      { text: { th: "ตั้งสถานะ: กด “ตั้งเป็นว่าง” เมื่อพร้อมรับงาน หรือ “ตั้งเป็นไม่ว่าง” เมื่อพัก (ร้านเห็นสถานะนี้ตอนมอบหมาย)", en: "Set status: “Set available” when ready, “Set busy” on a break (the shop sees it when assigning)." } },
      { text: { th: "แท็บ “งาน”: งานที่ร้านมอบหมายจะขึ้นเป็น “รอรับของที่ร้าน” (อัปเดตทุก 30 วินาที) มีที่อยู่ จุดสังเกต ยอด และวิธีจ่าย", en: "Jobs tab: assigned jobs show “Waiting at shop” (refresh every 30 s) with address, landmark, total and payment." } },
      { text: { th: "รับอาหารที่ร้านแล้วกด “รับของแล้ว” → กด “นำทาง” / “เปิดใน Google Maps” หรือ “โทรหาลูกค้า”", en: "At the shop tap “Picked up”, then Navigate / Google Maps or call the customer." } },
      { text: { th: "ส่งถึงมือลูกค้าแล้วกด “ส่งแล้ว” · ถ้าเป็นเก็บเงินปลายทาง รับเงินแล้วกด “เก็บเงินแล้ว”", en: "After handing over tap “Delivered”; for cash on delivery, collect and tap “Cash collected”." } },
      { text: { th: "แท็บ “รายได้”: เที่ยวและรายได้วันนี้/สัปดาห์นี้ และ “เงินสดที่ต้องคืนร้าน” — นำเงินสดคืนร้านตามยอดนี้", en: "Earnings tab: trips and pay today/this week and “Cash to return to the shop”." } },
    ],
    tips: [
      { th: "ลิงก์ขึ้นว่าใช้ไม่ได้? ขอลิงก์ใหม่จากร้าน (ลิงก์เดิมถูกยกเลิก)", en: "Link says invalid? Ask the shop for a new one." },
      { th: "ไม่เห็นงาน? ตรวจว่าตั้งเป็น “ว่าง” และให้ร้านกดมอบหมายให้คุณ", en: "No jobs? Make sure you’re available and the shop assigned you." },
      { th: "ห้ามส่งต่อลิงก์ให้คนอื่น — ใครมีลิงก์ก็เข้าแอปในชื่อคุณได้", en: "Never share your link — anyone with it acts as you." },
    ],
  },
];

export const GUIDES_PAGE_SIZE = 12;

/** Training checklist: every guide in one of these groups (order = training order). */
export type TrainingGroupId = "setup" | "daily" | "customer" | "rider" | "addons";
export const TRAINING_GROUPS: { id: TrainingGroupId; slugs: string[] }[] = [
  { id: "setup", slugs: ["getting-started", "open-close-shop", "print-qr"] },
  { id: "daily", slugs: ["manage-orders", "manage-menu"] },
  { id: "customer", slugs: ["customer-order"] },
  { id: "rider", slugs: ["delivery-riders", "rider-guide"] },
  { id: "addons", slugs: ["loyalty", "promotions"] },
];

export function findGuide(slug: string): ShopGuide | undefined {
  return SHOP_GUIDES.find((g) => g.slug === slug);
}

export function pageGuides(page: number, size = GUIDES_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(SHOP_GUIDES.length / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  return { items: SHOP_GUIDES.slice((p - 1) * size, p * size), page: p, totalPages };
}
