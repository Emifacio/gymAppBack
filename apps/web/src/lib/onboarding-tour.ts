import { driver, type Driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

type OnboardingTourOptions = {
  onComplete: () => void;
  navigate: (to: string) => void;
};

const waitForElement = async (
  selector: string,
  timeoutMs = 8000
): Promise<HTMLElement | null> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) return el;
    await new Promise((r) => setTimeout(r, 50));
  }

  return null;
};

export const createOnboardingTour = ({
  onComplete,
  navigate,
}: OnboardingTourOptions): Driver => {
  const goToStep = async (
    driverInstance: Driver,
    path: string,
    selector: string,
    onFail: () => void
  ) => {
    navigate(path);

    const el = await waitForElement(selector);

    if (!el) {
      console.info(`Onboarding: ${selector} not found`);
      onFail();
      driverInstance.destroy();
      return false;
    }

    el.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 200));

    return true;
  };

  const steps: DriveStep[] = [
    {
      element: "#tour-credits",
      popover: {
        title: "Tus Créditos",
        description:
          "Aquí puedes ver cuántos créditos tienes disponibles para reservar clases.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#tour-workouts",
      popover: {
        title: "Reservar clase",
        description:
          "Elige una clase y resérvala para asegurar tu lugar.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#tour-cancel-booking",
      popover: {
        title: "Cancelar clase",
        description:
          "Si no puedes asistir, cancela con tiempo para liberar el cupo.",
        side: "top",
        align: "start",
      },
    },
  ];

  const config: Config = {
    showProgress: true,
    steps,
    onCloseClick: () => instance.destroy(),
  };

  const instance = driver(config);

  // 🚀 Controlled flow (THIS is the key improvement)
  const start = async () => {
    instance.drive();

    // STEP 1 → STEP 2
    const ok1 = await goToStep(
      instance,
      "/workouts",
      "#tour-workouts",
      () => {
        onComplete();
      }
    );

    if (!ok1) return;

    instance.moveNext();

    // STEP 2 → STEP 3
    const ok2 = await goToStep(
      instance,
      "/bookings",
      "#tour-cancel-booking",
      () => {
        onComplete();
      }
    );

    if (!ok2) return;

    instance.moveNext();

    // FINAL STEP
    onComplete();
  };

  // 👇 Attach start method (clean API)
  return Object.assign(instance, { start });
};