-- Agregar permisos para service_role en daily_contracts_summary_config
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Grants para service_role (necesario para Edge Functions)
GRANT SELECT, INSERT, UPDATE ON daily_contracts_summary_config TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_contracts_summary_config() TO service_role;
GRANT EXECUTE ON FUNCTION ensure_daily_contracts_summary_config() TO service_role;
