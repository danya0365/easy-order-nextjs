import { ListCardSkeleton } from "@/src/presentation/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <ListCardSkeleton rows={5} />
    </div>
  );
}
