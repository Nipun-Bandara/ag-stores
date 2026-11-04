import { getDb } from "@/db";
import { UserRole } from "@/generated/prisma/client";
import {
  exceedsWeightAllowance,
  milliToDecimal,
  packedLineTotal,
  packedWeightValid,
  weightDifferenceMilli,
} from "@/lib/packing";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";
import {
  PrismaPackingRepository,
  type PackingRepository,
} from "@/repositories/packing.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type { PackedWeightUpdateInput } from "@/validations/packing";

export class PackingError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PackingError";
  }
}

export async function savePackedWeight(
  actor: AuthenticatedUser,
  orderId: string,
  input: PackedWeightUpdateInput,
  repository: PackingRepository = new PrismaPackingRepository(getDb()),
) {
  if (actor.role !== UserRole.SHOP_OWNER)
    throw new PackingError("OWNER_ONLY", "Shop owner access is required.", 403);
  if (!packedWeightValid(input.packedQuantity))
    throw new PackingError(
      "INVALID_WEIGHT",
      "Packed weight must be positive with at most three decimal places.",
      400,
    );
  return repository.transaction(async (transaction) => {
    const order = await transaction.findLockedOrder(orderId);
    if (!order || order.shop.ownerId !== actor.id)
      throw new PackingError("ORDER_NOT_FOUND", "Order not found.", 404);
    if (order.status !== "PREPARING" || !order.packingRequired)
      throw new PackingError(
        "PACKING_CLOSED",
        "Packed weights can only be saved while preparing a new KG order.",
        409,
      );
    if (order.packingVersion !== input.expectedVersion)
      throw new PackingError(
        "ORDER_CHANGED",
        "Packing changed. Refresh the order and try again.",
        409,
      );
    const item = order.items.find((candidate) => candidate.id === input.itemId);
    if (!item || item.sellingUnit !== "KG")
      throw new PackingError(
        "INVALID_ITEM",
        "Only KG order items can have a packed weight.",
        400,
      );

    const requested = item.quantity.toString();
    const previousWeight = item.packedQuantity?.toString() ?? requested;
    const allowance = order.shop.weightDifferenceAllowancePct.toFixed(2);
    const outsideAllowance = exceedsWeightAllowance(
      requested,
      input.packedQuantity,
      allowance,
    );
    const note = input.customerContactNote?.trim() ?? "";
    if (outsideAllowance && (!input.customerContactAgreed || !note))
      throw new PackingError(
        "CUSTOMER_CONTACT_REQUIRED",
        "Record customer agreement and a note for this weight difference.",
        400,
      );
    const contact = outsideAllowance ? { at: new Date(), note } : null;
    const difference = weightDifferenceMilli(
      previousWeight,
      input.packedQuantity,
    );
    const oldLineTotal = packedLineTotal(
      item.unitPrice.toFixed(2),
      previousWeight,
    );
    const newLineTotal = packedLineTotal(
      item.unitPrice.toFixed(2),
      input.packedQuantity,
    );
    let subtotal = "0";
    for (const line of order.items) {
      const weight =
        line.id === item.id
          ? input.packedQuantity
          : (line.packedQuantity?.toString() ?? line.quantity.toString());
      subtotal = addMinorUnits(
        subtotal,
        moneyToMinorUnits(packedLineTotal(line.unitPrice.toFixed(2), weight)),
      );
    }
    const newSubtotal = minorUnitsToMoney(subtotal);
    const newTotal = minorUnitsToMoney(
      addMinorUnits(subtotal, moneyToMinorUnits(order.deliveryFee.toFixed(2))),
    );
    if (
      !(await transaction.reconcileStock(
        item.productId,
        milliToDecimal(difference),
      ))
    )
      throw new PackingError(
        "INSUFFICIENT_STOCK",
        "There is not enough stock for the extra packed weight.",
        409,
      );
    await transaction.updateItem(item.id, input.packedQuantity, contact);
    if (
      !(await transaction.updateOrder(
        order.id,
        input.expectedVersion,
        newSubtotal,
        newTotal,
      ))
    )
      throw new PackingError(
        "ORDER_CHANGED",
        "Packing changed. Refresh the order and try again.",
        409,
      );
    await transaction.audit(actor.id, order.id, {
      itemId: item.id,
      productId: item.productId,
      requestedWeight: requested,
      previousPackedWeight: item.packedQuantity?.toString() ?? null,
      newPackedWeight: input.packedQuantity,
      stockDifference: milliToDecimal(difference),
      oldLineTotal,
      newLineTotal,
      previousSubtotal: order.subtotal.toFixed(2),
      newSubtotal,
      previousTotal: order.total.toFixed(2),
      newTotal,
      customerContactAgreed: outsideAllowance,
      customerContactNote: contact?.note ?? null,
      customerContactAt: contact?.at.toISOString() ?? null,
    });
    return {
      orderId,
      packingVersion: input.expectedVersion + 1,
      subtotal: newSubtotal,
      total: newTotal,
      oldLineTotal,
      newLineTotal,
    };
  });
}
