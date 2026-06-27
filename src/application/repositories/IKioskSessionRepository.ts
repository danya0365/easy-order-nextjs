export interface KioskSession {
  id: string;
  shopId: string;
  label: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CreateKioskSessionInput {
  shopId: string;
  label?: string | null;
  expiresAt: string;
}

export interface IKioskSessionRepository {
  create(input: CreateKioskSessionInput): Promise<KioskSession>;
  /** The session if it exists and hasn't expired, else null. */
  findValid(id: string, now: Date): Promise<KioskSession | null>;
  delete(id: string): Promise<void>;
  /** Revoke every kiosk device for a shop (owner "log out all kiosks"). */
  deleteAllForShop(shopId: string): Promise<void>;
  listByShop(shopId: string): Promise<KioskSession[]>;
}
