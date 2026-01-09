# 🔧 Pasos Finales para Solucionar "Permission Denied"

## ✅ Lo que Hemos Hecho

1. ✅ Código actualizado con `createClient` de Supabase
2. ✅ Logs de debug agregados
3. ✅ Variables en Secrets (aunque no se pueden modificar)

## 🔍 El Problema

El error "permission denied" puede ser porque `service_role` no tiene permisos explícitos en la tabla.

## 📋 Solución: Agregar Permisos a service_role

### Paso 1: Ejecutar SQL

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia y pega este SQL:

```sql
-- Agregar permisos para service_role
GRANT SELECT, INSERT, UPDATE ON daily_contracts_summary_config TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_contracts_summary_config() TO service_role;
GRANT EXECUTE ON FUNCTION ensure_daily_contracts_summary_config() TO service_role;
```

3. Click en **"Run"**

### Paso 2: Actualizar el Código con Logs de Debug

1. Abre `send-daily-contracts-summary-standalone-v2.ts`
2. Copia TODO el contenido (ya tiene los logs de debug)
3. Ve a **Edge Functions** → `send-daily-contracts-summary` → **Edit**
4. Pega el código actualizado
5. **Deploy**

### Paso 3: Probar y Revisar Logs

1. Intenta enviar manualmente desde el frontend
2. Ve a **Logs** de la función
3. Deberías ver:
   ```
   🔐 Variables de entorno: {
     supabaseUrl: "https://xxxxx.supabase.co...",
     supabaseServiceKey: "eyJhbGciOiJIUzI1NiIs...",
     resendApiKey: "re_xxxxx..."
   }
   ```

### Paso 4: Si el Error Persiste

Si después de ejecutar el SQL y actualizar el código, el error persiste:

1. **Comparte los logs** para ver qué valores tienen las variables
2. Verifica que el SQL se ejecutó correctamente
3. Puede ser necesario verificar que las variables estén realmente disponibles

## 🎯 Resultado Esperado

Después de estos pasos, la función debería:
- ✅ Leer las variables correctamente
- ✅ Acceder a la tabla sin problemas
- ✅ Enviar el email exitosamente
