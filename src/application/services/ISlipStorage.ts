export interface SaveSlipInput {
  shopId: string;
  paymentId: string;
  /** Original filename, used to derive the stored extension. */
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface SaveObjectInput {
  /** Full storage key, e.g. "leads/<id>.png". */
  key: string;
  contentType: string;
  bytes: Uint8Array;
}

/**
 * Abstraction over where uploaded payment slips live. Phase 1 writes to local
 * disk; a future implementation could store in object storage (S3/R2) without
 * touching the billing use cases.
 */
export interface ISlipStorage {
  /** Persist the slip and return a URL/path retrievable later. */
  save(input: SaveSlipInput): Promise<{ url: string }>;
  /** Persist arbitrary bytes under an explicit key (e.g. lead photos). */
  saveObject(input: SaveObjectInput): Promise<{ url: string }>;
  /** Read raw bytes for serving via an auth-gated route handler. */
  read(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  /** Best-effort delete by key (e.g. removing a shop image). Never throws. */
  delete(key: string): Promise<void>;
  /**
   * List every stored object under a key prefix (e.g. "leads/"), with its last
   * modified time — used by orphaned-file cleanup to find unreferenced blobs.
   */
  list(prefix: string): Promise<StoredObject[]>;
}

export interface StoredObject {
  /** Full storage key (same value stored in DB columns). */
  key: string;
  lastModified: Date;
}
