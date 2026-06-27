"use client";

import { useEffect, useRef } from "react";

import { markAllReadAction } from "@/src/presentation/actions/notification-actions";

/**
 * Fires once when the inbox is opened so the unread badge clears on the next
 * navigation. Renders nothing.
 */
export function MarkAllReadOnView() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markAllReadAction();
  }, []);
  return null;
}
