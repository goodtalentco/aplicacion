-- Solución completa para permisos de service_role en daily_contracts_summary_config
-- Ejecuta TODO este SQL en el SQL Editor de Supabase

-- 1. Agregar GRANTs para service_role
GRANT SELECT, INSERT, UPDATE ON daily_contracts_summary_config TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_contracts_summary_config() TO service_role;
GRANT EXECUTE ON FUNCTION ensure_daily_contracts_summary_config() TO service_role;

-- 2. Agregar política RLS para service_role (bypass completo)
-- Esto es necesario porque RLS está habilitado en la tabla
-- Primero eliminar si existe (para evitar errores si ya existe)
DROP POLICY IF EXISTS "service_role_all_access" ON daily_contracts_summary_config;

CREATE POLICY "service_role_all_access" ON daily_contracts_summary_config
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Verificar que se aplicó correctamente
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'daily_contracts_summary_config'
  AND grantee = 'service_role'
ORDER BY privilege_type;
