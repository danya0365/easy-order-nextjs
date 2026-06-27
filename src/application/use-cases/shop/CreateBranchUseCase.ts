import type { Branch } from "@/src/domain/entities";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";

export class CreateBranchUseCase {
  constructor(private readonly branches: IBranchRepository) {}

  async execute(shopId: string, name: string): Promise<Branch> {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      throw new Error("ชื่อสาขาต้องมี 1–80 ตัวอักษร");
    }
    return this.branches.create({ shopId, name: trimmed });
  }
}
