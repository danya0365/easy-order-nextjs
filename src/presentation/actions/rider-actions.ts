"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import {
  AssignRiderUseCase,
  CreateRiderUseCase,
  DuplicateRiderPhoneError,
  RegenerateRiderLinkUseCase,
  RevokeRiderMembershipUseCase,
  UpdateRiderUseCase,
} from "@/src/application/use-cases/rider/RiderUseCases";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import type { RiderCommissionType } from "@/src/domain/entities";

export interface RiderFormInput {
  name: string;
  phone: string;
  commissionType: RiderCommissionType;
  /** Baht for per_trip (converted to satang here); percent for percent_fee. */
  commissionValue: number;
  lineId?: string | null;
  active?: boolean;
}

function toRepoValue(input: RiderFormInput): number {
  const v = Number(input.commissionValue) || 0;
  return input.commissionType === "per_trip" ? Math.round(v * 100) : Math.round(v);
}

export async function saveRiderAction(
  riderId: string | null,
  input: RiderFormInput,
  opts?: { allowDuplicatePhone?: boolean },
): Promise<{ error?: string; duplicate?: boolean }> {
  try {
    const { shopId } = await requireShopWrite();
    const data = {
      name: String(input.name ?? ""),
      phone: String(input.phone ?? ""),
      commissionType: input.commissionType,
      commissionValue: toRepoValue(input),
      lineId: input.lineId ? String(input.lineId) : null,
    };
    if (riderId) {
      await new UpdateRiderUseCase(container.riderRepository).execute(shopId, riderId, {
        ...data,
        active: input.active !== false,
      });
    } else {
      await new CreateRiderUseCase(container.riderRepository).execute(shopId, data, {
        allowDuplicatePhone: opts?.allowDuplicatePhone,
      });
    }
    revalidatePath("/shop/riders");
    return {};
  } catch (e) {
    if (e instanceof DuplicateRiderPhoneError) {
      return { error: e.message, duplicate: true };
    }
    return { error: (e as Error).message };
  }
}

/** Shop ends ITS OWN membership (deactivate + kill the link). Other shops untouched. */
export async function revokeRiderMembershipAction(
  riderId: string,
): Promise<{ error?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    await new RevokeRiderMembershipUseCase(container.riderRepository).execute(shopId, riderId);
    revalidatePath("/shop/riders");
    revalidatePath(`/shop/riders/${riderId}`);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Issue a new personal link; the URL is returned once and never stored in plain text. */
export async function regenerateRiderLinkAction(
  riderId: string,
): Promise<{ error?: string; url?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    const token = await new RegenerateRiderLinkUseCase(container.riderRepository).execute(
      shopId,
      riderId,
    );
    revalidatePath("/shop/riders");
    revalidatePath(`/shop/riders/${riderId}`);
    return { url: `${await getBaseUrl()}/r/${token}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function assignRiderAction(
  orderId: string,
  riderId: string,
): Promise<{ error?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    await new AssignRiderUseCase(container.orderRepository, container.riderRepository).execute(
      shopId,
      orderId,
      riderId,
    );
    revalidatePath("/shop/orders");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
