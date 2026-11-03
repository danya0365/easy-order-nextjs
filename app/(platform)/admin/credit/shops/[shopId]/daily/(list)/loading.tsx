import { ListCardSkeleton, StatsSkeleton } from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" data-testid="credit-daily-skeleton">
      <StatsSkeleton count={1} />
      <ListCardSkeleton rows={6} />
    </div>
  );
}
