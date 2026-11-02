import { GroupIntlProvider } from "@/src/i18n/GroupIntlProvider";

/** Scopes client i18n messages to this route group (see src/i18n/client-namespaces.ts). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <GroupIntlProvider group="auth">{children}</GroupIntlProvider>;
}
