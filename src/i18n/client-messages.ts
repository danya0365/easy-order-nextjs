import "server-only";

import { getMessages } from "next-intl/server";

/**
 * The message namespaces shipped to the CLIENT bundle via
 * `NextIntlClientProvider`. Next's i18n guide notes that translations rendered
 * in Server Components (via `getTranslations`) cost nothing on the client — so
 * only namespaces that a CLIENT component (`useTranslations`) actually needs
 * belong here. Keeping this an explicit allowlist stops the whole catalog from
 * bloating the client bundle as it grows.
 *
 * When you add a client component that uses a new namespace, add it here (the
 * keys are type-checked against `messages/th.json`). Server-only namespaces stay
 * out (e.g. `notFound`, used by the server-rendered app/not-found.tsx).
 */
export async function getClientMessages() {
  const messages = await getMessages();
  return {
    common: messages.common,
    error: messages.error,
    auth: messages.auth,
    billing: messages.billing,
    shop: messages.shop,
    admin: messages.admin,
    reviews: messages.reviews,
    stamp: messages.stamp,
    leads: messages.leads,
    layout: messages.layout,
    map: messages.map,
    channels: messages.channels,
    analytics: messages.analytics,
    promote: messages.promote,
    theme: messages.theme,
  };
}
