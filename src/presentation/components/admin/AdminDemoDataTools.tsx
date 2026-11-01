"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Database, Trash2 } from "lucide-react";

import {
  clearDemoDataAction,
  seedDemoDataAction,
} from "@/src/presentation/actions/admin-shop-config-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function AdminDemoDataTools({
  shopId,
  counts,
}: {
  shopId: string;
  counts: { orders: number; customers: number; riders: number };
}) {
  const t = useTranslations("adminConfig");
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState("12");
  const [customers, setCustomers] = useState("3");
  const [riders, setRiders] = useState("1");
  const [pending, start] = useTransition();

  async function run(kind: "seed" | "clear") {
    // Confirm OUTSIDE the transition: a dialog opened inside an async
    // transition would never commit while the transition awaits it.
    const ok = await confirm({
      title: kind === "seed" ? t("demoSeedConfirmTitle") : t("demoClearConfirmTitle"),
      message: kind === "seed" ? t("demoSeedConfirmMsg") : t("demoClearConfirmMsg"),
      tone: kind === "clear" ? "danger" : "default",
    });
    if (!ok) return;
    start(async () => {
      const fd = new FormData();
      fd.set("shopId", shopId);
      fd.set("orders", orders);
      fd.set("customers", customers);
      fd.set("riders", riders);
      const res = kind === "seed" ? await seedDemoDataAction({}, fd) : await clearDemoDataAction({}, fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success(kind === "seed" ? t("demoSeeded") : t("demoCleared"));
        router.refresh();
      }
    });
  }

  const field = (id: string, label: string, v: string, set: (s: string) => void, max: number) => (
    <label className="flex flex-col gap-1 text-sm text-foreground" htmlFor={id}>
      {label}
      <Input id={id} type="number" min={0} max={max} value={v} onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <div className="flex flex-col gap-3" data-testid="admin-demo-data">
      <p className="text-xs text-muted">{t("demoHint")}</p>
      <p className="text-sm text-foreground" data-testid="demo-counts">
        {t("demoCounts", counts)}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {field("demoOrders", t("demoOrders"), orders, setOrders, 30)}
        {field("demoCustomers", t("demoCustomers"), customers, setCustomers, 10)}
        {field("demoRiders", t("demoRiders"), riders, setRiders, 5)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={pending} onClick={() => run("seed")} data-testid="demo-seed">
          <Database className="size-4" /> {t("demoSeed")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || counts.orders + counts.customers + counts.riders === 0}
          onClick={() => run("clear")}
          data-testid="demo-clear"
        >
          <Trash2 className="size-4" /> {t("demoClear")}
        </Button>
      </div>
    </div>
  );
}
