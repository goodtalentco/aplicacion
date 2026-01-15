-- ===============================================
-- MIGRACIÓN: Configuración de Notificaciones de Vencimiento de Contratos
-- Fecha: 2025-01-22
-- Descripción: Sistema de configuración para notificar vencimientos de contratos por email
-- ===============================================

-- ===============================================
-- 1. TABLA CONTRACT_EXPIRATION_NOTIFICATIONS_CONFIG
-- ===============================================

CREATE TABLE IF NOT EXISTS contract_expiration_notifications_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuración de emails destinatarios (JSON array de emails)
  recipient_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Días antes del vencimiento para notificar (JSON array: [14, 7, 3] = notificar a 14, 7 y 3 días)
  days_before_expiration JSONB NOT NULL DEFAULT '[14]'::jsonb,
  
  -- Configuración de horario (formato HH:MM en hora Colombia)
  send_time TEXT NOT NULL DEFAULT '08:00',
  
  -- Días de la semana para envío (JSON array: [1,2,3,4,5] = lunes a viernes)
  -- 0 = Domingo, 1 = Lunes, 2 = Martes, ..., 6 = Sábado
  send_days_of_week JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  
  -- Activar/desactivar envío automático
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  
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
  CONSTRAINT check_days_before_array CHECK (jsonb_typeof(days_before_expiration) = 'array'),
  CONSTRAINT check_send_days_array CHECK (jsonb_typeof(send_days_of_week) = 'array'),
  CONSTRAINT check_recipient_emails_not_empty CHECK (jsonb_array_length(recipient_emails) > 0 OR is_enabled = false),
  CONSTRAINT check_days_before_not_empty CHECK (jsonb_array_length(days_before_expiration) > 0 OR is_enabled = false),
  CONSTRAINT check_send_days_not_empty CHECK (jsonb_array_length(send_days_of_week) > 0 OR is_enabled = false),
  CONSTRAINT check_days_before_valid CHECK (
    -- Todos los valores deben ser números positivos entre 1 y 60
    (SELECT bool_and(
      (value::text)::integer >= 1 AND (value::text)::integer <= 60
    ) FROM jsonb_array_elements(days_before_expiration))
  )
);

-- Índice único para asegurar que solo hay una configuración
CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_expiration_notifications_config_single ON contract_expiration_notifications_config ((1));

-- Comentarios
COMMENT ON TABLE contract_expiration_notifications_config IS 'Configuración para notificaciones de vencimiento de contratos';
COMMENT ON COLUMN contract_expiration_notifications_config.recipient_emails IS 'Array JSON de emails destinatarios: ["email1@example.com", "email2@example.com"]';
COMMENT ON COLUMN contract_expiration_notifications_config.days_before_expiration IS 'Array JSON de días antes del vencimiento para notificar: [14, 7, 3] = notificar a 14, 7 y 3 días antes';
COMMENT ON COLUMN contract_expiration_notifications_config.send_time IS 'Hora de envío en formato HH:MM (hora Colombia): "08:00"';
COMMENT ON COLUMN contract_expiration_notifications_config.send_days_of_week IS 'Array JSON de días: [1,2,3,4,5] = lunes a viernes (0=domingo, 6=sábado)';
COMMENT ON COLUMN contract_expiration_notifications_config.is_enabled IS 'Si el envío automático está activado';
COMMENT ON COLUMN contract_expiration_notifications_config.last_sent_at IS 'Último envío exitoso';
COMMENT ON COLUMN contract_expiration_notifications_config.last_executed_at IS 'Última ejecución (exitosa o fallida)';
COMMENT ON COLUMN contract_expiration_notifications_config.last_error IS 'Último error si hubo fallo';

-- ===============================================
-- 2. TABLA CONTRACT_EXPIRATION_NOTIFICATIONS (Historial de notificaciones enviadas)
-- ===============================================

CREATE TABLE IF NOT EXISTS contract_expiration_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contrato relacionado
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Días antes del vencimiento cuando se notificó
  days_before_expiration INTEGER NOT NULL,
  
  -- Fecha de vencimiento del contrato
  expiration_date DATE NOT NULL,
  
  -- Fecha en que se envió la notificación
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Email al que se envió
  recipient_email TEXT NOT NULL,
  
  -- Si la notificación fue leída en la app (para notificaciones in-app)
  is_read BOOLEAN DEFAULT false,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT check_days_before_valid_range CHECK (days_before_expiration >= 1 AND days_before_expiration <= 60)
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_contract_expiration_notifications_contract_id ON contract_expiration_notifications(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_expiration_notifications_expiration_date ON contract_expiration_notifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_contract_expiration_notifications_sent_at ON contract_expiration_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_contract_expiration_notifications_is_read ON contract_expiration_notifications(is_read) WHERE is_read = false;

-- Comentarios
COMMENT ON TABLE contract_expiration_notifications IS 'Historial de notificaciones de vencimiento de contratos enviadas';
COMMENT ON COLUMN contract_expiration_notifications.days_before_expiration IS 'Días antes del vencimiento cuando se envió la notificación';
COMMENT ON COLUMN contract_expiration_notifications.is_read IS 'Si la notificación fue leída en la aplicación';

-- ===============================================
-- 3. TRIGGER PARA UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_contract_expiration_notifications_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contract_expiration_notifications_config_updated_at ON contract_expiration_notifications_config;
CREATE TRIGGER trigger_contract_expiration_notifications_config_updated_at
  BEFORE UPDATE ON contract_expiration_notifications_config
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_expiration_notifications_config_updated_at();

-- ===============================================
-- 4. FUNCIÓN HELPER PARA OBTENER/ACTUALIZAR CONFIGURACIÓN
-- ===============================================

-- Función para obtener la configuración (siempre hay una sola)
CREATE OR REPLACE FUNCTION get_contract_expiration_notifications_config()
RETURNS contract_expiration_notifications_config AS $$
  SELECT * FROM contract_expiration_notifications_config LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Función para crear configuración inicial si no existe
CREATE OR REPLACE FUNCTION ensure_contract_expiration_notifications_config()
RETURNS contract_expiration_notifications_config AS $$
DECLARE
  config contract_expiration_notifications_config;
BEGIN
  -- Intentar obtener configuración existente
  SELECT * INTO config FROM contract_expiration_notifications_config LIMIT 1;
  
  -- Si no existe, crear una por defecto
  IF NOT FOUND THEN
    INSERT INTO contract_expiration_notifications_config (
      recipient_emails,
      days_before_expiration,
      send_time,
      send_days_of_week,
      is_enabled
    ) VALUES (
      '[]'::jsonb,
      '[14]'::jsonb,
      '08:00',
      '[1,2,3,4,5]'::jsonb,
      false
    ) RETURNING * INTO config;
  END IF;
  
  RETURN config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 5. GRANTS PARA ROL AUTHENTICATED
-- ===============================================

-- Grants para las tablas
GRANT SELECT, INSERT, UPDATE ON contract_expiration_notifications_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON contract_expiration_notifications TO authenticated;

-- Grants para las funciones
GRANT EXECUTE ON FUNCTION get_contract_expiration_notifications_config() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_contract_expiration_notifications_config() TO authenticated;

-- ===============================================
-- 6. RLS (Row Level Security)
-- ===============================================

ALTER TABLE contract_expiration_notifications_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_expiration_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para contract_expiration_notifications_config
CREATE POLICY "view_contract_expiration_notifications_config" ON contract_expiration_notifications_config
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'view') 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "update_contract_expiration_notifications_config" ON contract_expiration_notifications_config
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'edit') 
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'edit') 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "insert_contract_expiration_notifications_config" ON contract_expiration_notifications_config
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'create') 
    OR is_super_admin(auth.uid())
  );

-- Políticas para contract_expiration_notifications
-- Los usuarios pueden ver sus propias notificaciones o todas si tienen permisos
CREATE POLICY "view_contract_expiration_notifications" ON contract_expiration_notifications
  FOR SELECT TO authenticated
  USING (
    recipient_email = COALESCE((SELECT notification_email FROM user_profiles WHERE user_id = auth.uid()), '')
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR has_permission(auth.uid(), 'contracts', 'view')
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "insert_contract_expiration_notifications" ON contract_expiration_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'contracts', 'view')
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "update_contract_expiration_notifications" ON contract_expiration_notifications
  FOR UPDATE TO authenticated
  USING (
    recipient_email = COALESCE((SELECT notification_email FROM user_profiles WHERE user_id = auth.uid()), '')
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR has_permission(auth.uid(), 'contracts', 'view')
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    recipient_email = COALESCE((SELECT notification_email FROM user_profiles WHERE user_id = auth.uid()), '')
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR has_permission(auth.uid(), 'contracts', 'view')
    OR is_super_admin(auth.uid())
  );

-- ===============================================
-- 7. INICIALIZAR CONFIGURACIÓN POR DEFECTO (si no existe)
-- ===============================================

-- Ejecutar función para crear configuración inicial
SELECT ensure_contract_expiration_notifications_config();
