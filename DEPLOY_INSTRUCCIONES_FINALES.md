# 🚀 Instrucciones Finales para Deploy

## ❌ El Error

El error indica que todavía estás usando código con `import { corsHeaders } from '../_shared/cors.ts'`.

## ✅ Solución Correcta

**DEBES usar el archivo `send-daily-contracts-summary-standalone-v2.ts`**

Este archivo:
- ✅ NO tiene imports de `_shared`
- ✅ Tiene headers CORS inline
- ✅ Usa `createClient` de Supabase

## 📋 Pasos ExACTOS

1. **Abre el archivo `send-daily-contracts-summary-standalone-v2.ts`**

2. **Selecciona TODO el contenido:**
   - Presiona `Ctrl+A` (o `Cmd+A` en Mac)
   - Presiona `Ctrl+C` para copiar

3. **Ve a Supabase Dashboard:**
   - Edge Functions
   - Click en `send-daily-contracts-summary`
   - Click en **"Edit"** (icono de lápiz)

4. **Borra TODO el código actual en el editor**

5. **Pega el código nuevo:**
   - Presiona `Ctrl+V` (o `Cmd+V` en Mac)

6. **VERIFICA que en las primeras líneas NO hay:**
   ```typescript
   import { corsHeaders } from '../_shared/cors.ts'
   ```
   
   **SÍ debe tener:**
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     ...
   }
   ```

7. **Click en "Deploy" o "Save"**

## 🔍 Verificación Rápida

Las primeras 15 líneas del código deben verse así:

```typescript
/**
 * Edge Function para enviar resumen diario de contrataciones pendientes
 * GOOD Talent - 2025
 * VERSIÓN STANDALONE - Para copiar en el editor del Dashboard
 * Usa createClient de Supabase para acceso a la base de datos
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers CORS inline (no se pueden usar imports externos en el editor)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
```

**NO debe tener:**
```typescript
import { corsHeaders } from '../_shared/cors.ts'
```

## ⚠️ Si el Error Persiste

Si después de seguir estos pasos el error persiste:

1. **Borra la función completamente:**
   - Edge Functions → `send-daily-contracts-summary` → Settings → Delete

2. **Crea una nueva función:**
   - Edge Functions → "Create a new function"
   - Nombre: `send-daily-contracts-summary`
   - Copia y pega el código de `send-daily-contracts-summary-standalone-v2.ts`

3. **Deploy**
