import { driver, type Driver, type Config, type DriverHook } from "driver.js";
import { getOnboardingSteps } from "./onboarding.steps";
import { completeTour } from "./onboarding.store";

interface ManagedDriver extends Driver {
  _isDestroyed?: boolean;
}

let driverInstance: ManagedDriver | null = null;

function createDriver(): ManagedDriver {
  const steps = getOnboardingSteps();
  let hasClosed = false;

  const onClose: DriverHook = () => {
    console.log("Onboarding closed");
    hasClosed = true;
    cleanupDriverInstance();
  };

  const onDestroyed: DriverHook = () => {
    if (!hasClosed) {
      console.log("Onboarding completed");
      completeTour();
    }
    cleanupDriverInstance();
  };

  const config: Config = {
    allowClose: true,
    showProgress: true,
    steps,
    onCloseClick: onClose,
    onDestroyed,
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
