import { after, afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { migrateTestDb } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { GenerateLineLinkCodeUseCase } from "@/src/application/use-cases/line/GenerateLineLinkCodeUseCase";

const SECRET = "test-channel-secret";
const TOKEN = "test-access-token";

let GET: typeof import("./route").GET;
let POST: typeof import("./route").POST;

const realFetch = global.fetch;
let fetchCalls: Array<{ url: string; body: string }> = [];

function sign(raw: string): string {
  return createHmac("sha256", SECRET).update(raw).digest("base64");
}

function eventsBody(events: unknown[]): string {
  return JSON.stringify({ events });
}

function postWebhook(
  raw: string,
  opts: { signature?: string | null } = {},
): Promise<Response> {
  const signature = "signature" in opts ? opts.signature : sign(raw);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (typeof signature === "string") headers["x-line-signature"] = signature;
  return POST(
    new Request("http://localhost/api/line/webhook", {
      method: "POST",
      headers,
      body: raw,
    }),
  );
}

async function userWithCode(
  email: string,
): Promise<{ userId: string; code: string }> {
  const u = await container.userRepository.create({
    email,
    passwordHash: "x",
    role: "shop_owner",
  });
  const code = await new GenerateLineLinkCodeUseCase(
    container.userRepository,
  ).execute(u.id);
  return { userId: u.id, code };
}

before(async () => {
  process.env.LINE_CHANNEL_SECRET = SECRET;
  process.env.LINE_CHANNEL_ACCESS_TOKEN = TOKEN;
  await migrateTestDb();
  ({ GET, POST } = await import("./route"));
});
beforeEach(() => {
  fetchCalls = [];
  global.fetch = (async (url: string | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), body: String(init?.body ?? "") });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});
after(() => {
  global.fetch = realFetch;
});

test("GET reports configured state", async () => {
  const res = await GET();
  assert.deepEqual(await res.json(), { ok: true, lineConfigured: true });
});

test("GET reports not-configured when env is absent", async () => {
  const saved = process.env.LINE_CHANNEL_SECRET;
  delete process.env.LINE_CHANNEL_SECRET;
  try {
    const res = await GET();
    assert.equal((await res.json()).lineConfigured, false);
  } finally {
    process.env.LINE_CHANNEL_SECRET = saved;
  }
});

test("POST is a 200 no-op when LINE is not configured", async () => {
  const saved = process.env.LINE_CHANNEL_SECRET;
  delete process.env.LINE_CHANNEL_SECRET;
  try {
    const res = await postWebhook(eventsBody([]), { signature: null });
    assert.equal(res.status, 200);
    assert.equal(fetchCalls.length, 0);
  } finally {
    process.env.LINE_CHANNEL_SECRET = saved;
  }
});

test("rejects a bad signature (403)", async () => {
  const res = await postWebhook(eventsBody([]), { signature: "wrong" });
  assert.equal(res.status, 403);
});

test("rejects a missing signature header (403)", async () => {
  const res = await postWebhook(eventsBody([]), { signature: null });
  assert.equal(res.status, 403);
});

test("malformed JSON with a valid signature is a 200 no-op", async () => {
  const raw = "{not json";
  const res = await postWebhook(raw, { signature: sign(raw) });
  assert.equal(res.status, 200);
  assert.equal(fetchCalls.length, 0);
});

test("a valid link code binds the LINE user and replies", async () => {
  const { userId, code } = await userWithCode("link-ok@test.local");
  const res = await postWebhook(
    eventsBody([
      {
        type: "message",
        replyToken: "rt1",
        source: { userId: "Uabc" },
        message: { type: "text", text: code },
      },
    ]),
  );

  assert.equal(res.status, 200);
  const user = await container.userRepository.findById(userId);
  assert.equal(user?.lineUserId, "Uabc", "lineUserId bound");
  assert.equal(
    await container.userRepository.findByLineLinkCode(code),
    null,
    "code cleared after use",
  );
  assert.equal(fetchCalls.length, 1, "success reply sent");
  assert.match(fetchCalls[0].body, /เชื่อมต่อสำเร็จ/);
});

test("a lowercase / whitespace-padded code still links", async () => {
  const { userId, code } = await userWithCode("link-trim@test.local");
  await postWebhook(
    eventsBody([
      {
        type: "message",
        replyToken: "rt2",
        source: { userId: "Utrim" },
        message: { type: "text", text: `  ${code.toLowerCase()}  ` },
      },
    ]),
  );
  const user = await container.userRepository.findById(userId);
  assert.equal(user?.lineUserId, "Utrim");
});

test("an unknown code is silent (no reply)", async () => {
  const res = await postWebhook(
    eventsBody([
      {
        type: "message",
        replyToken: "rt3",
        source: { userId: "Unone" },
        message: { type: "text", text: "ZZZZ99" },
      },
    ]),
  );
  assert.equal(res.status, 200);
  assert.equal(fetchCalls.length, 0);
});

test("non-code chat text is ignored (no reply)", async () => {
  const res = await postWebhook(
    eventsBody([
      {
        type: "message",
        replyToken: "rt4",
        source: { userId: "Uchat" },
        message: { type: "text", text: "สวัสดีครับ" },
      },
    ]),
  );
  assert.equal(res.status, 200);
  assert.equal(fetchCalls.length, 0);
});

test("a code whose LINE id is already bound elsewhere replies with the conflict", async () => {
  const a = await userWithCode("bind-a@test.local");
  await container.userRepository.setLineUserId(a.userId, "Ushared");
  const b = await userWithCode("bind-b@test.local");

  const res = await postWebhook(
    eventsBody([
      {
        type: "message",
        replyToken: "rt5",
        source: { userId: "Ushared" }, // already taken by user A
        message: { type: "text", text: b.code },
      },
    ]),
  );

  assert.equal(res.status, 200, "event error is isolated, webhook still 200");
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].body, /ถูกผูกกับบัญชีอื่น/);
});

test("a follow event replies with a welcome only when a replyToken is present", async () => {
  await postWebhook(eventsBody([{ type: "follow", replyToken: "rt6" }]));
  assert.equal(fetchCalls.length, 1, "welcome reply sent");
  assert.match(fetchCalls[0].body, /ขอบคุณที่เพิ่มเพื่อน/);

  fetchCalls = [];
  await postWebhook(eventsBody([{ type: "follow" }])); // no replyToken
  assert.equal(fetchCalls.length, 0);
});
