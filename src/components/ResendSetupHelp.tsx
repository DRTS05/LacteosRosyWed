import { AlertCircle, CheckCircle, ExternalLink, Mail } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface ResendSetupHelpProps {
  email: string;
}

/**
 * Componente de ayuda visual para configurar Resend
 * Muestra instrucciones paso a paso cuando hay errores de sandbox
 */
export function ResendSetupHelp({ email }: ResendSetupHelpProps) {
  return (
    <div className="space-y-4">
      {/* Header de error */}
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-red-800">
            <strong>Resend está en modo sandbox</strong>
          </p>
          <p className="text-xs text-red-700">
            No se puede enviar el email a <strong>{email}</strong> porque no está verificado.
          </p>
        </div>
      </div>

      {/* Solución rápida */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm text-blue-900">
                  <strong>✅ Solución Rápida (5 minutos):</strong>
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  Verifica tu email en Resend para poder recibir correos
                </p>
              </div>

              <ol className="text-xs text-blue-900 space-y-2 ml-4 list-decimal">
                <li>
                  Ve al Dashboard de Resend:
                  <a
                    href="https://resend.com/emails"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                  >
                    resend.com/emails
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Navega a <strong>"Domains"</strong> → <strong>"Verification"</strong>
                </li>
                <li>
                  Haz clic en <strong>"Add email"</strong> e ingresa:{" "}
                  <code className="px-1.5 py-0.5 bg-white rounded text-xs border">
                    {email}
                  </code>
                </li>
                <li>
                  Revisa tu bandeja de <strong>{email}</strong> y confirma el email
                </li>
                <li>¡Listo! Ahora podrás recibir emails de recuperación</li>
              </ol>

              <div className="flex gap-2 pt-2">
                <a
                  href="https://resend.com/emails"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md inline-flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Ir a Resend Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email de prueba alternativo */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-700">
          <strong>💡 Alternativa para testing:</strong>
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Puedes usar el email de prueba de Resend para verificar que funciona:
        </p>
        <code className="mt-2 px-2 py-1 bg-white rounded text-xs border block w-fit">
          delivered@resend.dev
        </code>
        <p className="text-xs text-gray-500 mt-1">
          (Los emails enviados aquí aparecen en el Dashboard de Resend)
        </p>
      </div>

      {/* Documentación adicional */}
      <div className="text-center">
        <p className="text-xs text-gray-600">
          📄 Consulta la guía completa en:{" "}
          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
            /RESEND_SETUP.md
          </code>
        </p>
      </div>
    </div>
  );
}
