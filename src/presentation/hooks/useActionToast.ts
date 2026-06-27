"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/src/presentation/components/ui/Toast";

/**
 * Fire a toast when a `useActionState` result transitions to a new success/error
 * message. Keeps the form's inline text as-is; just adds a hard-to-miss toast.
 * Skips the empty initial state and won't re-fire on unrelated re-renders.
 */
export function useActionToast(state: { success?: string; error?: string }) {
  const toast = useToast();
  const lastSuccess = useRef<string | undefined>(undefined);
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      toast.success(state.success);
    }
    lastSuccess.current = state.success;
  }, [state.success, toast]);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
    }
    lastError.current = state.error;
  }, [state.error, toast]);
}
