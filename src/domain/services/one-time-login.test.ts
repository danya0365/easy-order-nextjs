import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isAcceptableConfirmOrigin, isLinkPreviewUserAgent } from "./one-time-login";

describe("one-time link: preview UAs", () => {
  it("matches unfurl bots", () => {
    for (const ua of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "TelegramBot (like TwitterBot)",
      "WhatsApp/2.23.20.0",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "Twitterbot/1.0",
      "LinkedInBot/1.0",
    ]) assert.ok(isLinkPreviewUserAgent(ua), ua);
  });
  it("does not match real (in-app) browsers", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.0.0",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]",
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
    ]) assert.ok(!isLinkPreviewUserAgent(ua), ua);
    assert.ok(!isLinkPreviewUserAgent(null));
  });
});

describe("one-time link: confirm origin policy", () => {
  const host = "easy-order.easyai.site";
  it("accepts Origin: null (no-referrer page / in-app browser) and missing Origin", () => {
    assert.ok(isAcceptableConfirmOrigin({ origin: "null", host, secFetchSite: null }));
    assert.ok(isAcceptableConfirmOrigin({ origin: null, host, secFetchSite: "same-origin" }));
  });
  it("accepts same host, rejects other hosts and cross-site", () => {
    assert.ok(isAcceptableConfirmOrigin({ origin: `https://${host}`, host, secFetchSite: "same-origin" }));
    assert.ok(!isAcceptableConfirmOrigin({ origin: "https://evil.example", host, secFetchSite: null }));
    assert.ok(!isAcceptableConfirmOrigin({ origin: "null", host, secFetchSite: "cross-site" }));
    assert.ok(!isAcceptableConfirmOrigin({ origin: "not a url", host, secFetchSite: null }));
  });
});
