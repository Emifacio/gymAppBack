import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { MotionTokens, SuccessTokens } from "./motion-tokens";

type FeedbackType = "success" | "error" | "idle";

interface InlineFeedbackProps {
  message: string;
  type: FeedbackType;
  onDismiss?: () => void;
  duration?: number;
}

export function InlineFeedback({ message, type, onDismiss, duration = MotionTokens.feedback.errorDuration }: InlineFeedbackProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type === "success" && onDismiss) {
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [type, onDismiss, duration]);

  if (!message || type === "idle") return null;

  const isSuccess = type === "success";
  const containerClass = isSuccess ? SuccessTokens.inline.container : SuccessTokens.error.container;
  const iconClass = isSuccess ? SuccessTokens.inline.icon : SuccessTokens.error.icon;
  const textClass = isSuccess ? SuccessTokens.inline.text : SuccessTokens.error.text;

  return (
    <div
      className={`
        transition-all duration-${MotionTokens.transition.normal} ease-out
        opacity-100 translate-y-0
        ${containerClass}
        p-4
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <Check className={`size-5 flex-shrink-0 ${iconClass}`} strokeWidth={2.5} />
        ) : (
          <X className={`size-5 flex-shrink-0 ${iconClass}`} strokeWidth={2.5} />
        )}
        <p className={`text-sm font-medium ${textClass}`}>
          {message}
        </p>
      </div>
    </div>
  );
}
