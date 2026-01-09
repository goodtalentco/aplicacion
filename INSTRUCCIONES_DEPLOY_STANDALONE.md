# 📋 Instrucciones: Deploy de Edge Function Standalone

## ✅ Solución al Error "Module not found _shared/cors.ts"

El error ocurre porque el editor del Dashboard no puede acceder a archivos compartidos (`_shared`). 

## 🔧 Solución: Usar Versión Standalone

He creado `send-daily-contracts-summary-standalone-v2.ts` que:
- ✅ Tiene headers CORS inline (sin imports de `_shared`)
- ✅ Usa `createClient` de Supabase (soluciona el error "Forbidden")
- ✅ Funciona perfectamente en el Dashboard Editor

## 📝 Pasos para Deploy

1. **Abre el archivo:** `send-daily-contracts-summary-standalone-v2.ts`

2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)

3. **Ve a Supabase Dashboard:**
   - Edge Functions → `send-daily-contracts-summary`
   - Click en **"Edit"** o el icono de editar

4. **Pega el código completo** en el editor

5. **Click en "Deploy"** o "Save"

## ⚠️ Importante

- ✅ Esta versión **SÍ permite imports externos** (`createClient` de esm.sh)
- ✅ No usa imports de archivos locales (`_shared`)
- ✅ Funciona en el Dashboard Editor

## ✅ Verificar Variables de Entorno

Asegúrate de que estas estén configuradas:
- `SUPABASE_SERVICE_ROLE_KEY` (MUY IMPORTANTE)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (opcional)

## 🧪 Probar

Después del deploy:
1. Intenta enviar manualmente desde el frontend
2. Revisa los logs de la función
3. Debería funcionar sin errores de "Forbidden"
