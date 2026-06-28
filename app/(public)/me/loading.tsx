import { Card } from "@/src/presentation/components/ui/Card";
import { Skeleton } from "@/src/presentation/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Card>
        <ul className="flex flex-col divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
