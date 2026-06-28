"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  PosterDimensions,
  TemplateCopy,
} from "@/src/domain/services/promo-poster";
import { Button } from "@/src/presentation/components/ui/Button";
import { Modal } from "@/src/presentation/components/ui/Modal";
import {
  SimpleImageCropper,
  type SimpleCropperHandle,
} from "@/src/presentation/components/ui/SimpleImageCropper";
import { canvasToCompressedFile } from "@/src/presentation/lib/crop-image";
import { PosterExportArea } from "./PosterExportArea";
import type { PromoSeedData } from "./types";

const ACCEPT = "image/png,image/jpeg,image/webp";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

/**
 * Path C — owner uploads an AI-generated image; we crop it to the poster aspect
 * (reusing the upload crop pipeline) and overlay the loyalty CTA layer, so even
 * an off-the-wall AI image still carries the shop's QR + reward on-concept.
 */
export function UploadBgPanel({
  size,
  copy,
  seed,
  bgDataUrl,
  onBgChange,
}: {
  size: PosterDimensions;
  copy: TemplateCopy;
  seed: PromoSeedData;
  /** Lifted to PromoStudio so the upload survives switching path tabs. */
  bgDataUrl: string | null;
  onBgChange: (dataUrl: string | null) => void;
}) {
  const t = useTranslations("promote");
  const tc = useTranslations("common");
  const cropperRef = useRef<SimpleCropperHandle>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  // Cropper-transient state stays local; the processed background is lifted.
  const [src, setSrc] = useState<string | null>(null);
  const [baseName, setBaseName] = useState("ai-image");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspect = size.w / size.h;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (pickRef.current) pickRef.current.value = "";
    if (!file) return;
    setError(null);
    setBaseName(file.name);
    setSrc(URL.createObjectURL(file));
  }

  function closeCropper() {
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function confirmCrop() {
    const cropper = cropperRef.current;
    if (!cropper) return;
    setProcessing(true);
    try {
      const canvas = cropper.getCroppedCanvas({ maxWidth: 2000, maxHeight: 2000 });
      if (!canvas) throw new Error(tc("cropError"));
      const file = await canvasToCompressedFile(canvas, baseName);
      onBgChange(await fileToDataUrl(file));
      setError(null);
      closeCropper();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("uploadIntro")}</p>

      <input
        ref={pickRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onPick}
      />

      <div>
        <Button
          variant="outline"
          disabled={processing}
          onClick={() => pickRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          {bgDataUrl ? t("changeImage") : t("chooseImage")}
        </Button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {bgDataUrl ? (
        <PosterExportArea
          size={size}
          copy={copy}
          seed={seed}
          design={{ kind: "image", src: bgDataUrl }}
          fileName={`promote-${seed.shopName}`}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {t("noImageSelected")}
        </p>
      )}

      <Modal
        open={src !== null}
        onClose={closeCropper}
        title={t("cropTitle")}
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={closeCropper}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={processing}
              onClick={confirmCrop}
            >
              {processing ? tc("processing") : tc("confirm")}
            </Button>
          </>
        }
      >
        {src && <SimpleImageCropper ref={cropperRef} src={src} aspect={aspect} />}
      </Modal>
    </div>
  );
}
