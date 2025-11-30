// CORRECCIÓN TEMPORAL PARA getOrders
// Este archivo contiene la versión corregida de getOrders que usa el token de admin correctamente

import { projectId, publicAnonKey } from './info.tsx';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-960143c8`;

// Headers de autenticación para todas las peticiones
// IMPORTANTE: Usamos 'X-Admin-Token' en lugar de 'Authorization' para evitar
// que el runtime de Supabase intente validar nuestro token como un JWT de Supabase
const getHeaders = () => {
  const token = localStorage.getItem('admin_token');
  console.log('🔐 getHeaders - Token desde localStorage:', token ? token.substring(0, 30) + '...' : 'NO HAY TOKEN');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`, // Siempre usar anon key para pasar el filtro de Supabase
    'X-Admin-Token': token || '', // Nuestro token personalizado en header separado
  };
};

/**
 * Fetch con reintentos automáticos
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
 * Obtiene todos los pedidos
 * Solo admin - USA TOKEN DE ADMIN
 */
export async function getOrders() {
  try {
    console.log('📦 ========== OBTENIENDO PEDIDOS (VERSIÓN CORREGIDA) ==========');
    
    // IMPORTANTE: Usar token de admin desde getHeaders()
    const headers = getHeaders();
    console.log('📦 Usando autenticación de admin');
    
    const response = await fetchWithRetry(`${BASE_URL}/orders`, {
      method: 'GET',
      headers: headers,
    }, 3, 1000);
    
    console.log('📡 Respuesta recibida, status:', response.status);
    
    // Si es un error 401, devolver código de error para forzar logout
    if (response.status === 401) {
      console.error('🔐 ========== ERROR 401: TOKEN INVÁLIDO ==========');
      const errorText = await response.text();
      console.error('📄 Respuesta del servidor:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      
      // Limpiar token automáticamente
      localStorage.removeItem('admin_token');
      console.error('🧹 Token limpiado de localStorage');
      
      // Devolver objeto de error con código 401 para que AdminDashboard fuerce logout
      return { 
        code: 401, 
        success: false, 
        error: errorData.message || errorData.error || 'Token inválido' 
      } as any;
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
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ========== FIN ERROR ==========');
    return [];
  }
}
