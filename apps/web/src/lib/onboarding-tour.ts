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
  // eslint-disable-next-line prefer-const
  let driverInstance!: Driver;

  const steps: DriveStep[] = [
    {
      element: "#tour-credits",
      popover: {
        title: "Tus Créditos",
        description: "Aquí puedes ver cuántos créditos tienes disponibles para reservar clases.",
        side: "bottom",
        align: "start",
        onNextClick: () => {
          void (async () => {
            navigate("/workouts");
            const nextEl = await waitForElement("#tour-workouts");

            if (!nextEl) {
              console.info("Onboarding tour: #tour-workouts not found after navigation; ending tour early.");
              completed = true;
              onComplete();
              driverInstance.destroy();
              return;
            }

            nextEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
            await new Promise((resolve) => setTimeout(resolve, 250));
            driverInstance.moveNext();
          })();
        }
      }
    },
    {
      element: "#tour-workouts",
      popover: {
        title: "Reservar clase",
        description: "Elige una clase y resérvala para asegurar tu lugar.",
        side: "bottom",
        align: "start",
        onNextClick: () => {
          void (async () => {
            navigate("/bookings");
            const nextEl = await waitForElement("#tour-cancel-booking");

            if (!nextEl) {
              console.info("Onboarding tour: #tour-cancel-booking not found after navigation; completing tour.");
              completed = true;
              onComplete();
              driverInstance.destroy();
              return;
            }

            nextEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
            await new Promise((resolve) => setTimeout(resolve, 250));
            driverInstance.moveNext();
          })();
        }
      }
    },
    {
      element: "#tour-cancel-booking",
      popover: {
        title: "Cancelar clase",
        description: "Si no puedes asistir, cancela con tiempo para liberar el cupo.",
        side: "top",
        align: "start",
        onNextClick: () => {
          completed = true;
          onComplete();
          driverInstance.destroy();
        }
      }
    }
  ];

  const config: Config = {
    showProgress: true,
    steps,
    onCloseClick: () => {
      driverInstance.destroy();
    },
    onDestroyed: () => {
      // If the user cancels early we don't auto-fire completion side effects.
      if (completed) return;
    }
  };

  driverInstance = driver(config);
  return driverInstance;
};
