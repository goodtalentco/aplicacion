-- Agregar permisos para service_role en contracts y companies
-- Ejecuta este SQL en el SQL Editor de Supabase

-- 1. GRANTs para contracts
GRANT SELECT ON contracts TO service_role;

-- 2. GRANTs para companies  
GRANT SELECT ON companies TO service_role;

-- 3. Política RLS para contracts (bypass completo para service_role)
DROP POLICY IF EXISTS "service_role_all_access" ON contracts;
CREATE POLICY "service_role_all_access" ON contracts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Política RLS para companies (bypass completo para service_role)
DROP POLICY IF EXISTS "service_role_all_access" ON companies;
CREATE POLICY "service_role_all_access" ON companies
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Verificar permisos
SELECT 
  grantee, 
  table_name,
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('contracts', 'companies')
  AND grantee = 'service_role'
ORDER BY table_name, privilege_type;
