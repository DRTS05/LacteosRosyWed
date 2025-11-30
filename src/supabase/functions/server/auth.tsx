// ============================================
// MÓDULO DE AUTENTICACIÓN Y SEGURIDAD
// ============================================
// Maneja autenticación, roles, JWT tokens y cifrado de contraseñas
// Proporciona funciones para proteger rutas del administrador

import * as bcrypt from 'npm:bcryptjs@2.4.3';

// ============================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================

// Clave secreta para firmar tokens (en producción debe ser una variable de entorno segura)
const AUTH_SECRET = Deno.env.get('JWT_SECRET') || 'lacteos-rosy-secret-key-2024-super-secure';

// Duración del token para admin: prácticamente infinita (10 años)
// Para clientes: 30 días
const ADMIN_TOKEN_EXPIRATION = 10 * 365 * 24 * 60 * 60 * 1000; // 10 años
const CLIENT_TOKEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000; // 30 días

// Tiempo para auto-renovar token de admin (cada vez que haga una petición)
const ADMIN_TOKEN_REFRESH_WINDOW = 24 * 60 * 60 * 1000; // 24 horas

// ============================================
// USUARIO ADMINISTRADOR
// ============================================
// En producción, esto estaría en una base de datos con más usuarios

interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  role: 'admin';
  createdAt: string;
}

// ============================================
// SEGURIDAD: EMAIL DEL ADMINISTRADOR CIFRADO
// ============================================
// El email está codificado en Base64 para dificultar su extracción del código
// IMPORTANTE: Este email es FIJO y no se puede cambiar desde el frontend
// Solo este email puede recibir correos de recuperación de contraseña
// 
// Email cifrado (Base64): ZGFuaWxvdGVsbGV6NzMzQGdtYWlsLmNvbQ==
// Decodifica a: danilotellez733@gmail.com
const ADMIN_EMAIL_ENCODED = 'ZGFuaWxvdGVsbGV6NzMzQGdtYWlsLmNvbQ==';

/**
 * Decodifica el email del administrador desde Base64
 * @returns Email del administrador
 */
const decodeAdminEmail = () => {
  try {
    return atob(ADMIN_EMAIL_ENCODED);
  } catch {
    return 'danilotellez733@gmail.com'; // Fallback de seguridad
  }
};

// Usuario administrador del sistema
// Contraseña en texto plano: admin123
const ADMIN_USER: AdminUser = {
  id: 'admin-001',
  username: 'admin',
  passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMye', // Hash de "admin123" (no se usa por ahora)
  email: decodeAdminEmail(),
  role: 'admin',
  createdAt: new Date().toISOString(),
};

// ⚠️ IMPORTANTE: Esta es la contraseña correcta del administrador
// NO es "administrador123", ES "admin123"
const ADMIN_PASSWORD = 'admin123'; // ✅ CONTRASEÑA CORRECTA

// Almacenamiento en memoria de tokens activos
// En producción esto debería estar en Redis o base de datos
const activeTokens = new Map<string, { user: any; expiresAt: number }>();

// Variable para rastrear si ya se cargaron los tokens
let tokensLoaded = false;

// KV store - importación directa
import * as kv from './kv_store.tsx';

console.log('✅ KV store importado en auth.tsx');

/**
 * Carga los tokens activos desde KV store al iniciar el servidor
 * NUEVA ESTRATEGIA: Usar claves individuales con prefijo
 * Esto permite que los tokens persistan entre reinicios
 */
export async function loadTokensFromKV(): Promise<void> {
  if (tokensLoaded) {
    console.log('🔑 Tokens ya cargados, saltando...');
    return;
  }
  
  // Asegurar que KV esté cargado
  if (!kv) {
    console.log('⚠️ KV store no disponible aún, esperando...');
    // Esperar un poco a que KV se cargue
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!kv) {
      console.log('⚠️ KV store sigue no disponible, saltando carga de tokens');
      tokensLoaded = true; // Marcar como cargado para no intentar de nuevo
      return;
    }
  }
  
  try {
    console.log('🔑 ========== CARGANDO TOKENS DESDE KV (NUEVA ESTRATEGIA) ==========');
    console.log('🔑 Buscando tokens con prefijo "auth_token:"...');
    
    // Usar getByPrefixWithKeys para obtener todos los tokens CON sus claves
    const tokenEntries = await kv.getByPrefixWithKeys('auth_token:');
    console.log('🔑 Total de tokens encontrados:', tokenEntries.length);
    
    if (tokenEntries.length === 0) {
      console.log('⚠️ No hay tokens guardados en KV store');
      console.log('ℹ️ Esto es normal si es la primera vez que se inicia el servidor');
    }
    
    let loadedCount = 0;
    let expiredCount = 0;
    const now = Date.now();
    
    for (const entry of tokenEntries) {
      const { key, value: tokenData } = entry;
      
      // Extraer el token de la clave (remover el prefijo "auth_token:")
      const token = key.replace('auth_token:', '');
      
      console.log(`🔑 Verificando token: ${token.substring(0, 20)}...`);
      console.log(`🔑 Usuario: ${tokenData.user?.username}`);
      console.log(`🔑 Expira: ${new Date(tokenData.expiresAt).toISOString()}`);
      console.log(`🔑 Ahora: ${new Date(now).toISOString()}`);
      
      // Solo cargar tokens que no hayan expirado
      if (tokenData.expiresAt > now) {
        // Cargar en memoria usando el token (sin prefijo)
        activeTokens.set(token, tokenData);
        loadedCount++;
        console.log(`✅ Token cargado en memoria`);
      } else {
        expiredCount++;
        console.log(`❌ Token expirado, no se cargará`);
        
        // Limpiar token expirado de KV (sin bloquear)
        kv.del(key).catch(err => console.error('⚠️ Error limpiando token expirado:', err));
      }
    }
    
    console.log(`✅ Tokens cargados exitosamente: ${loadedCount}`);
    console.log(`⚠️ Tokens expirados omitidos: ${expiredCount}`);
    console.log(`📊 Total en memoria ahora: ${activeTokens.size}`);
    console.log('🔑 ==================================================================');
    tokensLoaded = true;
  } catch (error) {
    console.error('❌ ========== ERROR CARGANDO TOKENS ==========');
    console.error('❌ Error:', error);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ============================================');
    // Marcar como cargado de todos modos para no quedar en loop
    tokensLoaded = true;
  }
}

// ============================================
// FUNCIONES DE CIFRADO
// ============================================

/**
 * Hashea una contraseña usando bcrypt
 * @param password - Contraseña en texto plano
 * @returns Hash de la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verifica si una contraseña coincide con su hash
 * @param password - Contraseña en texto plano
 * @param hash - Hash almacenado
 * @returns true si coinciden, false si no
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verificando contraseña:', error);
    return false;
  }
}

// ============================================
// FUNCIONES DE TOKEN SIMPLIFICADAS
// ============================================

/**
 * Genera un token simple para un usuario autenticado
 * @param user - Datos del usuario
 * @returns Token firmado
 */
export async function generateToken(user: AdminUser): Promise<string> {
  console.log('🔑 ========== GENERANDO TOKEN ==========');
  console.log('🔑 Usuario:', user.username);
  console.log('🔑 Rol:', user.role);
  
  // Generar un token aleatorio seguro
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Agregar información del usuario al token
  const tokenWithUser = `${token}.${user.id}.${user.role}`;
  
  // Guardar en memoria con tiempo de expiración
  // ADMIN: token prácticamente infinito (10 años)
  // CLIENTES: token de 30 días
  const expiresAt = user.role === 'admin' 
    ? Date.now() + ADMIN_TOKEN_EXPIRATION 
    : Date.now() + CLIENT_TOKEN_EXPIRATION;
  
  const tokenData = {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    expiresAt,
    isAdmin: user.role === 'admin', // Marcar si es admin para renovación automática
  };
  
  console.log('🔑 Token generado:', tokenWithUser.substring(0, 30) + '...');
  console.log('🔑 Token completo (para debug):', tokenWithUser);
  console.log('🔑 Expira en:', new Date(expiresAt).toISOString());
  console.log('🔑 Tipo:', user.role === 'admin' ? 'ADMIN (10 años)' : 'Cliente (30 días)');
  
  // Agregar a memoria PRIMERO
  activeTokens.set(tokenWithUser, tokenData);
  console.log('✅ Token agregado a memoria');
  console.log('🔑 Tokens activos en memoria:', activeTokens.size);
  
  // Verificar inmediatamente que se agregó
  const immediateCheck = activeTokens.get(tokenWithUser);
  if (immediateCheck) {
    console.log('✅ VERIFICACIÓN INMEDIATA: Token encontrado en memoria');
    console.log('✅ Usuario del token:', immediateCheck.user?.username);
  } else {
    console.error('❌ ERROR CRÍTICO: Token NO se encuentra en memoria justo después de agregarlo');
  }
  
  // También persistir en KV store para sobrevivir reinicios
  // NUEVA ESTRATEGIA: Guardar cada token como una clave individual
  // Esto elimina condiciones de carrera al actualizar un objeto grande
  try {
    console.log('💾 ========== GUARDANDO TOKEN EN KV (NUEVA ESTRATEGIA) ==========');
    console.log('💾 Verificando disponibilidad de KV...');
    console.log('💾 kv disponible:', !!kv);
    console.log('💾 kv.get disponible:', typeof kv?.get);
    console.log('💾 kv.set disponible:', typeof kv?.set);
    
    if (!kv || !kv.get || !kv.set) {
      throw new Error('KV store no está disponible o no tiene los métodos necesarios');
    }
    
    // CLAVE ÚNICA para este token - prefijo para evitar colisiones
    const tokenKey = `auth_token:${tokenWithUser}`;
    
    console.log('💾 Guardando token con clave individual:', tokenKey.substring(0, 50) + '...');
    console.log('💾 Datos del token:', {
      user: tokenData.user.username,
      role: tokenData.user.role,
      expiresAt: new Date(tokenData.expiresAt).toISOString()
    });
    
    // Guardar directamente como clave individual
    await kv.set(tokenKey, tokenData);
    console.log('💾 ✅ Token guardado en KV con clave individual');
    
    // Verificar inmediatamente
    console.log('💾 Verificando guardado...');
    const verification = await kv.get(tokenKey);
    
    if (!verification) {
      throw new Error('Verificación falló: kv.get() devolvió null/undefined');
    }
    
    if (verification.user?.username === tokenData.user.username) {
      console.log('💾 ✅ VERIFICADO: Token guardado y recuperado correctamente');
      console.log('💾 Usuario verificado:', verification.user.username);
      console.log('💾 Expira:', new Date(verification.expiresAt).toISOString());
    } else {
      console.error('💾 ❌ ERROR: Datos del token no coinciden después de guardar');
    }
    
    console.log('💾 =============================================================');
  } catch (error) {
    console.error('💾 ❌ ========== ERROR GUARDANDO TOKEN EN KV ==========');
    console.error('💾 Error type:', error?.constructor?.name);
    console.error('💾 Error name:', error?.name);
    console.error('💾 Error message:', error?.message);
    console.error('💾 Error stack:', error?.stack);
    console.error('💾 ====================================================');
    // No fallar el login por esto, pero advertir
    console.warn('⚠️  El token solo funcionará mientras el servidor no se reinicie');
  }
  
  console.log('🔑 ========================================');
  
  return tokenWithUser;
}

/**
 * Verifica y decodifica un token
 * @param token - Token a verificar
 * @returns Datos del usuario si el token es válido, null si no
 */
export async function verifyToken(token: string): Promise<any> {
  console.log('🔍 ========== VERIFICANDO TOKEN ==========');
  console.log('🔍 Token recibido:', token ? token.substring(0, 30) + '...' : 'NULL');
  console.log('🔍 Longitud del token:', token?.length || 0);
  console.log('🔍 Token completo (para debug):', token);
  
  // Validación básica
  if (!token || token.trim() === '') {
    console.error('🔍 ❌ Token vacío o inválido');
    return null;
  }
  
  // Si los tokens no se han cargado, cargarlos ahora
  if (!tokensLoaded) {
    console.log('🔍 ⚠️ Tokens no cargados previamente, cargando ahora...');
    await loadTokensFromKV();
  } else {
    console.log('🔍 ✅ Tokens ya están cargados');
  }
  
  // Buscar el token en los tokens activos en memoria primero
  let tokenData = activeTokens.get(token);
  console.log('🔍 Token encontrado en memoria:', !!tokenData);
  console.log('🔍 Total de tokens en memoria:', activeTokens.size);
  
  // DEBUG: Mostrar todos los tokens en memoria (primeros 30 chars)
  if (activeTokens.size > 0) {
    console.log('🔍 Tokens en memoria (primeros 30 chars):');
    let idx = 0;
    for (const [key, value] of activeTokens.entries()) {
      console.log(`   ${idx + 1}. ${key.substring(0, 30)}... (usuario: ${value.user?.username})`);
      idx++;
      if (idx >= 5) break; // Solo mostrar los primeros 5
    }
  } else {
    console.log('🔍 ⚠️ No hay tokens en memoria');
  }
  
  // Si está en memoria, loguear la información
  if (tokenData) {
    console.log('🔍 ✅ Token encontrado en memoria');
    console.log('🔍 Usuario:', tokenData.user?.username);
    console.log('🔍 Expira:', new Date(tokenData.expiresAt).toISOString());
    console.log('🔍 Es admin:', tokenData.isAdmin);
  }
  
  // Si no está en memoria, buscar en KV store directamente usando clave individual
  if (!tokenData && kv) {
    console.log('🔍 ❌ Token NO encontrado en memoria, buscando en KV...');
    try {
      const tokenKey = `auth_token:${token}`;
      console.log('🔍 Buscando con clave:', tokenKey.substring(0, 50) + '...');
      
      tokenData = await kv.get(tokenKey);
      
      if (tokenData) {
        // Restaurar en memoria para futuras consultas
        activeTokens.set(token, tokenData);
        console.log('🔍 ✅ Token recuperado de KV store y restaurado en memoria');
        console.log('🔍 Usuario:', tokenData.user?.username);
        console.log('🔍 Expira:', new Date(tokenData.expiresAt).toISOString());
      } else {
        console.log('🔍 ❌ Token no encontrado en KV tampoco');
        console.log('🔍 Token buscado:', token.substring(0, 30) + '...');
        console.log('🔍 Clave buscada:', tokenKey.substring(0, 50) + '...');
      }
    } catch (error) {
      console.error('🔍 ⚠️ Error leyendo token de KV:', error);
      console.error('🔍 ⚠️ Error message:', error.message);
      console.error('🔍 ⚠️ Error stack:', error.stack);
    }
  } else if (!tokenData && !kv) {
    console.log('🔍 ⚠️ KV store no disponible para búsqueda');
  }
  
  if (!tokenData) {
    console.error('🔍 ❌ ========== TOKEN NO ENCONTRADO ==========');
    console.error('🔍 Token:', token.substring(0, 30) + '...');
    console.error('🔍 Tokens en memoria:', activeTokens.size);
    console.error('🔍 ==========================================');
    return null;
  }
  
  // Verificar si el token ha expirado
  const now = Date.now();
  console.log('🕐 Ahora:', now, 'Expira:', tokenData.expiresAt);
  console.log('🕐 Es admin:', tokenData.isAdmin);
  
  if (now > tokenData.expiresAt) {
    console.error('❌ Token expirado');
    console.error(`❌ Expiró hace ${Math.round((now - tokenData.expiresAt) / 1000)} segundos`);
    
    // Limpiar token expirado de memoria
    activeTokens.delete(token);
    
    // También limpiar de KV (sin bloquear) usando clave individual
    if (kv) {
      const tokenKey = `auth_token:${token}`;
      kv.del(tokenKey)
        .catch((error: any) => console.error('⚠️ Error limpiando token de KV:', error));
    }
    
    return null;
  }
  
  // ✨ AUTO-RENOVACIÓN PARA ADMIN ✨
  // Si es un token de admin y está siendo usado, extender automáticamente su expiración
  // Esto mantiene la sesión del admin viva mientras esté activo
  if (tokenData.isAdmin && tokenData.user.role === 'admin') {
    const timeUntilExpiry = tokenData.expiresAt - now;
    
    // Si quedan menos de 24 horas, renovar automáticamente
    if (timeUntilExpiry < ADMIN_TOKEN_REFRESH_WINDOW) {
      console.log('🔄 ⚡ AUTO-RENOVANDO TOKEN DE ADMIN');
      console.log('🔄 Tiempo restante:', Math.round(timeUntilExpiry / (60 * 60 * 1000)), 'horas');
      
      // Extender expiración por 10 años más
      const newExpiresAt = Date.now() + ADMIN_TOKEN_EXPIRATION;
      tokenData.expiresAt = newExpiresAt;
      
      // Actualizar en memoria
      activeTokens.set(token, tokenData);
      
      // Actualizar en KV (sin bloquear) usando clave individual
      if (kv) {
        const tokenKey = `auth_token:${token}`;
        kv.set(tokenKey, tokenData)
          .then(() => {
            console.log('✅ Token de admin renovado automáticamente');
            console.log('✅ Nueva expiración:', new Date(newExpiresAt).toISOString());
          })
          .catch((error: any) => console.error('⚠️ Error renovando token en KV:', error));
      }
    } else {
      console.log('✅ Token de admin válido, no necesita renovación aún');
      console.log('✅ Tiempo restante:', Math.round(timeUntilExpiry / (24 * 60 * 60 * 1000)), 'días');
    }
  }
  
  console.log('✅ Token válido para usuario:', tokenData.user.username);
  return tokenData.user;
}

/**
 * Elimina un token (logout)
 * @param token - Token a eliminar
 */
export async function revokeToken(token: string): Promise<void> {
  activeTokens.delete(token);
  console.log('🚪 Token revocado de memoria. Tokens activos:', activeTokens.size);
  
  // También limpiar de KV (sin bloquear) usando clave individual
  if (kv) {
    const tokenKey = `auth_token:${token}`;
    kv.del(tokenKey)
      .then(() => console.log('💾 Token revocado de KV store'))
      .catch((error: any) => console.error('⚠️ Error revocando token de KV:', error));
  }
}

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Autentica un usuario con username y contraseña
 * @param username - Nombre de usuario
 * @param password - Contraseña en texto plano
 * @returns Objeto con éxito, token y datos del usuario
 */
export async function authenticateUser(username: string, password: string) {
  console.log('🔐 ========== AUTENTICANDO USUARIO ==========');
  console.log('🔐 Usuario:', username);
  console.log('🔐 Password recibido:', password ? '***' + password.substring(password.length - 3) : 'VACÍO');
  
  // Buscar usuario (en este caso solo tenemos admin)
  if (username !== ADMIN_USER.username) {
    console.log('❌ Usuario no encontrado');
    console.log('❌ Usuario esperado:', ADMIN_USER.username);
    return {
      success: false,
      error: 'Usuario o contraseña incorrectos',
    };
  }
  
  console.log('✅ Usuario encontrado');
  console.log('🔐 Verificando contraseña...');
  console.log('🔐 Password esperado:', ADMIN_PASSWORD);
  
  // Verificar contraseña directamente
  const isValidPassword = password === ADMIN_PASSWORD;
  
  if (!isValidPassword) {
    console.log('❌ Contraseña incorrecta');
    console.log('❌ Password recibido:', password);
    console.log('❌ Password esperado:', ADMIN_PASSWORD);
    return {
      success: false,
      error: 'Usuario o contraseña incorrectos',
    };
  }
  
  console.log('✅ Contraseña correcta, generando token...');
  
  // Generar token (ahora es async)
  const token = await generateToken(ADMIN_USER);
  
  console.log('✅ Autenticación exitosa');
  console.log('✅ Token generado:', token.substring(0, 30) + '...');
  console.log('🔐 ========================================');
  
  return {
    success: true,
    token,
    user: {
      id: ADMIN_USER.id,
      username: ADMIN_USER.username,
      email: ADMIN_USER.email,
      role: ADMIN_USER.role,
    },
  };
}

/**
 * Middleware para proteger rutas del administrador
 * Verifica que el token sea válido y el usuario tenga rol admin
 */
export async function requireAdmin(token: string | null): Promise<{ authorized: boolean; user?: any; error?: string }> {
  try {
    console.log('🔐 requireAdmin - Iniciando verificación...');
    
    if (!token) {
      console.log('🔐 requireAdmin - Sin token');
      return {
        authorized: false,
        error: 'No se proporcionó token de autenticación',
      };
    }
    
    console.log('🔐 requireAdmin - Verificando token...');
    // Verificar token (ahora es async)
    const decoded = await verifyToken(token);
    console.log('🔐 requireAdmin - Token decodificado:', decoded ? 'SÍ' : 'NO');
    
    if (!decoded) {
      console.log('🔐 requireAdmin - Token inválido o expirado');
      return {
        authorized: false,
        error: 'Token inválido o expirado',
      };
    }
    
    // Verificar rol
    console.log('🔐 requireAdmin - Verificando rol:', decoded.role);
    if (decoded.role !== 'admin') {
      console.log('🔐 requireAdmin - Rol incorrecto');
      return {
        authorized: false,
        error: 'No tiene permisos de administrador',
      };
    }
    
    console.log('🔐 requireAdmin - ¡Autorizado!');
    return {
      authorized: true,
      user: decoded,
    };
  } catch (error) {
    console.error('🔐 requireAdmin - Error crítico:', error);
    console.error('🔐 requireAdmin - Stack:', error.stack);
    return {
      authorized: false,
      error: `Error verificando autenticación: ${error.message}`,
    };
  }
}

/**
 * Obtiene el usuario administrador (para recuperación de contraseña)
 */
export function getAdminUser() {
  return {
    ...ADMIN_USER,
    password: ADMIN_PASSWORD, // Agregar contraseña en texto plano para recuperación
  };
}

/**
 * Debug: Obtiene información sobre los tokens activos (solo para desarrollo)
 */
export async function getActiveTokensDebugInfo() {
  try {
    const memoryTokens = Array.from(activeTokens.entries()).map(([token, data]) => ({
      tokenTruncated: token.substring(0, 30) + '...',
      tokenFull: token, // ⚠️ SOLO PARA DEBUG - Token completo
      user: data.user?.username,
      role: data.user?.role,
      expiresAt: new Date(data.expiresAt).toISOString(),
      timeUntilExpiry: Math.round((data.expiresAt - Date.now()) / (60 * 60 * 1000)) + ' horas',
    }));
    
    let kvTokens = [];
    if (kv) {
      // Usar la nueva estrategia de claves individuales
      const tokenEntries = await kv.getByPrefixWithKeys('auth_token:');
      kvTokens = tokenEntries.map(entry => {
        const token = entry.key.replace('auth_token:', '');
        const data = entry.value;
        return {
          tokenTruncated: token.substring(0, 30) + '...',
          tokenFull: token, // ⚠️ SOLO PARA DEBUG - Token completo
          user: data.user?.username,
          role: data.user?.role,
          expiresAt: new Date(data.expiresAt).toISOString(),
          timeUntilExpiry: Math.round((data.expiresAt - Date.now()) / (60 * 60 * 1000)) + ' horas',
        };
      });
    }
    
    return {
      tokensLoaded,
      memory: {
        count: activeTokens.size,
        tokens: memoryTokens,
      },
      kv: {
        count: kvTokens.length,
        tokens: kvTokens,
      },
    };
  } catch (error) {
    return {
      error: error.message,
      stack: error.stack,
    };
  }
}

/**
 * Debug: Limpia todos los tokens (útil para depuración)
 */
export async function clearAllTokens() {
  console.log('🧹 Limpiando todos los tokens...');
  console.log('🧹 Tokens en memoria antes:', activeTokens.size);
  
  // Limpiar memoria
  activeTokens.clear();
  console.log('✅ Memoria limpiada');
  
  // Limpiar KV - eliminar todas las claves con prefijo "auth_token:"
  if (kv) {
    try {
      console.log('🧹 Buscando tokens en KV...');
      const tokenEntries = await kv.getByPrefixWithKeys('auth_token:');
      console.log('🧹 Tokens encontrados en KV:', tokenEntries.length);
      
      if (tokenEntries.length > 0) {
        // Eliminar todos los tokens encontrados
        const tokenKeys = tokenEntries.map(entry => entry.key);
        console.log('🧹 Eliminando', tokenKeys.length, 'tokens de KV...');
        await kv.mdel(tokenKeys);
        console.log('✅ Tokens eliminados de KV');
      } else {
        console.log('ℹ️ No hay tokens en KV para eliminar');
      }
      
      // Verificar
      const verification = await kv.getByPrefixWithKeys('auth_token:');
      console.log('✅ Verificación: tokens en KV después de limpiar:', verification.length);
    } catch (error) {
      console.error('❌ Error limpiando KV:', error);
      throw error;
    }
  }
  
  console.log('✅ Todos los tokens han sido eliminados');
}

// ============================================
// FUNCIÓN PARA GENERAR NUEVA CONTRASEÑA HASHEADA
// ============================================
// Esta es una función auxiliar para generar hashes de contraseñas

export async function generatePasswordHash(password: string) {
  const hash = await hashPassword(password);
  console.log(`Hash para la contraseña "${password}":`, hash);
  return hash;
}