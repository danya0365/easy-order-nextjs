import {
  ListCardSkeleton,
  StatsSkeleton,
} from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <StatsSkeleton count={2} />
      <ListCardSkeleton rows={4} />
    </div>
  );
}
