import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            cancel_on_tap_outside?: boolean;
            context?: "signin" | "signup" | "use";
          }) => void;
          prompt: (
            momentListener?: (notification: {
              isDisplayMoment?: () => boolean;
              isDisplayed?: () => boolean;
              isNotDisplayed?: () => boolean;
              isSkippedMoment?: () => boolean;
              isDismissedMoment?: () => boolean;
              getNotDisplayedReason?: () => string;
              getSkippedReason?: () => string;
              getDismissedReason?: () => string;
            }) => void
          ) => void;
          cancel: () => void;
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

let googleIdentityScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar Google Identity Service. Por favor intente nuevamente.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Service. Por favor intente nuevamente."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        d="M21.805 12.227c0-.818-.073-1.604-.209-2.364H12v4.473h5.487a4.694 4.694 0 0 1-2.036 3.082v2.558h3.295c1.928-1.775 3.059-4.392 3.059-7.749Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.618-2.424l-3.295-2.558c-.894.6-2.036.967-3.323.967-2.599 0-4.8-1.754-5.586-4.118H3.01v2.636A9.997 9.997 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.414 13.867A5.998 5.998 0 0 1 6.091 12c0-.65.114-1.278.323-1.867V7.497H3.01a10 10 0 0 0 0 9.006l3.404-2.636Z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.982c1.473 0 2.79.509 3.836 1.509l2.863-2.863C16.964 2.99 14.7 2 12 2A9.997 9.997 0 0 0 3.01 7.497l3.404 2.636C7.2 7.736 9.401 5.982 12 5.982Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignIn({ clientId, onSuccess, onError, disabled }: GoogleSignInProps) {
  const [isReady, setIsReady] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const initializedClientId = useRef<string | null>(null);
  const statusId = useId();
  const isConfigured = clientId.length > 0;

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    let isMounted = true;

    void loadGoogleIdentityScript()
      .then(() => {
        if (!isMounted || !window.google?.accounts?.id) {
          return;
        }

        if (initializedClientId.current !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential?: string }) => {
              setIsLaunching(false);

              if (!response?.credential) {
                onError("No se pudo obtener la credencial de Google.");
                return;
              }

              onSuccess(response.credential);
            },
            cancel_on_tap_outside: true,
            context: "signin"
          });

          initializedClientId.current = clientId;
        }

        setIsReady(true);
      })
      .catch((error: Error) => {
        if (isMounted) {
          setIsReady(false);
          setIsLaunching(false);
          onError(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clientId, isConfigured, onError, onSuccess]);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    setIsLaunching(false);
    window.google?.accounts?.id.cancel?.();
  }, [disabled]);

  if (!isConfigured) {
    return (
      <div className="relative">
        <p className="mt-2 text-xs text-[var(--accent)]">
          Google login is not configured. Missing VITE_GOOGLE_CLIENT_ID.
        </p>
      </div>
    );
  }

  const isBusy = disabled || isLaunching;

  return (
    <div className="relative w-full">
      <Button
        aria-describedby={statusId}
        className="h-13 w-full justify-center rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] px-5 text-[15px] font-semibold text-[var(--text-primary)] shadow-sm shadow-black/5 hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] hover:shadow-md focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] disabled:border-[var(--border-base)] disabled:bg-[var(--bg-surface-secondary)] disabled:text-[var(--text-muted)]"
        disabled={!isReady || isBusy}
        loading={isBusy}
        size="lg"
        type="button"
        variant="outline"
        onClick={() => {
          if (!isReady || !window.google?.accounts?.id) {
            onError("Google Identity Services not available in browser.");
            return;
          }

          setIsLaunching(true);
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed?.()) {
              setIsLaunching(false);
              onError("No se pudo abrir el selector de Google. Por favor intente nuevamente.");
              return;
            }

            if (notification.isSkippedMoment?.() || notification.isDismissedMoment?.()) {
              setIsLaunching(false);
            }
          });
        }}
      >
        {!isBusy ? <GoogleMark /> : null}
        <span>Continuar con Google</span>
      </Button>
      <p className="sr-only" id={statusId}>
        {isBusy
          ? "Abriendo autenticación de Google."
          : isReady
            ? "Botón para iniciar sesión con Google."
            : "Cargando autenticación de Google."}
      </p>
    </div>
  );
}
