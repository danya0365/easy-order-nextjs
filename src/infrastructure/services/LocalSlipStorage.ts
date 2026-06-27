import "server-only";

import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ISlipStorage,
  SaveObjectInput,
  SaveSlipInput,
  StoredObject,
} from "@/src/application/services/ISlipStorage";
import {
  contentTypeForKey,
  extFor,
  slipKey,
} from "@/src/application/services/slip-media";

const BASE_DIR = path.join(process.cwd(), "uploads");

/**
 * Resolve a storage key like "slips/<id>.png" or "shops/<id>/<img>.png" to a
 * safe absolute path under BASE_DIR. Every segment is sanitized to block
 * traversal; the last segment is the file, the rest are nested dirs. Returns
 * null for malformed keys (fewer than 2 segments or an empty segment).
 */
function resolveKey(key: string): { dir: string; file: string } | null {
  const parts = key.split("/").map((p) => p.replace(/[^a-zA-Z0-9._-]/g, ""));
  if (parts.length < 2 || parts.some((p) => !p)) return null;
  const file = parts.pop()!;
  return { dir: path.join(BASE_DIR, ...parts), file };
}

/** Stores uploads on local disk under ./uploads (dev only — Vercel uses R2). */
export class LocalSlipStorage implements ISlipStorage {
  async save(input: SaveSlipInput): Promise<{ url: string }> {
    // Storage key (relative); served via /api/slips/[paymentId].
    return this.saveObject({
      key: slipKey(input.paymentId, extFor(input)),
      contentType: input.contentType,
      bytes: input.bytes,
    });
  }

  async saveObject(input: SaveObjectInput): Promise<{ url: string }> {
    const resolved = resolveKey(input.key);
    if (!resolved) throw new Error("invalid storage key");
    await mkdir(resolved.dir, { recursive: true });
    await writeFile(path.join(resolved.dir, resolved.file), input.bytes);
    return { url: input.key };
  }

  async read(
    url: string,
  ): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    const resolved = resolveKey(url);
    if (!resolved) return null;
    try {
      const buf = await readFile(path.join(resolved.dir, resolved.file));
      return { bytes: new Uint8Array(buf), contentType: contentTypeForKey(url) };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const resolved = resolveKey(key);
    if (!resolved) return;
    try {
      await unlink(path.join(resolved.dir, resolved.file));
    } catch {
      /* best-effort — already gone is fine */
    }
  }

  async list(prefix: string): Promise<StoredObject[]> {
    // Sanitize the prefix the same way keys are, so it stays under BASE_DIR.
    const segs = prefix.split("/").map((p) => p.replace(/[^a-zA-Z0-9._-]/g, ""));
    const root = path.join(BASE_DIR, ...segs.filter(Boolean));
    const out: StoredObject[] = [];

    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return; // prefix dir doesn't exist yet — nothing stored
      }
      for (const e of entries) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) {
          await walk(abs);
        } else {
          const rel = path.relative(BASE_DIR, abs).split(path.sep).join("/");
          const s = await stat(abs);
          out.push({ key: rel, lastModified: s.mtime });
        }
      }
    };

    await walk(root);
    return out;
  }
}
