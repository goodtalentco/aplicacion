-- ===============================================
-- MIGRACIÓN: Configuración de Resúmenes Diarios de Contrataciones
-- Fecha: 2025-01-22
-- Descripción: Sistema de configuración para resúmenes diarios por email de contrataciones pendientes
-- ===============================================

-- ===============================================
-- 1. TABLA DAILY_CONTRACTS_SUMMARY_CONFIG
-- ===============================================

CREATE TABLE IF NOT EXISTS daily_contracts_summary_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuración de emails destinatarios (JSON array de emails)
  recipient_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Configuración de horario (formato HH:MM en hora Colombia)
  send_time TEXT NOT NULL DEFAULT '08:00',
  
  -- Días de la semana para envío (JSON array: [1,2,3,4,5] = lunes a viernes)
  -- 0 = Domingo, 1 = Lunes, 2 = Martes, ..., 6 = Sábado
  send_days_of_week JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  
  -- Activar/desactivar envío automático
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Último envío exitoso
  last_sent_at TIMESTAMPTZ,
  
  -- Última ejecución (exitosa o fallida)
  last_executed_at TIMESTAMPTZ,
  
  -- Último error (si hubo)
  last_error TEXT,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Restricciones
  CONSTRAINT check_send_time_format CHECK (send_time ~* '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT check_recipient_emails_array CHECK (jsonb_typeof(recipient_emails) = 'array'),
  CONSTRAINT check_send_days_array CHECK (jsonb_typeof(send_days_of_week) = 'array'),
  CONSTRAINT check_recipient_emails_not_empty CHECK (jsonb_array_length(recipient_emails) > 0 OR is_enabled = false),
  CONSTRAINT check_send_days_not_empty CHECK (jsonb_array_length(send_days_of_week) > 0 OR is_enabled = false)
);

-- Índice único para asegurar que solo hay una configuración
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_contracts_summary_config_single ON daily_contracts_summary_config ((1));

-- Comentarios
COMMENT ON TABLE daily_contracts_summary_config IS 'Configuración para resúmenes diarios de contrataciones pendientes';
COMMENT ON COLUMN daily_contracts_summary_config.recipient_emails IS 'Array JSON de emails destinatarios: ["email1@example.com", "email2@example.com"]';
COMMENT ON COLUMN daily_contracts_summary_config.send_time IS 'Hora de envío en formato HH:MM (hora Colombia): "08:00"';
COMMENT ON COLUMN daily_contracts_summary_config.send_days_of_week IS 'Array JSON de días: [1,2,3,4,5] = lunes a viernes (0=domingo, 6=sábado)';
COMMENT ON COLUMN daily_contracts_summary_config.is_enabled IS 'Si el envío automático está activado';
COMMENT ON COLUMN daily_contracts_summary_config.last_sent_at IS 'Último envío exitoso';
COMMENT ON COLUMN daily_contracts_summary_config.last_executed_at IS 'Última ejecución (exitosa o fallida)';
COMMENT ON COLUMN daily_contracts_summary_config.last_error IS 'Último error si hubo fallo';

-- ===============================================
-- 2. TRIGGER PARA UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_daily_contracts_summary_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_contracts_summary_config_updated_at ON daily_contracts_summary_config;
CREATE TRIGGER trigger_daily_contracts_summary_config_updated_at
  BEFORE UPDATE ON daily_contracts_summary_config
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_contracts_summary_config_updated_at();

-- ===============================================
-- 3. FUNCIÓN HELPER PARA OBTENER/ACTUALIZAR CONFIGURACIÓN
-- ===============================================

-- Función para obtener la configuración (siempre hay una sola)
CREATE OR REPLACE FUNCTION get_daily_contracts_summary_config()
RETURNS daily_contracts_summary_config AS $$
  SELECT * FROM daily_contracts_summary_config LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Función para crear configuración inicial si no existe
CREATE OR REPLACE FUNCTION ensure_daily_contracts_summary_config()
RETURNS daily_contracts_summary_config AS $$
DECLARE
  config daily_contracts_summary_config;
BEGIN
  -- Intentar obtener configuración existente
  SELECT * INTO config FROM daily_contracts_summary_config LIMIT 1;
  
  -- Si no existe, crear una por defecto
  IF NOT FOUND THEN
    INSERT INTO daily_contracts_summary_config (
      recipient_emails,
      send_time,
      send_days_of_week,
      is_enabled
    ) VALUES (
      '[]'::jsonb,
      '08:00',
      '[1,2,3,4,5]'::jsonb,
      false
    ) RETURNING * INTO config;
  END IF;
  
  RETURN config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 4. GRANTS PARA ROL AUTHENTICATED
-- ===============================================

-- Grants para la tabla
GRANT SELECT, INSERT, UPDATE ON daily_contracts_summary_config TO authenticated;

-- Grants para las funciones
GRANT EXECUTE ON FUNCTION get_daily_contracts_summary_config() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_daily_contracts_summary_config() TO authenticated;

-- ===============================================
-- 5. RLS (Row Level Security)
-- ===============================================

ALTER TABLE daily_contracts_summary_config ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios con permiso de gestión pueden ver/editar
CREATE POLICY "view_daily_contracts_summary_config" ON daily_contracts_summary_config
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'view') 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "update_daily_contracts_summary_config" ON daily_contracts_summary_config
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'edit') 
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'edit') 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "insert_daily_contracts_summary_config" ON daily_contracts_summary_config
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'create') 
    OR is_super_admin(auth.uid())
  );

-- ===============================================
-- 6. INICIALIZAR CONFIGURACIÓN POR DEFECTO (si no existe)
-- ===============================================

-- Ejecutar función para crear configuración inicial
SELECT ensure_daily_contracts_summary_config();
