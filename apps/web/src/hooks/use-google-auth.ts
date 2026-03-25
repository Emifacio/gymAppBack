import { useEffect, useRef, useState } from "react";

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
            use_fedcm_for_button?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            }
          ) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface UseGoogleAuthOptions {
  clientId: string;
  disabled?: boolean | undefined;
  onSuccess: (credential: string) => void;
  onError: (message: string) => void;
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
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () =>
          reject(
            new Error("No se pudo cargar Google Identity Service. Por favor intente nuevamente.")
          ),
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
    script.onerror = () =>
      reject(new Error("No se pudo cargar Google Identity Service. Por favor intente nuevamente."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

export function useGoogleAuth({
  clientId,
  disabled = false,
  onSuccess,
  onError
}: UseGoogleAuthOptions) {
  const [isReady, setIsReady] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(0);
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const initializedClientId = useRef<string | null>(null);
  const promptedClientId = useRef<string | null>(null);
  const successHandlerRef = useRef(onSuccess);
  const errorHandlerRef = useRef(onError);
  const isConfigured = clientId.length > 0;

  useEffect(() => {
    successHandlerRef.current = onSuccess;
    errorHandlerRef.current = onError;
  }, [onError, onSuccess]);

  useEffect(() => {
    if (!isConfigured) {
      promptedClientId.current = null;
      initializedClientId.current = null;
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
              if (!response.credential) {
                errorHandlerRef.current("No se pudo obtener la credencial de Google.");
                return;
              }

              successHandlerRef.current(response.credential);
            },
            cancel_on_tap_outside: true,
            context: "signin",
            use_fedcm_for_button: true
          });

          initializedClientId.current = clientId;
          promptedClientId.current = null;
        }

        if (isMounted) {
          setIsReady(true);
        }
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        setIsReady(false);
        errorHandlerRef.current(error.message);
      });

    return () => {
      isMounted = false;
    };
  }, [clientId, isConfigured]);

  useEffect(() => {
    if (!isReady || !buttonContainerRef.current || !window.google?.accounts?.id) {
      return;
    }

    const container = buttonContainerRef.current;
    const updateWidth = () => {
      const nextWidth = Math.round(container.getBoundingClientRect().width);
      setButtonWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        updateWidth();
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isReady]);

  useEffect(() => {
    if (
      !isReady ||
      !buttonContainerRef.current ||
      !window.google?.accounts?.id ||
      buttonWidth <= 0
    ) {
      return;
    }

    buttonContainerRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonContainerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left",
      width: buttonWidth
    });
  }, [buttonWidth, isReady]);

  useEffect(() => {
    if (!isReady || disabled || !window.google?.accounts?.id) {
      return;
    }

    if (promptedClientId.current === clientId) {
      return;
    }

    promptedClientId.current = clientId;
    window.google.accounts.id.prompt();
  }, [clientId, disabled, isReady]);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    window.google?.accounts?.id.cancel();
  }, [disabled]);

  return {
    buttonContainerRef,
    isConfigured,
    isReady
  };
}
