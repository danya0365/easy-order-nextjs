"use client";

import { LogOut } from "lucide-react";

import { unlinkMemberDeviceAction } from "@/src/presentation/actions/member/unlink-member-action";

/** "ไม่ใช่ฉัน / ออกจากระบบสมาชิก" — confirm, then unbind this device. */
export function UnlinkMemberButton({
  slug,
  label,
  confirmText,
}: {
  slug: string;
  label: string;
  confirmText: string;
}) {
  return (
    <form
      action={unlinkMemberDeviceAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        data-testid="member-unlink"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-muted-surface hover:text-foreground"
      >
        <LogOut className="size-3.5" />
        {label}
      </button>
    </form>
  );
}
