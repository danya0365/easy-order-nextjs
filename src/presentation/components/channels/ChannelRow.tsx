import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/src/presentation/components/ui/cn";

/**
 * One connection-channel row (e.g. LINE) inside the connections &
 * security section. Presentational: the icon + name + description + an optional
 * trailing slot (status/action) and optional `children` rendered full-width
 * below (e.g. the LINE link instructions).
 */
export function ChannelRow({
  icon: Icon,
  iconClassName,
  name,
  description,
  badge,
  trailing,
  muted,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  name: string;
  description: string;
  badge?: ReactNode;
  trailing?: ReactNode;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2 py-3", muted && "opacity-60")}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted-surface text-foreground",
            iconClassName,
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium text-foreground">{name}</span>
            {badge}
          </div>
          <span className="text-xs text-muted">{description}</span>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
      {children}
    </div>
  );
}
