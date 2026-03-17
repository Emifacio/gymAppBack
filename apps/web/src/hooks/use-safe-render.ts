import { useState, useCallback, type ReactNode } from "react";
import { logger } from "@/lib/logger";

/**
 * useSafeRender hook
 * Provides a defensive wrapper for rendering dynamic or error-prone UI sections.
 * Automatically catches local rendering errors and allows falling back to a 
 * "safe" UI instead of crashing the parent component.
 */
export function useSafeRender() {
  const [errorContext, setErrorContext] = useState<{ hasError: boolean; error: Error | null }>({
    hasError: false,
    error: null,
  });

  const safeRender = useCallback((renderFn: () => ReactNode, fallbackUI: ReactNode = null): ReactNode => {
    if (errorContext.hasError) {
      return fallbackUI;
    }

    try {
      return renderFn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(error, { metadata: { hook: "useSafeRender" } });
      setErrorContext({ hasError: true, error });
      return fallbackUI;
    }
  }, [errorContext.hasError]);

  const resetError = useCallback(() => {
    setErrorContext({ hasError: false, error: null });
  }, []);

  return {
    safeRender,
    hasError: errorContext.hasError,
    error: errorContext.error,
    resetError,
  };
}
