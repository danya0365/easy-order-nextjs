import {
  StatsSkeleton,
  ListCardSkeleton,
} from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <StatsSkeleton count={4} />
      <ListCardSkeleton rows={6} />
    </div>
  );
}
