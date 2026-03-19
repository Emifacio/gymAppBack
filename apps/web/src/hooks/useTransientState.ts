import { useCallback, useEffect, useRef, useState } from "react";
import { MotionTokens } from "@/components/ui/motion-tokens";

type TransientState = "idle" | "loading" | "success" | "error";

interface UseTransientStateOptions {
  duration?: number;
  onReset?: () => void;
}

export function useTransientState(options: UseTransientStateOptions = {}) {
  const { duration = MotionTokens.feedback.successDuration, onReset } = options;
  const [state, setState] = useState<TransientState>("idle");
  const [message, setMessage] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setState("idle");
    setMessage("");
    onReset?.();
  }, [clearTimer, onReset]);

  const triggerSuccess = useCallback(
    (msg?: string) => {
      clearTimer();
      setState("success");
      if (msg) setMessage(msg);
      timerRef.current = setTimeout(() => {
        setState("idle");
        setMessage("");
        onReset?.();
      }, duration);
    },
    [clearTimer, duration, onReset]
  );

  const triggerError = useCallback(
    (msg: string) => {
      clearTimer();
      setState("error");
      setMessage(msg);
      timerRef.current = setTimeout(() => {
        setState("idle");
        setMessage("");
      }, MotionTokens.feedback.errorDuration);
    },
    [clearTimer]
  );

  const triggerLoading = useCallback(() => {
    clearTimer();
    setState("loading");
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    state,
    message,
    isIdle: state === "idle",
    isLoading: state === "loading",
    isSuccess: state === "success",
    isError: state === "error",
    triggerSuccess,
    triggerError,
    triggerLoading,
    reset,
  };
}
