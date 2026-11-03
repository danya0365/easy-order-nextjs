import { FormCardSkeleton, ListCardSkeleton, StatsSkeleton } from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" data-testid="credit-skeleton">
      <StatsSkeleton count={1} />
      <FormCardSkeleton fields={3} />
      <ListCardSkeleton rows={6} />
    </div>
  );
}
