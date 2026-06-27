"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile CAPTCHA. Renders the widget and exposes its token via a
 * hidden input named `captchaToken` (read server-side). Renders nothing when no
 * site key is configured (CAPTCHA disabled — e.g. local dev).
 */
export function TurnstileWidget({ siteKey }: { siteKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    function render() {
      if (cancelled || rendered.current || !ref.current || !window.turnstile)
        return;
      rendered.current = true;
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    }

    if (window.turnstile) {
      render();
    } else {
      let s = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`,
      );
      if (!s) {
        s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", render);
    }
    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return (
    <>
      <div ref={ref} className="min-h-[65px]" />
      <input type="hidden" name="captchaToken" value={token} />
    </>
  );
}
