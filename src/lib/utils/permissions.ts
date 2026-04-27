import type { UserRole } from "@/types/token";

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function canPushToStorybook(role: UserRole): boolean {
  return role === "admin";
}
