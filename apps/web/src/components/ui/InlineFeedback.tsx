import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

type FeedbackType = "success" | "error" | "idle";

interface InlineFeedbackProps {
  message: string;
  type: FeedbackType;
  onDismiss?: () => void;
  duration?: number;
}

export function InlineFeedback({ message, type, onDismiss, duration = 4000 }: InlineFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message && type !== "idle") {
      setIsVisible(true);
      if (type === "success" && onDismiss) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [message, type, duration, onDismiss]);

  if (!message || type === "idle") return null;

  return (
    <div
      className={`
        transition-all duration-300 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
        ${type === "success" ? "rounded-xl border border-emerald-200 bg-emerald-50" : "rounded-xl border border-red-200 bg-red-50"}
        p-4
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {type === "success" ? (
          <Check className="size-5 flex-shrink-0 text-emerald-600" strokeWidth={2.5} />
        ) : (
          <X className="size-5 flex-shrink-0 text-red-600" strokeWidth={2.5} />
        )}
        <p className={`text-sm font-medium ${type === "success" ? "text-emerald-800" : "text-red-800"}`}>
          {message}
        </p>
      </div>
    </div>
  );
}
