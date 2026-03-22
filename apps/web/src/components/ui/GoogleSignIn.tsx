import { useEffect, useRef } from "react";
import { useTheme } from "@/providers/theme-provider";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInProps {
  clientId: string;
  onSuccess: (credential: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function GoogleSignIn({ clientId, onSuccess, onError, disabled }: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme } = useTheme();
  const isConfigured = clientId.length > 0;

  useEffect(() => {
    if (!isConfigured || disabled) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";

    const renderButton = () => {
      if (!window.google?.accounts?.id) {
        onError("Google Identity Services not available in browser.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (!response?.credential) {
            onError("No se pudo obtener la credencial de Google.");
            return;
          }
          onSuccess(response.credential);
        },
      });

      if (buttonRef.current) {
        // Clear previous button if any
        buttonRef.current.innerHTML = "";
        
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
          width: Math.max(buttonRef.current.offsetWidth, 240),
          logo_alignment: "left",
        });
      }
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      script.onload = () => {
        queueMicrotask(renderButton);
      };

      script.onerror = () => {
        onError("No se pudo cargar Google Identity Service. Por favor intente nuevamente.");
      };

      document.head.appendChild(script);
    }

    return () => {
      // We don't necessarily want to remove the script globally if other components use it,
      // but cleaning up the button is good.
    };
  }, [clientId, onSuccess, onError, disabled, isConfigured, resolvedTheme]);

  if (!isConfigured) {
    return (
      <div className="relative">
        <p className="mt-2 text-xs text-[var(--accent)]">
          Google login is not configured. Missing VITE_GOOGLE_CLIENT_ID.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={buttonRef}
        className="w-full [&>div]:!w-full"
        style={{ minHeight: disabled ? "44px" : "auto", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}
      />
    </div>
  );
}
