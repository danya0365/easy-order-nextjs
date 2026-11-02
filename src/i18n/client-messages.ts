import "server-only";

import { getMessages } from "next-intl/server";

import { BASE_NAMESPACES, GROUP_NAMESPACES, type ClientGroup } from "./client-namespaces";

type Messages = Awaited<ReturnType<typeof getMessages>>;

// Picked subsets are cached per isolate: messages are static, so building the
// object once avoids re-walking the catalog on every request.
const cache = new Map<string, Messages>();

function pick(messages: Messages, names: readonly string[], key: string): Messages {
  const hit = cache.get(key);
  if (hit) return hit;
  const all = messages as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const n of names) if (all[n] !== undefined) out[n] = all[n];
  cache.set(key, out as Messages);
  return out as Messages;
}

/** Root layout: only the namespaces every page may need. */
export async function getBaseClientMessages() {
  return pick(await getMessages(), BASE_NAMESPACES, "__base");
}

/** Route-group layouts: BASE + that group's client namespaces (see client-namespaces.ts). */
export async function getClientMessagesFor(group: ClientGroup) {
  return pick(await getMessages(), [...BASE_NAMESPACES, ...GROUP_NAMESPACES[group]], group);
}
