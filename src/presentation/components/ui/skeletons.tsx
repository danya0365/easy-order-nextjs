import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

/** A card with an optional title row plus N divided list rows. */
export function ListCardSkeleton({
  rows = 5,
  header = true,
}: {
  rows?: number;
  header?: boolean;
}) {
  return (
    <Card>
      {header && <Skeleton className="mb-4 h-6 w-40" />}
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** A responsive grid of stat tiles. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-4 w-16" />
        </Card>
      ))}
    </div>
  );
}

/** A simple card holding stacked input-sized blocks (forms / settings). */
export function FormCardSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Card className="flex flex-col gap-4">
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
      <Skeleton className="h-10 w-32 rounded-full" />
    </Card>
  );
}
