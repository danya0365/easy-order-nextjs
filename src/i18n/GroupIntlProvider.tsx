import { NextIntlClientProvider } from "next-intl";

import { getClientMessagesFor } from "./client-messages";
import type { ClientGroup } from "./client-namespaces";

/** Server component: scopes client messages to one route group. */
export async function GroupIntlProvider({ group, children }: { group: ClientGroup; children: React.ReactNode }) {
  const messages = await getClientMessagesFor(group);
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
