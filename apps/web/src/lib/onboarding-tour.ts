import { driver } from "driver.js";
import "driver.js/dist/driver.css";

type OnboardingTourOptions = {
  onComplete: () => void;
  navigate: (to: string) => void;
};

const waitForElement = async (selector: string, timeoutMs = 8000) => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return null;
};

export const createOnboardingTour = ({ onComplete, navigate }: OnboardingTourOptions) => {
  let completed = false;
  const steps = [
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
  ] as const;

  const driverObj = driver({
    showProgress: true,
    steps: steps as any,
    onNextClick: async () => {
      const activeIndex = (driverObj as any).getActiveIndex?.() ?? 0;

      if (activeIndex === 0) {
        navigate("/workouts");
        const nextEl = await waitForElement("#tour-workouts");
        if (!nextEl) {
          console.warn("Onboarding tour: #tour-workouts not found after navigation, ending tour.");
          (driverObj as any).destroy?.();
          return;
        }
        (driverObj as any).moveNext?.();
        return;
      }

      if (activeIndex === 1) {
        navigate("/bookings");
        const nextEl = await waitForElement("#tour-cancel-booking");
        if (!nextEl) {
          console.warn("Onboarding tour: #tour-cancel-booking not found after navigation, ending tour.");
          (driverObj as any).destroy?.();
          return;
        }
        (driverObj as any).moveNext?.();
        return;
      }

      if (activeIndex === steps.length - 1) {
        completed = true;
        onComplete();
        (driverObj as any).destroy?.();
        return;
      }

      (driverObj as any).moveNext?.();
    },
    onCloseClick: () => {
      (driverObj as any).destroy?.();
    },
    onDestroyed: () => {
      // Only persist completion when the user reached the last step.
      if (!completed) return;
    },
  });

  return driverObj;
};
