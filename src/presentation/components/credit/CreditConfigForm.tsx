"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import type { CreditDailyConfig, CreditLowBalanceConfig, CreditPlatformConfig, CreditShopOverride } from "@/src/domain/services/credit";
import { saveCreditConfigAction, saveCreditOverrideAction } from "@/src/presentation/actions/credit-actions";
import { Button } from "@/src/presentation/components/ui/Button";

const field = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground";
const toB = (s: number) => String(s / 100);
const toS = (b: string) => Math.round((Number(b) || 0) * 100);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-brand-500" data-testid={testId} />
      {label}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-border">
      <legend className="px-1 text-sm font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

const STATUSES = ["pending", "preparing", "ready", "completed"] as const;

function DailyFields({ d, set }: { d: CreditDailyConfig; set: (d: CreditDailyConfig) => void }) {
  const t = useTranslations("credit");
  const up = (p: Partial<CreditDailyConfig>) => set({ ...d, ...p });
  return (
    <>
      <p className="text-xs text-muted">{t("dailyDesc")}</p>
      <div className="grid grid-cols-2 gap-3">
        <Row label={t("cfgThreshold")}>
          <input className={field} type="number" min="0" step="1" value={toB(d.thresholdSatang)} onChange={(e) => up({ thresholdSatang: toS(e.target.value) })} data-testid="cfg-threshold" />
        </Row>
        <Row label={t("cfgDailyFee")}>
          <input className={field} type="number" min="0" step="0.01" value={toB(d.feeSatang)} onChange={(e) => up({ feeSatang: toS(e.target.value) })} data-testid="cfg-fee" />
        </Row>
        <Row label={t("cfgCutoff")}>
          <input className={field} type="time" value={d.cutoffTime} onChange={(e) => up({ cutoffTime: e.target.value || "00:00" })} data-testid="cfg-cutoff" />
        </Row>
        <Row label={t("cfgBasis")}>
          <select className={field} value={d.basis} onChange={(e) => up({ basis: e.target.value as "total" | "subtotal" })}>
            <option value="total">{t("basisTotal")}</option>
            <option value="subtotal">{t("basisSubtotal")}</option>
          </select>
        </Row>
        <Row label={t("cfgStartDate")}>
          <input className={field} type="date" value={d.startDate} onChange={(e) => up({ startDate: e.target.value })} />
        </Row>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{t("cfgCountStatuses")}</p>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((st) => (
            <Toggle
              key={st}
              label={t(`status_${st}`)}
              checked={d.countStatuses.includes(st)}
              onChange={(v) => up({ countStatuses: v ? [...d.countStatuses, st] : d.countStatuses.filter((x) => x !== st) })}
              testId={`cfg-count-${st}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted">{t("cancelledNeverCounts")}</p>
      </div>
      <Toggle label={t("cfgInclusive")} checked={d.inclusive} onChange={(v) => up({ inclusive: v })} />
      <Toggle label={t("cfgUseShopCutoff")} checked={d.useShopCutoff} onChange={(v) => up({ useShopCutoff: v })} />
    </>
  );
}

function LowFields({ l, set }: { l: CreditLowBalanceConfig; set: (l: CreditLowBalanceConfig) => void }) {
  const t = useTranslations("credit");
  const up = (p: Partial<CreditLowBalanceConfig>) => set({ ...l, ...p });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Row label={t("cfgWarn")}>
        <input className={field} type="number" min="0" step="1" value={toB(l.warnSatang)} onChange={(e) => up({ warnSatang: toS(e.target.value) })} />
      </Row>
      <Row label={t("cfgLowMode")}>
        <select className={field} value={l.mode} onChange={(e) => up({ mode: e.target.value as CreditLowBalanceConfig["mode"] })} data-testid="cfg-low-mode">
          <option value="warn">{t("lowWarnOnly")}</option>
          <option value="block">{t("lowBlock")}</option>
        </select>
      </Row>
      {l.mode === "block" && (
        <Row label={t("cfgNegLimit")}>
          <input className={field} type="number" min="0" step="1" value={toB(l.negativeLimitSatang)} onChange={(e) => up({ negativeLimitSatang: toS(e.target.value) })} />
        </Row>
      )}
    </div>
  );
}

function useSave() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string; success?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r);
      if (r.success) router.refresh();
    });
  return { msg, pending, run };
}

function Msg({ msg }: { msg: { error?: string; success?: string } }) {
  return (
    <>
      {msg.error && <p className="rounded-lg bg-error-surface px-3 py-2 text-sm text-error">{msg.error}</p>}
      {msg.success && <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success" data-testid="cfg-saved">{msg.success}</p>}
    </>
  );
}

/** Platform-wide credit config (master switch, defaults, topup). */
export function CreditConfigForm({ initial }: { initial: CreditPlatformConfig }) {
  const t = useTranslations("credit");
  const [c, setC] = useState(initial);
  const { msg, pending, run } = useSave();
  const tp = c.topup;
  const upT = (p: Partial<typeof tp>) => setC({ ...c, topup: { ...tp, ...p } });
  return (
    <form
      className="flex flex-col gap-4"
      data-testid="credit-config-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveCreditConfigAction(JSON.stringify(c)));
      }}
    >
      <div className="rounded-2xl bg-muted-surface p-4">
        <Toggle label={t("cfgMaster")} checked={c.enabled} onChange={(v) => setC({ ...c, enabled: v })} testId="cfg-master" />
        <p className="mt-1 text-xs text-muted">{t("cfgMasterDesc")}</p>
      </div>
      <Row label={t("cfgStarting")}>
        <input className={field} type="number" min="0" step="1" value={toB(c.startingCreditSatang)} onChange={(e) => setC({ ...c, startingCreditSatang: toS(e.target.value) })} />
      </Row>
      <Section title={t("cfgDaily")}>
        <DailyFields d={c.daily} set={(d) => setC({ ...c, daily: d })} />
      </Section>
      <Section title={t("cfgLow")}>
        <LowFields l={c.lowBalance} set={(l) => setC({ ...c, lowBalance: l })} />
      </Section>
      <Section title={t("cfgTopup")}>
        <div className="grid grid-cols-2 gap-3">
          <Row label={t("cfgPromptpay")}>
            <input className={field} inputMode="numeric" value={tp.promptpayId} onChange={(e) => upT({ promptpayId: e.target.value.replace(/[^0-9]/g, "") })} data-testid="cfg-promptpay" />
          </Row>
          <Row label={t("cfgTopupMin")}>
            <input className={field} type="number" min="0" value={toB(tp.minSatang)} onChange={(e) => upT({ minSatang: toS(e.target.value) })} />
          </Row>
          <Row label={t("cfgTopupMax")}>
            <input className={field} type="number" min="0" value={toB(tp.maxSatang)} onChange={(e) => upT({ maxSatang: toS(e.target.value) })} />
          </Row>
        </div>
        <Toggle label={t("cfgAllowCustom")} checked={tp.allowCustom} onChange={(v) => upT({ allowCustom: v })} />
        <Toggle label={t("cfgAutoVerify")} checked={tp.autoVerify} onChange={(v) => upT({ autoVerify: v })} />
        <p className="text-sm font-medium text-foreground">{t("cfgPackages")}</p>
        {tp.packages.map((p, i) => (
          <div key={i} className="flex items-end gap-2">
            <Row label={t("cfgPkgAmount")}>
              <input className={field} type="number" min="1" value={toB(p.amountSatang)} onChange={(e) => upT({ packages: tp.packages.map((x, j) => (j === i ? { ...x, amountSatang: toS(e.target.value) } : x)) })} />
            </Row>
            <Row label={t("cfgPkgBonus")}>
              <input className={field} type="number" min="0" step="0.5" value={p.bonusPercent} onChange={(e) => upT({ packages: tp.packages.map((x, j) => (j === i ? { ...x, bonusPercent: Number(e.target.value) || 0 } : x)) })} />
            </Row>
            <button type="button" aria-label={t("remove")} className="mb-1 rounded-lg p-2 text-error hover:bg-error-surface" onClick={() => upT({ packages: tp.packages.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => upT({ packages: [...tp.packages, { id: `p${Date.now().toString(36)}`, amountSatang: 100000, bonusPercent: 15 }] })}>
          <Plus className="size-4" /> {t("addPackage")}
        </Button>
      </Section>
      <Msg msg={msg} />
      <Button type="submit" loading={pending} data-testid="cfg-save">{t("save")}</Button>
    </form>
  );
}

/** Per-shop override (daily rule / low-balance / exemption). */
export function CreditOverrideForm({ shopId, platform, override }: { shopId: string; platform: CreditPlatformConfig; override: CreditShopOverride | null }) {
  const t = useTranslations("credit");
  const [exempt, setExempt] = useState(override?.enabled === false);
  const [useD, setUseD] = useState(!!override?.daily);
  const [useL, setUseL] = useState(!!override?.lowBalance);
  const [d, setD] = useState<CreditDailyConfig>({ ...platform.daily, ...(override?.daily ?? {}) });
  const [l, setL] = useState<CreditLowBalanceConfig>({ ...platform.lowBalance, ...(override?.lowBalance ?? {}) });
  const { msg, pending, run } = useSave();
  const submit = () => {
    const o: CreditShopOverride = {};
    if (exempt) o.enabled = false;
    if (useD) o.daily = d;
    if (useL) o.lowBalance = l;
    run(() => saveCreditOverrideAction(shopId, Object.keys(o).length ? JSON.stringify(o) : null));
  };
  return (
    <form className="flex flex-col gap-3" data-testid="credit-override-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <p className="text-xs text-muted">{t("overrideDesc")}</p>
      <Toggle label={t("exempt")} checked={exempt} onChange={setExempt} />
      <Toggle label={t("overrideDaily")} checked={useD} onChange={setUseD} testId="ovr-daily" />
      {useD && <Section title={t("cfgDaily")}><DailyFields d={d} set={setD} /></Section>}
      <Toggle label={t("overrideLow")} checked={useL} onChange={setUseL} testId="ovr-low" />
      {useL && <Section title={t("cfgLow")}><LowFields l={l} set={setL} /></Section>}
      <Msg msg={msg} />
      <div className="flex gap-2">
        <Button type="submit" loading={pending} data-testid="ovr-save">{t("save")}</Button>
        {override && (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => saveCreditOverrideAction(shopId, null))}>
            {t("clearOverride")}
          </Button>
        )}
      </div>
    </form>
  );
}
