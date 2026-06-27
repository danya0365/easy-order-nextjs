"use client";

import { useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import {
  uploadShopImageAction,
  deleteShopImageAction,
  type FormState,
} from "@/src/presentation/actions/shop-actions";
import type { ShopImage, ShopImageKind } from "@/src/domain/entities";
import { Button } from "@/src/presentation/components/ui/Button";
import { ImageCropField } from "@/src/presentation/components/ui/ImageCropField";
import { useToast } from "@/src/presentation/components/ui/Toast";

/** Cache-bust by image id (ids are immutable; a replacement gets a new id). */
const src = (id: string) => `/api/shop-images/${id}`;

export function ShopImagesManager({ images }: { images: ShopImage[] }) {
  const t = useTranslations("shop");
  const profile = images.find((i) => i.kind === "profile") ?? null;
  const cover = images.find((i) => i.kind === "cover") ?? null;
  const gallery = images.filter((i) => i.kind === "gallery");

  return (
    <div className="flex flex-col gap-6">
      <SingleImage kind="profile" label={t("imgProfile")} image={profile} aspect={1} />
      <SingleImage kind="cover" label={t("imgCover")} image={cover} aspect={16 / 9} />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t("imgGallery")}</p>
        {gallery.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {gallery.map((img) => (
              <li key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- internal image route */}
                <img
                  src={src(img.id)}
                  alt=""
                  className="aspect-square w-full rounded-lg border border-border object-cover"
                />
                <DeleteButton imageId={img.id} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">{t("imgGalleryHint")}</p>
        <UploadForm kind="gallery" aspect={1} label={t("imgAdd")} />
      </div>
    </div>
  );
}

function SingleImage({
  kind,
  label,
  image,
  aspect,
}: {
  kind: ShopImageKind;
  label: string;
  image: ShopImage | null;
  aspect: number;
}) {
  const t = useTranslations("shop");
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {image ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- internal image route */}
          <img
            src={src(image.id)}
            alt={label}
            className="size-20 rounded-lg border border-border object-cover"
          />
          <DeleteButton imageId={image.id} variant="text" />
        </div>
      ) : (
        <p className="text-xs text-muted">{t("imgNone")}</p>
      )}
      <UploadForm
        kind={kind}
        aspect={aspect}
        label={image ? t("imgChange") : t("imgUpload")}
      />
    </div>
  );
}

function UploadForm({
  kind,
  aspect,
  label,
}: {
  kind: ShopImageKind;
  aspect: number;
  label: string;
}) {
  const t = useTranslations("shop");
  const toast = useToast();
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const res = await uploadShopImageAction(prev, formData);
      if (res.error) toast.error(res.error);
      else if (res.success) toast.success(res.success);
      return res;
    },
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="kind" value={kind} />
      <ImageCropField name="image" aspect={aspect} label={label} />
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending} className="w-fit">
        {pending ? t("imgUploading") : t("imgUpload")}
      </Button>
    </form>
  );
}

function DeleteButton({
  imageId,
  variant = "overlay",
}: {
  imageId: string;
  variant?: "overlay" | "text";
}) {
  const t = useTranslations("shop");
  const toast = useToast();
  const [pending, start] = useTransition();

  function onDelete() {
    start(async () => {
      const res = await deleteShopImageAction(imageId);
      if (res.error) toast.error(res.error);
    });
  }

  if (variant === "text") {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
        <Trash2 className="size-4" />
        {pending ? t("imgDeleting") : t("imgDelete")}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label={t("imgDelete")}
      className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-card/90 text-error shadow-sm backdrop-blur transition hover:bg-card disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
