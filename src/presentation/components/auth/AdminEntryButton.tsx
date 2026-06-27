"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/src/presentation/components/ui/cn";

/**
 * Inner label that reacts to navigation status. `useLinkStatus` must be rendered
 * inside the <Link>, so it lives in this child: the moment the link is clicked it
 * flips to pending (spinner + dim) giving instant feedback while the destination
 * (which does a server session check / redirect) loads.
 */
function Label({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 transition-opacity",
        pending && "opacity-80",
      )}
    >
      {label}
      {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
    </span>
  );
}

/** Pill entry button for the home page that shows pending feedback on click. */
export function AdminEntryButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-on-brand shadow-sm transition hover:bg-brand-600"
    >
      <Label label={label} />
    </Link>
  );
}
