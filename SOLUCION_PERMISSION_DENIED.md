# 🔧 Solución: Permission Denied para Table

## ❌ Problema Actual

El error "permission denied for table daily_contracts_summary_config" persiste aunque las variables `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` están en Secrets pero no se pueden modificar.

## ✅ Solución

He actualizado el código para:
1. Agregar logs de debug para ver qué variables están disponibles
2. Intentar usar `SUPABASE_URL_INTERNAL` como fallback
3. Mejorar mensajes de error

## 📋 Pasos

1. **Abre el archivo `send-daily-contracts-summary-standalone-v2.ts`**

2. **Copia TODO el contenido actualizado** (tiene logs de debug)

3. **Pega en Supabase Dashboard:**
   - Edge Functions → `send-daily-contracts-summary` → Edit
   - Borra todo el código anterior
   - Pega el nuevo código
   - Deploy

4. **Ejecuta la función manualmente** desde el frontend

5. **Revisa los logs** - deberías ver algo como:
   ```
   🔐 Variables de entorno: {
     supabaseUrl: "https://xxxxx.supabase.co...",
     supabaseServiceKey: "eyJhbGciOiJIUzI1NiIs...",
     resendApiKey: "re_xxxxx..."
   }
   ```

6. **Comparte los logs** para ver qué variables están disponibles

## 🔍 Si las Variables NO Aparecen en los Logs

Si los logs muestran "NO CONFIGURADA" para alguna variable:

1. Las variables en Secrets pueden estar a nivel de proyecto pero no disponibles para la función
2. Puede ser necesario agregarlas específicamente en la función
3. O puede ser un problema de cómo Supabase maneja las variables del sistema

## 💡 Alternativa: Verificar en SQL Editor

Mientras tanto, verifica que la tabla y permisos estén correctos:

```sql
-- Verificar que la tabla existe
SELECT * FROM daily_contracts_summary_config LIMIT 1;

-- Verificar permisos (si tienes acceso)
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'daily_contracts_summary_config';
```
