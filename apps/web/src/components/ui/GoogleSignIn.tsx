import { useEffect, useRef } from "react";

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
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
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
      return;
    }

    script.onload = () => {
      queueMicrotask(renderButton);
    };

    script.onerror = () => {
      onError("No se pudo cargar Google Identity Service. Por favor intente nuevamente.");
    };

    document.head.appendChild(script);

    return () => {
      const existing = document.querySelector("script[data-google-identity]");
      existing?.remove();
    };
  }, [clientId, onSuccess, onError, disabled, isConfigured]);

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
