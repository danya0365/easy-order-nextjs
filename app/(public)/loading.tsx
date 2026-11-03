import { Skeleton } from "@/src/presentation/components/ui/Skeleton";

/** Home map skeleton — the shared header lives in the (public) layout. */
export default function Loading() {
  return (
    <main className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
      <section className="relative flex-1">
        <Skeleton className="absolute inset-0 rounded-none" />
      </section>
    </main>
  );
}
