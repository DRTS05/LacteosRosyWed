// ============================================
// API CLIENT - UTILIDADES PARA COMUNICACIÓN CON EL SERVIDOR
// ============================================
// Este archivo contiene todas las funciones para interactuar
// con el backend de Supabase y sincronizar datos

import { projectId, publicAnonKey } from './info.tsx';

// URL base del servidor
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-960143c8`;

// Headers de autenticación para todas las peticiones
// IMPORTANTE: Usamos 'X-Admin-Token' en lugar de 'Authorization' para evitar
// que el runtime de Supabase intente validar nuestro token como un JWT de Supabase
const getHeaders = () => {
  const token = localStorage.getItem('admin_token');
  console.log('🔐 getHeaders - Token desde localStorage (primeros 30):', token ? token.substring(0, 30) + '...' : 'NO HAY TOKEN');
  console.log('🔐 getHeaders - Token completo:', token);
  console.log('🔐 getHeaders - Longitud del token:', token?.length);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`, // Siempre usar anon key para pasar el filtro de Supabase
    'X-Admin-Token': token || '', // Nuestro token personalizado en header separado
  };
};

/**
 * Fetch con reintentos automáticos
 * @param url - URL a llamar
 * @param options - Opciones de fetch
 * @param retries - Número de reintentos (default: 3)
 * @param delay - Delay entre reintentos en ms (default: 1000)
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retries: number = 3, 
  delay: number = 1000
): Promise<Response> {
  try {
    console.log(`🔄 Llamando a: ${url}`);
    const response = await fetch(url, options);
    
    // Si la respuesta es OK, devolverla
    if (response.ok || response.status >= 400) {
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    if (retries > 0) {
      console.warn(`⚠️ Error en fetch, reintentando... (${retries} intentos restantes)`);
      console.warn(`⚠️ Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

/**
 * Función de prueba para verificar conectividad con el servidor
 */
export async function testServerConnection() {
  try {
    console.log('🧪 Probando conexión con servidor...');
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    const data = await response.json();
    console.log('✅ Servidor responde:', data);
    return data;
  } catch (error) {
    console.error('❌ Error probando servidor:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Función de prueba para verificar autenticación
 */
export async function testAuthentication() {
  try {
    const token = localStorage.getItem('admin_token');
    console.log('🧪 Probando autenticación...');
    console.log('🔐 Token:', token ? token.substring(0, 30) + '...' : 'NO HAY TOKEN');
    
    if (!token) {
      return { success: false, error: 'No hay token en localStorage' };
    }
    
    const response = await fetch(`${BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    const data = await response.json();
    console.log('✅ Resultado de autenticación:', data);
    return data;
  } catch (error) {
    console.error('❌ Error probando autenticación:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Debug: Obtiene información sobre los tokens activos en el servidor
 */
export async function debugTokens() {
  try {
    console.log('🔍 Obteniendo debug de tokens...');
    const response = await fetch(`${BASE_URL}/debug/tokens`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    const data = await response.json();
    console.log('✅ Debug de tokens:', data);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo debug de tokens:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Debug: Limpia todos los tokens del servidor (útil para depuración)
 */
export async function clearAllServerTokens() {
  try {
    console.log('🧹 ========== LIMPIANDO TODOS LOS TOKENS ==========');
    console.log('🧹 Paso 1: Limpiando tokens en el servidor...');
    const response = await fetch(`${BASE_URL}/debug/clear-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    const data = await response.json();
    console.log('✅ Respuesta de limpieza del servidor:', data);
    
    // También limpiar el token local
    console.log('🧹 Paso 2: Limpiando token de localStorage...');
    localStorage.removeItem('admin_token');
    console.log('✅ Token local también eliminado');
    
    console.log('🧹 ============================================');
    console.log('✅ LIMPIEZA COMPLETA - Ahora puedes hacer login de nuevo');
    
    return data;
  } catch (error) {
    console.error('❌ Error limpiando tokens:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Debug: Verifica un token específico en el servidor
 */
export async function verifySpecificToken(token?: string) {
  try {
    const tokenToVerify = token || localStorage.getItem('admin_token');
    
    if (!tokenToVerify) {
      return { success: false, error: 'No hay token para verificar' };
    }
    
    console.log('🔍 Verificando token específico en el servidor...');
    console.log('🔍 Token (primeros 50):', tokenToVerify.substring(0, 50) + '...');
    
    const response = await fetch(`${BASE_URL}/debug/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ token: tokenToVerify }),
    });
    
    const data = await response.json();
    console.log('✅ Resultado de verificación:', data);
    return data;
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Debug: Test completo del flujo de autenticación
 * Hace login, verifica el token, y compara los valores
 */
export async function testAuthenticationFlow() {
  try {
    console.log('🧪 ========== TEST COMPLETO DE AUTENTICACIÓN ==========');
    
    // Paso 1: Verificar token actual
    console.log('🧪 PASO 1: Verificando token actual en localStorage...');
    const currentToken = localStorage.getItem('admin_token');
    console.log('  Token actual:', currentToken ? currentToken.substring(0, 50) + '...' : 'NINGUNO');
    console.log('  Longitud:', currentToken?.length || 0);
    
    if (currentToken) {
      console.log('  Caracteres especiales:', {
        tieneEspacios: currentToken.includes(' '),
        tieneSaltos: currentToken.includes('\n'),
        tieneTabs: currentToken.includes('\t'),
      });
      console.log('  Token completo:', currentToken);
    }
    
    // Paso 2: Obtener info de tokens del servidor
    console.log('\n🧪 PASO 2: Obteniendo info de tokens del servidor...');
    const tokensInfo = await debugTokens();
    console.log('  Tokens en memoria:', tokensInfo.memory?.count || 0);
    console.log('  Tokens en KV:', tokensInfo.kv?.count || 0);
    console.log('  Tokens cargados:', tokensInfo.tokensLoaded);
    
    if (tokensInfo.memory?.tokens?.length > 0) {
      console.log('  Primer token en memoria (truncado):', tokensInfo.memory.tokens[0].token);
    }
    
    // Paso 3: Hacer una petición de prueba a un endpoint protegido
    console.log('\n🧪 PASO 3: Probando petición a endpoint protegido (/orders)...');
    try {
      const headers = getHeaders();
      console.log('  Headers que se enviarán:', JSON.stringify(headers, null, 2));
      console.log('  Token en Authorization header:', headers.Authorization);
      
      const testResponse = await fetch(`${BASE_URL}/orders`, {
        method: 'GET',
        headers: headers,
      });
      
      console.log('  Respuesta status:', testResponse.status);
      console.log('  Respuesta OK:', testResponse.ok);
      
      if (testResponse.status === 401) {
        console.error('  ❌ ERROR 401: Token rechazado por el servidor');
        const errorBody = await testResponse.text();
        console.error('  Cuerpo del error:', errorBody);
      } else if (testResponse.ok) {
        console.log('  ✅ Petición exitosa!');
        const data = await testResponse.json();
        console.log('  Datos recibidos:', data.success ? `${data.data?.length || 0} pedidos` : 'Error');
      }
    } catch (error) {
      console.error('  ❌ Error en petición de prueba:', error.message);
    }
    
    // Paso 4: Verificar si el token actual es válido usando /auth/verify
    if (currentToken) {
      console.log('\n🧪 PASO 4: Verificando token con /auth/verify...');
      const verifyResult = await testAuthentication();
      console.log('  Resultado:', verifyResult.success ? '✅ VÁLIDO' : '❌ INVÁLIDO');
      if (!verifyResult.success) {
        console.log('  Error:', verifyResult.error);
      }
    }
    
    // Paso 5: Comparación exacta de tokens
    if (currentToken && tokensInfo.memory?.tokens?.length > 0) {
      console.log('\n🧪 PASO 5: Comparando tokens...');
      const serverToken = tokensInfo.memory.tokens[0].tokenFull || tokensInfo.memory.tokens[0].token;
      
      console.log('  Token cliente (longitud):', currentToken.length);
      console.log('  Token servidor (longitud):', serverToken.length);
      console.log('  Token cliente:', currentToken);
      console.log('  Token servidor:', serverToken);
      console.log('  ¿Son exactamente iguales?:', currentToken === serverToken);
      
      if (currentToken !== serverToken) {
        console.log('  ⚠️ ¡Los tokens NO coinciden!');
        
        // Si tienen diferentes longitudes
        if (currentToken.length !== serverToken.length) {
          console.log('  ⚠️ PROBLEMA: Diferentes longitudes');
          console.log(`    Cliente: ${currentToken.length} caracteres`);
          console.log(`    Servidor: ${serverToken.length} caracteres`);
        }
        
        // Buscar primera diferencia
        console.log('  Buscando primera diferencia:');
        const minLength = Math.min(currentToken.length, serverToken.length);
        for (let i = 0; i < minLength; i++) {
          if (currentToken[i] !== serverToken[i]) {
            console.log(`    ⚠️ Primera diferencia en posición ${i}:`);
            console.log(`      Cliente: "${currentToken[i]}" (código ASCII: ${currentToken.charCodeAt(i)})`);
            console.log(`      Servidor: "${serverToken[i]}" (código ASCII: ${serverToken.charCodeAt(i)})`);
            console.log(`      Contexto cliente: ...${currentToken.substring(Math.max(0, i-5), i+5)}...`);
            console.log(`      Contexto servidor: ...${serverToken.substring(Math.max(0, i-5), i+5)}...`);
            break;
          }
        }
        
        // Si uno es más largo que el otro
        if (currentToken.length !== serverToken.length) {
          console.log(`    El token más largo tiene ${Math.abs(currentToken.length - serverToken.length)} caracteres adicionales`);
        }
      } else {
        console.log('  ✅ Los tokens coinciden EXACTAMENTE');
      }
    }
    
    console.log('\n🧪 ================================================');
    
    return {
      success: true,
      currentToken: currentToken ? 'exists' : 'none',
      serverTokens: {
        memory: tokensInfo.memory?.count || 0,
        kv: tokensInfo.kv?.count || 0,
      },
      message: 'Test completado - revisa la consola para detalles'
    };
  } catch (error) {
    console.error('❌ Error en test de autenticación:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// FUNCIONES - AUTENTICACIÓN
// ============================================

/**
 * Login de administrador
 * @param username - Nombre de usuario
 * @param password - Contraseña
 */
export async function loginAdmin(username: string, password: string) {
  try {
    console.log('🔵 Intentando login con:', username);
    console.log('🔗 URL:', `${BASE_URL}/auth/login`);
    
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ username, password }),
    });
    
    console.log('📡 Respuesta recibida, status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Respuesta no OK:', response.status, errorText);
      return { 
        success: false, 
        error: `Error del servidor (${response.status}): ${errorText}`
      };
    }
    
    const data = await response.json();
    console.log('📦 Data recibida:', data);
    
    if (data.success && data.token) {
      // Guardar token en localStorage
      localStorage.setItem('admin_token', data.token);
      console.log('✅ Token guardado exitosamente');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error en login - detalles completos:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    return { 
      success: false, 
      error: `Error de conexión al servidor: ${error.message}. Verifica que el servidor esté funcionando.`
    };
  }
}

/**
 * Solicitar recuperación de contraseña
 * @param email - Email del administrador
 */
export async function requestPasswordReset(email: string) {
  try {
    console.log('🔐 Solicitando recuperación de contraseña para:', email);
    
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Solicitud de recuperación enviada exitosamente');
    } else {
      console.error('❌ Error en recuperación:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error solicitando recuperación:', error);
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

/**
 * Solicitar recuperación de contraseña (nombre alternativo para compatibilidad)
 */
export async function forgotPassword() {
  return requestPasswordReset('danilotellez733@gmail.com');
}

/**
 * Verificar si el token es válido
 */
export async function verifyToken() {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) return { success: false };
    
    const response = await fetch(`${BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Cerrar sesión
 */
export function logoutAdmin() {
  localStorage.removeItem('admin_token');
}

/**
 * Reinicializar datos de la base de datos (solo desarrollo)
 * Recarga todos los datos iniciales: productos, clientes, pedidos, vehículos
 */
export async function reinitializeData() {
  try {
    const response = await fetch(`${BASE_URL}/admin/reinitialize-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error reinicializando datos:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Limpiar completamente la base de datos (PELIGROSO - solo desarrollo)
 * Elimina TODOS los datos sin recargar datos iniciales
 */
export async function clearDatabase() {
  try {
    console.log('🗑️ Limpiando base de datos...');
    const response = await fetch(`${BASE_URL}/admin/clear-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    console.log('✅ Base de datos limpiada:', data);
    return data;
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// ============================================
// FUNCIONES - AUTENTICACIÓN DE CLIENTES
// ============================================

/**
 * Login de cliente
 * @param email - Email del cliente
 * @param password - Contraseña del cliente
 */
export async function loginCustomer(email: string, password: string) {
  try {
    console.log('🔐 Intentando login de cliente:', email);
    
    const response = await fetch(`${BASE_URL}/customers/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Login de cliente exitoso');
      // Guardar datos del cliente en localStorage
      localStorage.setItem('customerEmail', data.data.email);
      localStorage.setItem('customerData', JSON.stringify(data.data));
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error en login de cliente:', error);
    return { 
      success: false, 
      error: `Error de conexión: ${error.message}`
    };
  }
}

/**
 * Registro de nuevo cliente
 * @param customerData - Datos del nuevo cliente
 */
export async function registerCustomer(customerData: {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  municipality: string;
  department: string;
}) {
  try {
    console.log('📝 Registrando nuevo cliente:', customerData.email);
    
    const response = await fetch(`${BASE_URL}/customers/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(customerData),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Registro de cliente exitoso');
      // Guardar datos del cliente en localStorage
      localStorage.setItem('customerEmail', data.data.email);
      localStorage.setItem('customerData', JSON.stringify(data.data));
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error en registro de cliente:', error);
    return { 
      success: false, 
      error: `Error de conexión: ${error.message}`
    };
  }
}

/**
 * Cerrar sesión de cliente
 */
export function logoutCustomer() {
  localStorage.removeItem('customerEmail');
  localStorage.removeItem('customerData');
}

// ============================================
// FUNCIONES - PRODUCTOS
// ============================================

/**
 * Obtiene todos los productos
 */
export async function getProducts() {
  try {
    console.log('📦 ========== OBTENIENDO PRODUCTOS ==========');
    console.log('📦 URL:', `${BASE_URL}/products`);
    
    const response = await fetchWithRetry(`${BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 5, 1000);
    
    console.log('📡 Respuesta recibida, status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Error en respuesta:', response.status);
      const errorText = await response.text();
      console.error('❌ Texto de error:', errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Productos recibidos:', data.success ? data.data.length : 0);
    
    // Si no hay productos, intentar forzar inicialización
    if (data.success && (!data.data || data.data.length === 0)) {
      console.log('⚠️ No hay productos, intentando inicialización...');
      await forceInitData();
      
      // Reintentar obtener productos
      const retryResponse = await fetch(`${BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const retryData = await retryResponse.json();
      console.log('✅ Productos después de inicialización:', retryData.success ? retryData.data.length : 0);
      return retryData.success ? retryData.data : [];
    }
    
    console.log('📦 ========== FIN OBTENIENDO PRODUCTOS ==========');
    return data.success ? data.data : [];
  } catch (error) {
    console.error('❌ ========== ERROR OBTENIENDO PRODUCTOS ==========');
    console.error('❌ Error obteniendo productos:', error);
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ========== FIN ERROR ==========');
    
    // Si hay error de conexión, intentar forzar inicialización
    console.log('⚠️ Error de conexión, intentando inicialización...');
    try {
      await forceInitData();
    } catch (initError) {
      console.error('❌ Error en inicialización forzada:', initError);
    }
    
    return [];
  }
}

/**
 * Fuerza la inicialización de datos en el servidor
 */
async function forceInitData() {
  try {
    console.log('🔄 ========== FORZANDO INICIALIZACIÓN ==========');
    console.log('🔄 URL:', `${BASE_URL}/force-init`);
    
    const response = await fetch(`${BASE_URL}/force-init`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    console.log('📡 Respuesta status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Inicialización forzada exitosa:', data);
      console.log('📊 Datos cargados:');
      console.log('   - Productos:', data.counts?.products || 0);
      console.log('   - Clientes:', data.counts?.customers || 0);
      console.log('   - Pedidos:', data.counts?.orders || 0);
      console.log('   - Vehículos:', data.counts?.vehicles || 0);
      console.log('🔄 ========== FIN INICIALIZACIÓN ==========');
      return data;
    } else {
      const errorText = await response.text();
      console.error('❌ Error en inicialización forzada:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error llamando a force-init:', error);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    return null;
  }
}

/**
 * Agrega un nuevo producto al catálogo
 * Solo admin
 */
export async function addProduct(productData: any) {
  try {
    const response = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error agregando producto:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Actualiza un producto existente
 * Solo admin
 */
export async function updateProduct(productId: string, productData: any) {
  try {
    const response = await fetch(`${BASE_URL}/products/${productId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Elimina un producto del catálogo
 * Solo admin
 */
export async function deleteProduct(productId: string) {
  try {
    const response = await fetch(`${BASE_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error eliminando producto:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Sube una imagen de producto al servidor
 * Solo admin
 */
export async function uploadProductImage(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('admin_token');
    
    const response = await fetch(`${BASE_URL}/upload-product-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`, // Siempre usar anon key para pasar el filtro de Supabase
        'X-Admin-Token': token || '', // Nuestro token personalizado
      },
      body: formData,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// ============================================
// FUNCIONES - PEDIDOS
// ============================================

/**
 * Obtiene todos los pedidos
 * Solo admin
 */
export async function getOrders() {
  try {
    console.log('📦 ========== OBTENIENDO PEDIDOS ==========');
    console.log('📦 URL:', `${BASE_URL}/orders`);
    console.log('📦 Base URL:', BASE_URL);
    console.log('📦 Project ID:', projectId);
    
    // Primero verificar que el servidor esté vivo
    console.log('🔍 Verificando salud del servidor...');
    const healthResponse = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(err => {
      console.error('❌ Error en health check:', err);
      return null;
    });
    
    if (!healthResponse) {
      console.error('❌ Servidor no responde al health check');
      alert('⚠️ ERROR DE CONEXIÓN\n\nEl servidor no está respondiendo.\nPor favor verifica que el servidor esté funcionando correctamente.');
      return [];
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Servidor respondiendo:', healthData);
    
    console.log('📦 Haciendo petición GET /orders con token de ADMIN...');
    const adminHeaders = getHeaders(); // Usar token de admin, no publicAnonKey
    const response = await fetchWithRetry(`${BASE_URL}/orders`, {
      method: 'GET',
      headers: adminHeaders,
    }, 5, 1000);
    
    console.log('📡 Respuesta recibida, status:', response.status);
    console.log('📡 Respuesta OK:', response.ok);
    
    // Si es un error 401, devolver código de error para forzar logout
    if (response.status === 401) {
      console.error('🔐 ERROR 401: TOKEN INVÁLIDO - FORZANDO LOGOUT');
      const errorText = await response.text();
      console.error('📄 Respuesta:', errorText);
      localStorage.removeItem('admin_token');
      return { code: 401, success: false, error: 'Token inválido' } as any;
    }
    
    if (!response.ok) {
      console.error('❌ Error en respuesta:', response.status);
      const errorText = await response.text();
      console.error('❌ Texto de error:', errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Pedidos recibidos:', data.success ? data.data.length : 0);
    console.log('📦 ========== FIN OBTENIENDO PEDIDOS ==========');
    return data.success ? data.data : [];
  } catch (error) {
    console.error('❌ ========== ERROR OBTENIENDO PEDIDOS ==========');
    console.error('❌ Error obteniendo pedidos:', error);
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Detalles del error:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ========== FIN ERROR ==========');
    
    // Mostrar alerta al usuario
    alert(
      '⚠️ ERROR DE CONEXIÓN\n\n' +
      'No se pudo conectar con el servidor.\n\n' +
      `Error: ${error.message}\n\n` +
      'Por favor:\n' +
      '1. Verifica tu conexión a internet\n' +
      '2. Asegúrate de que el servidor esté funcionando\n' +
      '3. Revisa la consola (F12) para más detalles'
    );
    
    return [];
  }
}

/**
 * Obtiene los pedidos de un cliente específico
 * Usado por clientes para ver su historial
 */
export async function getCustomerOrders(email?: string) {
  try {
    // Si no se proporciona email, obtenerlo de localStorage
    const customerEmail = email || localStorage.getItem('customerEmail');
    
    if (!customerEmail) {
      console.log('⚠️ No hay email de cliente para obtener pedidos');
      return [];
    }
    
    const response = await fetchWithRetry(`${BASE_URL}/orders/customer/${customerEmail}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 3, 1000);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.data.length} pedidos encontrados para ${customerEmail}`);
    }
    
    return data.success ? data.data : [];
  } catch (error) {
    console.error('❌ Error obteniendo pedidos del cliente:', error);
    return [];
  }
}

/**
 * Crea un nuevo pedido
 * Usado por clientes al finalizar compra
 */
export async function createOrder(items: any[], total: number) {
  try {
    // Obtener datos del cliente desde localStorage
    const customerDataStr = localStorage.getItem('customerData');
    if (!customerDataStr) {
      console.error('❌ No hay customerData en localStorage');
      throw new Error('No hay datos de cliente. Por favor inicia sesión.');
    }
    
    const customerData = JSON.parse(customerDataStr);
    console.log('👤 Datos del cliente:', customerData);
    
    // El total que llega ya incluye el costo de envío (70)
    // Necesitamos el subtotal para enviarlo al backend
    const DELIVERY_COST = 70;
    const subtotal = total - DELIVERY_COST;
    
    // Preparar datos del pedido
    const orderData = {
      customerId: customerData.id,
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      deliveryAddress: customerData.address,
      municipality: customerData.municipality,
      department: customerData.department,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
      })),
      subtotal: subtotal,
    };
    
    console.log('📦 Creando pedido:', orderData);
    console.log('🔗 URL:', `${BASE_URL}/orders`);
    
    // Crear pedido con Authorization header
    const response = await fetchWithRetry(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(orderData),
    }, 3, 1000);
    
    console.log('📡 Respuesta recibida, status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta:', response.status, errorText);
      throw new Error(`Error del servidor (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Pedido creado exitosamente:', data.data.id);
    } else {
      console.error('❌ Pedido no creado:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    console.error('❌ Error completo:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message || 'Error de conexión con el servidor' };
  }
}

/**
 * Actualiza el estado de un pedido (DEBUG - sin autenticación)
 * Solo para diagnóstico
 */
export async function updateOrderDebug(orderId: string, updates: any) {
  try {
    console.log('🧪 Actualizando pedido (DEBUG):', orderId, 'con datos:', updates);
    
    const response = await fetch(`${BASE_URL}/orders/${orderId}/debug`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(updates),
    });
    
    const responseText = await response.text();
    console.log('📄 Respuesta texto:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('📦 Respuesta data parseada:', data);
    } catch (jsonError) {
      console.error('❌ Error parseando JSON:', jsonError);
      return { 
        success: false, 
        error: `Error en respuesta del servidor (${response.status}): ${responseText || 'Sin contenido'}` 
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error crítico actualizando pedido (debug):', error);
    return { 
      success: false, 
      error: `Error de conexión: ${error.message}` 
    };
  }
}

/**
 * Actualiza el estado de un pedido
 * Solo admin
 */
export async function updateOrder(orderId: string, updates: any) {
  try {
    console.log('📝 Actualizando pedido:', orderId, 'con datos:', updates);
    const headers = getHeaders();
    console.log('🔐 Headers enviados:', headers);
    console.log('🔗 URL:', `${BASE_URL}/orders/${orderId}`);
    
    const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(updates),
    });
    
    console.log('📡 Respuesta status:', response.status);
    console.log('📡 Respuesta OK:', response.ok);
    console.log('📡 Respuesta headers:', Object.fromEntries(response.headers.entries()));
    
    // Verificar si es un error 401 (no autorizado)
    if (response.status === 401) {
      console.error('🔐 ========== ERROR 401: NO AUTORIZADO ==========');
      
      const responseText = await response.text();
      console.error('📄 Respuesta del servidor:', responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText };
      }
      
      const errorMsg = errorData.message || errorData.error || 'Token inválido';
      console.error('📄 Mensaje de error:', errorMsg);
      
      // Si el mensaje indica token inválido o expirado, limpiar automáticamente
      if (errorMsg.includes('Token inválido') || 
          errorMsg.includes('expirado') || 
          errorMsg.includes('Invalid JWT') ||
          errorMsg.toLowerCase().includes('token')) {
        
        console.error('🧹 LIMPIANDO TOKEN INVÁLIDO AUTOMÁTICAMENTE');
        console.error('🧹 Este token ya no sirve, se necesita un nuevo login');
        localStorage.removeItem('admin_token');
        
        // NO RECARGAR AUTOMÁTICAMENTE - dejamos que el usuario maneje el error
        console.error('❌ Token inválido. El usuario debe iniciar sesión manualmente.');
      }
      
      return {
        success: false,
        error: `Token inválido o expirado: ${errorMsg}`,
        code: 401,
        shouldReload: true
      };
    }
    
    // Primero obtener el texto de la respuesta
    const responseText = await response.text();
    console.log('📄 Respuesta texto:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('📦 Respuesta data parseada:', data);
    } catch (jsonError) {
      console.error('❌ Error parseando JSON:', jsonError);
      return { 
        success: false, 
        error: `Error en respuesta del servidor (${response.status}): ${responseText || 'Sin contenido'}` 
      };
    }
    
    // Si el servidor devolvió un error, retornarlo con más detalles
    if (!data.success) {
      console.error('❌ Servidor reportó error:', data.error);
      console.error('❌ Data completo:', JSON.stringify(data, null, 2));
      
      // Si el error es undefined, null o vacío, usar el mensaje completo del objeto data
      let errorMessage = data.error;
      if (!errorMessage) {
        errorMessage = data.message || data.details || JSON.stringify(data);
      }
      if (!errorMessage || errorMessage === '{}') {
        errorMessage = 'Error desconocido del servidor (sin mensaje de error)';
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error crítico actualizando pedido:', error);
    console.error('❌ Stack:', error.stack);
    return { 
      success: false, 
      error: `Error de conexión: ${error.message}` 
    };
  }
}

/**
 * Cancela un pedido
 * Usado por clientes para cancelar sus propios pedidos
 */
export async function cancelOrder(orderId: string) {
  try {
    console.log('🚫 Cancelando pedido:', orderId);
    console.log('🔍 Tipo de orderId:', typeof orderId);
    console.log('🔍 Longitud de orderId:', orderId.length);
    console.log('🔍 orderId en bytes:', Array.from(orderId).map(c => c.charCodeAt(0)));
    
    const response = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Pedido cancelado exitosamente');
    } else {
      console.error('❌ Error cancelando pedido:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error cancelando pedido:', error);
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

/**
 * Marca un pedido como entregado
 * Usado por clientes para confirmar la recepción de sus pedidos
 */
export async function markOrderAsDelivered(orderId: string) {
  try {
    console.log('✅ Marcando pedido como entregado:', orderId);
    
    const response = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}/deliver`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Pedido marcado como entregado exitosamente');
    } else {
      console.error('❌ Error marcando pedido como entregado:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error marcando pedido como entregado:', error);
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

/**
 * Marca todos los pedidos como leídos
 * Usado por el admin para limpiar notificaciones
 */
export async function markAllOrdersAsRead() {
  try {
    console.log('📬 Marcando todos los pedidos como leídos...');
    
    const response = await fetch(`${BASE_URL}/orders/mark-all-read`, {
      method: 'POST',
      headers: getHeaders(),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.markedCount} pedidos marcados como leídos`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error marcando pedidos como leídos:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// ============================================
// FUNCIONES - CLIENTES
// ============================================

/**
 * Obtiene todos los clientes registrados
 * Solo admin
 */
export async function getCustomers() {
  try {
    console.log('📦 Llamando a GET /customers con reintentos...');
    
    const response = await fetchWithRetry(`${BASE_URL}/customers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 5, 1000);
    
    console.log('📡 Respuesta recibida:', response.status);
    
    if (!response.ok) {
      console.error('❌ Error en respuesta:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Clientes recibidos:', data.success ? data.data.length : 0);
    return data.success ? data.data : [];
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    console.error('❌ Detalles del error:', error.message);
    return [];
  }
}

/**
 * Registra un nuevo cliente
 * Usado durante el registro de usuario
 */
export async function registerCustomerAdmin(customerData: any) {
  try {
    const response = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customerData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error registrando cliente:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Actualiza información de un cliente
 * Solo admin
 */
export async function updateCustomer(customerId: string, customerData: any) {
  try {
    const response = await fetch(`${BASE_URL}/customers/${customerId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customerData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Elimina un cliente
 * Solo admin
 */
export async function deleteCustomer(customerId: string) {
  try {
    const response = await fetch(`${BASE_URL}/customers/${customerId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error eliminando cliente:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// ============================================
// FUNCIONES - VEHÍCULOS
// ============================================

/**
 * Obtiene todos los vehículos
 * Solo admin
 */
export async function getVehicles() {
  try {
    console.log('🚗 ========== OBTENIENDO VEHÍCULOS ==========');
    console.log('🚗 URL:', `${BASE_URL}/vehicles`);
    
    // Primero verificar que el servidor esté vivo
    console.log('🔍 Verificando salud del servidor...');
    const healthResponse = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(err => {
      console.error('❌ Error en health check:', err);
      return null;
    });
    
    if (!healthResponse) {
      console.error('❌ Servidor no responde al health check');
      return [];
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Servidor respondiendo:', healthData);
    
    console.log('🚗 Haciendo petición GET /vehicles...');
    const response = await fetchWithRetry(`${BASE_URL}/vehicles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 5, 1000);
    
    console.log('📡 Respuesta recibida, status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Error en respuesta:', response.status);
      const errorText = await response.text();
      console.error('��� Texto de error:', errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Vehículos recibidos:', data.success ? data.data.length : 0);
    console.log('🚗 ========== FIN OBTENIENDO VEHÍCULOS ==========');
    return data.success ? data.data : [];
  } catch (error) {
    console.error('❌ ========== ERROR OBTENIENDO VEHÍCULOS ==========');
    console.error('❌ Error obteniendo vehículos:', error);
    console.error('❌ Tipo de error:', error.name);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ========== FIN ERROR ==========');
    return [];
  }
}

/**
 * Agrega un nuevo vehículo
 * Solo admin
 */
export async function addVehicle(vehicleData: any) {
  try {
    const response = await fetch(`${BASE_URL}/vehicles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(vehicleData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error agregando vehículo:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Actualiza información de un vehículo
 * Solo admin
 */
export async function updateVehicle(vehicleId: string, vehicleData: any) {
  try {
    const response = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(vehicleData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error actualizando vehículo:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

/**
 * Elimina un vehículo
 * Solo admin
 */
export async function deleteVehicle(vehicleId: string) {
  try {
    const response = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error eliminando vehículo:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// ============================================
// FUNCIONES - CONFIGURACIÓN
// ============================================

/**
 * Obtiene la configuración global de la app
 * Incluye el costo de entrega
 */
export async function getConfig() {
  try {
    const response = await fetch(`${BASE_URL}/config`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : { deliveryCost: 70 };
  } catch (error) {
    console.error('❌ Error obteniendo configuración:', error);
    return { deliveryCost: 70 };
  }
}

/**
 * Ejecuta un diagnóstico completo del servidor
 * Útil para debugging
 */
export async function runServerDiagnostics() {
  console.log('🔍 ========== DIAGNÓSTICO DEL SERVIDOR ==========');
  console.log('🔍 URL Base:', BASE_URL);
  console.log('🔍 Project ID:', projectId);
  
  const results = {
    baseUrl: BASE_URL,
    projectId: projectId,
    server: { success: false, error: null, data: null },
    tokenExists: { success: false, error: null, data: null },
    authentication: { success: false, error: null, data: null },
    health: { success: false, error: null, data: null },
    products: { success: false, error: null, count: 0 },
    orders: { success: false, error: null, count: 0 },
    customers: { success: false, error: null, count: 0 },
    vehicles: { success: false, error: null, count: 0 },
  };
  
  // 0. Verificar servidor (health check básico)
  try {
    console.log('🔍 0. Verificando servidor...');
    const serverResponse = await fetchWithRetry(`${BASE_URL}/health`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 3, 500);
    
    if (serverResponse.ok) {
      const serverData = await serverResponse.json();
      results.server = { success: true, error: null, data: serverData };
      console.log('✅ Servidor OK:', serverData);
    } else {
      const errorText = await serverResponse.text().catch(() => 'Sin detalles');
      results.server = { success: false, error: `HTTP ${serverResponse.status}: ${errorText}`, data: null };
      console.error('❌ Servidor failed:', serverResponse.status, errorText);
    }
  } catch (error) {
    results.server = { success: false, error: error.message, data: null };
    console.error('❌ Servidor error:', error.message);
  }
  
  // 0.1. Verificar que exista token en localStorage
  const token = localStorage.getItem('admin_token');
  if (token) {
    results.tokenExists = { success: true, error: null, data: { tokenLength: token.length } };
    console.log('✅ Token existe en localStorage');
  } else {
    results.tokenExists = { success: false, error: 'No hay token en localStorage', data: null };
    console.log('❌ No hay token en localStorage');
  }
  
  // 0.2. Verificar autenticación con el token
  if (token) {
    try {
      console.log('🔍 0.2. Verificando autenticación...');
      const authResponse = await fetch(`${BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.success) {
          results.authentication = { success: true, error: null, data: authData.user };
          console.log('✅ Autenticación válida:', authData.user);
        } else {
          results.authentication = { success: false, error: authData.error || 'Autenticación inválida', data: null };
          console.error('❌ Autenticación inválida:', authData.error);
        }
      } else {
        results.authentication = { success: false, error: `HTTP ${authResponse.status}`, data: null };
        console.error('❌ Autenticación failed:', authResponse.status);
      }
    } catch (error) {
      results.authentication = { success: false, error: error.message, data: null };
      console.error('❌ Autenticación error:', error.message);
    }
  } else {
    results.authentication = { success: false, error: 'No hay token para verificar', data: null };
  }
  
  // 1. Health check
  try {
    console.log('🔍 1. Verificando health check...');
    const healthResponse = await fetchWithRetry(`${BASE_URL}/health`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 3, 500);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      results.health = { success: true, error: null, data: healthData };
      console.log('✅ Health check OK:', healthData);
    } else {
      const errorText = await healthResponse.text().catch(() => 'Sin detalles');
      results.health = { success: false, error: `HTTP ${healthResponse.status}: ${errorText}`, data: null };
      console.error('❌ Health check failed:', healthResponse.status, errorText);
    }
  } catch (error) {
    results.health = { success: false, error: error.message, data: null };
    console.error('❌ Health check error:', error.message);
  }
  
  // 2. Products
  try {
    console.log('🔍 2. Verificando productos...');
    const productsResponse = await fetchWithRetry(`${BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 3, 500);
    
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      results.products = { 
        success: true, 
        error: null, 
        count: productsData.data?.length || 0 
      };
      console.log('✅ Productos OK:', results.products.count);
    } else {
      const errorText = await productsResponse.text().catch(() => 'Sin detalles');
      results.products = { success: false, error: `HTTP ${productsResponse.status}: ${errorText}`, count: 0 };
      console.error('❌ Productos failed:', productsResponse.status, errorText);
    }
  } catch (error) {
    results.products = { success: false, error: error.message, count: 0 };
    console.error('❌ Productos error:', error.message);
  }
  
  // 3. Orders
  try {
    console.log('🔍 3. Verificando pedidos...');
    const ordersResponse = await fetchWithRetry(`${BASE_URL}/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 3, 500);
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      results.orders = { 
        success: true, 
        error: null, 
        count: ordersData.data?.length || 0 
      };
      console.log('✅ Pedidos OK:', results.orders.count);
    } else {
      const errorText = await ordersResponse.text().catch(() => 'Sin detalles');
      results.orders = { success: false, error: `HTTP ${ordersResponse.status}: ${errorText}`, count: 0 };
      console.error('❌ Pedidos failed:', ordersResponse.status, errorText);
    }
  } catch (error) {
    results.orders = { success: false, error: error.message, count: 0 };
    console.error('❌ Pedidos error:', error.message);
  }
  
  // 4. Customers
  try {
    console.log('🔍 4. Verificando clientes...');
    const customersResponse = await fetchWithRetry(`${BASE_URL}/customers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 3, 500);
    
    if (customersResponse.ok) {
      const customersData = await customersResponse.json();
      results.customers = { 
        success: true, 
        error: null, 
        count: customersData.data?.length || 0 
      };
      console.log('✅ Clientes OK:', results.customers.count);
    } else {
      const errorText = await customersResponse.text().catch(() => 'Sin detalles');
      results.customers = { success: false, error: `HTTP ${customersResponse.status}: ${errorText}`, count: 0 };
      console.error('❌ Clientes failed:', customersResponse.status, errorText);
    }
  } catch (error) {
    results.customers = { success: false, error: error.message, count: 0 };
    console.error('❌ Clientes error:', error.message);
  }
  
  // 5. Vehicles
  try {
    console.log('🔍 5. Verificando vehículos...');
    const vehiclesResponse = await fetchWithRetry(`${BASE_URL}/vehicles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }, 3, 500);
    
    if (vehiclesResponse.ok) {
      const vehiclesData = await vehiclesResponse.json();
      results.vehicles = { 
        success: true, 
        error: null, 
        count: vehiclesData.data?.length || 0 
      };
      console.log('✅ Vehículos OK:', results.vehicles.count);
    } else {
      const errorText = await vehiclesResponse.text().catch(() => 'Sin detalles');
      results.vehicles = { success: false, error: `HTTP ${vehiclesResponse.status}: ${errorText}`, count: 0 };
      console.error('❌ Vehículos failed:', vehiclesResponse.status, errorText);
    }
  } catch (error) {
    results.vehicles = { success: false, error: error.message, count: 0 };
    console.error('❌ Vehículos error:', error.message);
  }
  
  console.log('🔍 ========== FIN DIAGNÓSTICO ==========');
  console.log('📊 Resultados:', results);
  
  return results;
}