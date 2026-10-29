import { Card } from "@/src/presentation/components/ui/Card";
import { Skeleton } from "@/src/presentation/components/ui/Skeleton";
import { FormCardSkeleton } from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </Card>
      <FormCardSkeleton fields={2} />
    </div>
  );
}
