import { ListCardSkeleton, StatsSkeleton } from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <StatsSkeleton count={2} />
      <ListCardSkeleton rows={3} />
    </main>
  );
}
