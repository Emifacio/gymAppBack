import { driver, type Driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

type OnboardingTourOptions = {
  onComplete: () => void;
  navigate: (to: string) => void;
};

const waitForElement = async (selector: string, timeoutMs = 8000): Promise<HTMLElement | null> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) return el;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return null;
};

export const createOnboardingTour = ({ onComplete, navigate }: OnboardingTourOptions): Driver => {
  let completed = false;
  const steps: DriveStep[] = [
    {
      element: "#tour-credits",
      popover: {
        title: "Tus Créditos",
        description: "Aquí puedes ver cuántos créditos tienes disponibles para reservar clases.",
        side: "bottom",
        align: "start"
      }
    },
    {
      element: "#tour-workouts",
      popover: {
        title: "Reservar clase",
        description: "Elige una clase y resérvala para asegurar tu lugar.",
        side: "bottom",
        align: "start"
      }
    },
    {
      element: "#tour-cancel-booking",
      popover: {
        title: "Cancelar clase",
        description: "Si no puedes asistir, cancela con tiempo para liberar el cupo.",
        side: "top",
        align: "start"
      }
    }
  ];

  const config: Config = {
    showProgress: true,
    steps,
    onNextClick: () => {
      void (async () => {
        const activeIndex = driverInstance.getActiveIndex() ?? 0;

        if (activeIndex === 0) {
          navigate("/workouts");
          const nextEl = await waitForElement("#tour-workouts");
          if (!nextEl) {
            console.info("Onboarding tour: #tour-workouts not found after navigation; ending tour early.");
            completed = true;
            onComplete();
            driverInstance.destroy();
            return;
          }
          driverInstance.moveNext();
          return;
        }

        if (activeIndex === 1) {
          navigate("/bookings");
          const nextEl = await waitForElement("#tour-cancel-booking");
          if (!nextEl) {
            console.info("Onboarding tour: #tour-cancel-booking not found after navigation; completing tour.");
            completed = true;
            onComplete();
            driverInstance.destroy();
            return;
          }
          driverInstance.moveNext();
          return;
        }

        if (activeIndex === steps.length - 1) {
          completed = true;
          onComplete();
          driverInstance.destroy();
          return;
        }

        driverInstance.moveNext();
      })();
    },
    onCloseClick: () => {
      driverInstance.destroy();
    },
    onDestroyed: () => {
      if (!completed) return;
    }
  };

  const driverInstance = driver(config);
  return driverInstance;
};
