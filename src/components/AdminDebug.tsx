import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, RefreshCw, Trash2, Bug, CheckCircle, XCircle } from "lucide-react";
import { 
  debugTokens, 
  clearAllServerTokens, 
  testAuthentication,
  testServerConnection,
  testAuthenticationFlow,
  verifySpecificToken
} from "../utils/supabase/api";

interface AdminDebugProps {
  onBack: () => void;
}

export function AdminDebug({ onBack }: AdminDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [flowTestResult, setFlowTestResult] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDebugTokens = async () => {
    setLoading(true);
    try {
      console.log('🔍 Obteniendo debug de tokens...');
      const result = await debugTokens();
      console.log('📦 Resultado:', result);
      setDebugInfo(result);
    } catch (error) {
      console.error('❌ Error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestAuth = async () => {
    setLoading(true);
    try {
      console.log('🔐 Probando autenticación...');
      const result = await testAuthentication();
      console.log('📦 Resultado:', result);
      setAuthStatus(result);
    } catch (error) {
      console.error('❌ Error:', error);
      setAuthStatus({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestServer = async () => {
    setLoading(true);
    try {
      console.log('🧪 Probando servidor...');
      const result = await testServerConnection();
      console.log('📦 Resultado:', result);
      setServerStatus(result);
    } catch (error) {
      console.error('❌ Error:', error);
      setServerStatus({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestFlow = async () => {
    setLoading(true);
    try {
      console.log('🧪 Probando flujo completo de autenticación...');
      const result = await testAuthenticationFlow();
      console.log('📦 Resultado:', result);
      setFlowTestResult(result);
    } catch (error) {
      console.error('❌ Error:', error);
      setFlowTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySpecific = async () => {
    setLoading(true);
    try {
      console.log('🔍 Verificando token específico...');
      const result = await verifySpecificToken();
      console.log('📦 Resultado:', result);
      setVerifyResult(result);
    } catch (error) {
      console.error('❌ Error:', error);
      setVerifyResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClearTokens = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que quieres limpiar TODOS los tokens?\n\nEsto cerrará todas las sesiones activas y tendrás que iniciar sesión de nuevo.')) {
      return;
    }

    setLoading(true);
    try {
      console.log('🧹 Limpiando tokens...');
      const result = await clearAllServerTokens();
      console.log('📦 Resultado:', result);
      alert('✅ Tokens limpiados exitosamente.\n\nAhora puedes hacer login de nuevo.');
      
      // Limpiar estados
      setDebugInfo(null);
      setAuthStatus(null);
      
      // Recargar para forzar re-login
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Error:', error);
      alert(`❌ Error limpiando tokens: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const localToken = localStorage.getItem('admin_token');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={onBack}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Bug className="w-8 h-8 text-blue-600" />
            <h1 className="text-blue-900">Panel de Diagnóstico</h1>
          </div>
          <p className="text-gray-600">Herramientas para depurar problemas de autenticación</p>
        </div>

        {/* Acciones */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Acciones de Diagnóstico</CardTitle>
            <CardDescription>
              Ejecuta estas acciones para diagnosticar problemas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={handleTestServer}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Probar Servidor
              </Button>

              <Button
                onClick={handleTestAuth}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verificar Token
              </Button>

              <Button
                onClick={handleDebugTokens}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Bug className="w-4 h-4 mr-2" />
                Debug Tokens
              </Button>

              <Button
                onClick={handleVerifySpecific}
                disabled={loading}
                variant="outline"
                className="w-full bg-green-50 hover:bg-green-100"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verificar Token en Servidor
              </Button>

              <Button
                onClick={handleTestFlow}
                disabled={loading}
                variant="outline"
                className="w-full bg-blue-50 hover:bg-blue-100 md:col-span-2"
              >
                <Bug className="w-4 h-4 mr-2" />
                Test Completo (Recomendado)
              </Button>

              <Button
                onClick={handleClearTokens}
                disabled={loading}
                variant="destructive"
                className="w-full md:col-span-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar Todos los Tokens
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token Local */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Token en localStorage</CardTitle>
          </CardHeader>
          <CardContent>
            {localToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>Token encontrado</span>
                </div>
                <div className="bg-gray-100 p-3 rounded font-mono text-xs break-all">
                  {localToken.substring(0, 50)}...
                </div>
                <p className="text-sm text-gray-500">
                  Longitud: {localToken.length} caracteres
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span>No hay token en localStorage</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado del Servidor */}
        {serverStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Estado del Servidor</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(serverStatus, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Estado de Autenticación */}
        {authStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Estado de Autenticación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 ${authStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                  {authStatus.success ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Token válido</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Token inválido</span>
                    </>
                  )}
                </div>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                  {JSON.stringify(authStatus, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado de Verificación Específica */}
        {verifyResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Verificación de Token en Servidor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 ${verifyResult.tokenValid ? 'text-green-600' : 'text-red-600'}`}>
                  {verifyResult.tokenValid ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Token válido en el servidor</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Token NO válido en el servidor</span>
                    </>
                  )}
                </div>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                  {JSON.stringify(verifyResult, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado del Test Completo */}
        {flowTestResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resultado del Test Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(flowTestResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Debug de Tokens */}
        {debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Información de Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
