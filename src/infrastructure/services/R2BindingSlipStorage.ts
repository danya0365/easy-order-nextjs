import "server-only";

import { env } from "cloudflare:workers";

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
import { logger } from "@/src/infrastructure/observability/logger";

/**
 * Slip/image storage backed by a Workers R2 binding (`env.SLIP_BUCKET`).
 * Prefer this on Cloudflare Workers when S3 Access Key env vars are unset.
 */
export class R2BindingSlipStorage implements ISlipStorage {
  constructor(private readonly bucket: R2Bucket) {}

  async save(input: SaveSlipInput): Promise<{ url: string }> {
    return this.saveObject({
      key: slipKey(input.paymentId, extFor(input)),
      contentType: input.contentType,
      bytes: input.bytes,
    });
  }

  async saveObject(input: SaveObjectInput): Promise<{ url: string }> {
    await this.bucket.put(input.key, input.bytes, {
      httpMetadata: { contentType: input.contentType },
    });
    return { url: input.key };
  }

  async read(
    url: string,
  ): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    const obj = await this.bucket.get(url);
    if (!obj) return null;
    const bytes = new Uint8Array(await obj.arrayBuffer());
    return {
      bytes,
      contentType: obj.httpMetadata?.contentType ?? contentTypeForKey(url),
    };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.bucket.delete(key);
    } catch (e) {
      logger.error("R2 binding delete failed", {
        scope: "r2-binding",
        err: (e as Error).message,
      });
    }
  }

  async list(prefix: string): Promise<StoredObject[]> {
    const out: StoredObject[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.bucket.list({ prefix, cursor });
      for (const o of page.objects) {
        out.push({ key: o.key, lastModified: o.uploaded });
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return out;
  }
}

type WorkersEnv = { SLIP_BUCKET?: R2Bucket };

/** Resolve `env.SLIP_BUCKET` when the Workers R2 binding is configured. */
export function r2BindingFromEnv(): R2Bucket | null {
  const bucket = (env as WorkersEnv).SLIP_BUCKET;
  return bucket ?? null;
}
