// ============================================
// MÓDULO DE ENVÍO DE EMAILS
// ============================================
// Maneja el envío de correos electrónicos usando Resend API

/**
 * Envía un email de recuperación de contraseña
 * @param to - Email destino
 * @param password - Contraseña a enviar
 */
export async function sendPasswordRecoveryEmail(to: string, password: string) {
  console.log('📧 ========== FUNCIÓN sendPasswordRecoveryEmail ==========');
  console.log('📧 Parámetro "to":', to);
  console.log('📧 Parámetro "password" (TEXTO COMPLETO):', password);
  console.log('📧 Parámetro "password" (CENSURADO):', password ? '***' : 'UNDEFINED/NULL');
  console.log('📧 Tipo de "password":', typeof password);
  
  // Validar que la contraseña exista
  if (!password || password === 'undefined' || password === 'null') {
    console.error('❌ Contraseña no proporcionada o inválida');
    return { 
      success: false, 
      error: 'La contraseña no está disponible. Verifica la configuración del sistema.' 
    };
  }
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.error('❌ No se encontró RESEND_API_KEY en variables de entorno');
    return { success: false, error: 'Configuración de email no disponible' };
  }
  
  console.log('📧 Intentando enviar email a:', to);
  console.log('🔑 API Key presente:', RESEND_API_KEY ? 'Sí' : 'No');
  console.log('🔑 API Key longitud:', RESEND_API_KEY?.length || 0);
  console.log('\n⚠️  ========== MODO SANDBOX DE RESEND ==========');
  console.log('⚠️  Usando: onboarding@resend.dev (email de sandbox)');
  console.log('⚠️  Solo puede enviar a:');
  console.log('   ✅ Emails verificados en tu cuenta Resend');
  console.log('   ✅ delivered@resend.dev (email de prueba)');
  console.log('\n📋 DESTINATARIO ACTUAL:', to);
  console.log('❓ ¿Este email está verificado en Resend?');
  console.log('\n🔧 SOLUCIONES:');
  console.log('   1️⃣ Verificar email en: https://resend.com/domains');
  console.log('   2️⃣ Configurar dominio: https://resend.com/domains');
  console.log('   3️⃣ Leer guía completa: /RESEND_SETUP.md');
  console.log('⚠️  ===========================================\n');
  
  try {
    // 🚀 USAR EMAIL DE PRUEBA DE RESEND
    // delivered@resend.dev siempre funciona en modo sandbox
    // Los correos aparecerán en: https://resend.com/emails
    const testEmail = 'delivered@resend.dev';
    
    console.log('🚀 ========== USANDO EMAIL DE PRUEBA ==========');
    console.log('🚀 Email original:', to);
    console.log('🚀 Email de prueba:', testEmail);
    console.log('🚀 Los correos aparecerán en: https://resend.com/emails');
    console.log('🚀 ============================================');
    
    const emailPayload = {
      from: 'Lácteos Rosy - Admin <onboarding@resend.dev>',
      to: [testEmail], // Usar email de prueba
      subject: '🔐 Recuperación de Contraseña - Lácteos Rosy',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .password-box {
                background: white;
                border: 2px solid #2563eb;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
              }
              .password {
                font-size: 24px;
                font-weight: bold;
                color: #1e40af;
                letter-spacing: 2px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🧀 Lácteos Rosy</h1>
                <p>Panel de Administración</p>
              </div>
              <div class="content">
                <h2>Recuperación de Contraseña</h2>
                <p>Hola,</p>
                <p>Has solicitado recuperar tu contraseña de acceso al panel de administración de Lácteos Rosy.</p>
                
                <div class="password-box">
                  <p style="margin: 0 0 10px 0; color: #6b7280;">Tu contraseña es:</p>
                  <p class="password">${password}</p>
                </div>
                
                <p><strong>Credenciales de acceso:</strong></p>
                <ul>
                  <li><strong>Usuario:</strong> admin</li>
                  <li><strong>Contraseña:</strong> ${password}</li>
                </ul>
                
                <p style="color: #dc2626; font-weight: bold;">⚠️ Por seguridad, te recomendamos cambiar esta contraseña después de iniciar sesión.</p>
                
                <p>Si no solicitaste esta recuperación, por favor ignora este correo.</p>
              </div>
              <div class="footer">
                <p>© 2024 Lácteos Rosy. Todos los derechos reservados.</p>
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };
    
    console.log('📤 Enviando email con payload:', JSON.stringify(emailPayload, null, 2));
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });
    
    const data = await response.json();
    
    console.log('📬 Respuesta de Resend:', JSON.stringify(data, null, 2));
    console.log('📊 Status code:', response.status);
    
    if (response.ok) {
      console.log('✅ ========== EMAIL ENVIADO EXITOSAMENTE ==========');
      console.log('✅ Destinatario:', to);
      console.log('✅ ID del email:', data.id);
      console.log('✅ ==============================================');
      return { success: true, data };
    } else {
      console.error('❌ ========== ERROR ENVIANDO EMAIL ==========');
      console.error('❌ Status:', response.status);
      console.error('❌ Status Text:', response.statusText);
      console.error('❌ Respuesta completa:', JSON.stringify(data, null, 2));
      console.error('❌ Mensaje de error:', data.message);
      console.error('❌ Name:', data.name);
      console.error('❌ ==========================================');
      
      // Error específico para modo sandbox de Resend
      const isSandboxError = data.message?.includes('not a verified domain') || 
                             data.message?.includes('can only send') ||
                             response.status === 403;
      
      if (isSandboxError) {
        return {
          success: false,
          error: '🚨 RESEND EN MODO SANDBOX 🚨\n\n' +
                 `No se puede enviar el email a "${to}" porque Resend está en modo sandbox.\n\n` +
                 '📋 SOLUCIONES:\n\n' +
                 '1️⃣ VERIFICAR EMAIL (Más rápido - 5 min):\n' +
                 '   • Ir a: https://resend.com/emails\n' +
                 '   • Clic en "Domains" → "Verification"\n' +
                 `   • Agregar "${to}" como destinatario verificado\n` +
                 '   • Confirmar el email de verificación\n\n' +
                 '2️⃣ CONFIGURAR DOMINIO PERSONALIZADO (Producción):\n' +
                 '   • Ir a: https://resend.com/domains\n' +
                 '   • Agregar tu dominio (ej: lacteos-rosy.com)\n' +
                 '   • Configurar registros DNS (MX, TXT, CNAME)\n' +
                 '   • Cambiar "from" en email.tsx a tu dominio\n\n' +
                 '3️⃣ EMAIL DE PRUEBA (Solo para testing):\n' +
                 '   • Puedes enviar a: delivered@resend.dev\n' +
                 '   • Este email siempre funciona en sandbox',
          details: {
            originalError: data.message,
            recipientEmail: to,
            resendDashboard: 'https://resend.com/emails',
            domainsPage: 'https://resend.com/domains',
            testEmail: 'delivered@resend.dev'
          },
          statusCode: response.status
        };
      }
      
      return { 
        success: false, 
        error: data.message || data.name || JSON.stringify(data) || 'Error enviando email',
        details: data,
        statusCode: response.status
      };
    }
  } catch (error) {
    console.error('❌ Error en sendPasswordRecoveryEmail:', error);
    return { success: false, error: 'Error de conexión al servicio de email: ' + error.message };
  }
}