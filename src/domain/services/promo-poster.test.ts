/**
 * Pure-function tests. Run via Node's built-in runner + tsx:
 *   node scripts/test.mjs   (enumerates *.test.ts under src/)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PROMO_GOAL_PRESETS,
  POSTER_SIZES,
  getPosterSize,
  getPromoPreset,
  buildTemplateCopy,
  buildAiPromptSegments,
  composeAiPrompt,
  type PromoCopyContext,
  type PromoGoal,
  type PosterSize,
} from "./promo-poster";

const CTX: PromoCopyContext = {
  shopName: "ร้านกาแฟดีดี",
  highlight: "ลด 10% เมนูใหม่",
};

const ALL_GOALS: PromoGoal[] = PROMO_GOAL_PRESETS.map((p) => p.goal);
const ALL_SIZES: PosterSize[] = POSTER_SIZES.map((s) => s.id);

test("every preset is resolvable and has non-empty copy + prompt seeds", () => {
  assert.equal(PROMO_GOAL_PRESETS.length, 5);
  for (const goal of ALL_GOALS) {
    const p = getPromoPreset(goal);
    assert.ok(p.labelKey.length > 0, `${goal} labelKey`);
    assert.ok(p.headline.length > 0, `${goal} headline`);
    assert.ok(p.subcopyDefault.length > 0, `${goal} subcopyDefault`);
    assert.ok(p.valueLine.length > 0, `${goal} valueLine`);
    assert.ok(p.promptMood.length > 0, `${goal} mood`);
    assert.ok(p.promptVibeSeed.length > 0, `${goal} vibe`);
  }
});

test("customer copy never implies signup/login", () => {
  // Easy Order: customers order at the in-store tablet with no account. Guard the
  // copy so a future edit can't reintroduce "register / log in" framing.
  for (const goal of ALL_GOALS) {
    const copy = buildTemplateCopy(goal, CTX);
    for (const line of [copy.headline, copy.subcopy, copy.valueLine]) {
      assert.ok(
        !/สมัครสมาชิก|เข้าสู่ระบบ|ล็อกอิน|login/i.test(line),
        `forbidden signup wording in "${line}"`,
      );
    }
  }
});

test("unknown goal / size throw", () => {
  assert.throws(() => getPromoPreset("nope" as PromoGoal));
  assert.throws(() => getPosterSize("nope" as PosterSize));
});

test("template copy substitutes every placeholder (no stray braces)", () => {
  for (const goal of ALL_GOALS) {
    const copy = buildTemplateCopy(goal, CTX);
    for (const line of [copy.headline, copy.subcopy, copy.valueLine]) {
      assert.ok(!/[{}]/.test(line), `unsubstituted placeholder in: ${line}`);
    }
  }
});

test("template copy injects shop data; owner highlight wins the subcopy", () => {
  const copy = buildTemplateCopy("new_customer", CTX);
  // headline = "แวะชิมที่ {shopName}" → shop name injected.
  assert.ok(copy.headline.includes("ร้านกาแฟดีดี"), "shopName injected");
  // A non-empty highlight overrides the goal's default supporting line.
  assert.equal(copy.subcopy, "ลด 10% เมนูใหม่");
  // With a blank highlight, the preset's default subcopy is used instead.
  const blank = buildTemplateCopy("new_customer", { shopName: "ร้าน X", highlight: "" });
  assert.equal(blank.subcopy, getPromoPreset("new_customer").subcopyDefault);
});

test("AI prompt aspect segment matches each size", () => {
  for (const size of ALL_SIZES) {
    const segs = buildAiPromptSegments("festival", CTX, size);
    assert.equal(segs.locked.aspect, getPosterSize(size).aspectPhrase);
  }
});

test("composeAiPrompt always keeps locked no-text + aspect, even after edits", () => {
  const segs = buildAiPromptSegments("new_customer", CTX, "ig_square");
  segs.editable.subject = "ลาเต้อาร์ตในแก้วใส";
  segs.editable.vibe = "โทนพาสเทล";
  const prompt = composeAiPrompt(segs);

  assert.ok(prompt.includes("ลาเต้อาร์ตในแก้วใส"), "edited subject kept");
  assert.ok(prompt.includes("โทนพาสเทล"), "edited vibe kept");
  assert.ok(prompt.includes(segs.locked.noText), "locked no-text kept");
  assert.ok(prompt.includes(segs.locked.aspect), "locked aspect kept");
  assert.ok(prompt.includes(segs.locked.style), "locked style kept");
});

test("composeAiPrompt drops empty editable parts without dangling commas", () => {
  const segs = buildAiPromptSegments("weekday_boost", CTX, "story_9x16");
  segs.editable.subject = "";
  segs.editable.vibe = "";
  const prompt = composeAiPrompt(segs);
  assert.ok(!prompt.includes(", ,"), "no empty segment artifacts");
  assert.ok(!prompt.startsWith(","), "no leading comma");
  assert.ok(prompt.includes(segs.locked.noText));
});

test("all poster sizes have positive pixel dimensions", () => {
  assert.equal(POSTER_SIZES.length, 4);
  for (const s of POSTER_SIZES) {
    assert.ok(s.w > 0 && s.h > 0, `${s.id} dims`);
    assert.ok(s.aspectPhrase.length > 0, `${s.id} aspect phrase`);
  }
});
