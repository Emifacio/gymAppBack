import { useEffect, useRef, useState } from "react";

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
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setStatus("error");
      setErrorMessage("Google login is not configured. Missing VITE_GOOGLE_CLIENT_ID.");
      onError("Google login is not configured. Missing VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    const renderButton = () => {
      if (!window.google?.accounts?.id) {
        setStatus("error");
        const msg = "Google Identity Services not available in browser.";
        setErrorMessage(msg);
        onError(msg);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (!response?.credential) {
            const msg = "No se pudo obtener la credencial de Google.";
            setErrorMessage(msg);
            onError(msg);
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

      setStatus("ready");
      setErrorMessage(null);
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }

    const existingScript = document.querySelector("script[data-google-identity]");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";

    script.onload = () => {
      setTimeout(renderButton, 0);
    };

    script.onerror = () => {
      setStatus("error");
      const msg = "No se pudo cargar Google Identity Service. Por favor intente nuevamente.";
      setErrorMessage(msg);
      onError(msg);
    };

    document.head.appendChild(script);

    return () => {
      const existing = document.querySelector("script[data-google-identity]");
      existing?.remove();
    };
  }, [clientId, onSuccess, onError]);

  return (
    <div className="relative">
      <div
        ref={buttonRef}
        className="w-full [&>div]:!w-full"
        style={{ minHeight: disabled ? "44px" : "auto", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}
      />
      {status === "error" && errorMessage && (
        <p className="mt-2 text-xs text-[var(--accent)]">{errorMessage}</p>
      )}
    </div>
  );
}
