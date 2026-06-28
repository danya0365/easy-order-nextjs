import { getTranslations } from "next-intl/server";

import type { ShopImage } from "@/src/domain/entities";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";

/** Public gallery grid of a shop's photos. Renders nothing when empty. */
export async function ShopGallery({ images }: { images: ShopImage[] }) {
  if (images.length === 0) return null;
  const t = await getTranslations("shop");
  return (
    <Card>
      <CardHeader title={t("imgGalleryCardTitle")} />
      <div className="grid grid-cols-3 gap-2.5">
        {images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element -- internal image route
          <img
            key={img.id}
            src={`/api/shop-images/${img.id}`}
            alt={t("imgGalleryAlt")}
            className="aspect-square w-full rounded-xl object-cover ring-1 ring-border"
          />
        ))}
      </div>
    </Card>
  );
}
