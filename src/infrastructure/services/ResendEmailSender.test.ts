import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ResendEmailSender,
  emailConfigFromEnv,
  createEmailSender,
} from "./ResendEmailSender";
import { nullEmailSender } from "@/src/application/services/IEmailSender";

function withEmailEnv(
  vars: { RESEND_API_KEY?: string; EMAIL_FROM?: string },
  fn: () => void,
) {
  const saved = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  if (vars.RESEND_API_KEY) process.env.RESEND_API_KEY = vars.RESEND_API_KEY;
  if (vars.EMAIL_FROM) process.env.EMAIL_FROM = vars.EMAIL_FROM;
  try {
    fn();
  } finally {
    process.env.RESEND_API_KEY = saved.RESEND_API_KEY;
    process.env.EMAIL_FROM = saved.EMAIL_FROM;
    if (saved.RESEND_API_KEY === undefined) delete process.env.RESEND_API_KEY;
    if (saved.EMAIL_FROM === undefined) delete process.env.EMAIL_FROM;
  }
}

test("emailConfigFromEnv: null unless BOTH vars are set", () => {
  withEmailEnv({}, () => assert.equal(emailConfigFromEnv(), null));
  withEmailEnv({ RESEND_API_KEY: "k" }, () =>
    assert.equal(emailConfigFromEnv(), null),
  );
  withEmailEnv({ EMAIL_FROM: "a@b.co" }, () =>
    assert.equal(emailConfigFromEnv(), null),
  );
  withEmailEnv({ RESEND_API_KEY: "k", EMAIL_FROM: "a@b.co" }, () =>
    assert.deepEqual(emailConfigFromEnv(), { apiKey: "k", from: "a@b.co" }),
  );
});

test("createEmailSender returns the no-op sender when unconfigured", () => {
  withEmailEnv({}, () => assert.equal(createEmailSender(), nullEmailSender));
});

test("send is fail-soft — never throws on a permanent (4xx) response", async () => {
  const origFetch = global.fetch;
  const origErr = console.error;
  console.error = () => {};
  // 400 is treated as permanent (no retry), so this resolves immediately.
  global.fetch = (async () =>
    new Response("bad", { status: 400 })) as typeof fetch;
  try {
    const sender = new ResendEmailSender({ apiKey: "k", from: "a@b.co" });
    await sender.send({ to: "u@e.co", subject: "s", text: "t" });
  } finally {
    global.fetch = origFetch;
    console.error = origErr;
  }
});

test("send posts to Resend with auth + payload on success", async () => {
  const origFetch = global.fetch;
  let capturedUrl = "";
  let capturedHeaders: Record<string, string> = {};
  let capturedBody = "";
  global.fetch = (async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedHeaders = init.headers as Record<string, string>;
    capturedBody = String(init.body);
    return new Response(JSON.stringify({ id: "e1" }), { status: 200 });
  }) as unknown as typeof fetch;
  try {
    const sender = new ResendEmailSender({ apiKey: "k", from: "From <a@b.co>" });
    await sender.send({ to: "u@e.co", subject: "Hi", text: "Body" });
  } finally {
    global.fetch = origFetch;
  }
  assert.equal(capturedUrl, "https://api.resend.com/emails");
  assert.match(capturedHeaders.Authorization, /Bearer k/);
  const body = JSON.parse(capturedBody);
  assert.equal(body.to, "u@e.co");
  assert.equal(body.from, "From <a@b.co>");
  assert.equal(body.subject, "Hi");
  assert.equal(body.text, "Body");
});
