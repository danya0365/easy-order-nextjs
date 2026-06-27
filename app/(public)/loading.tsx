import { Skeleton } from "@/src/presentation/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </header>
      <section className="relative flex-1">
        <Skeleton className="absolute inset-0 rounded-none" />
      </section>
    </main>
  );
}
