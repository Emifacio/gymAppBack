import { driver, type Driver } from "driver.js";
import type { OnboardingStepDefinition, OnboardingControllerOptions, OnboardingTransitionResult, OnboardingWaitOptions } from "./onboarding.types";
import { completeTour } from "./onboarding.store";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_POLL_INTERVAL_MS = 100;

function isElementVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

function isRouteActive(route: string, pathname: string): boolean {
  if (route === "/") return pathname === "/" || pathname === "";
  return pathname.startsWith(route);
}

function waitForRouteAndElement(
  route: string,
  selector: string,
  options: OnboardingWaitOptions = {}
): Promise<HTMLElement> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = options;
  
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const { pathname } = window.location;

    if (!isRouteActive(route, pathname)) {
      reject(new Error(`Route mismatch: expected ${route}, current ${pathname}`));
      return;
    }

    const poll = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el && isElementVisible(el)) {
        resolve(el);
        return;
      }

      elapsed += pollIntervalMs;
      if (elapsed >= timeoutMs) {
        reject(new Error(`Element not found or not visible: ${selector} on route ${route}`));
        return;
      }

      requestAnimationFrame(() => {
        setTimeout(poll, pollIntervalMs);
      });
    };

    poll();
  });
}

export class OnboardingController {
  private driverInstance: Driver | null = null;
  private currentStepIndex = 0;
  private isRunning = false;
  private isDestroyed = false;
  private steps: OnboardingStepDefinition[];
  private options: OnboardingControllerOptions;
  private navigateFn: (path: string) => void;

  constructor(steps: OnboardingStepDefinition[], navigateFn: (path: string) => void, options: OnboardingControllerOptions) {
    this.steps = steps;
    this.navigateFn = navigateFn;
    this.options = options;
  }

  start(): void {
    if (this.isRunning || this.isDestroyed) {
      console.log("[Onboarding] Cannot start: already running or destroyed");
      return;
    }

    console.log("[Onboarding] Starting tour with", this.steps.length, "steps");
    this.isRunning = true;
    this.currentStepIndex = 0;

    void this.showStep(0);
  }

  private async showStep(index: number): Promise<void> {
    if (this.isDestroyed || !this.isRunning) return;

    const step = this.steps[index];
    if (!step) {
      console.log("[Onboarding] No step at index", index);
      void this.complete();
      return;
    }

    console.log("[Onboarding] Showing step", index + 1, ":", step.id, "on route", step.route);

    this.options.onStepChange?.(index, this.steps.length);

    if (step.canRun && !step.canRun()) {
      console.log("[Onboarding] Step", step.id, "precondition failed, skipping");
      if (!step.isOptional) {
        void this.abort(`Step "${step.id}" precondition failed`);
        return;
      }
      if (index < this.steps.length - 1) {
        this.currentStepIndex = index + 1;
        void this.showStep(index + 1);
      } else {
        void this.complete();
      }
      return;
    }

    try {
      await this.navigateAndWait(step.route, step.selector);
      this.renderDriverStep(step);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error("[Onboarding] Failed to show step:", reason);
      
      if (step.isOptional) {
        console.log("[Onboarding] Step is optional, skipping");
        if (index < this.steps.length - 1) {
          this.currentStepIndex = index + 1;
          void this.showStep(index + 1);
        } else {
          void this.complete();
        }
      } else {
        void this.abort(reason);
      }
    }
  }

  private async navigateAndWait(route: string, selector: string): Promise<void> {
    const { pathname } = window.location;

    if (!isRouteActive(route, pathname)) {
      console.log("[Onboarding] Navigating to", route);
      this.navigateFn(route);
      
      await new Promise<void>((resolve) => {
        const checkRoute = () => {
          if (isRouteActive(route, window.location.pathname)) {
            resolve();
          }
        };

        const interval = setInterval(() => {
          checkRoute();
          if (isRouteActive(route, window.location.pathname)) {
            clearInterval(interval);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 3000);
      });
    }

    console.log("[Onboarding] Waiting for element:", selector);
    await waitForRouteAndElement(route, selector);
    console.log("[Onboarding] Element found:", selector);
  }

  private renderDriverStep(step: OnboardingStepDefinition): void {
    if (this.isDestroyed) return;

    this.driverInstance?.destroy();

    const popoverConfig: Record<string, string> = {
      title: step.popover.title ?? "",
      description: String(step.popover.description ?? ""),
    };
    if (step.popover.side) popoverConfig.side = step.popover.side;
    if (step.popover.align) popoverConfig.align = step.popover.align;

    this.driverInstance = driver({
      animate: true,
      allowClose: true,
      showProgress: true,
      smoothScroll: true,
      steps: [
        {
          element: step.selector,
          popover: popoverConfig,
        },
      ],
      onNextClick: () => {
        console.log("[Onboarding] Next clicked from step", this.currentStepIndex + 1);
        this.moveNext();
      },
      onPrevClick: () => {
        console.log("[Onboarding] Prev clicked");
        this.movePrev();
      },
      onCloseClick: () => {
        console.log("[Onboarding] Close clicked");
        void this.close();
      },
    });

    const el = document.querySelector<HTMLElement>(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        this.driverInstance?.drive();
      }, 300);
    } else {
      void this.abort(`Element not found when trying to drive: ${step.selector}`);
    }
  }

  moveNext(): void {
    if (this.isDestroyed || !this.isRunning) return;

    this.driverInstance?.destroy();

    const nextIndex = this.currentStepIndex + 1;
    if (nextIndex >= this.steps.length) {
      void this.complete();
      return;
    }

    this.currentStepIndex = nextIndex;
    void this.showStep(nextIndex);
  }

  movePrev(): void {
    if (this.isDestroyed || !this.isRunning) return;
    if (this.currentStepIndex === 0) return;

    this.driverInstance?.destroy();
    this.currentStepIndex -= 1;
    void this.showStep(this.currentStepIndex);
  }

  private async complete(): Promise<void> {
    if (this.isDestroyed) return;

    console.log("[Onboarding] Completing tour");
    this.isRunning = false;

    this.driverInstance?.destroy();
    this.driverInstance = null;

    completeTour(this.options.userId ?? undefined);
    this.options.onComplete();
    this.isDestroyed = true;
  }

  private async close(): Promise<void> {
    if (this.isDestroyed) return;

    console.log("[Onboarding] Closing tour early");
    this.isRunning = false;

    this.driverInstance?.destroy();
    this.driverInstance = null;

    this.options.onClose();
    this.isDestroyed = true;
  }

  private async abort(reason: string): Promise<void> {
    if (this.isDestroyed) return;

    console.log("[Onboarding] Aborting tour:", reason);
    this.isRunning = false;

    this.driverInstance?.destroy();
    this.driverInstance = null;

    this.options.onAbort(reason);
    this.isDestroyed = true;
  }

  destroy(): void {
    if (this.isDestroyed) return;

    console.log("[Onboarding] Destroying controller");
    this.isRunning = false;
    this.isDestroyed = true;

    if (this.driverInstance) {
      try {
        this.driverInstance.destroy();
      } catch {
        // ignore
      }
      this.driverInstance = null;
    }
  }
}
