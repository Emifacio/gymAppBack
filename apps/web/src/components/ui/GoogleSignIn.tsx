import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { useGoogleAuth } from "@/hooks/use-google-auth";

interface GoogleSignInProps {
  clientId: string;
  onSuccess: (credential: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
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
  const statusId = useId();
  const { buttonContainerRef, isConfigured, isReady } = useGoogleAuth({
    clientId,
    disabled,
    onSuccess,
    onError
  });

  if (!isConfigured) {
    return (
      <div className="relative">
        <p className="mt-2 text-xs text-[var(--accent)]">
          Google login is not configured. Missing VITE_GOOGLE_CLIENT_ID.
        </p>
      </div>
    );
  }

  const isBusy = Boolean(disabled);

  return (
    <div className="relative w-full">
      {isReady ? (
        <div
          aria-describedby={statusId}
          aria-disabled={isBusy}
          className={isBusy ? "pointer-events-none opacity-60" : undefined}
          ref={buttonContainerRef}
        />
      ) : (
        <Button
          aria-describedby={statusId}
          className="h-13 w-full justify-center rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] px-5 text-[15px] font-semibold text-[var(--text-primary)] shadow-sm shadow-black/5"
          disabled
          loading
          size="lg"
          type="button"
          variant="outline"
        >
          <GoogleMark />
          <span>Continuar con Google</span>
        </Button>
      )}
      <p className="sr-only" id={statusId}>
        {isBusy
          ? "Autenticación de Google temporalmente deshabilitada."
          : isReady
            ? "Botón oficial de Google para iniciar sesión."
            : "Cargando autenticación de Google."}
      </p>
    </div>
  );
}
