import { useState, useEffect } from "react";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminDebug } from "./components/AdminDebug";
import { testAuthentication } from "./utils/supabase/api";

interface AdminAppProps {
  onBack: () => void;
}

export default function AdminApp({ onBack }: AdminAppProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  // TODOS los hooks deben estar al inicio, antes de cualquier return
  useEffect(() => {
    // Verificar si hay un token válido al cargar
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        console.log('🔐 No hay token, mostrando login');
        setIsChecking(false);
        return;
      }
      
      console.log('🔐 Token encontrado, verificando validez...');
      const result = await testAuthentication();
      
      if (result.success) {
        console.log('✅ Token válido, usuario autenticado');
        setIsLoggedIn(true);
      } else {
        console.log('❌ Token inválido:', result.error);
        console.log('🧹 Limpiando token inválido del localStorage');
        localStorage.removeItem('admin_token');
        
        // No mostrar alert aquí, solo dejar que se muestre el login
        // El mensaje se mostrará cuando intenten hacer una acción
      }
      
      setIsChecking(false);
    };
    
    checkAuth();
  }, []);

  // Detectar combinación de teclas Ctrl+Shift+D para abrir debug
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        console.log('🔍 Abriendo panel de debug...');
        setShowDebug(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsLoggedIn(false);
  };

  // Mostrar panel de debug si se activó
  if (showDebug) {
    return <AdminDebug onBack={() => setShowDebug(false)} />;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLogin onLoginSuccess={() => setIsLoggedIn(true)} onBack={onBack} />;
  }

  return <AdminDashboard onLogout={handleLogout} onBack={onBack} />;
}