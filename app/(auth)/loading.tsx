import { Skeleton } from "@/src/presentation/components/ui/Skeleton";

// Shown instantly while the login page runs its server session check (and
// possibly redirects), so navigating to /login never flashes a blank screen.
export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </main>
  );
}
