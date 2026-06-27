import type { Branch } from "@/src/domain/entities";
import type {
  IBranchRepository,
  UpdateBranchLocationInput,
} from "@/src/application/repositories/IBranchRepository";
import { validateLatLng, normalizeAddress } from "@/src/domain/services/geo";

export class UpdateBranchLocationUseCase {
  constructor(private readonly branches: IBranchRepository) {}

  /**
   * Sets (or clears) a branch's location. The branch must belong to `shopId`.
   * Pass null lat/lng to remove the pin from the map.
   */
  async execute(
    shopId: string,
    branchId: string,
    input: UpdateBranchLocationInput,
  ): Promise<Branch> {
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.shopId !== shopId) {
      throw new Error("ไม่พบสาขาในร้านนี้");
    }

    const { latitude, longitude } = input;
    validateLatLng({ latitude, longitude });
    const address = normalizeAddress(input.address);

    return this.branches.updateLocation(branchId, { latitude, longitude, address });
  }
}
