"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/src/presentation/components/ui/Toast";

const MAX_INPUT = 4 * 1024 * 1024;
const SIDE = 256;

/** Center-crop + downscale to a SIDE×SIDE JPEG in the browser. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, SIDE, SIDE);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85),
  );
}

/** Rider picks a photo → resized client-side → POST /rider/avatar (cookie auth). */
export function RiderAvatarUpload() {
  const t = useTranslations("rider");
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(t("avatarType"));
      return;
    }
    if (file.size > MAX_INPUT) {
      toast.error(t("avatarTooBig"));
      return;
    }
    setBusy(true);
    try {
      const blob = await toSquareJpeg(file);
      const fd = new FormData();
      fd.append("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const res = await fetch("/rider/avatar", { method: "POST", body: fd });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "error");
      toast.success(t("meUploaded"));
      router.refresh();
    } catch (e) {
      toast.error(`${t("meUploadFailed")}${e instanceof Error && e.message !== "error" ? `: ${e.message}` : ""}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 font-semibold text-foreground">
      {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
      {busy ? t("meUploading") : t("meChangePhoto")}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        data-testid="rider-avatar-input"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </label>
  );
}
