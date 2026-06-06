import { adminRole, guestRole, userRole } from "./permissions";

export const authRoles = {
  admin: adminRole,
  user: userRole,
  guest: guestRole,
};

// ROLES key's value should reflect authRoles' keys
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;

export const ROLE_VALUES = Object.values(ROLES);
export type Role = (typeof ROLES)[keyof typeof ROLES];
