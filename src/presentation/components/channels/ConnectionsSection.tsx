"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  generateLineLinkCodeAction,
  unlinkLineAction,
} from "@/src/presentation/actions/line-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { ChannelRow } from "./ChannelRow";

/**
 * Connections & security section: the channel an operator links to receive
 * notifications and sign in via OTP. LINE only for now (structured so more
 * channels can be added later).
 */
export function ConnectionsSection({
  linked,
  addUrl,
}: {
  linked: boolean;
  addUrl?: string;
}) {
  const t = useTranslations("channels");
  const [code, setCode] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const lineTrailing = linked ? (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-sm text-success">
        <CheckCircle2 size={16} />
        {t("connected")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => start(async () => void (await unlinkLineAction()))}
      >
        {t("disconnect")}
      </Button>
    </div>
  ) : code ? null : (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await generateLineLinkCodeAction();
          setCode(r.code);
        })
      }
    >
      {t("connect")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-brand-800">
        <ShieldCheck className="size-4 shrink-0" />
        <span>{t("securityHint")}</span>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        <li>
          <ChannelRow
            icon={MessageCircle}
            // eslint-disable-next-line no-restricted-syntax -- #06C755 is LINE's official brand color
            iconClassName="bg-[#06C755]/10 text-[#06C755]"
            name="LINE"
            description={t("lineDescription")}
            badge={
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                {t("usableForLogin")}
              </span>
            }
            trailing={lineTrailing}
          >
            {!linked && !addUrl && (
              <p className="text-xs text-warning">{t("notConfigured")}</p>
            )}
            {!linked && code && (
              <div className="flex flex-col gap-2 rounded-xl bg-muted-surface p-4 text-sm">
                <p className="font-medium text-foreground">{t("howToConnect")}</p>
                <ol className="list-decimal space-y-1 pl-5 text-muted">
                  <li>
                    {addUrl ? (
                      <>
                        {t("addFriendPrefix")}{" "}
                        <a
                          className="text-brand-700 underline"
                          href={addUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("addFriendLink")}
                        </a>
                      </>
                    ) : (
                      t("addFriendNoUrl")
                    )}
                  </li>
                  <li>{t("sendCodeInChat")}</li>
                </ol>
                <p className="select-all rounded-lg bg-card px-3 py-2 text-center text-lg font-bold tracking-widest text-brand-700">
                  {code}
                </p>
                <p className="text-xs text-muted">{t("afterSendHint")}</p>
              </div>
            )}
          </ChannelRow>
        </li>
      </ul>
    </div>
  );
}
