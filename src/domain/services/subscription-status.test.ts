/**
 * Tests for the pause-shop billing logic.
 * Run: npx tsx --test src/domain/services/subscription-status.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { computeBillingState, resumeDueDate } from "./subscription-status";

const DAY = 24 * 60 * 60 * 1000;

test("paused: frozen state, not suspended, days frozen at pausedAt", () => {
  const now = new Date("2026-06-16T00:00:00.000Z");
  const due = new Date(now.getTime() + 10 * DAY).toISOString();
  const pausedAt = now.toISOString();
  const s = computeBillingState({ currentPeriodDueAt: due, pausedAt }, now);
  assert.equal(s.state, "paused");
  assert.equal(s.isPaused, true);
  assert.equal(s.isSuspended, false);
  assert.equal(s.daysUntilDue, 10);
  assert.equal(s.bannerLevel, 0);
  assert.equal(s.preExpiryBannerLevel, 0);
});

test("paused: time passing does NOT consume days or suspend", () => {
  const pausedAt = "2026-06-16T00:00:00.000Z";
  const due = new Date(new Date(pausedAt).getTime() + 5 * DAY).toISOString();
  // 'now' is 100 days after pause — would normally be long-suspended.
  const now = new Date(new Date(pausedAt).getTime() + 100 * DAY);
  const s = computeBillingState({ currentPeriodDueAt: due, pausedAt }, now);
  assert.equal(s.state, "paused");
  assert.equal(s.isSuspended, false);
  assert.equal(s.daysUntilDue, 5); // still frozen at the pause instant
});

test("admin suspension overrides pause", () => {
  const now = new Date("2026-06-16T00:00:00.000Z");
  const due = new Date(now.getTime() + 10 * DAY).toISOString();
  const s = computeBillingState(
    { currentPeriodDueAt: due, pausedAt: now.toISOString(), shopStatus: "suspended_by_admin" },
    now,
  );
  assert.equal(s.state, "suspended");
  assert.equal(s.isSuspended, true);
  assert.equal(s.isPaused, false);
});

test("not paused → normal active computation (isPaused false)", () => {
  const now = new Date("2026-06-16T00:00:00.000Z");
  const due = new Date(now.getTime() + 3 * DAY).toISOString();
  const s = computeBillingState({ currentPeriodDueAt: due, pausedAt: null }, now);
  assert.equal(s.state, "active");
  assert.equal(s.isPaused, false);
  assert.equal(s.daysUntilDue, 3);
});

test("resumeDueDate pushes due forward by the paused span", () => {
  const pausedAt = "2026-06-16T00:00:00.000Z";
  const due = "2026-06-26T00:00:00.000Z"; // 10 days from pause
  const now = new Date(new Date(pausedAt).getTime() + 7 * DAY); // paused 7 days
  const newDue = resumeDueDate(due, pausedAt, now);
  // due shifts forward exactly 7 days → remaining (newDue - now) stays 10 days.
  assert.equal(newDue, "2026-07-03T00:00:00.000Z");
  const remainingDays = Math.round(
    (new Date(newDue).getTime() - now.getTime()) / DAY,
  );
  assert.equal(remainingDays, 10);
});

test("resumeDueDate: negative span guarded (clock skew) → no shift", () => {
  const pausedAt = "2026-06-16T00:00:00.000Z";
  const due = "2026-06-26T00:00:00.000Z";
  const now = new Date(new Date(pausedAt).getTime() - 1000); // now before pause
  assert.equal(resumeDueDate(due, pausedAt, now), due);
});

test("resumeDueDate: pausing under a full day refunds nothing (anti-arbitrage)", () => {
  const pausedAt = "2026-06-16T00:00:00.000Z";
  const due = "2026-06-26T00:00:00.000Z";
  // Closed only 16h (e.g. overnight) → less than a whole day → no credit.
  const now = new Date(new Date(pausedAt).getTime() + 16 * 60 * 60 * 1000);
  assert.equal(resumeDueDate(due, pausedAt, now), due);
});

test("resumeDueDate: partial days are floored to whole days", () => {
  const pausedAt = "2026-06-16T00:00:00.000Z";
  const due = "2026-06-26T00:00:00.000Z";
  // Closed 2.5 days → credited only 2 whole days.
  const now = new Date(new Date(pausedAt).getTime() + 2.5 * DAY);
  assert.equal(resumeDueDate(due, pausedAt, now), "2026-06-28T00:00:00.000Z");
});

test("frozenDaysSoFar: whole days closed shown for the resume preview", () => {
  const pausedAt = "2026-06-16T00:00:00.000Z";
  const due = "2026-06-26T00:00:00.000Z";
  // Closed only 16h → 0 whole days creditable yet.
  const just16h = new Date(new Date(pausedAt).getTime() + 16 * 60 * 60 * 1000);
  assert.equal(
    computeBillingState({ currentPeriodDueAt: due, pausedAt }, just16h)
      .frozenDaysSoFar,
    0,
  );
  // Closed 2.5 days → 2 whole days creditable.
  const twoAndHalf = new Date(new Date(pausedAt).getTime() + 2.5 * DAY);
  assert.equal(
    computeBillingState({ currentPeriodDueAt: due, pausedAt }, twoAndHalf)
      .frozenDaysSoFar,
    2,
  );
});
