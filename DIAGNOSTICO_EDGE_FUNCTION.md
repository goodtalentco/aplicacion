# 🔍 Diagnóstico de Edge Function - send-daily-contracts-summary

## Error Actual
```
Access to fetch at 'https://irvgruylufihzoveycph.supabase.co/functions/v1/send-daily-contracts-summary' 
from origin 'https://aplicacion-frontend-43d83hsl0-grupogoods-projects.vercel.app' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## ✅ Checklist de Verificación

### 1. Verificar que la función está desplegada

**En Supabase Dashboard:**
1. Ve a **Edge Functions** (menú lateral izquierdo)
2. Busca `send-daily-contracts-summary` en la lista
3. Si NO está en la lista → **La función NO está desplegada**
4. Si SÍ está → Haz click en ella para ver detalles

### 2. Verificar logs de la función

**Si la función está desplegada:**
1. Click en `send-daily-contracts-summary`
2. Ve a la pestaña **"Logs"**
3. Intenta ejecutar el envío manual desde el frontend
4. Revisa los logs para ver errores

**Errores comunes en logs:**
- `Module not found` → Falta código o hay error de sintaxis
- `RESEND_API_KEY no configurada` → Falta variable de entorno
- `Error parsing JSON` → Problema con el código

### 3. Verificar variables de entorno

1. En la función `send-daily-contracts-summary`
2. Ve a **Settings** → **Secrets**
3. Verifica que existan:
   - ✅ `RESEND_API_KEY` (debe tener valor)
   - ✅ `RESEND_FROM_EMAIL` (opcional, pero recomendado)
   - ✅ `SUPABASE_URL` (debería estar automático)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` (debería estar automático)

### 4. Probar la función manualmente desde Supabase

**En Supabase Dashboard:**
1. Ve a la función `send-daily-contracts-summary`
2. Ve a la pestaña **"Invoke"** o **"Test"**
3. Selecciona método: **POST**
4. Body: `{}`
5. Click en **"Invoke"** o **"Run"**
6. Revisa la respuesta

**Si funciona aquí pero no desde el frontend:**
→ Problema de CORS o autenticación

**Si NO funciona aquí:**
→ Problema en el código de la función

### 5. Verificar código de la función

**Revisa que el código tenga:**
1. ✅ Manejo de OPTIONS para CORS (líneas 57-59)
2. ✅ Headers CORS correctos
3. ✅ No haya errores de sintaxis

---

## 🚨 Soluciones según el problema encontrado

### Problema: La función NO está desplegada

**Solución:**
1. Ve a **Edge Functions** → **Deploy a new function**
2. Selecciona **"Via Editor"**
3. Nombre: `send-daily-contracts-summary`
4. Copia TODO el código de `send-daily-contracts-summary-standalone.ts`
5. Pega en el editor
6. Click en **"Deploy"**
7. Espera a que termine el despliegue

### Problema: Error en los logs (ej: "Module not found")

**Solución:**
- El código puede tener un error de sintaxis
- Revisa que copiaste TODO el código completo
- Asegúrate de que no hay líneas faltantes

### Problema: "RESEND_API_KEY no configurada"

**Solución:**
1. Ve a la función → Settings → Secrets
2. Agrega `RESEND_API_KEY` con tu API key de Resend
3. Guarda

### Problema: La función funciona en "Test" pero no desde el frontend

**Solución:**
- Puede ser un problema de autenticación
- Verifica que estés logueado en el frontend
- Revisa que el token de sesión sea válido

---

## 📝 Información que necesito para ayudarte

Por favor comparte:
1. ✅ ¿La función `send-daily-contracts-summary` aparece en la lista de Edge Functions?
2. ✅ ¿Qué aparece en los logs de la función cuando intentas enviar?
3. ✅ ¿Qué pasa si pruebas la función desde el dashboard (botón Test/Invoke)?
4. ✅ ¿Tienes configuradas las variables de entorno (RESEND_API_KEY, etc.)?
