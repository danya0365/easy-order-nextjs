import type { Customer } from "@/src/domain/entities";

export interface ICustomerDeviceRepository {
  /** Bind a new device to a customer; returns the opaque token (cookie value). */
  create(customerId: string): Promise<{ token: string }>;
  /** Resolve a device token to its customer (joins customers). */
  findByToken(token: string): Promise<{ customer: Customer } | null>;
  /** Remove all device bindings for a customer (e.g. on PDPA erasure). */
  deleteByCustomer(customerId: string): Promise<void>;
}
