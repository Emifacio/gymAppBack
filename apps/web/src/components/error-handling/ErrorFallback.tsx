import React from "react";
import { RefreshCcw, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  resetErrorBoundary 
}) => {
  const handleReload = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 p-6 text-center animate-in fade-in duration-500">
      <div className="max-w-md space-y-8">
        {/* Icon with soft pulse */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-50 p-4">
            <AlertCircle className="h-12 w-12 text-red-500/80" strokeWidth={1.5} />
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Algo no salió como esperábamos
          </h1>
          <p className="text-base text-gray-500 leading-relaxed">
            Estamos trabajando para solucionarlo. Mientras tanto, puedes intentar recargar la página o volver al inicio.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
          <Button
            onClick={handleReload}
            className="group inline-flex items-center justify-center gap-2 px-8 py-6 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCcw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
            Reintentar
          </Button>
          
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 border-gray-200 bg-white px-8 py-6 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Button>
        </div>

        {/* Technical context footer (subtle) */}
        <div className="pt-12">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400/60">
            ATHLYT Production Resilience
          </p>
        </div>
      </div>
    </div>
  );
};
