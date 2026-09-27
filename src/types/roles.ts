export const USER_ROLES = [
  "CUSTOMER",
  "SHOP_OWNER",
  "DELIVERY_PERSON",
  "ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
