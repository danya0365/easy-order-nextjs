import { Card } from "@/src/presentation/components/ui/Card";
import { Skeleton } from "@/src/presentation/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-border">
        <Skeleton className="h-40 w-full" />
        <div className="flex flex-col items-center gap-2 px-4 pb-5">
          <Skeleton className="-mt-12 size-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
      </Card>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </Card>
    </main>
  );
}
