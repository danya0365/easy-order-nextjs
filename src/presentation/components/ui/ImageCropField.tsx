"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  SimpleImageCropper,
  type SimpleCropperHandle,
} from "./SimpleImageCropper";
import { canvasToCompressedFile } from "@/src/presentation/lib/crop-image";

const ACCEPT = "image/png,image/jpeg,image/webp";

// `value` is the crop-window aspect ratio (NaN = free / matches the photo).
// A NaN value renders the translated "free" label; the rest are literal ratios.
const RATIO_PRESETS: { label: string; value: number }[] = [
  { label: "", value: NaN },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

const sameRatio = (a: number, b: number) =>
  (Number.isNaN(a) && Number.isNaN(b)) || a === b;

/**
 * File picker that crops + downscales a photo before staging it into a hidden
 * `<input name={name}>`, so the surrounding `<form action={...}>` submits the
 * cropped JPEG instead of the raw (often huge) phone photo.
 *
 * Uses the in-house SimpleImageCropper (drag to pan, slider to zoom — no crop
 * library). `aspect` sets the starting ratio (`null` = free); pass
 * `allowRatioChange` to show the ratio presets (locked otherwise).
 */
export function ImageCropField({
  name,
  aspect,
  label,
  disabled,
  allowRatioChange,
  onReadyChange,
}: {
  name: string;
  aspect: number | null;
  label: string;
  disabled?: boolean;
  allowRatioChange?: boolean;
  /** Fired with `true` once a cropped file is staged, `false` while empty/busy. */
  onReadyChange?: (ready: boolean) => void;
}) {
  const t = useTranslations("common");
  const cropperRef = useRef<SimpleCropperHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const initialRatio = aspect ?? NaN;
  const [src, setSrc] = useState<string | null>(null);
  const [baseName, setBaseName] = useState("image");
  const [activeRatio, setActiveRatio] = useState<number>(initialRatio);

  const [preview, setPreview] = useState<string | null>(null);
  const [sizeKb, setSizeKb] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setReady = useCallback(
    (ready: boolean) => onReadyChange?.(ready),
    [onReadyChange],
  );

  const onPickRaw = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Picker only feeds the cropper — clear it so the raw file is never submitted.
      if (pickRef.current) pickRef.current.value = "";
      if (!file) return;
      setError(null);
      setBaseName(file.name);
      setActiveRatio(initialRatio);
      setSrc(URL.createObjectURL(file));
    },
    [initialRatio],
  );

  const pickRatio = useCallback((value: number) => {
    // The cropper reshapes from the `aspect` prop — just drive it with state.
    setActiveRatio(value);
  }, []);

  const closeCropper = useCallback(() => {
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const confirmCrop = useCallback(async () => {
    const cropper = cropperRef.current;
    if (!cropper) return;
    setProcessing(true);
    setReady(false);
    try {
      const canvas = cropper.getCroppedCanvas({ maxWidth: 2000, maxHeight: 2000 });
      if (!canvas) throw new Error(t("cropError"));
      const file = await canvasToCompressedFile(canvas, baseName);
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileRef.current) fileRef.current.files = dt.files;
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setSizeKb(Math.round(file.size / 1024));
      setError(null);
      setReady(true);
      closeCropper();
    } catch (e) {
      setError((e as Error).message);
      setReady(false);
    } finally {
      setProcessing(false);
    }
  }, [baseName, setReady, closeCropper, t]);

  return (
    <div className="flex flex-col gap-2">
      {/* Submitted by the parent form; populated only after a successful crop. */}
      <input ref={fileRef} type="file" name={name} accept={ACCEPT} className="hidden" />
      <input
        ref={pickRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onPickRaw}
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={t("cropPreviewAlt")}
          className="max-h-48 w-full rounded-lg border border-border object-contain bg-muted-surface"
        />
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || processing}
          onClick={() => pickRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          {processing ? t("processing") : preview ? t("cropChangeImage") : label}
        </Button>
        {sizeKb !== null && (
          <span className="text-xs text-muted">{t("cropReadySize", { kb: sizeKb })}</span>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <Modal
        open={src !== null}
        onClose={closeCropper}
        title={t("cropTitle")}
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={closeCropper}>
              {t("cancel")}
            </Button>
            <Button type="button" size="sm" disabled={processing} onClick={confirmCrop}>
              {processing ? t("processing") : t("confirm")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {allowRatioChange && (
            <div className="flex flex-wrap gap-1.5">
              {RATIO_PRESETS.map((r) => {
                const active = sameRatio(activeRatio, r.value);
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => pickRatio(r.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                      active
                        ? "bg-brand-500 text-on-brand ring-brand-500"
                        : "bg-card text-muted ring-border hover:ring-brand-300"
                    }`}
                  >
                    {Number.isNaN(r.value) ? t("cropFreeRatio") : r.label}
                  </button>
                );
              })}
            </div>
          )}

          {src && (
            <SimpleImageCropper ref={cropperRef} src={src} aspect={activeRatio} />
          )}
        </div>
      </Modal>
    </div>
  );
}
