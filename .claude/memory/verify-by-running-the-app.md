---
name: verify-by-running-the-app
description: "User insists features be verified by actually running the app (not just tsc/lint/build), and that wrong recorded requirements be fixed"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1a43c7ec-1fa7-4ad3-b55c-a5c2837e5bb4
---

On Easy Order ([[project-easy-order]]), the user pushed hard on two things:

1. **"Done" requires running the real app, not just the static gate.** Early on I claimed a
feature was "all green" off `tsc`/`lint`/`npm test`/`next build` — but had never started the dev
server. The user found it broken (a fresh clone's `local.db` was empty → `no such table`) and
called it out: *"พังเรา clone มาแล้ว ยังไม่ได่เทสอะไรเลย … คุณยังไม่ได้เทส"*.

**Why:** `npm test` is unit/integration only; Playwright e2e (`npm run test:e2e`) is separate, and
neither proves pages render. A passing build hides runtime/DB/env failures.

**How to apply:** for any user-facing change, after the static gate, **boot `npm run dev` and drive
the real flow** (Playwright headless against the seeded local DB works well here — set the device/
session cookie or log in, click through, then assert via the page AND the sqlite DB). This caught
real bugs this session (orphan-cron deleting menu images; a fixed submit bar colliding with the
bottom app nav). Report what was actually exercised.

2. **Fix wrong recorded requirements, don't just code around them.** The cloned handoff had
mislabeled scope ("customers anonymous / no accounts", "shop directory out of scope"). The user
wanted the docs (AGENTS.md Project Summary, README, `.claude/memory/`) corrected — and kept
accurate as features ship (mark "planned" vs "built"). When a memory/doc says a feature is
out-of-scope or not built, re-confirm against reality before trusting it.
