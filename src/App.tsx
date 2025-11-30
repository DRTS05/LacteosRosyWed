import { useState, useEffect } from "react";
import CustomerApp from "./CustomerApp";
import AdminApp from "./AdminApp";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { ShoppingBag, Lock } from "lucide-react";

type AppMode = "home" | "customer" | "admin";

export default function App() {
  const [mode, setMode] = useState<AppMode>("home");

  // Verificar el servidor al cargar la aplicación
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { projectId, publicAnonKey } = await import('./utils/supabase/info.tsx');
        const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-960143c8`;
        
        console.log('🚀 Iniciando aplicación Lácteos Rosy...');
        console.log('🔗 Servidor:', baseUrl);
        
        // Mensaje importante sobre configuración de email
        console.log('\n📧 ========================================');
        console.log('📧 CONFIGURACIÓN DE EMAIL (RESEND)');
        console.log('📧 ========================================');
        console.log('📧 Para usar recuperación de contraseña:');
        console.log('📧 1. Verifica danilotellez733@gmail.com en Resend');
        console.log('📧 2. Visita: https://resend.com/domains');
        console.log('📧 3. Lee: IMPORTANTE_LEER_PRIMERO.md');
        console.log('📧 ========================================\n');
        
        // Intentar conectar con reintentos
        let retries = 5;
        let connected = false;
        
        while (retries > 0 && !connected) {
          try {
            console.log(`💪 Intentando conectar con el servidor... (${6 - retries}/5)`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
            
            const initResponse = await fetch(`${baseUrl}/health`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (initResponse.ok) {
              const healthData = await initResponse.json();
              console.log('✅ Servidor conectado:', healthData);
              connected = true;
              
              // Ahora sí, forzar inicialización de datos
              console.log('📦 Cargando datos iniciales...');
              const dataResponse = await fetch(`${baseUrl}/force-init`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                },
              });
              
              const initData = await dataResponse.json();
              if (initData.success) {
                console.log(`📊 Datos cargados:`);
                console.log(`   - Productos: ${initData.counts.products}`);
                console.log(`   - Clientes: ${initData.counts.customers}`);
                console.log(`   - Pedidos: ${initData.counts.orders}`);
                console.log(`   - Vehículos: ${initData.counts.vehicles}`);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Intento fallido (${6 - retries}/5):`, error.message);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
            }
          }
        }
        
        if (!connected) {
          console.error('❌ No se pudo conectar con el servidor después de 5 intentos');
          console.error('⚠️ La aplicación puede no funcionar correctamente');
        }
      } catch (error) {
        console.error('❌ Error crítico inicializando aplicación:', error);
      }
    };
    
    initializeApp();
  }, []);
  
  if (mode === "customer") {
    return <CustomerApp onBack={() => setMode("home")} />;
  }

  if (mode === "admin") {
    return <AdminApp onBack={() => setMode("home")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decoraciones de fondo animadas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-40 left-1/3 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-white mb-4 text-5xl md:text-6xl drop-shadow-lg">Lácteos Rosy</h1>
          <p className="text-blue-100 text-xl md:text-2xl mb-2">Productos lácteos frescos y de calidad</p>
          <p className="text-blue-200 text-lg">Seleccione cómo desea acceder</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tarjeta de Cliente */}
          <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 cursor-pointer transform hover:-translate-y-3 bg-gradient-to-br from-white to-blue-50 overflow-hidden group" onClick={() => setMode("customer")}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="text-center pb-6 relative">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mx-auto mb-6 shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <ShoppingBag className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-blue-900 mb-3">Tienda en Línea</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Explora nuestros productos y realiza tu pedido
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Button
                onClick={() => setMode("customer")}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg transform hover:scale-105"
              >
                Ir a la Tienda
              </Button>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl">
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                  Ver catálogo de productos
                </li>
                <li className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl">
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                  Agregar al carrito de compras
                </li>
                <li className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl">
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                  Crear cuenta o iniciar sesión
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Tarjeta de Administrador */}
          <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 cursor-pointer transform hover:-translate-y-3 bg-gradient-to-br from-white to-orange-50 overflow-hidden group" onClick={() => setMode("admin")}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="text-center pb-6 relative">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl mx-auto mb-6 shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <Lock className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-orange-900 mb-3">Panel de Administración</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Gestiona pedidos, productos y clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Button
                onClick={() => setMode("admin")}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg transform hover:scale-105"
              >
                Iniciar Sesión como Admin
              </Button>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl">
                  <span className="w-2 h-2 bg-orange-600 rounded-full flex-shrink-0"></span>
                  Gestionar pedidos
                </li>
                <li className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl">
                  <span className="w-2 h-2 bg-orange-600 rounded-full flex-shrink-0"></span>
                  Administrar productos
                </li>
                <li className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl">
                  <span className="w-2 h-2 bg-orange-600 rounded-full flex-shrink-0"></span>
                  Ver información de clientes
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-blue-100 text-sm bg-white/10 backdrop-blur-sm inline-block px-6 py-3 rounded-full shadow-lg">
            © 2025 Lácteos Rosy. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}