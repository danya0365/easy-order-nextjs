// Type-safe next-intl message keys: `t('...')` is checked against the catalog,
// so a typo or a key missing from messages/th.json is a compile error.
type Messages = typeof import("./messages/th.json");

declare module "next-intl" {
  interface AppConfig {
    Messages: Messages;
  }
}

// Makes this file a module so the block above AUGMENTS next-intl's types
// instead of replacing them (which would hide its real exports).
export {};
