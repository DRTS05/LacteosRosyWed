# 🥛 Lácteos Rosy - Sistema de Catálogo y Ventas

Sistema completo de catálogo y ventas para Lácteos Rosy, con gestión de productos, pedidos, clientes y panel de administración.

## 📋 Características

### 👥 Para Clientes
- ✅ Catálogo de productos por categorías (Quesos, Cuajadas, Lácteos)
- ✅ Carrito de compras con gestión de cantidades
- ✅ Sistema de registro con información de entrega
- ✅ Historial de pedidos
- ✅ Seguimiento de estado de pedidos en tiempo real
- ✅ Login con email/contraseña

### 🔐 Para Administradores
- ✅ Dashboard con métricas y notificaciones
- ✅ Gestión completa de productos (CRUD)
- ✅ Gestión de pedidos con actualización de estados
- ✅ Gestión de clientes
- ✅ Gestión de vehículos de reparto (Disponible/Mantenimiento)
- ✅ Control de inventario automático
- ✅ Sistema de autenticación seguro

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 16+ instalado
- Una cuenta de Supabase (ya configurada en `lvjuehqcyjpiqvqnlvxv`)
- Visual Studio Code (recomendado)

### Paso 1: Clonar/Descargar el Proyecto

Si descargaste el proyecto como ZIP, descomprime la carpeta. Si usas Git:

```bash
git clone [url-del-repositorio]
cd lacteos-rosy
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

1. Renombra el archivo `.env.example` a `.env`:
```bash
# En Windows
ren .env.example .env

# En Mac/Linux
mv .env.example .env
```

2. Edita `.env` y completa la SERVICE_ROLE_KEY:

```env
VITE_SUPABASE_URL=https://lvjuehqcyjpiqvqnlvxv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2anVlaHFjeWpwaXF2cW5sdnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTg3NjcsImV4cCI6MjA3NDM5NDc2N30.0h5izllIAUKpQc8RXZ5t3Fu2JmNtM2GCPW118JRNqgc
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**¿Dónde encontrar la SERVICE_ROLE_KEY?**
- Ve a: https://supabase.com/dashboard/project/lvjuehqcyjpiqvqnlvxv/settings/api
- Copia la clave `service_role` (secret)

### Paso 4: Estructura del Proyecto

El proyecto ya está organizado para VS Code. La estructura es:

\`\`\`
lacteos-rosy/
├── src/
│   ├── main.tsx                    # Punto de entrada
│   ├── App.tsx                     # App principal (página inicio)
│   ├── CustomerApp.tsx             # Módulo de clientes
│   ├── AdminApp.tsx                # Módulo de administración
│   ├── components/                 # Componentes React
│   │   ├── Header.tsx
│   │   ├── Cart.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── admin/                  # Componentes del admin
│   │   └── ui/                     # Componentes UI reutilizables
│   ├── utils/
│   │   └── supabase/               # Utilidades de Supabase
│   │       ├── api.tsx             # Llamadas a la API
│   │       ├── client.tsx          # Cliente de Supabase
│   │       └── info.tsx            # Configuración del proyecto
│   └── styles/
│       └── globals.css             # Estilos globales con Tailwind
├── supabase/
│   └── functions/
│       └── server/                 # Edge Functions (backend)
│           ├── index.tsx           # Servidor principal
│           ├── auth.tsx            # Autenticación
│           ├── email.tsx           # Emails
│           └── kv_store.tsx        # Base de datos (protegido)
├── package.json                    # Dependencias
├── vite.config.ts                  # Configuración de Vite
├── tsconfig.json                   # Configuración de TypeScript
└── index.html                      # HTML principal
\`\`\`

### Paso 5: Ejecutar en Desarrollo

\`\`\`bash
npm run dev
\`\`\`

Esto abrirá automáticamente el navegador en `http://localhost:5173`

## 🔐 Credenciales de Administrador

**Usuario:** \`admin\`  
**Contraseña:** \`admin123\`

⚠️ **IMPORTANTE:** Cambia estas credenciales en producción editando `/supabase/functions/server/auth.tsx`

## 📁 Archivos que NO debes Modificar

Estos archivos están protegidos por el sistema:
- ❌ `/supabase/functions/server/kv_store.tsx` (gestión de base de datos)
- ❌ `/components/figma/ImageWithFallback.tsx` (componente del sistema)
- ❌ `/utils/supabase/info.tsx` (configuración de Supabase)

## 🏗️ Build para Producción

\`\`\`bash
npm run build
\`\`\`

Esto generará una carpeta `dist/` lista para deployar.

## 🚀 Deployment

### Opción 1: Vercel (Recomendado)
1. Instala Vercel CLI: \`npm i -g vercel\`
2. Ejecuta: \`vercel\`
3. Agrega las variables de entorno en el dashboard de Vercel

### Opción 2: Netlify
1. Instala Netlify CLI: \`npm i -g netlify-cli\`
2. Ejecuta: \`netlify deploy\`
3. Agrega las variables de entorno en el dashboard de Netlify

### Importante para Deployment
El backend (Edge Functions) ya está deployado en Supabase y funcionando en:
- URL: \`https://ujfaznvuubprykfsazjc.supabase.co/functions/v1/make-server-960143c8\`

**No necesitas deployar el backend**, solo el frontend.

## 🔧 Comandos Disponibles

\`\`\`bash
npm run dev        # Iniciar servidor de desarrollo
npm run build      # Construir para producción
npm run preview    # Previsualizar build de producción
npm run lint       # Revisar código con ESLint
\`\`\`

## 🐛 Solución de Problemas

### Error: "Cannot find module"
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Error de Supabase Connection
- Verifica que las variables en \`.env.local\` sean correctas
- Verifica que el servidor de Supabase esté funcionando

### El admin no puede hacer login
- Usuario: \`admin\`
- Contraseña: \`admin123\`
- Verifica que no haya espacios adicionales

## 📚 Documentación Adicional

- [Guía de Exportación a VS Code](./GUIA_EXPORTACION_VS_CODE.md)
- [Guía de Configuración de Email](./README_EMAIL.md)
- [Setup de Resend](./RESEND_SETUP.md)
- [Checklist de Configuración](./CHECKLIST_CONFIGURACION.md)
- [Documentación del Index](./DOCUMENTACION_INDEX.md)

## 🔄 Funcionalidades Actuales

- ✅ Autenticación con email/contraseña
- ✅ Sistema de vehículos simplificado (Disponible/Mantenimiento)
- ✅ Validación de vehículos en mantenimiento
- ✅ Control completo de stock
- ✅ Notificaciones en tiempo real

## 💡 Tecnologías Utilizadas

- **Frontend:** React 18, TypeScript, Tailwind CSS v4
- **Backend:** Supabase Edge Functions (Deno + Hono)
- **Base de Datos:** Supabase Postgres
- **Autenticación:** Supabase Auth + JWT custom
- **Email:** Resend
- **UI Components:** Radix UI + shadcn/ui
- **Icons:** Lucide React
- **Build:** Vite

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa la documentación en `/guidelines/Guidelines.md`
2. Verifica los logs del servidor en el dashboard de Supabase
3. Contacta al desarrollador

---

**© 2024 Lácteos Rosy. Todos los derechos reservados.**