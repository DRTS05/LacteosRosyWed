import { useState } from "react";
import { AlertCircle, X, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

/**
 * Banner informativo sobre la configuración de email
 * Se puede cerrar y se guarda en localStorage para no molestar
 */
export function EmailConfigBanner() {
  const [dismissed, setDismissed] = useState(() => {
    // Verificar si ya fue cerrado antes
    return localStorage.getItem('emailConfigBannerDismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('emailConfigBannerDismissed', 'true');
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm text-blue-900">
              <strong>📧 Configuración de Email Requerida</strong>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Para usar la recuperación de contraseña, verifica{" "}
              <code className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">
                danilotellez733@gmail.com
              </code>{" "}
              en Resend
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
            >
              Configurar en Resend
              <ExternalLink className="w-3 h-3" />
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="text-xs h-auto py-1.5 px-3"
            >
              Ya lo hice
            </Button>
          </div>

          <p className="text-xs text-blue-600">
            📄 Más info:{" "}
            <code className="px-1 py-0.5 bg-blue-100 rounded">
              IMPORTANTE_LEER_PRIMERO.md
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
