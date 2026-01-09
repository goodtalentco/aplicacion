# ✅ Verificar y Ejecutar SQL para Permisos

## 📋 SQL a Ejecutar

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta esto:

```sql
-- Agregar permisos para service_role (necesario para Edge Functions)
GRANT SELECT, INSERT, UPDATE ON daily_contracts_summary_config TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_contracts_summary_config() TO service_role;
GRANT EXECUTE ON FUNCTION ensure_daily_contracts_summary_config() TO service_role;
```

## ✅ Verificar que se Ejecutó Correctamente

Después de ejecutar el SQL, verifica con esto:

```sql
-- Verificar permisos en la tabla
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'daily_contracts_summary_config'
ORDER BY grantee, privilege_type;
```

Deberías ver `service_role` con permisos `SELECT`, `INSERT`, `UPDATE`.

## 🔍 Si el Error Persiste Después del SQL

Si después de ejecutar el SQL el error persiste, puede ser un problema de RLS. En ese caso, también necesitamos verificar que `service_role` pueda bypass RLS (normalmente lo hace, pero verifiquemos).

Ejecuta esto también:

```sql
-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'daily_contracts_summary_config';
```

## 🎯 Pasos Completos

1. ✅ Ejecuta el SQL de GRANTs (arriba)
2. ✅ Verifica que los permisos se aplicaron (segunda query)
3. ✅ Actualiza el código de la función (ya tiene logs de debug)
4. ✅ Prueba de nuevo
