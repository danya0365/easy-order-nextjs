import type { User } from "@/src/domain/entities";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

export interface CreateStaffInput {
  shopId: string;
  branchId: string;
  email: string;
  password: string;
}

export class CreateStaffUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly branches: IBranchRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(input: CreateStaffInput): Promise<User> {
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("อีเมลไม่ถูกต้อง");
    }
    if (input.password.length < 6) {
      throw new Error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
    }

    // The branch must belong to the shop (tenant scoping).
    const branch = await this.branches.findById(input.branchId);
    if (!branch || branch.shopId !== input.shopId) {
      throw new Error("ไม่พบสาขาในร้านนี้");
    }

    const existing = await this.users.findByEmailWithSecret(email);
    if (existing) throw new Error("อีเมลนี้ถูกใช้งานแล้ว");

    const passwordHash = await this.hasher.hash(input.password);
    return this.users.create({
      email,
      passwordHash,
      role: "branch_staff",
      shopId: input.shopId,
      branchId: input.branchId,
    });
  }
}
