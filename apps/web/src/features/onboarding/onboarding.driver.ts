import { driver, type Driver, type Config } from "driver.js";
import { getOnboardingSteps } from "./onboarding.steps";
import { completeTour } from "./onboarding.store";

interface ManagedDriver extends Driver {
  _isDestroyed?: boolean;
}

let driverInstance: ManagedDriver | null = null;

function createDriver(): ManagedDriver {
  const steps = getOnboardingSteps();

  const config: Config = {
    allowClose: true,
    showProgress: true,
    steps,
    onCloseClick: () => {
      console.log("Onboarding closed");
      cleanupDriverInstance();
      // explicit: close does not mark completion (strict UX)
      // completeTour();
    },
    onComplete: () => {
      console.log("Onboarding completed");
      completeTour();
      cleanupDriverInstance();
    },
  };

  const instance = driver(config) as ManagedDriver;
  instance._isDestroyed = false;
  return instance;
}

function cleanupDriverInstance(): void {
  if (!driverInstance) return;
  try {
    driverInstance.destroy();
  } catch {
    // ignore destroy errors
  }
  driverInstance._isDestroyed = true;
  driverInstance = null;
}

export function getDriver(): Driver {
  if (!driverInstance || driverInstance._isDestroyed) {
    driverInstance = createDriver();
  }
  return driverInstance;
}

export function destroyDriver(): void {
  cleanupDriverInstance();
}
