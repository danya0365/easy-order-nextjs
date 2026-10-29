import { test } from "node:test";
import assert from "node:assert/strict";

import {
  assertHalalMenuContent,
  isNonHalalMenuText,
  HALAL_MENU_REJECT_MESSAGE,
} from "./halal-menu";

test("allows Halal dishes", () => {
  for (const n of [
    "ข้าวกะเพราไก่ไข่ดาว",
    "ต้มยำกุ้ง",
    "ไก่ล้านตัว",
    "ข้าวผัดกุ้ง",
    "น้ำเปล่า",
    "ชาเย็น",
  ]) {
    assert.equal(isNonHalalMenuText(n), false);
  }
});

test("blocks pork and alcohol", () => {
  for (const n of [
    "ข้าวผัดหมู",
    "หมูทอด",
    "เบคอนกรอบ",
    "แฮมชีส",
    "ไส้กรอกทอด",
    "เบียร์ช้าง",
    "Pork fried rice",
    "Bacon wrap",
  ]) {
    assert.equal(isNonHalalMenuText(n), true, n);
  }
});

test("assert throws with Thai message", () => {
  assert.throws(
    () => assertHalalMenuContent("ข้าวหมูแดง"),
    (e: Error) => e.message === HALAL_MENU_REJECT_MESSAGE,
  );
  assert.doesNotThrow(() => assertHalalMenuContent("ข้าวไก่ย่าง"));
  assert.throws(
    () => assertHalalMenuContent("น้ำสมุนไพร", "ผสมเบียร์เล็กน้อย"),
    (e: Error) => e.message === HALAL_MENU_REJECT_MESSAGE,
  );
});
