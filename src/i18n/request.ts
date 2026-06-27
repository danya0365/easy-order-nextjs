import { getRequestConfig } from "next-intl/server";

/**
 * next-intl request config — single-locale (Thai) setup WITHOUT i18n routing:
 * no `[locale]` path segments, no middleware. This keeps the scaffold additive
 * and reversible.
 *
 * To add languages later: pick the locale here (e.g. from a cookie or the
 * Accept-Language header) and load the matching `messages/<locale>.json`. Call
 * sites use `t('key')` already, so they don't need to change.
 */
export const DEFAULT_LOCALE = "th";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import("../../messages/th.json")).default,
}));
