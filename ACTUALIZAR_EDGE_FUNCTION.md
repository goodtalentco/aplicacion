# ✅ Solución: Actualizar Edge Function

He actualizado el código para usar `createClient` de Supabase en lugar de `fetch` directo. Esto soluciona el error "Forbidden".

## 🔧 Cambios Realizados

El archivo `supabase/functions/send-daily-contracts-summary/index.ts` ahora:
- ✅ Usa `createClient` de Supabase para acceso a la base de datos
- ✅ Todas las consultas usan el cliente de Supabase en lugar de fetch
- ✅ Manejo de errores mejorado

## 📋 Pasos para Actualizar

**Opción 1: Usando CLI (Recomendado)**
```bash
cd supabase
supabase functions deploy send-daily-contracts-summary
```

**Opción 2: Usando Dashboard (Si no tienes CLI)**

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Click en `send-daily-contracts-summary`
3. Click en **"Edit"** o **"Update"**
4. Copia TODO el contenido de `supabase/functions/send-daily-contracts-summary/index.ts`
5. Pega en el editor
6. Click en **"Deploy"** o **"Save"**

**⚠️ IMPORTANTE:** 
- El código ahora usa `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- Esto requiere que el editor permita imports externos
- Si el editor del Dashboard no permite imports, deberás usar el CLI

## ✅ Verificar Variables de Entorno

Asegúrate de que estas variables estén configuradas en la función:
- `SUPABASE_URL` (automática, pero verifica)
- `SUPABASE_SERVICE_ROLE_KEY` (debe estar configurada)
- `RESEND_API_KEY` (debe estar configurada)
- `RESEND_FROM_EMAIL` (opcional pero recomendado)

## 🧪 Probar

Después de actualizar:
1. Intenta enviar manualmente desde el frontend
2. Revisa los logs de la función
3. Si funciona, deberías ver el email enviado
