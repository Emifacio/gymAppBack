import type { Member } from "@gym/api-client";

export function isAdmin(member: Member | null | undefined) {
  return member?.role === "admin";
}

export function isInstructor(member: Member | null | undefined) {
  return member?.role === "instructor";
}

export function canManageOperations(member: Member | null | undefined) {
  return isAdmin(member) || isInstructor(member);
}

export function canManagePlans(member: Member | null | undefined) {
  return isAdmin(member);
}
