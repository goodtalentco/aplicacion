# 🔧 Solución: Error "Edge Function returned a non-2xx status code"

## ✅ Buena Noticia
La función **SÍ está desplegada** y respondiendo. El error significa que la función está ejecutándose pero falla en algún punto.

## 🔍 Paso 1: Revisar los Logs (MUY IMPORTANTE)

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Click en `send-daily-contracts-summary`
3. Ve a la pestaña **"Logs"**
4. Busca las líneas más recientes (las últimas ejecuciones)
5. **Copia y comparte** los logs que aparecen cuando intentas ejecutar la función

Los logs te dirán EXACTAMENTE qué está fallando, por ejemplo:
- `RESEND_API_KEY no configurada`
- `Error obteniendo configuración: ...`
- `Error obteniendo contratos: ...`
- etc.

## 🚨 Errores Comunes y Soluciones

### Error 1: "RESEND_API_KEY no configurada"
**Solución:**
1. Ve a la función → Settings → Secrets
2. Agrega `RESEND_API_KEY` con tu API key de Resend
3. Guarda

### Error 2: "No se encontró configuración"
**Solución:**
Ejecuta este SQL en el SQL Editor:
```sql
SELECT ensure_daily_contracts_summary_config();
```

### Error 3: "Error obteniendo configuración: 403" o similar
**Solución:**
- Puede ser un problema de permisos
- Verifica que la tabla `daily_contracts_summary_config` existe
- Verifica que ejecutaste los GRANTs

### Error 4: "Error obteniendo contratos: ..."
**Solución:**
- Puede ser un problema con la query
- Verifica que la tabla `contracts` existe y tiene datos
- Los logs mostrarán el error específico

---

## 📋 Acción Inmediata

**Por favor, comparte los logs de la función** para que pueda ayudarte a identificar el error exacto.

Los logs aparecen en:
- Supabase Dashboard → Edge Functions → `send-daily-contracts-summary` → Logs
