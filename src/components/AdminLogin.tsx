import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Lock, User, ArrowLeft, AlertTriangle, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { loginAdmin, requestPasswordReset } from "../utils/supabase/api";
import { ResendSetupHelp } from "./ResendSetupHelp";

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

export function AdminLogin({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // ============================================
  // SEGURIDAD: EMAIL DEL ADMINISTRADOR CIFRADO
  // ============================================
  // Email codificado en Base64 para ofuscación y seguridad
  // Este email es FIJO y no se puede modificar desde la UI
  // Solo este email puede recibir correos de recuperación
  const ADMIN_EMAIL_ENCODED = "ZGFuaWxvdGVsbGV6NzMzQGdtYWlsLmNvbQ=="; // Base64
  
  /**
   * Decodifica el email del administrador
   * @returns Email del administrador
   */
  const getAdminEmail = () => {
    try {
      return atob(ADMIN_EMAIL_ENCODED);
    } catch {
      // Nunca debería fallar, pero por seguridad
      return "admin@lacteos-rosy.com";
    }
  };
  
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<{
    message: string;
    details?: any;
    isSandboxError?: boolean;
  } | null>(null);

  /**
   * Maneja la solicitud de recuperación de contraseña
   */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null); // Limpiar errores previos

    try {
      // Usar el email decodificado del admin
      const adminEmail = getAdminEmail();
      const result = await requestPasswordReset(adminEmail);
      
      if (result.success) {
        setResetSuccess(true);
        setResetError(null);
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetSuccess(false);
        }, 3000);
      } else {
        console.error("❌ Error completo de recuperación:", result);
        console.error("❌ Detalles del error:", result.details);
        
        // Detectar si es error de sandbox de Resend
        const isSandboxError = 
          result.error?.includes('RESEND EN MODO SANDBOX') ||
          result.details?.resendDashboard ||
          result.details?.recipientEmail;
        
        // Guardar error para mostrar en UI
        setResetError({
          message: result.error || 'Error desconocido',
          details: result.details,
          isSandboxError
        });
      }
    } catch (error) {
      console.error("❌ Error solicitando recuperación:", error);
      setResetError({
        message: "Error de conexión. Intente nuevamente.",
        isSandboxError: false
      });
    } finally {
      setResetLoading(false);
    }
  };

  /**
   * Maneja el submit del formulario de login
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log('🔐 Intentando login...');
      
      const result = await loginAdmin(credentials.username, credentials.password);
      
      if (result.success) {
        console.log("✅ Login exitoso");
        setFailedAttempts(0);
        onLoginSuccess();
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setError("Demasiados intentos fallidos. Regresando al inicio...");
          setTimeout(() => {
            onBack();
          }, 2000);
        } else {
          const errorMsg = result.error || "Usuario o contraseña incorrectos";
          setError(`${errorMsg} (Intento ${newAttempts}/3)`);
        }
      }
    } catch (error) {
      console.error("❌ Error en login:", error);
      setError(`Error de conexión. Intente nuevamente.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Botón para volver al inicio */}
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-white hover:bg-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Inicio
        </Button>

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-2">Lácteos Rosy</h1>
          <p className="text-blue-200">Panel de Administración</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingrese sus credenciales de administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo de Usuario */}
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ingrese su usuario"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials({ ...credentials, username: e.target.value })
                    }
                    className="pl-10"
                    required
                    disabled={failedAttempts >= 3 || loading}
                  />
                </div>
              </div>

              {/* Campo de Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({ ...credentials, password: e.target.value })
                    }
                    className="pl-10"
                    required
                    disabled={failedAttempts >= 3 || loading}
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                  failedAttempts >= 3 ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600'
                }`}>
                  {failedAttempts >= 3 && <AlertTriangle className="w-4 h-4" />}
                  {error}
                </div>
              )}

              {/* Botón de Enviar */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={failedAttempts >= 3 || loading}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>

              {/* Enlace de Recuperación de Contraseña */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  disabled={failedAttempts >= 3 || loading}
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>

              {/* Información de intentos restantes */}
              {failedAttempts > 0 && failedAttempts < 3 && (
                <p className="text-center text-sm text-gray-500">
                  Intentos restantes: {3 - failedAttempts}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-blue-200 text-sm">
            © 2025 Lácteos Rosy. Todos los derechos reservados.
          </p>
          
          <p className="text-blue-300 text-xs opacity-70">
            ¿Problemas? Presiona Ctrl+Shift+D para diagnóstico
          </p>
        </div>

        {/* Diálogo de Recuperación de Contraseña */}
        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Recuperar Contraseña
              </DialogTitle>
              <DialogDescription>
                Se enviará tu contraseña de acceso al correo registrado del administrador
              </DialogDescription>
            </DialogHeader>
            
            {resetSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  ✅ Se ha enviado un correo con las instrucciones de recuperación a tu correo registrado
                </p>
              </div>
            ) : resetError?.isSandboxError ? (
              // Mostrar ayuda visual cuando es error de sandbox
              <div className="space-y-4">
                <ResendSetupHelp email={getAdminEmail()} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetError(null);
                    setShowForgotPassword(false);
                  }}
                  className="w-full"
                >
                  Entendido
                </Button>
              </div>
            ) : resetError ? (
              // Mostrar error genérico
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    ❌ {resetError.message}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResetError(null)}
                    className="flex-1"
                  >
                    Reintentar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResetError(null);
                      setShowForgotPassword(false);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {/* Solo mostrar cuadro de seguridad sin revelar el email */}
                <div className="flex items-start gap-3 text-sm text-amber-700 bg-amber-50 p-4 rounded-md border border-amber-200">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="space-y-2 flex-1">
                    <p>
                      <strong>Protección de seguridad activada:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                      <li>Solo el correo registrado puede recibir este correo</li>
                      <li>Máximo 3 intentos por hora</li>
                      <li>Todos los intentos son monitoreados</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1"
                    disabled={resetLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Enviando..." : "Confirmar y Enviar"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
