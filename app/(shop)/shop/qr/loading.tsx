import { ListCardSkeleton } from "@/src/presentation/components/ui/skeletons";
import { Skeleton } from "@/src/presentation/components/ui/Skeleton";

/** Mirrors /shop/qr: title, big order-QR card, 2-col grid of QR cards. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-12 w-full rounded-xl sm:w-56" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ListCardSkeleton rows={1} />
        <ListCardSkeleton rows={1} />
        <ListCardSkeleton rows={1} />
        <ListCardSkeleton rows={1} />
      </div>
    </div>
  );
}
