-- Solución completa: Permisos para service_role en todas las tablas necesarias
-- Ejecuta TODO este SQL en el SQL Editor de Supabase

-- ================================================
-- 1. daily_contracts_summary_config
-- ================================================
GRANT SELECT, INSERT, UPDATE ON daily_contracts_summary_config TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_contracts_summary_config() TO service_role;
GRANT EXECUTE ON FUNCTION ensure_daily_contracts_summary_config() TO service_role;

DROP POLICY IF EXISTS "service_role_all_access" ON daily_contracts_summary_config;
CREATE POLICY "service_role_all_access" ON daily_contracts_summary_config
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 2. contracts
-- ================================================
GRANT SELECT ON contracts TO service_role;

DROP POLICY IF EXISTS "service_role_all_access" ON contracts;
CREATE POLICY "service_role_all_access" ON contracts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 3. companies
-- ================================================
GRANT SELECT ON companies TO service_role;

DROP POLICY IF EXISTS "service_role_all_access" ON companies;
CREATE POLICY "service_role_all_access" ON companies
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 4. Verificar permisos
-- ================================================
SELECT 
  grantee, 
  table_name,
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('daily_contracts_summary_config', 'contracts', 'companies')
  AND grantee = 'service_role'
ORDER BY table_name, privilege_type;
