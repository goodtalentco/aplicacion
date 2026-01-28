-- ===============================================
-- MIGRACIÓN: Asegurar Configuración de Notificaciones de Vencimiento
-- Fecha: 2025-01-23
-- Descripción: Asegura que la tabla y función de configuración de notificaciones existan
-- ===============================================

-- ===============================================
-- 1. CREAR TABLA SI NO EXISTE
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
  CONSTRAINT check_send_days_array CHECK (jsonb_typeof(send_days_of_week) = 'array')
);

-- ===============================================
-- 2. AGREGAR RESTRICCIONES ADICIONALES SI NO EXISTEN
-- ===============================================

DO $$
BEGIN
  -- Agregar restricciones condicionales solo si no existen
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_recipient_emails_not_empty'
  ) THEN
    ALTER TABLE contract_expiration_notifications_config
    ADD CONSTRAINT check_recipient_emails_not_empty 
    CHECK (jsonb_array_length(recipient_emails) > 0 OR is_enabled = false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_days_before_not_empty'
  ) THEN
    ALTER TABLE contract_expiration_notifications_config
    ADD CONSTRAINT check_days_before_not_empty 
    CHECK (jsonb_array_length(days_before_expiration) > 0 OR is_enabled = false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_send_days_not_empty'
  ) THEN
    ALTER TABLE contract_expiration_notifications_config
    ADD CONSTRAINT check_send_days_not_empty 
    CHECK (jsonb_array_length(send_days_of_week) > 0 OR is_enabled = false);
  END IF;

END $$;

-- Eliminar restricción problemática si existe (usa subconsulta que no está permitida)
ALTER TABLE contract_expiration_notifications_config
DROP CONSTRAINT IF EXISTS check_days_before_valid;

-- ===============================================
-- 3. ÍNDICE ÚNICO MEJORADO (usando partial index)
-- ===============================================

-- Eliminar índice anterior si existe (puede causar problemas)
DROP INDEX IF EXISTS idx_contract_expiration_notifications_config_single;

-- Crear índice único usando un enfoque más robusto
-- Usamos un índice parcial que siempre es verdadero para asegurar solo una fila
CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_expiration_notifications_config_single 
ON contract_expiration_notifications_config (id) 
WHERE id IS NOT NULL;

-- Alternativa: usar un campo constante para el índice único
-- Primero agregar columna constante si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_expiration_notifications_config' 
    AND column_name = 'singleton'
  ) THEN
    ALTER TABLE contract_expiration_notifications_config
    ADD COLUMN singleton BOOLEAN NOT NULL DEFAULT true;
    
    -- Crear índice único en el campo constante
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_expiration_notifications_config_singleton
    ON contract_expiration_notifications_config (singleton) 
    WHERE singleton = true;
  END IF;
END $$;

-- ===============================================
-- 4. COMENTARIOS
-- ===============================================

COMMENT ON TABLE contract_expiration_notifications_config IS 'Configuración para notificaciones de vencimiento de contratos';
COMMENT ON COLUMN contract_expiration_notifications_config.recipient_emails IS 'Array JSON de emails destinatarios: ["email1@example.com", "email2@example.com"]';
COMMENT ON COLUMN contract_expiration_notifications_config.days_before_expiration IS 'Array JSON de días antes del vencimiento para notificar: [14, 7, 3] = notificar a 14, 7 y 3 días antes';
COMMENT ON COLUMN contract_expiration_notifications_config.send_time IS 'Hora de envío en formato HH:MM (hora Colombia): "08:00"';
COMMENT ON COLUMN contract_expiration_notifications_config.send_days_of_week IS 'Array JSON de días: [1,2,3,4,5] = lunes a viernes (0=domingo, 6=sábado)';
COMMENT ON COLUMN contract_expiration_notifications_config.is_enabled IS 'Si el envío automático está activado';
COMMENT ON COLUMN contract_expiration_notifications_config.singleton IS 'Campo constante para asegurar solo una configuración';

-- ===============================================
-- 5. FUNCIÓN DE VALIDACIÓN PARA DAYS_BEFORE_EXPIRATION
-- ===============================================

-- Función para validar que los días antes del vencimiento sean válidos (1-60)
CREATE OR REPLACE FUNCTION validate_days_before_expiration()
RETURNS TRIGGER AS $$
DECLARE
  day_value JSONB;
  day_int INTEGER;
BEGIN
  -- Validar cada valor en el array days_before_expiration
  FOR day_value IN SELECT * FROM jsonb_array_elements(NEW.days_before_expiration)
  LOOP
    BEGIN
      day_int := (day_value::text)::integer;
      
      -- Verificar que esté en el rango válido (1-60)
      IF day_int < 1 OR day_int > 60 THEN
        RAISE EXCEPTION 'Los días antes del vencimiento deben estar entre 1 y 60. Valor inválido: %', day_int;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Valor inválido en days_before_expiration: %. Debe ser un número entre 1 y 60.', day_value;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar days_before_expiration antes de insertar/actualizar
DROP TRIGGER IF EXISTS trigger_validate_days_before_expiration ON contract_expiration_notifications_config;
CREATE TRIGGER trigger_validate_days_before_expiration
  BEFORE INSERT OR UPDATE ON contract_expiration_notifications_config
  FOR EACH ROW
  EXECUTE FUNCTION validate_days_before_expiration();

-- ===============================================
-- 6. TRIGGER PARA UPDATED_AT
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
-- 7. FUNCIÓN HELPER PARA OBTENER/ACTUALIZAR CONFIGURACIÓN
-- ===============================================

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
      is_enabled,
      singleton
    ) VALUES (
      '[]'::jsonb,
      '[14]'::jsonb,
      '08:00',
      '[1,2,3,4,5]'::jsonb,
      false,
      true
    ) RETURNING * INTO config;
  END IF;
  
  RETURN config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 7. GRANTS PARA ROL AUTHENTICATED
-- ===============================================

GRANT SELECT, INSERT, UPDATE ON contract_expiration_notifications_config TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_contract_expiration_notifications_config() TO authenticated;

-- ===============================================
-- 9. RLS (Row Level Security)
-- ===============================================

ALTER TABLE contract_expiration_notifications_config ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si hay conflictos
DROP POLICY IF EXISTS "view_contract_expiration_notifications_config" ON contract_expiration_notifications_config;
DROP POLICY IF EXISTS "update_contract_expiration_notifications_config" ON contract_expiration_notifications_config;
DROP POLICY IF EXISTS "insert_contract_expiration_notifications_config" ON contract_expiration_notifications_config;

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

-- ===============================================
-- 9. LIMPIAR CONFIGURACIONES DUPLICADAS (si existen)
-- ===============================================

-- Si hay múltiples configuraciones, mantener solo la más reciente
DO $$
DECLARE
  config_count INTEGER;
  config_id_to_keep UUID;
BEGIN
  SELECT COUNT(*) INTO config_count FROM contract_expiration_notifications_config;
  
  IF config_count > 1 THEN
    -- Obtener el ID de la configuración más reciente
    SELECT id INTO config_id_to_keep 
    FROM contract_expiration_notifications_config 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Eliminar las demás
    DELETE FROM contract_expiration_notifications_config 
    WHERE id != config_id_to_keep;
    
    RAISE NOTICE 'Se eliminaron % configuraciones duplicadas, manteniendo la más reciente', config_count - 1;
  END IF;
END $$;

-- ===============================================
-- 11. INICIALIZAR CONFIGURACIÓN POR DEFECTO
-- ===============================================

-- Ejecutar función para crear configuración inicial si no existe
SELECT ensure_contract_expiration_notifications_config();
