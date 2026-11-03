import { Skeleton } from "@/src/presentation/components/ui/Skeleton";
import {
  ListCardSkeleton,
  StatsSkeleton,
} from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-48" />
      <StatsSkeleton />
      <ListCardSkeleton rows={5} />
    </div>
  );
}
