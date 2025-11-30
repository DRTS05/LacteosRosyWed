// ============================================
// SERVIDOR BACKEND PARA LÁCTEOS ROSY
// ============================================
// Este servidor maneja todas las operaciones de la base de datos
// y sincroniza los datos entre el módulo de clientes y administrador

import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Imports de autenticación - importar directamente, no lazy
import { 
  authenticateUser, 
  requireAdmin, 
  getAdminUser, 
  loadTokensFromKV,
  getActiveTokensDebugInfo,
  clearAllTokens
} from './auth.tsx';

console.log('✅ Módulo de autenticación importado');

// ============================================
// RATE LIMITING PARA RECUPERACIÓN DE CONTRASEÑA
// ============================================
// Almacén de intentos de recuperación con timestamps
const passwordResetAttempts = new Map<string, number[]>();
const MAX_RESET_ATTEMPTS = 3; // Máximo 3 intentos
const RESET_WINDOW_MS = 60 * 60 * 1000; // Ventana de 1 hora

/**
 * Verifica si se han excedido los intentos de recuperación
 * @param identifier - Identificador único (puede ser IP, pero por ahora usamos "global")
 */
function checkResetRateLimit(identifier: string = 'global'): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const attempts = passwordResetAttempts.get(identifier) || [];
  
  // Filtrar intentos dentro de la ventana de tiempo
  const recentAttempts = attempts.filter(timestamp => now - timestamp < RESET_WINDOW_MS);
  
  // Actualizar la lista de intentos
  passwordResetAttempts.set(identifier, recentAttempts);
  
  const remainingAttempts = MAX_RESET_ATTEMPTS - recentAttempts.length;
  
  return {
    allowed: recentAttempts.length < MAX_RESET_ATTEMPTS,
    remainingAttempts: Math.max(0, remainingAttempts)
  };
}

/**
 * Registra un intento de recuperación
 */
function recordResetAttempt(identifier: string = 'global'): void {
  const attempts = passwordResetAttempts.get(identifier) || [];
  attempts.push(Date.now());
  passwordResetAttempts.set(identifier, attempts);
}

// ============================================
// CONFIGURACIÓN DE MIDDLEWARE
// ============================================
// CORS permite que el frontend se comunique con el servidor
app.use('*', cors());

// Logger condicional - no loguear health checks para mejor performance
app.use('*', async (c, next) => {
  const path = c.req.path;
  // Solo loguear rutas importantes, no health checks
  if (!path.includes('/health') && !path.includes('/ping')) {
    console.log(`[${new Date().toISOString()}] ${c.req.method} ${path}`);
  }
  await next();
});

// ============================================
// CLIENTE DE SUPABASE
// ============================================
// Se usa para operaciones de Storage (subida de imágenes)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================
const BUCKET_NAME = 'make-960143c8-product-images';
const DELIVERY_COST = 70; // Costo fijo de entrega en córdobas

// ============================================
// INICIALIZACIÓN DEL STORAGE BUCKET
// ============================================
// Crea el bucket para imágenes de productos si no existe
async function initStorage() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: false, // Bucket privado por seguridad
      });
      console.log(`✅ Bucket ${BUCKET_NAME} creado exitosamente`);
    }
  } catch (error) {
    console.error('Error inicializando storage:', error);
  }
}

// NO inicializar storage de forma bloqueante - se hará en background

// ============================================
// FUNCIÓN: CARGAR DATOS INICIALES
// ============================================
// Precarga 5 clientes con 3 pedidos cada uno si no existen datos
async function initializeData() {
  try {
    console.log('🔄 ========== VERIFICANDO DATOS ==========');
    
    const existingProducts = await kv.get('products');
    console.log('📦 Productos existentes:', existingProducts ? existingProducts.length : 0);
    
    // SOLO CARGAR DATOS SI NO EXISTEN
    if (existingProducts && existingProducts.length > 0) {
      console.log('✅ Los datos ya existen, no se sobrescribirán');
      console.log('📊 Resumen de datos existentes:');
      const existingCustomers = await kv.get('customers');
      const existingOrders = await kv.get('orders');
      const existingVehicles = await kv.get('vehicles');
      console.log(`  - Productos: ${existingProducts?.length || 0}`);
      console.log(`  - Clientes: ${existingCustomers?.length || 0}`);
      console.log(`  - Pedidos: ${existingOrders?.length || 0}`);
      console.log(`  - Vehículos: ${existingVehicles?.length || 0}`);
      return; // No sobrescribir datos existentes
    }
    
    console.log('🔄 No hay datos, inicializando datos precargados...');
    
    // Productos iniciales con las imágenes especificadas
    const initialProducts = [
      {
        id: "1",
        name: "Queso Fresco",
        description: "Queso fresco tradicional, suave y cremoso",
        price: 95,
        unit: "lb",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIZ8CkRpt4uO7FYCgi16DR1LRsp0vbPVq10Q&s",
        category: "Quesos",
        stock: 50,
      },
      {
        id: "2",
        name: "Queso Ahumado",
        description: "Queso con sabor ahumado natural, ideal para bocadillos",
        price: 95,
        unit: "lb",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlwpdBXrFaRR0B41eE9QYg0F2AzwLXmVGf0Q&s",
        category: "Quesos",
        stock: 35,
      },
      {
        id: "3",
        name: "Cuajada Fresca",
        description: "Cuajada fresca del día, textura suave",
        price: 90,
        unit: "lb",
        image: "https://img-global.cpcdn.com/recipes/f8efc6a132c5bcf5/600x852cq80/cuajada-fresca-foto-principal.webp",
        category: "Cuajadas",
        stock: 60,
      },
      {
        id: "4",
        name: "Cuajada Ahumada",
        description: "Cuajada con proceso de ahumado artesanal",
        price: 90,
        unit: "lb",
        image: "https://www.mapanicaragua.com/wp-content/uploads/2021/04/Cuajada-ahumada.jpg",
        category: "Cuajadas",
        stock: 45,
      },
      {
        id: "5",
        name: "Crema",
        description: "Crema de leche espesa y deliciosa",
        price: 60,
        unit: "lt",
        image: "https://bodegahilvia.com/sistema/docs/products/IMG_5468.JPG",
        category: "Lácteos",
        stock: 70,
      },
      {
        id: "6",
        name: "Quesillo",
        description: "Quesillo tradicional, perfecto para desayunos",
        price: 130,
        unit: "lb",
        image: "https://naranjomarket.com/wp-content/uploads/2020/05/queso-provolone.jpg",
        category: "Quesos",
        stock: 40,
      },
      {
        id: "7",
        name: "Queso Mozzarella",
        description: "Mozzarella fresca, ideal para pizzas y ensaladas",
        price: 110,
        unit: "lb",
        image: "https://media.istockphoto.com/id/181146375/es/foto/mozzarella-de-b%C3%BAfalo.jpg?s=612x612&w=0&k=20&c=GACLeShIiL_64kADXFF0y-GfAaK3BMM_lV5wEk42jDk=",
        category: "Quesos",
        stock: 30,
      },
      {
        id: "8",
        name: "Queso Manto de Leche",
        description: "Queso suave y cremoso tipo manto",
        price: 95,
        unit: "lb",
        image: "https://i.ytimg.com/vi/gGD9SDecCAw/maxresdefault.jpg",
        category: "Quesos",
        stock: 25,
      },
      {
        id: "9",
        name: "Queso Ricotta",
        description: "Ricotta suave y versátil para cocinar",
        price: 80,
        unit: "lb",
        image: "https://elpiamontes.com.uy/wp-content/uploads/2024/10/ricotta-grande-1.jpg",
        category: "Quesos",
        stock: 38,
      },
      {
        id: "10",
        name: "Mantequilla Lavada",
        description: "Mantequilla artesanal lavada, sabor puro",
        price: 100,
        unit: "lb",
        image: "https://cloudfront-us-east-1.images.arcpublishing.com/infobae/2TPNOXI7C5BPNMJQ5CQ2P2BVRQ.jpg",
        category: "Lácteos",
        stock: 42,
      },
    ];

    await kv.set('products', initialProducts);
    console.log('✅ 10 productos cargados');
    
    // Verificar que se guardaron
    const savedProducts = await kv.get('products');
    console.log(`✅ Verificación: ${savedProducts?.length || 0} productos en BD`);

    // 5 clientes precargados
    const initialCustomers = [
      {
        id: "c1",
        name: "María González Ruiz",
        email: "maria.gonzalez@email.com",
        password: "Maria2024!", // Contraseña única para María
        phone: "8456-7890",
        address: "Barrio San Sebastián, de la Rotonda 2c al sur",
        municipality: "Managua",
        department: "Managua",
        registeredAt: "2024-01-15T10:30:00Z",
      },
      {
        id: "c2",
        name: "Carlos Pérez Martínez",
        email: "carlos.perez@email.com",
        password: "Carlos123$", // Contraseña única para Carlos
        phone: "8765-4321",
        address: "Col. Centroamérica, frente al parque",
        municipality: "León",
        department: "León",
        registeredAt: "2024-02-10T14:20:00Z",
      },
      {
        id: "c3",
        name: "Ana Martínez López",
        email: "ana.martinez@email.com",
        password: "Ana#Secure99", // Contraseña única para Ana
        phone: "8234-5678",
        address: "Reparto Schick, del semáforo 1c al oeste",
        municipality: "Managua",
        department: "Managua",
        registeredAt: "2024-02-20T09:15:00Z",
      },
      {
        id: "c4",
        name: "José López Hernández",
        email: "jose.lopez@email.com",
        password: "Jose456&Safe", // Contraseña única para José
        phone: "8543-2109",
        address: "Barrio El Calvario, casa #45",
        municipality: "Granada",
        department: "Granada",
        registeredAt: "2024-03-05T16:45:00Z",
      },
      {
        id: "c5",
        name: "Rosa Hernández García",
        email: "rosa.hernandez@email.com",
        password: "Rosa789*Key", // Contraseña única para Rosa
        phone: "8912-3456",
        address: "Residencial Las Colinas, módulo B",
        municipality: "Masaya",
        department: "Masaya",
        registeredAt: "2024-03-15T11:00:00Z",
      },
    ];

    await kv.set('customers', initialCustomers);
    console.log('✅ 5 clientes cargados');

    // Generar 3 pedidos para cada cliente (15 pedidos en total)
    const initialOrders = [];
    const statuses = ["Entregado", "En Camino", "Procesando"];
    
    for (let i = 0; i < initialCustomers.length; i++) {
      const customer = initialCustomers[i];
      
      for (let j = 0; j < 3; j++) {
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - (j * 3)); // Pedidos cada 3 días
        
        // Seleccionar 2-3 productos aleatorios para cada pedido
        const numProducts = 2 + Math.floor(Math.random() * 2);
        const orderItems = [];
        let subtotal = 0;
        
        for (let k = 0; k < numProducts; k++) {
          const product = initialProducts[Math.floor(Math.random() * initialProducts.length)];
          const quantity = 1 + Math.floor(Math.random() * 3);
          orderItems.push({
            productId: product.id,
            productName: product.name,
            quantity,
            price: product.price,
            unit: product.unit,
          });
          subtotal += product.price * quantity;
        }
        
        initialOrders.push({
          id: `order-${i}-${j}`, // ID fijo sin Date.now()
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          deliveryAddress: customer.address,
          municipality: customer.municipality,
          department: customer.department,
          items: orderItems,
          subtotal,
          deliveryCost: DELIVERY_COST,
          total: subtotal + DELIVERY_COST,
          status: statuses[j],
          vehicleId: j === 0 ? "v1" : null, // Solo el primer pedido tiene vehículo asignado
          createdAt: orderDate.toISOString(),
          updatedAt: orderDate.toISOString(),
        });
      }
    }

    await kv.set('orders', initialOrders);
    console.log('✅ 15 pedidos cargados');

    // Vehículos iniciales
    const initialVehicles = [
      {
        id: "v1",
        plate: "MAN-001",
        model: "Moto Honda 2001",
        status: "Disponible",
        driver: "Por asignar",
        capacity: "50 kg",
      },
      {
        id: "v2",
        plate: "MAN-002",
        model: "Camioneta Hilux 2017",
        status: "Disponible",
        driver: "Por asignar",
        capacity: "500 kg",
      },
    ];

    await kv.set('vehicles', initialVehicles);
    console.log('✅ 2 vehículos cargados');

    console.log('✅ Datos iniciales cargados: 10 productos, 5 clientes, 15 pedidos, 2 vehículos');
  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
  }
}

// NO inicializar datos de forma bloqueante - el servidor debe arrancar primero
// La inicialización se hará en background
console.log('🚀 ========== SERVIDOR LÁCTEOS ROSY ==========');
console.log('🚀 Hora de inicio:', new Date().toISOString());
console.log('⚡ Arrancando servidor HTTP primero...');

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================

/**
 * Middleware para verificar autenticación de admin
 * IMPORTANTE: Lee el token del header X-Admin-Token en lugar de Authorization
 * para evitar que Supabase intente validarlo como JWT
 */
const adminAuthMiddleware = async (c: any, next: any) => {
  try {
    console.log('🔐 ========== MIDDLEWARE DE AUTENTICACIÓN ==========');
    
    // Leer token del header personalizado X-Admin-Token
    const customToken = c.req.header('X-Admin-Token');
    console.log('🔐 X-Admin-Token header:', customToken ? customToken.substring(0, 50) + '...' : 'NO HAY HEADER');
    
    // También intentar con Authorization por compatibilidad
    const authHeader = c.req.header('Authorization');
    console.log('🔐 Authorization header:', authHeader ? authHeader.substring(0, 50) + '...' : 'NO HAY HEADER');
    
    // Priorizar X-Admin-Token, luego Authorization
    let token = customToken;
    if (!token && authHeader) {
      token = authHeader.replace('Bearer ', '').trim();
    }
    
    console.log('🔐 Token extraído (primeros 30):', token ? token.substring(0, 30) + '...' : 'NO HAY TOKEN');
    console.log('🔐 Token completo (para debug):', token);
    console.log('🔐 Longitud del token:', token?.length);
    
    // Si no hay token, rechazar
    if (!token) {
      console.log('❌ No se proporcionó token');
      return c.json({ 
        success: false, 
        error: 'No se proporcionó token de autenticación',
        code: 401,
        message: 'No se proporcionó token de autenticación'
      }, 401);
    }
    
    console.log('🔐 Llamando a requireAdmin...');
    const result = await requireAdmin(token);
    console.log('🔐 Resultado de requireAdmin:', result);
    
    if (!result.authorized) {
      console.log('❌ Autorización denegada:', result.error);
      return c.json({ 
        code: 401,
        success: false, 
        message: result.error || 'Token inválido o expirado',
        error: result.error || 'Token inválido o expirado'
      }, 401);
    }
    
    console.log('✅ Autorización exitosa para usuario:', result.user?.username);
    c.set('user', result.user);
    console.log('🔐 ================================================');
    await next();
  } catch (error) {
    console.error('❌ Error crítico en middleware de autenticación:', error);
    console.error('❌ Message:', error.message);
    console.error('❌ Stack:', error.stack);
    return c.json({ 
      success: false, 
      error: `Error de autenticación: ${error.message}`,
      message: `Error de autenticación: ${error.message}`,
      code: 500
    }, 500);
  }
};

// ============================================
// RUTAS - HEALTH CHECK Y DEBUG
// ============================================

// GET: Health check principal - debe estar PRIMERO y ser SÚPER RÁPIDO
app.get('/make-server-960143c8/health', (c) => {
  // Respuesta mínima para máxima velocidad - sin logging, sin timestamp
  return c.json({ status: 'ok' });
});

// GET: Ruta raíz para verificar que el servidor responde
app.get('/make-server-960143c8/', (c) => {
  return c.json({ 
    success: true, 
    message: 'Servidor Lácteos Rosy activo',
    timestamp: new Date().toISOString(),
    status: 'running'
  });
});

// GET: Ping simple - la ruta más rápida posible
app.get('/make-server-960143c8/ping', (c) => {
  return c.text('pong');
});

// GET: Debug tokens - Ver tokens en memoria y KV (solo para desarrollo)
app.get('/make-server-960143c8/debug/tokens', async (c) => {
  try {
    const debugInfo = await getActiveTokensDebugInfo();
    return c.json({ success: true, data: debugInfo });
  } catch (error) {
    console.error('❌ Error en debug/tokens:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST: Limpiar todos los tokens (útil para depuración)
app.post('/make-server-960143c8/debug/clear-tokens', async (c) => {
  try {
    console.log('🧹 Limpiando todos los tokens...');
    await clearAllTokens();
    console.log('✅ Tokens limpiados');
    return c.json({ success: true, message: 'Todos los tokens han sido eliminados' });
  } catch (error) {
    console.error('❌ Error limpiando tokens:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// RUTAS - AUTENTICACIÓN
// ============================================

// POST: Login de administrador
// Autentica al usuario y devuelve un token JWT
app.post('/make-server-960143c8/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;
    
    console.log('🔐 Login request para usuario:', username);
    
    const result = await authenticateUser(username, password);
    
    if (result.success) {
      console.log('✅ Login exitoso para:', username);
      return c.json(result);
    } else {
      console.log('❌ Login fallido para:', username);
      return c.json(result, 401);
    }
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    console.error('❌ Stack:', error.stack);
    return c.json({ success: false, error: 'Error en autenticación', details: error.message }, 500);
  }
});

// POST: Solicitar recuperación de contraseña
// Envía la contraseña por email al administrador
app.post('/make-server-960143c8/auth/forgot-password', async (c) => {
  try {
    // ✅ STEP 1: Verificar rate limiting ANTES de procesar
    const rateLimit = checkResetRateLimit();
    
    if (!rateLimit.allowed) {
      console.error('🚨 RATE LIMIT EXCEDIDO - Demasiados intentos de recuperación');
      return c.json({ 
        success: false, 
        error: 'Demasiados intentos de recuperación. Por favor intente más tarde.' 
      }, 429);
    }
    
    console.log(`📧 Rate limit OK: ${rateLimit.remainingAttempts} intentos restantes`);
    
    const body = await c.req.json();
    const requestedEmail = body.email;
    
    console.log('📧 Solicitud de recuperación - validando email...');
    
    // Obtener datos del usuario admin
    const admin = getAdminUser();
    
    // VALIDACIÓN ESTRICTA: Solo se acepta el email exacto del admin
    // Normalizar ambos emails para comparación (lowercase, trim)
    const normalizedRequested = requestedEmail?.toLowerCase().trim();
    const normalizedAdmin = admin.email?.toLowerCase().trim();
    
    console.log('🔐 Email solicitado (normalizado):', normalizedRequested);
    console.log('🔐 Email admin (normalizado):', normalizedAdmin);
    
    // Validación estricta - debe coincidir exactamente
    if (!normalizedRequested || normalizedRequested !== normalizedAdmin) {
      console.error('🚨🚨🚨 ========== ALERTA DE SEGURIDAD ========== 🚨🚨🚨');
      console.error('🚨 INTENTO DE ACCESO NO AUTORIZADO DETECTADO');
      console.error('🚨 Email solicitado:', requestedEmail);
      console.error('🚨 IP/Usuario:', c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'Desconocido');
      console.error('🚨 Timestamp:', new Date().toISOString());
      console.error('🚨 User-Agent:', c.req.header('user-agent') || 'Desconocido');
      console.error('🚨 Este intento ha sido registrado y será revisado');
      console.error('🚨🚨🚨 ========================================== 🚨🚨🚨');
      
      // Registrar el intento fallido también (consume un intento del rate limit)
      recordResetAttempt();
      
      // No revelar detalles por seguridad - mensaje genérico
      return c.json({ 
        success: false, 
        error: 'Acceso denegado. Este incidente ha sido registrado por seguridad.' 
      }, 403);
    }
    
    console.log('✅ Email validado, iniciando envío a:', admin.email);
    console.log('🔍 DEBUG - Objeto admin completo:', JSON.stringify(admin, null, 2));
    console.log('🔍 DEBUG - admin.password:', admin.password);
    console.log('🔍 DEBUG - admin.email:', admin.email);
    
    // ✅ STEP 3: Registrar el intento ANTES de enviar el email
    recordResetAttempt();
    console.log(`📊 Intento registrado. Intentos restantes: ${rateLimit.remainingAttempts - 1}`);
    
    const { sendPasswordRecoveryEmail } = await import('./email.tsx');
    
    console.log('📧 Preparando envío de email...');
    console.log('📧 To:', admin.email);
    console.log('📧 Password:', admin.password ? '***' : 'UNDEFINED');
    
    // Enviar email con la contraseña
    const result = await sendPasswordRecoveryEmail(admin.email, admin.password);
    
    console.log('📬 Resultado del envío:', result);
    
    if (result.success) {
      console.log('✅ Correo de recuperación enviado exitosamente');
      return c.json({ 
        success: true, 
        message: 'Se ha enviado un correo de recuperación al correo registrado del administrador' 
      });
    } else {
      // No devolver la contraseña por seguridad
      console.error('❌ Error completo:', JSON.stringify(result, null, 2));
      return c.json({ 
        success: false, 
        error: 'No se pudo enviar el correo de recuperación. Por favor contacta al soporte técnico.',
        details: result.error
      }, 500);
    }
  } catch (error) {
    console.error('❌ Error crítico en forgot-password:', error);
    return c.json({ 
      success: false, 
      error: 'Error enviando email de recuperación. Por favor contacta al soporte técnico.',
      details: error.message
    }, 500);
  }
});

// GET: Debug endpoint para verificar estado del servidor
// Usado para diagnosticar problemas
app.get('/make-server-960143c8/debug/status', async (c) => {
  return c.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    env: 'production'
  });
});

// GET: Debug endpoint para verificar tokens
// Muestra información detallada sobre tokens activos
app.get('/make-server-960143c8/debug/tokens', async (c) => {
  try {
    console.log('🔍 ========== DEBUG: TOKENS ==========');
    const tokensInfo = await getActiveTokensDebugInfo();
    console.log('🔍 Info de tokens:', JSON.stringify(tokensInfo, null, 2));
    console.log('🔍 =====================================');
    return c.json({ 
      success: true, 
      ...tokensInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo info de tokens:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// POST: Debug endpoint para verificar un token específico
// Verifica si un token específico es válido y está en el servidor
app.post('/make-server-960143c8/debug/verify-token', async (c) => {
  try {
    console.log('🔍 ========== DEBUG: VERIFICAR TOKEN ESPECÍFICO ==========');
    const body = await c.req.json();
    const { token } = body;
    
    console.log('🔍 Token recibido (primeros 50):', token ? token.substring(0, 50) + '...' : 'NINGUNO');
    console.log('🔍 Token completo:', token);
    console.log('🔍 Longitud:', token?.length || 0);
    
    // Llamar a requireAdmin para verificar
    const result = await requireAdmin(token);
    
    console.log('🔍 Resultado de verificación:', result);
    console.log('🔍 ========================================================');
    
    return c.json({
      success: true,
      tokenValid: result.authorized,
      user: result.user,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// POST: Verificar token
// Valida que el token JWT sea válido
app.post('/make-server-960143c8/auth/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;
    
    const auth = await requireAdmin(token);
    
    if (auth.authorized) {
      return c.json({ success: true, user: auth.user });
    } else {
      return c.json({ success: false, error: auth.error }, 401);
    }
  } catch (error) {
    console.error('Error verificando token:', error);
    return c.json({ success: false, error: 'Error verificando autenticación' }, 500);
  }
});

// POST: Refrescar token (regenerar si es válido pero no está en memoria)
// Permite recuperar la sesión si el servidor se reinició
app.post('/make-server-960143c8/auth/refresh', async (c) => {
  try {
    console.log('🔄 ========== REFRESH TOKEN ==========');
    const body = await c.req.json();
    const { username, password } = body;
    
    console.log('🔄 Usuario:', username);
    
    // Validar credenciales del admin
    const loginResult = await loginAdmin(username, password);
    
    if (loginResult.success) {
      console.log('✅ Credenciales válidas, generando nuevo token');
      return c.json({ 
        success: true, 
        token: loginResult.token,
        user: loginResult.user,
        message: 'Token refrescado exitosamente'
      });
    } else {
      console.log('❌ Credenciales inválidas');
      return c.json({ 
        success: false, 
        error: 'Credenciales inválidas para refrescar token' 
      }, 401);
    }
  } catch (error) {
    console.error('❌ Error refrescando token:', error);
    return c.json({ 
      success: false, 
      error: 'Error refrescando autenticación' 
    }, 500);
  }
});

// ============================================
// RUTAS - PRODUCTOS
// ============================================

// GET: Obtener todos los productos
// Usado por clientes y admin para mostrar el catálogo
app.get('/make-server-960143c8/products', async (c) => {
  try {
    const products = await kv.get('products') || [];
    
    // Verificar que products sea un array
    if (!Array.isArray(products)) {
      console.error('❌ Los productos no son un array:', typeof products);
      return c.json({ success: true, data: [] });
    }
    
    return c.json({ success: true, data: products });
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error.message);
    return c.json({ success: false, error: `Error obteniendo productos: ${error.message}` }, 500);
  }
});

// POST: Agregar nuevo producto
// Usado por el admin para crear productos
app.post('/make-server-960143c8/products', adminAuthMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const products = await kv.get('products') || [];
    
    const newProduct = {
      id: Date.now().toString(),
      name: body.name,
      description: body.description,
      price: parseFloat(body.price),
      unit: body.unit,
      category: body.category,
      stock: parseInt(body.stock),
      image: body.image || 'https://images.unsplash.com/photo-1625944525991-c196b2813492?w=400',
    };
    
    products.push(newProduct);
    await kv.set('products', products);
    
    return c.json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Error agregando producto:', error);
    return c.json({ success: false, error: 'Error agregando producto' }, 500);
  }
});

// PUT: Actualizar producto existente
// Usado por el admin para editar productos
app.put('/make-server-960143c8/products/:id', adminAuthMiddleware, async (c) => {
  try {
    const productId = c.req.param('id');
    const body = await c.req.json();
    const products = await kv.get('products') || [];
    
    const index = products.findIndex((p: any) => p.id === productId);
    if (index === -1) {
      return c.json({ success: false, error: 'Producto no encontrado' }, 404);
    }
    
    products[index] = {
      ...products[index],
      name: body.name,
      description: body.description,
      price: parseFloat(body.price),
      unit: body.unit,
      category: body.category,
      stock: parseInt(body.stock),
      image: body.image || products[index].image,
    };
    
    await kv.set('products', products);
    
    return c.json({ success: true, data: products[index] });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    return c.json({ success: false, error: 'Error actualizando producto' }, 500);
  }
});

// DELETE: Eliminar producto
// Usado por el admin para borrar productos
app.delete('/make-server-960143c8/products/:id', adminAuthMiddleware, async (c) => {
  try {
    const productId = c.req.param('id');
    const products = await kv.get('products') || [];
    
    const filtered = products.filter((p: any) => p.id !== productId);
    await kv.set('products', filtered);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    return c.json({ success: false, error: 'Error eliminando producto' }, 500);
  }
});

// POST: Subir imagen de producto
// Usado por el admin al agregar un nuevo producto con foto
app.post('/make-server-960143c8/upload-product-image', adminAuthMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No se proporcionó archivo' }, 400);
    }
    
    // Generar nombre único para el archivo
    const fileName = `${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
      });
    
    if (error) {
      console.error('Error subiendo imagen:', error);
      return c.json({ success: false, error: 'Error subiendo imagen' }, 500);
    }
    
    // Generar URL firmada (válida por 1 año)
    const { data: signedUrlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 31536000); // 1 año en segundos
    
    return c.json({ 
      success: true, 
      imageUrl: signedUrlData?.signedUrl || '' 
    });
  } catch (error) {
    console.error('Error en upload-product-image:', error);
    return c.json({ success: false, error: 'Error procesando imagen' }, 500);
  }
});

// ============================================
// RUTAS - PEDIDOS
// ============================================

// GET: Obtener todos los pedidos
// Usado por el admin para ver todos los pedidos
app.get('/make-server-960143c8/orders', async (c) => {
  try {
    console.log('📦 GET /orders - Petición recibida');
    console.log('📦 Obteniendo pedidos desde KV store...');
    
    const orders = await kv.get('orders') || [];
    console.log(`📦 Pedidos obtenidos: ${orders.length}`);
    
    // Verificar que orders sea un array
    if (!Array.isArray(orders)) {
      console.error('❌ Los pedidos no son un array:', typeof orders);
      return c.json({ success: true, data: [] });
    }
    
    // Ordenar pedidos por fecha (más recientes primero)
    const sortedOrders = orders.sort((a: any, b: any) => {
      try {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      } catch (err) {
        console.error('Error ordenando pedidos:', err);
        return 0;
      }
    });
    
    console.log(`✅ Devolviendo ${sortedOrders.length} pedidos ordenados por fecha`);
    return c.json({ success: true, data: sortedOrders });
  } catch (error) {
    console.error('❌ Error obteniendo pedidos:', error);
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    return c.json({ success: false, error: `Error obteniendo pedidos: ${error.message}` }, 500);
  }
});

// GET: Obtener pedidos de un cliente específico
// Usado por clientes para ver su historial
app.get('/make-server-960143c8/orders/customer/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const orders = await kv.get('orders') || [];
    const vehicles = await kv.get('vehicles') || [];
    
    const customerOrders = orders.filter((o: any) => o.customerEmail === email);
    
    // Enriquecer pedidos con información del vehículo
    const enrichedOrders = customerOrders.map((order: any) => {
      if (order.vehicleId) {
        const vehicle = vehicles.find((v: any) => v.id === order.vehicleId);
        if (vehicle) {
          return {
            ...order,
            vehicleName: vehicle.model,
            vehiclePlate: vehicle.plate,
            vehicleType: vehicle.model.toLowerCase().includes('moto') ? 'Moto' : 'Camioneta',
          };
        }
      }
      return order;
    });
    
    // Ordenar pedidos por fecha (más recientes primero)
    const sortedOrders = enrichedOrders.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return c.json({ success: true, data: sortedOrders });
  } catch (error) {
    console.error('Error obteniendo pedidos del cliente:', error);
    return c.json({ success: false, error: 'Error obteniendo pedidos' }, 500);
  }
});

// POST: Crear nuevo pedido
// Usado por clientes al hacer un pedido desde el carrito
app.post('/make-server-960143c8/orders', async (c) => {
  try {
    console.log('📦 POST /orders - Iniciando creación de pedido');
    
    const body = await c.req.json();
    console.log('📦 Datos recibidos:', JSON.stringify(body, null, 2));
    
    // Validar datos requeridos
    if (!body.customerId || !body.customerEmail || !body.items || body.items.length === 0) {
      console.error('❌ Datos incompletos:', body);
      return c.json({ 
        success: false, 
        error: 'Datos incompletos. Se requiere customerId, customerEmail e items.' 
      }, 400);
    }
    
    // Obtener productos para validar stock
    const products = await kv.get('products') || [];
    
    // Validar stock disponible para cada item
    for (const item of body.items) {
      const product = products.find((p: any) => p.id === item.id);
      if (!product) {
        return c.json({
          success: false,
          error: `Producto ${item.name} no encontrado`
        }, 400);
      }
      
      if (product.stock < item.quantity) {
        return c.json({
          success: false,
          error: `Stock insuficiente para ${item.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`
        }, 400);
      }
    }
    
    // Restar stock de los productos
    for (const item of body.items) {
      const productIndex = products.findIndex((p: any) => p.id === item.id);
      if (productIndex !== -1) {
        products[productIndex].stock -= item.quantity;
        console.log(`📉 Stock actualizado: ${products[productIndex].name} - Nuevo stock: ${products[productIndex].stock}`);
      }
    }
    
    // Guardar productos con stock actualizado
    await kv.set('products', products);
    console.log('✅ Stock actualizado en la base de datos');
    
    const orders = await kv.get('orders') || [];
    console.log(`📦 Pedidos existentes: ${orders.length}`);
    
    const newOrder = {
      id: `order-${Date.now()}`,
      customerId: body.customerId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      deliveryAddress: body.deliveryAddress,
      municipality: body.municipality,
      department: body.department,
      items: body.items,
      subtotal: body.subtotal,
      deliveryCost: DELIVERY_COST,
      total: body.subtotal + DELIVERY_COST,
      status: 'Pendiente',
      vehicleId: null,
      isNew: true, // Marcar como pedido nuevo para notificación
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('📦 Nuevo pedido creado:', newOrder.id);
    
    orders.push(newOrder);
    await kv.set('orders', orders);
    
    console.log(`✅ Pedido guardado. Total de pedidos: ${orders.length}`);
    
    return c.json({ success: true, data: newOrder });
  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    console.error('❌ Stack trace:', error.stack);
    return c.json({ 
      success: false, 
      error: `Error creando pedido: ${error.message}` 
    }, 500);
  }
});

// PUT: Actualizar estado de pedido (DEBUG - SIN AUTENTICACIÓN)
// TEMPORAL: Endpoint de prueba sin autenticación para diagnosticar problemas
app.put('/make-server-960143c8/orders/:id/debug', async (c) => {
  try {
    console.log('🧪 ============ ACTUALIZAR PEDIDO DEBUG ============');
    const orderId = c.req.param('id');
    console.log('🧪 Order ID:', orderId);
    
    const body = await c.req.json();
    console.log('🧪 Body:', body);
    
    // Validar que el vehículo no esté en mantenimiento
    if (body.vehicleId && body.vehicleId !== null) {
      const vehicles = await kv.get('vehicles') || [];
      const vehicle = vehicles.find((v: any) => v.id === body.vehicleId);
      
      if (vehicle && vehicle.status === 'Mantenimiento') {
        console.error('❌ No se puede asignar vehículo en mantenimiento:', vehicle.model);
        return c.json({ 
          success: false, 
          error: 'No se puede asignar un vehículo que está en mantenimiento' 
        }, 400);
      }
    }
    
    const orders = await kv.get('orders') || [];
    console.log('🧪 Total pedidos en DB:', orders.length);
    
    const index = orders.findIndex((o: any) => o.id === orderId);
    console.log('🧪 Índice encontrado:', index);
    
    if (index === -1) {
      console.error('❌ Pedido no encontrado:', orderId);
      return c.json({ success: false, error: 'Pedido no encontrado' }, 404);
    }
    
    console.log('🧪 Pedido original:', orders[index]);
    
    orders[index] = {
      ...orders[index],
      status: body.status,
      vehicleId: body.vehicleId !== undefined ? body.vehicleId : orders[index].vehicleId,
      isNew: false,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('🧪 Pedido actualizado:', orders[index]);
    
    await kv.set('orders', orders);
    console.log('💾 Guardado en KV store');
    
    console.log(`✅ Pedido ${orderId} actualizado: ${body.status}`);
    
    return c.json({ success: true, data: orders[index] });
  } catch (error) {
    console.error('❌ Error actualizando pedido (debug):', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Message:', error.message);
    return c.json({ 
      success: false, 
      error: `Error actualizando pedido: ${error.message}` 
    }, 500);
  }
});

// PUT: Actualizar estado de pedido
// Usado por el admin para cambiar el estado de un pedido
app.put('/make-server-960143c8/orders/:id', adminAuthMiddleware, async (c) => {
  try {
    console.log('📝 ============ ACTUALIZAR PEDIDO ============');
    const orderId = c.req.param('id');
    console.log('📝 Order ID:', orderId);
    
    const body = await c.req.json();
    console.log('📝 Body:', body);
    
    // Validar que el vehículo no esté en mantenimiento
    if (body.vehicleId && body.vehicleId !== null) {
      const vehicles = await kv.get('vehicles') || [];
      const vehicle = vehicles.find((v: any) => v.id === body.vehicleId);
      
      if (vehicle && vehicle.status === 'Mantenimiento') {
        console.error('❌ No se puede asignar vehículo en mantenimiento:', vehicle.model);
        return c.json({ 
          success: false, 
          error: 'No se puede asignar un vehículo que está en mantenimiento' 
        }, 400);
      }
    }
    
    const orders = await kv.get('orders') || [];
    console.log('📝 Total pedidos en DB:', orders.length);
    
    const index = orders.findIndex((o: any) => o.id === orderId);
    console.log('📝 Índice encontrado:', index);
    
    if (index === -1) {
      console.error('❌ Pedido no encontrado:', orderId);
      return c.json({ success: false, error: 'Pedido no encontrado' }, 404);
    }
    
    console.log('📝 Pedido original:', orders[index]);
    
    orders[index] = {
      ...orders[index],
      status: body.status,
      vehicleId: body.vehicleId !== undefined ? body.vehicleId : orders[index].vehicleId,
      isNew: false, // Marcar como visto cuando el admin lo actualiza
      updatedAt: new Date().toISOString(),
    };
    
    console.log('📝 Pedido actualizado:', orders[index]);
    
    await kv.set('orders', orders);
    console.log('💾 Guardado en KV store');
    
    console.log(`✅ Pedido ${orderId} actualizado: ${body.status}`);
    
    return c.json({ success: true, data: orders[index] });
  } catch (error) {
    console.error('❌ Error actualizando pedido:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Message:', error.message);
    return c.json({ 
      success: false, 
      error: `Error actualizando pedido: ${error.message}` 
    }, 500);
  }
});

// PUT: Cancelar pedido (solo clientes)
// Usado por clientes para cancelar sus propios pedidos
app.put('/make-server-960143c8/orders/:id/cancel', async (c) => {
  try {
    const orderId = c.req.param('id').trim(); // Eliminar espacios en blanco
    console.log('🚫 Cancelando pedido:', orderId);
    
    const orders = await kv.get('orders') || [];
    console.log('📦 Total de pedidos en DB:', orders.length);
    console.log('📦 IDs de pedidos:', orders.map((o: any) => `"${o.id}"`));
    console.log('📦 Buscando pedido con ID:', `"${orderId}"`);
    
    const index = orders.findIndex((o: any) => o.id.trim() === orderId);
    if (index === -1) {
      console.error('❌ Pedido no encontrado:', orderId);
      console.error('📦 Pedidos disponibles:', JSON.stringify(orders.map((o: any) => ({ id: o.id, status: o.status, email: o.customerEmail })), null, 2));
      return c.json({ success: false, error: 'Pedido no encontrado' }, 404);
    }
    
    const order = orders[index];
    
    // Solo se pueden cancelar pedidos pendientes o en camino
    if (order.status !== 'Pendiente' && order.status !== 'En Camino') {
      console.error('❌ No se puede cancelar pedido con estado:', order.status);
      return c.json({ 
        success: false, 
        error: 'Solo puedes cancelar pedidos pendientes o en camino' 
      }, 400);
    }
    
    // Devolver el stock a los productos
    const products = await kv.get('products') || [];
    for (const item of order.items) {
      const productIndex = products.findIndex((p: any) => p.id === item.id);
      if (productIndex !== -1) {
        products[productIndex].stock += item.quantity;
        console.log(`📈 Stock devuelto: ${products[productIndex].name} + ${item.quantity} = ${products[productIndex].stock}`);
      }
    }
    await kv.set('products', products);
    
    // Actualizar estado del pedido
    orders[index] = {
      ...order,
      status: 'Cancelado',
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set('orders', orders);
    
    console.log(`✅ Pedido ${orderId} cancelado exitosamente`);
    
    return c.json({ success: true, data: orders[index] });
  } catch (error) {
    console.error('❌ Error cancelando pedido:', error);
    return c.json({ success: false, error: 'Error cancelando pedido' }, 500);
  }
});

// PUT: Marcar pedido como entregado (solo clientes)
// Usado por clientes para confirmar la recepción de sus pedidos
app.put('/make-server-960143c8/orders/:id/deliver', async (c) => {
  try {
    const orderId = c.req.param('id').trim();
    console.log('✅ Marcando pedido como entregado:', orderId);
    
    const orders = await kv.get('orders') || [];
    console.log('📦 Total de pedidos en DB:', orders.length);
    
    const index = orders.findIndex((o: any) => o.id.trim() === orderId);
    if (index === -1) {
      console.error('❌ Pedido no encontrado:', orderId);
      return c.json({ success: false, error: 'Pedido no encontrado' }, 404);
    }
    
    const order = orders[index];
    
    // Solo se pueden marcar como entregado pedidos que están "En Camino"
    if (order.status !== 'En Camino') {
      console.error('❌ No se puede marcar como entregado un pedido con estado:', order.status);
      return c.json({ 
        success: false, 
        error: 'Solo puedes marcar como entregado pedidos que están en camino' 
      }, 400);
    }
    
    // Actualizar estado del pedido
    orders[index] = {
      ...order,
      status: 'Entregado',
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set('orders', orders);
    
    console.log(`✅ Pedido ${orderId} marcado como entregado exitosamente`);
    
    return c.json({ success: true, data: orders[index] });
  } catch (error) {
    console.error('❌ Error marcando pedido como entregado:', error);
    return c.json({ success: false, error: 'Error marcando pedido como entregado' }, 500);
  }
});

// POST: Marcar todos los pedidos como leídos
// Usado por el admin para limpiar notificaciones
app.post('/make-server-960143c8/orders/mark-all-read', async (c) => {
  try {
    console.log('📬 Marcando todos los pedidos como leídos...');
    
    const orders = await kv.get('orders') || [];
    
    // Marcar todos los pedidos con isNew=true como isNew=false
    const updatedOrders = orders.map((order: any) => ({
      ...order,
      isNew: false,
    }));
    
    await kv.set('orders', updatedOrders);
    
    const markedCount = orders.filter((o: any) => o.isNew === true).length;
    console.log(`✅ ${markedCount} pedidos marcados como leídos`);
    
    return c.json({ success: true, markedCount });
  } catch (error) {
    console.error('❌ Error marcando pedidos como leídos:', error);
    return c.json({ success: false, error: 'Error marcando pedidos como leídos' }, 500);
  }
});

// ============================================
// RUTAS - CLIENTES
// ============================================

// POST: Login de cliente
// Autentica a un cliente con email y contraseña
app.post('/make-server-960143c8/customers/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    console.log('🔐 Intento de login de cliente:', email);
    
    const customers = await kv.get('customers') || [];
    const customer = customers.find((c: any) => c.email === email);
    
    if (!customer) {
      console.log('❌ Cliente no encontrado');
      return c.json({ success: false, error: 'Email o contraseña incorrectos' }, 401);
    }
    
    // Verificar contraseña (en este caso comparación directa, en producción usar bcrypt)
    if (customer.password !== password) {
      console.log('❌ Contraseña incorrecta');
      return c.json({ success: false, error: 'Email o contraseña incorrectos' }, 401);
    }
    
    console.log('✅ Login de cliente exitoso');
    
    // Devolver datos del cliente sin la contraseña
    const { password: _, ...customerData } = customer;
    
    return c.json({ 
      success: true, 
      data: customerData,
      message: 'Login exitoso'
    });
  } catch (error) {
    console.error('Error en login de cliente:', error);
    return c.json({ success: false, error: 'Error en autenticación' }, 500);
  }
});

// POST: Registro de nuevo cliente
// Crea una cuenta nueva con todos los datos del cliente
app.post('/make-server-960143c8/customers/register', async (c) => {
  try {
    const body = await c.req.json();
    const customers = await kv.get('customers') || [];
    
    // Verificar si el email ya existe
    const existingCustomer = customers.find((c: any) => c.email === body.email);
    if (existingCustomer) {
      return c.json({ success: false, error: 'El email ya está registrado' }, 400);
    }
    
    const newCustomer = {
      id: `c${Date.now()}`,
      name: body.name,
      email: body.email,
      password: body.password, // En producción usar bcrypt para hashear
      phone: body.phone,
      address: body.address,
      municipality: body.municipality,
      department: body.department,
      registeredAt: new Date().toISOString(),
    };
    
    customers.push(newCustomer);
    await kv.set('customers', customers);
    
    console.log('✅ Cliente registrado exitosamente:', body.email);
    
    // Devolver datos sin la contraseña
    const { password: _, ...customerData } = newCustomer;
    
    return c.json({ 
      success: true, 
      data: customerData,
      message: 'Registro exitoso'
    });
  } catch (error) {
    console.error('Error registrando cliente:', error);
    return c.json({ success: false, error: 'Error registrando cliente' }, 500);
  }
});

// GET: Obtener todos los clientes
// Usado por el admin para ver la lista de clientes
app.get('/make-server-960143c8/customers', async (c) => {
  try {
    console.log('👥 GET /customers - Petición recibida');
    console.log('👥 Obteniendo clientes desde KV store...');
    
    const customers = await kv.get('customers') || [];
    console.log(`👥 Clientes obtenidos: ${customers.length}`);
    
    // Verificar que customers sea un array
    if (!Array.isArray(customers)) {
      console.error('❌ Los clientes no son un array:', typeof customers);
      return c.json({ success: true, data: [] });
    }
    
    console.log(`✅ Devolviendo ${customers.length} clientes`);
    return c.json({ success: true, data: customers });
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    return c.json({ success: false, error: `Error obteniendo clientes: ${error.message}` }, 500);
  }
});

// PUT: Actualizar información de cliente
// Usado por el admin para editar datos de clientes
app.put('/make-server-960143c8/customers/:id', adminAuthMiddleware, async (c) => {
  try {
    const customerId = c.req.param('id');
    const body = await c.req.json();
    const customers = await kv.get('customers') || [];
    
    const index = customers.findIndex((c: any) => c.id === customerId);
    if (index === -1) {
      return c.json({ success: false, error: 'Cliente no encontrado' }, 404);
    }
    
    customers[index] = {
      ...customers[index],
      name: body.name || customers[index].name,
      email: body.email || customers[index].email,
      phone: body.phone || customers[index].phone,
      address: body.address || customers[index].address,
      municipality: body.municipality || customers[index].municipality,
      department: body.department || customers[index].department,
    };
    
    await kv.set('customers', customers);
    
    return c.json({ success: true, data: customers[index] });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return c.json({ success: false, error: 'Error actualizando cliente' }, 500);
  }
});

// DELETE: Eliminar cliente
// Usado por el admin para borrar clientes
app.delete('/make-server-960143c8/customers/:id', adminAuthMiddleware, async (c) => {
  try {
    const customerId = c.req.param('id');
    const customers = await kv.get('customers') || [];
    
    const filtered = customers.filter((c: any) => c.id !== customerId);
    await kv.set('customers', filtered);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    return c.json({ success: false, error: 'Error eliminando cliente' }, 500);
  }
});

// ============================================
// RUTAS - VEHÍCULOS
// ============================================

// GET: Obtener todos los vehículos
// Usado por el admin para gestionar vehículos
app.get('/make-server-960143c8/vehicles', async (c) => {
  try {
    console.log('🚗 GET /vehicles - Petición recibida');
    console.log('🚗 Obteniendo vehículos desde KV store...');
    
    const vehicles = await kv.get('vehicles') || [];
    console.log(`🚗 Vehículos obtenidos: ${vehicles.length}`);
    
    // Verificar que vehicles sea un array
    if (!Array.isArray(vehicles)) {
      console.error('❌ Los vehículos no son un array:', typeof vehicles);
      return c.json({ success: true, data: [] });
    }
    
    console.log(`✅ Devolviendo ${vehicles.length} vehículos`);
    return c.json({ success: true, data: vehicles });
  } catch (error) {
    console.error('❌ Error obteniendo vehículos:', error);
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    return c.json({ success: false, error: `Error obteniendo vehículos: ${error.message}` }, 500);
  }
});

// POST: Agregar nuevo vehículo
// Usado por el admin para registrar vehículos
app.post('/make-server-960143c8/vehicles', adminAuthMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const vehicles = await kv.get('vehicles') || [];
    
    const newVehicle = {
      id: `v${Date.now()}`,
      plate: body.plate,
      model: body.model,
      status: body.status || 'Disponible',
      driver: body.driver,
      capacity: body.capacity,
    };
    
    vehicles.push(newVehicle);
    await kv.set('vehicles', vehicles);
    
    return c.json({ success: true, data: newVehicle });
  } catch (error) {
    console.error('Error agregando vehículo:', error);
    return c.json({ success: false, error: 'Error agregando vehículo' }, 500);
  }
});

// PUT: Actualizar vehículo
// Usado por el admin para editar información de vehículos
app.put('/make-server-960143c8/vehicles/:id', adminAuthMiddleware, async (c) => {
  try {
    const vehicleId = c.req.param('id');
    const body = await c.req.json();
    const vehicles = await kv.get('vehicles') || [];
    
    const index = vehicles.findIndex((v: any) => v.id === vehicleId);
    if (index === -1) {
      return c.json({ success: false, error: 'Vehículo no encontrado' }, 404);
    }
    
    vehicles[index] = {
      ...vehicles[index],
      ...body,
    };
    
    await kv.set('vehicles', vehicles);
    
    return c.json({ success: true, data: vehicles[index] });
  } catch (error) {
    console.error('Error actualizando vehículo:', error);
    return c.json({ success: false, error: 'Error actualizando vehículo' }, 500);
  }
});

// DELETE: Eliminar vehículo
// Usado por el admin para borrar vehículos
app.delete('/make-server-960143c8/vehicles/:id', adminAuthMiddleware, async (c) => {
  try {
    const vehicleId = c.req.param('id');
    const vehicles = await kv.get('vehicles') || [];
    
    const filtered = vehicles.filter((v: any) => v.id !== vehicleId);
    await kv.set('vehicles', filtered);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error eliminando vehículo:', error);
    return c.json({ success: false, error: 'Error eliminando vehículo' }, 500);
  }
});

// ============================================
// RUTA DE CONFIGURACIÓN
// ============================================

// GET: Verificar token (debugging)
// Endpoint para verificar si un token es válido
app.get('/make-server-960143c8/debug/verify-token', (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('🔍 ========== DEBUG: VERIFICAR TOKEN ==========');
    console.log('🔍 Auth Header:', authHeader);
    console.log('🔍 Token extraído:', token ? `${token.substring(0, 30)}...` : 'NO HAY TOKEN');
    
    const result = requireAdmin(token);
    
    return c.json({
      success: true,
      tokenPresent: !!token,
      authorized: result.authorized,
      user: result.user,
      error: result.error,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// GET: Forzar inicialización de datos (público para debugging)
// Esta ruta permite cargar los datos iniciales sin autenticación
app.get('/make-server-960143c8/force-init', async (c) => {
  try {
    console.log('🔄 ========== FORZANDO INICIALIZACIÓN ==========');
    console.log('🔄 Petición recibida en /force-init');
    
    await initializeData();
    console.log('✅ initializeData() completado');
    
    const products = await kv.get('products');
    const customers = await kv.get('customers');
    const orders = await kv.get('orders');
    const vehicles = await kv.get('vehicles');
    
    const counts = {
      products: products?.length || 0,
      customers: customers?.length || 0,
      orders: orders?.length || 0,
      vehicles: vehicles?.length || 0,
    };
    
    console.log('📊 Datos cargados:', counts);
    console.log('🔄 ========== FIN INICIALIZACIÓN ==========');
    
    return c.json({ 
      success: true, 
      message: 'Datos inicializados correctamente',
      counts
    });
  } catch (error) {
    console.error('❌ Error forzando inicialización:', error);
    console.error('❌ Tipo:', error.name);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST: Reinicializar datos (solo para desarrollo/debugging)
// Fuerza la recarga de todos los datos iniciales
app.post('/make-server-960143c8/admin/reinitialize-data', async (c) => {
  try {
    console.log('🔄 Forzando reinicialización de datos...');
    
    // Eliminar datos existentes
    await kv.del('products');
    await kv.del('customers');
    await kv.del('orders');
    await kv.del('vehicles');
    
    console.log('🗑️ Datos anteriores eliminados');
    
    // Recargar datos iniciales
    await initializeData();
    
    // Verificar que se cargaron correctamente
    const products = await kv.get('products');
    const customers = await kv.get('customers');
    const orders = await kv.get('orders');
    const vehicles = await kv.get('vehicles');
    
    return c.json({ 
      success: true, 
      message: 'Datos reinicializados correctamente',
      counts: {
        products: products?.length || 0,
        customers: customers?.length || 0,
        orders: orders?.length || 0,
        vehicles: vehicles?.length || 0,
      }
    });
  } catch (error) {
    console.error('❌ Error reinicializando datos:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST: Limpiar completamente la base de datos (PELIGROSO - solo desarrollo)
// Elimina TODOS los datos sin recargar datos iniciales
app.post('/make-server-960143c8/admin/clear-database', async (c) => {
  try {
    console.log('🗑️ ========== LIMPIANDO BASE DE DATOS ==========');
    
    // Obtener todas las claves para verificar antes de eliminar
    const productsBefore = await kv.get('products');
    const customersBefore = await kv.get('customers');
    const ordersBefore = await kv.get('orders');
    const vehiclesBefore = await kv.get('vehicles');
    
    console.log('📊 Datos antes de eliminar:');
    console.log(`  - Productos: ${productsBefore?.length || 0}`);
    console.log(`  - Clientes: ${customersBefore?.length || 0}`);
    console.log(`  - Pedidos: ${ordersBefore?.length || 0}`);
    console.log(`  - Vehículos: ${vehiclesBefore?.length || 0}`);
    
    // Eliminar TODOS los datos
    await kv.del('products');
    await kv.del('customers');
    await kv.del('orders');
    await kv.del('vehicles');
    
    console.log('✅ Base de datos completamente limpia');
    
    // Verificar que se eliminaron
    const productsAfter = await kv.get('products');
    const customersAfter = await kv.get('customers');
    const ordersAfter = await kv.get('orders');
    const vehiclesAfter = await kv.get('vehicles');
    
    console.log('📊 Datos después de eliminar:');
    console.log(`  - Productos: ${productsAfter?.length || 0}`);
    console.log(`  - Clientes: ${customersAfter?.length || 0}`);
    console.log(`  - Pedidos: ${ordersAfter?.length || 0}`);
    console.log(`  - Vehículos: ${vehiclesAfter?.length || 0}`);
    
    return c.json({ 
      success: true, 
      message: 'Base de datos completamente limpia',
      deleted: {
        products: productsBefore?.length || 0,
        customers: customersBefore?.length || 0,
        orders: ordersBefore?.length || 0,
        vehicles: vehiclesBefore?.length || 0,
      }
    });
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET: Obtener configuración global
// Incluye el costo de entrega que se usa en el carrito
app.get('/make-server-960143c8/config', async (c) => {
  try {
    return c.json({ 
      success: true, 
      data: {
        deliveryCost: DELIVERY_COST,
      }
    });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return c.json({ success: false, error: 'Error obteniendo configuración' }, 500);
  }
});

// GET: Generar hash de contraseña (solo para debugging)
// Esta ruta ayuda a generar hashes correctos de bcrypt
app.get('/make-server-960143c8/debug/generate-hash/:password', async (c) => {
  try {
    const password = c.req.param('password');
    const { hashPassword } = await import('./auth.tsx');
    const hash = await hashPassword(password);
    
    console.log(`🔑 Hash generado para "${password}": ${hash}`);
    
    return c.json({ 
      success: true, 
      password,
      hash,
      message: 'Hash generado exitosamente'
    });
  } catch (error) {
    console.error('Error generando hash:', error);
    return c.json({ success: false, error: 'Error generando hash' }, 500);
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

console.log('📡 ========== ARRANCANDO SERVIDOR HTTP ==========');
console.log('🔗 Rutas disponibles:');
console.log('   POST /make-server-960143c8/auth/login');
console.log('   POST /make-server-960143c8/auth/forgot-password');
console.log('   GET  /make-server-960143c8/health');
console.log('   GET  /make-server-960143c8/products');
console.log('   GET  /make-server-960143c8/orders');
console.log('   POST /make-server-960143c8/orders/mark-all-read');
console.log('   GET  /make-server-960143c8/customers');
console.log('   GET  /make-server-960143c8/vehicles');
console.log('✅ Servidor HTTP listo para recibir peticiones');

// Cargar tokens ANTES de iniciar el servidor para evitar errores de autenticación
console.log('🔑 ========== CARGANDO TOKENS ANTES DE INICIAR SERVIDOR ==========');

// MIGRACIÓN: Convertir tokens antiguos al nuevo formato
console.log('🔄 Verificando si hay tokens en formato antiguo...');
try {
  const oldTokensObject = await kv.get('active_tokens');
  if (oldTokensObject && typeof oldTokensObject === 'object') {
    const oldTokenKeys = Object.keys(oldTokensObject);
    if (oldTokenKeys.length > 0) {
      console.log(`🔄 ⚠️ Encontrados ${oldTokenKeys.length} tokens en formato antiguo`);
      console.log('🔄 Migrando al nuevo formato de claves individuales...');
      
      let migratedCount = 0;
      for (const token of oldTokenKeys) {
        const tokenData = oldTokensObject[token];
        const newKey = `auth_token:${token}`;
        
        try {
          await kv.set(newKey, tokenData);
          migratedCount++;
          console.log(`✅ Token ${migratedCount}/${oldTokenKeys.length} migrado`);
        } catch (error) {
          console.error(`❌ Error migrando token:`, error.message);
        }
      }
      
      console.log(`✅ Migración completada: ${migratedCount} tokens migrados`);
      
      // Limpiar objeto antiguo
      await kv.del('active_tokens');
      console.log('✅ Objeto antiguo eliminado');
    } else {
      console.log('ℹ️ No hay tokens en formato antiguo');
    }
  } else {
    console.log('ℹ️ No existe objeto de tokens antiguo');
  }
} catch (error) {
  console.error('⚠️ Error durante migración de tokens:', error);
  console.error('⚠️ El servidor continuará de todos modos...');
}

await loadTokensFromKV();
console.log('✅ Tokens cargados exitosamente');

// ============================================
// VERIFICACIÓN DE CONFIGURACIÓN DE EMAIL
// ============================================
console.log('\n📧 ========== CONFIGURACIÓN DE EMAIL (RESEND) ==========');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
if (RESEND_API_KEY) {
  console.log('✅ RESEND_API_KEY configurada');
  console.log('📧 Sistema de recuperación de contraseña: ACTIVO');
  
  // Verificar contraseña del admin
  const { getAdminUser } = await import('./auth.tsx');
  const adminInfo = getAdminUser();
  console.log('🔐 CONTRASEÑA DEL ADMIN CARGADA:', adminInfo.password);
  console.log('🔐 ⚠️ DEBE SER: admin123 (NO administrador123)');
  
  console.log('⚠️  IMPORTANTE: Resend en modo sandbox solo puede enviar a:');
  console.log('   • Emails verificados en tu cuenta Resend');
  console.log('   • delivered@resend.dev (email de prueba)');
  console.log('\n📋 Email del administrador: danilotellez733@gmail.com');
  console.log('\n🔧 Si los emails no llegan, consulta:');
  console.log('   📄 /RESEND_SETUP.md - Guía completa de configuración');
  console.log('   🌐 https://resend.com/emails - Dashboard de Resend');
  console.log('   ✅ Verifica el email en: https://resend.com/domains');
} else {
  console.log('⚠️  RESEND_API_KEY NO configurada');
  console.log('⚠️  El sistema de recuperación de contraseña NO funcionará');
}
console.log('📧 =====================================================\n');

// Iniciar el servidor
Deno.serve(app.fetch);

// Inicializar storage y datos EN BACKGROUND después de arrancar el servidor
(async () => {
  try {
    console.log('🔄 Iniciando procesos de background...');
    
    // Inicializar storage bucket
    console.log('📦 Inicializando storage bucket...');
    await initStorage();
    console.log('✅ Storage inicializado');
    
    // Inicializar datos
    console.log('📦 Inicializando datos...');
    await initializeData();
    console.log('✅ Datos inicializados');
    
    console.log('✅ ========== INICIALIZACIÓN COMPLETA ==========');
  } catch (error) {
    console.error('❌ Error durante inicialización en background:', error);
    console.error('❌ Stack trace:', error.stack);
    console.log('⚠️ El servidor continuará de todos modos...');
  }
})();