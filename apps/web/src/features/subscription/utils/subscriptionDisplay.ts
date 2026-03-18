import type { MemberSubscriptionStatus } from "@gym/api-client";

export function getSubscriptionStatusLabel(subscription?: MemberSubscriptionStatus | null) {
  if (!subscription) return "Sin plan activo";
  if (subscription.active_plan) return subscription.plan_name ?? "Plan asignado";
  if (subscription.error_code === "PLAN_EXPIRED") return "Plan expirado";
  return "Sin plan activo asignado";
}

export function getSubscriptionCreditDetail(subscription?: MemberSubscriptionStatus | null) {
  if (!subscription) return "La reserva está bloqueada hasta que tu plan esté activo.";
  if (subscription.active_plan) {
    return subscription.allows_free_pass
      ? "Ilimitado mientras haya capacidad disponible"
      : `${subscription.active_credits} créditos restantes`;
  }
  return "La reserva está bloqueada hasta que tu plan esté activo.";
}
