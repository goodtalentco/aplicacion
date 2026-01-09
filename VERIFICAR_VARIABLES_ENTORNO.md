# 🔍 Verificar Variables de Entorno

El error "permission denied for table" significa que `SUPABASE_SERVICE_ROLE_KEY` no está configurada o no es válida.

## ✅ Pasos para Verificar y Configurar

### 1. Verificar Variables de Entorno en Supabase

1. Ve a **Supabase Dashboard**
2. **Edge Functions** → `send-daily-contracts-summary`
3. Ve a la pestaña **"Settings"** o **"Secrets"**
4. Busca estas variables:

   **REQUERIDAS:**
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` - DEBE estar configurada
   - ✅ `RESEND_API_KEY` - DEBE estar configurada
   
   **OPCIONALES:**
   - `RESEND_FROM_EMAIL` - Recomendado pero opcional

### 2. Obtener SUPABASE_SERVICE_ROLE_KEY

Si NO está configurada:

1. Ve a **Supabase Dashboard** → **Settings** → **API**
2. Busca la sección **"Project API keys"**
3. Encuentra **"service_role"** key (NO uses la "anon" key)
4. Copia esa clave completa
5. Ve a la función → Settings → Secrets
6. Agrega nueva variable:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (pega la clave que copiaste)
7. Guarda

### 3. Verificar RESEND_API_KEY

1. Ve a tu cuenta de Resend (https://resend.com)
2. Ve a API Keys
3. Copia tu API key
4. En Supabase, agrega la variable `RESEND_API_KEY`
5. Guarda

### 4. Verificar que las Variables Estén Configuradas

Las variables deben verse así en el Dashboard:

```
SUPABASE_SERVICE_ROLE_KEY    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (muy larga)
RESEND_API_KEY               re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL            noreply@goodtalent.com (opcional)
```

### 5. Probar de Nuevo

Después de configurar las variables:
1. Intenta enviar manualmente desde el frontend
2. Revisa los logs
3. Debería funcionar ahora
