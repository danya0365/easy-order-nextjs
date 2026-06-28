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
    layout: messages.layout,
    channels: messages.channels,
    theme: messages.theme,
    menu: messages.menu,
    order: messages.order,
    kiosk: messages.kiosk,
    map: messages.map,
    reviews: messages.reviews,
    analytics: messages.analytics,
    promote: messages.promote,
  };
}
