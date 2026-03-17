import type { BookingEligibilityErrorCode, MemberSubscriptionStatus } from "@gym/api-client";

export interface BookingEligibilityModalContent {
  title: string;
  description: string;
}

const NO_ACTIVE_PLAN_CONTENT: BookingEligibilityModalContent = {
  title: "No posees un plan activo",
  description:
    "Parece que no tienes un plan de membresía activo. Por favor, contacta a administración para obtener más información sobre cómo adquirir un plan y comenzar a reservar clases."
};

const INSUFFICIENT_CREDITS_CONTENT: BookingEligibilityModalContent = {
  title: "Créditos insuficientes para reservar esta clase.",
  description:
    "Parece que no tienes suficientes créditos para reservar esta clase. Por favor, contacta a administración para obtener más información sobre cómo adquirir más créditos."
};

const PLAN_EXPIRED_CONTENT: BookingEligibilityModalContent = {
  title: "Plan expirado",
  description:
    "Tu plan de membresía ha expirado. Por favor, contacta a administración para renovarlo o reactivar tu acceso."
};

export function getPrecheckErrorCode(
  subscription: MemberSubscriptionStatus | undefined
): BookingEligibilityErrorCode | undefined {
  if (!subscription) {
    return undefined;
  }
  if (!subscription.active_plan) {
    return (subscription.error_code as BookingEligibilityErrorCode | undefined) ?? "NO_ACTIVE_PLAN";
  }
  if (!subscription.allows_free_pass && subscription.active_credits <= 0) {
    return "INSUFFICIENT_CREDITS";
  }
  return undefined;
}

export function getBookingEligibilityModalContent(
  code: string | undefined
): BookingEligibilityModalContent | null {
  if (code === "INSUFFICIENT_CREDITS") {
    return INSUFFICIENT_CREDITS_CONTENT;
  }
  if (code === "PLAN_EXPIRED") {
    return PLAN_EXPIRED_CONTENT;
  }
  if (code === "NO_ACTIVE_PLAN") {
    return NO_ACTIVE_PLAN_CONTENT;
  }
  return null;
}
