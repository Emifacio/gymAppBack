import type { OnboardingStepDefinition } from "./onboarding.types";

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: "credits",
    route: "/",
    selector: "#tour-credits",
    popover: {
      title: "Tus Créditos",
      description: "Aquí puedes ver cuántos créditos tienes disponibles para reservar clases.",
      side: "bottom",
      align: "start",
    },
  },
  {
    id: "workouts",
    route: "/workouts",
    selector: "#tour-workouts",
    popover: {
      title: "Reservar clase",
      description: "Elige una clase y resérvala para asegurar tu lugar.",
      side: "bottom",
      align: "start",
    },
    isOptional: true,
  },
  {
    id: "cancel-booking",
    route: "/bookings",
    selector: "#tour-cancel-booking",
    popover: {
      title: "Cancelar clase",
      description: "Si no puedes asistir, cancela con tiempo para liberar el cupo.",
      side: "top",
      align: "start",
    },
  },
];

export function getOnboardingSteps(): OnboardingStepDefinition[] {
  return ONBOARDING_STEPS;
}
