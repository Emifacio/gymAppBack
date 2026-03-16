import type { BookingEligibilityErrorCode, MemberSubscriptionStatus } from "@gym/api-client";

export interface BookingEligibilityModalContent {
  title: string;
  description: string;
}

const NO_ACTIVE_PLAN_CONTENT: BookingEligibilityModalContent = {
  title: "No active plan assigned",
  description:
    "You cannot reserve classes until a membership plan is assigned. Please contact the administration."
};

const INSUFFICIENT_CREDITS_CONTENT: BookingEligibilityModalContent = {
  title: "Insufficient credits to reserve this class.",
  description:
    "Please contact administration to upgrade your plan or purchase additional credits."
};

const PLAN_EXPIRED_CONTENT: BookingEligibilityModalContent = {
  title: "Plan expired",
  description:
    "Your membership plan has expired. Please contact the administration to renew or reactivate your access."
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
