# 📧 Guía de Configuración de Resend para Lácteos Rosy

## 🚨 Problema Actual

Resend está en **modo sandbox**, lo que significa que solo puede enviar emails a:
- ✅ Direcciones de email verificadas en tu cuenta
- ✅ `delivered@resend.dev` (email de prueba)

**Email del administrador:** `danilotellez733@gmail.com`

---

## ✅ Solución 1: Verificar Email (Más Rápido - 5 minutos)

Esta es la solución más rápida para empezar a probar el sistema.

### Pasos:

1. **Ir al Dashboard de Resend:**
   ```
   https://resend.com/emails
   ```

2. **Navegar a "Domains":**
   - En el menú lateral, busca la opción **"Domains"**
   - Luego ve a la sección **"Verification"** o **"Verified emails"**

3. **Agregar email del administrador:**
   - Haz clic en **"Add email"** o **"Verify email"**
   - Ingresa: `danilotellez733@gmail.com`
   - Haz clic en **"Send verification email"**

4. **Confirmar verificación:**
   - Revisa tu bandeja de entrada de `danilotellez733@gmail.com`
   - Busca un email de **Resend** con el asunto similar a "Verify your email"
   - Haz clic en el enlace de verificación

5. **¡Listo!** 🎉
   - Ahora el sistema de recuperación de contraseña debería funcionar
   - Prueba solicitando una recuperación de contraseña desde el panel de admin

---

## 🚀 Solución 2: Configurar Dominio Personalizado (Producción)

Para usar el sistema en producción y poder enviar emails a cualquier dirección, necesitas configurar tu propio dominio.

### Requisitos:
- ✅ Un dominio propio (ej: `lacteos-rosy.com`, `lacteos-rosy.com.ni`)
- ✅ Acceso al panel de administración DNS del dominio

### Pasos:

#### 1. Agregar dominio en Resend

```
https://resend.com/domains
```

- Haz clic en **"Add Domain"**
- Ingresa tu dominio (ej: `lacteos-rosy.com`)
- Haz clic en **"Add"**

#### 2. Configurar registros DNS

Resend te proporcionará registros DNS que debes agregar. Estos serán similares a:

**Registros MX** (para recibir respuestas de bounce):
```
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com
```

**Registro TXT** (para SPF):
```
Name: @
Value: v=spf1 include:amazonses.com ~all
```

**Registro CNAME** (para DKIM):
```
Name: resend._domainkey
Value: resend._domainkey.resend.com
```

**Registros exactos:** Los valores reales los verás en tu dashboard de Resend.

#### 3. Agregar registros en tu proveedor DNS

Dependiendo de dónde tengas tu dominio:

**GoDaddy:**
1. Ir a "My Products"
2. Seleccionar tu dominio
3. Ir a "DNS Management"
4. Agregar los registros proporcionados por Resend

**Namecheap:**
1. Ir a "Domain List"
2. Clic en "Manage" junto a tu dominio
3. Ir a "Advanced DNS"
4. Agregar los registros

**Cloudflare:**
1. Seleccionar tu dominio
2. Ir a "DNS" → "Records"
3. Agregar los registros

**Otros proveedores:** Busca la sección "DNS Settings" o "DNS Management"

#### 4. Verificar configuración

- Espera 5-10 minutos para que los cambios DNS se propaguen
- En Resend Dashboard, verás el estado de verificación
- Cuando veas ✅ verde junto a tu dominio, estará listo

#### 5. Actualizar código del servidor

Una vez verificado el dominio, actualiza el archivo `/supabase/functions/server/email.tsx`:

```typescript
// Cambiar esta línea:
from: 'Lácteos Rosy - Admin <onboarding@resend.dev>',

// Por:
from: 'Lácteos Rosy - Admin <admin@lacteos-rosy.com>',
// O el email que prefieras de tu dominio verificado
```

#### 6. ¡Listo para producción! 🎉

Ahora puedes enviar emails a cualquier dirección sin restricciones.

---

## 🧪 Solución 3: Email de Prueba (Solo para Testing)

Si solo quieres probar que el sistema de emails funciona sin configurar nada:

### Email de prueba de Resend:
```
delivered@resend.dev
```

Este email **siempre funciona** en modo sandbox y puedes ver los correos enviados en:
```
https://resend.com/emails
```

**⚠️ Limitación:** Este email es solo para pruebas. No podrás recibir emails reales en tu bandeja.

---

## 📊 Comparación de Soluciones

| Solución | Tiempo | Complejidad | Uso Recomendado |
|----------|--------|-------------|-----------------|
| **1. Verificar Email** | 5 min | ⭐ Fácil | Desarrollo y pruebas |
| **2. Dominio Personalizado** | 30-60 min | ⭐⭐⭐ Media | Producción |
| **3. Email de Prueba** | 0 min | ⭐ Muy fácil | Testing técnico |

---

## 🔍 Verificar que Funciona

Una vez implementada cualquiera de las soluciones:

1. **Ir al panel de admin:**
   ```
   http://localhost:5173/admin  (o tu URL de producción)
   ```

2. **Clic en "¿Olvidó su contraseña?"**

3. **Confirmar envío del email**

4. **Verificar:**
   - ✅ No aparece error de sandbox
   - ✅ Se muestra mensaje de éxito
   - ✅ El email llega a la bandeja de entrada

---

## 🆘 Solución de Problemas

### Error: "not a verified domain"
**Causa:** El email no está verificado en Resend  
**Solución:** Seguir "Solución 1: Verificar Email"

### Error: "can only send to verified recipients"
**Causa:** Estás en modo sandbox  
**Solución:** Verificar el email o configurar dominio personalizado

### Email no llega a la bandeja
**Posibles causas:**
1. ✅ Revisar carpeta de Spam/Correo no deseado
2. ✅ Verificar que el email esté confirmado en Resend
3. ✅ Ver logs del servidor (consola del navegador → Network → Ver respuesta)
4. ✅ Revisar Resend Dashboard para ver si el email fue enviado

### DNS no se verifica
**Solución:**
1. Esperar 10-15 minutos (propagación DNS)
2. Usar herramientas de verificación DNS:
   - https://mxtoolbox.com/
   - https://www.whatsmydns.net/
3. Verificar que los registros estén exactamente como los proporcionó Resend

---

## 📞 Contacto y Soporte

**Dashboard de Resend:**  
https://resend.com/emails

**Documentación de Resend:**  
https://resend.com/docs/introduction

**Verificar DNS:**  
https://mxtoolbox.com/

---

## ⚡ Recomendación Final

Para **desarrollo/pruebas inmediatas:**
→ Usa **Solución 1** (Verificar email) - Toma solo 5 minutos

Para **producción:**
→ Implementa **Solución 2** (Dominio personalizado) - La más profesional y escalable

---

**✨ Última actualización:** 29 de noviembre, 2024  
**🔐 Sistema:** Recuperación de contraseña ultra-segura para Lácteos Rosy
