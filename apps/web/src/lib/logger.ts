/**
 * Simple logging abstraction for the application.
 * Currently logs to console, but can be easily extended to support
 * external services like Sentry, LogRocket, or a custom backend.
 */

interface LogContext {
  componentStack?: string | undefined;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.info(`[INFO] ${message}`, context || "");
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(`[WARN] ${message}`, context || "");
  },
  
  error: (error: Error | string, context?: LogContext) => {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[ERROR] ${message}`, {
      ...context,
      stack,
      timestamp: new Date().toISOString(),
    });

    // FUTURE: Integrate with external services here
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { extra: context });
    // }
  },

  debug: (message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context || "");
    }
  },
};
