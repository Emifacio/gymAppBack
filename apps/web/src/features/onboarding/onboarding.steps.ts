import type { DriveStep } from "driver.js";

export function getOnboardingSteps(): DriveStep[] {
  return [
    {
      element: "#tour-credits",
      popover: {
        title: "Tus Créditos",
        description: "Aquí puedes ver cuántos créditos tienes disponibles para reservar clases.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#tour-workouts",
      popover: {
        title: "Reservar clase",
        description: "Elige una clase y resérvala para asegurar tu lugar.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#tour-cancel-booking",
      popover: {
        title: "Cancelar clase",
        description: "Si no puedes asistir, cancela con tiempo para liberar el cupo.",
        side: "top",
        align: "start",
      },
    },
  ];
}
