"use client";

import { useEffect } from "react";

import { reportClientError } from "@/src/presentation/lib/report-client-error";

/**
 * Root error boundary — catches errors thrown by the root layout itself, which
 * the segment-level app/error.tsx cannot. It REPLACES the root layout (so the
 * app's CSS/providers aren't available); styles are inline on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportClientError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#fff",
          color: "#1f2937",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          ระบบมีปัญหาชั่วคราว
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
          ขออภัยในความไม่สะดวก กรุณาลองใหม่อีกครั้ง
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "9999px",
            padding: "0.625rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 500,
            color: "#fff",
            background: "#ea580c",
            cursor: "pointer",
          }}
        >
          ลองอีกครั้ง
        </button>
      </body>
    </html>
  );
}
