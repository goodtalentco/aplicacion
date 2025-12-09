-- =====================================================
-- MIGRACIÓN: Reestructuración del Historial de Contratos Fijos
-- Fecha: 2025-01-22
-- Descripción: Convierte historial_contratos_fijos en un sistema de períodos
-- =====================================================

-- =====================================================
-- 1. BACKUP DE DATOS EXISTENTES
-- =====================================================

-- Crear tabla temporal para backup
CREATE TEMP TABLE backup_historial_contratos_fijos AS 
SELECT * FROM historial_contratos_fijos;

-- =====================================================
-- 2. RESTRUCTURAR LA TABLA PRINCIPAL
-- =====================================================

-- Agregar nuevas columnas
ALTER TABLE historial_contratos_fijos 
ADD COLUMN IF NOT EXISTS numero_periodo INTEGER,
ADD COLUMN IF NOT EXISTS tipo_periodo TEXT DEFAULT 'inicial',
ADD COLUMN IF NOT EXISTS es_periodo_actual BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS periodo_orden INTEGER;

-- Renombrar columnas existentes
ALTER TABLE historial_contratos_fijos 
RENAME COLUMN fecha_inicio_anterior TO fecha_inicio;

ALTER TABLE historial_contratos_fijos 
RENAME COLUMN fecha_fin_anterior TO fecha_fin;

-- Eliminar columnas que no necesitamos
ALTER TABLE historial_contratos_fijos 
DROP COLUMN IF EXISTS empresa_anterior,
DROP COLUMN IF EXISTS numero_prorroga,
DROP COLUMN IF EXISTS tipo_terminacion;

-- =====================================================
-- 3. MIGRAR DATOS EXISTENTES
-- =====================================================

-- Actualizar datos existentes: convertir a número de período basado en orden cronológico
WITH periodos_ordenados AS (
  SELECT 
    id,
    contract_id,
    ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY fecha_inicio) as nuevo_numero_periodo
  FROM historial_contratos_fijos
)
UPDATE historial_contratos_fijos h
SET 
  numero_periodo = po.nuevo_numero_periodo,
  tipo_periodo = CASE 
    WHEN po.nuevo_numero_periodo = 1 THEN 'inicial'
    ELSE 'prorroga_automatica'
  END
FROM periodos_ordenados po
WHERE h.id = po.id;

-- =====================================================
-- 4. AGREGAR CONSTRAINTS Y VALIDACIONES
-- =====================================================

-- Hacer campos obligatorios
ALTER TABLE historial_contratos_fijos 
ALTER COLUMN numero_periodo SET NOT NULL,
ALTER COLUMN tipo_periodo SET NOT NULL,
ALTER COLUMN es_periodo_actual SET NOT NULL,
ALTER COLUMN fecha_inicio SET NOT NULL,
ALTER COLUMN fecha_fin SET NOT NULL;

-- Agregar constraints
ALTER TABLE historial_contratos_fijos 
ADD CONSTRAINT check_numero_periodo_positivo 
  CHECK (numero_periodo > 0),
ADD CONSTRAINT check_tipo_periodo_valido 
  CHECK (tipo_periodo IN ('inicial', 'prorroga_automatica', 'prorroga_acordada')),
ADD CONSTRAINT check_fechas_validas 
  CHECK (fecha_inicio < fecha_fin),
ADD CONSTRAINT unique_numero_periodo_por_contrato 
  UNIQUE (contract_id, numero_periodo),
ADD CONSTRAINT unique_periodo_actual_por_contrato 
  UNIQUE (contract_id, es_periodo_actual) DEFERRABLE INITIALLY DEFERRED;

-- Solo un período actual por contrato
CREATE UNIQUE INDEX idx_unique_periodo_actual 
ON historial_contratos_fijos (contract_id) 
WHERE es_periodo_actual = true;

-- =====================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_historial_contratos_contract_periodo 
ON historial_contratos_fijos (contract_id, numero_periodo);

CREATE INDEX IF NOT EXISTS idx_historial_contratos_fechas 
ON historial_contratos_fijos (fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_historial_contratos_periodo_actual 
ON historial_contratos_fijos (contract_id, es_periodo_actual);

-- =====================================================
-- 6. FUNCIONES HELPER PARA CÁLCULOS
-- =====================================================

-- Función para obtener el estado actual del contrato fijo
CREATE OR REPLACE FUNCTION get_contract_fixed_status(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  total_periodos INTEGER := 0;
  periodo_actual INTEGER := 0;
  dias_totales INTEGER := 0;
  años_totales NUMERIC(4,2) := 0;
  resultado JSONB;
BEGIN
  -- Contar total de períodos
  SELECT COUNT(*) INTO total_periodos
  FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid;
  
  -- Obtener período actual
  SELECT numero_periodo INTO periodo_actual
  FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid AND es_periodo_actual = true;
  
  -- Calcular días totales trabajados
  SELECT COALESCE(SUM(fecha_fin - fecha_inicio + 1), 0) INTO dias_totales
  FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid;
  
  -- Convertir a años
  años_totales := ROUND(dias_totales / 365.0, 2);
  
  resultado := jsonb_build_object(
    'total_periodos', COALESCE(total_periodos, 0),
    'periodo_actual', COALESCE(periodo_actual, 0),
    'dias_totales', dias_totales,
    'años_totales', años_totales,
    'proximo_periodo', COALESCE(total_periodos, 0) + 1,
    'debe_ser_indefinido', años_totales >= 4.0 OR total_periodos >= 3,
    'alerta_legal', CASE 
      WHEN años_totales >= 4.0 THEN 'DEBE SER INDEFINIDO - Más de 4 años'
      WHEN total_periodos >= 3 THEN 'DEBE SER INDEFINIDO - Más de 3 períodos'
      WHEN total_periodos = 2 THEN 'ALERTA - Próximo período debe ser indefinido'
      ELSE 'OK - Puede continuar a término fijo'
    END
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear nuevo período en el historial
CREATE OR REPLACE FUNCTION create_contract_period(
  contract_uuid UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_tipo_periodo TEXT DEFAULT 'inicial',
  p_es_actual BOOLEAN DEFAULT false,
  user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  nuevo_numero_periodo INTEGER;
  periodo_id UUID;
BEGIN
  -- Obtener el próximo número de período
  SELECT COALESCE(MAX(numero_periodo), 0) + 1 
  INTO nuevo_numero_periodo
  FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid;
  
  -- Si es período actual, desactivar otros períodos actuales
  IF p_es_actual THEN
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = false 
    WHERE contract_id = contract_uuid AND es_periodo_actual = true;
  END IF;
  
  -- Crear el nuevo período
  INSERT INTO historial_contratos_fijos (
    contract_id,
    numero_periodo,
    fecha_inicio,
    fecha_fin,
    tipo_periodo,
    es_periodo_actual,
    created_by
  ) VALUES (
    contract_uuid,
    nuevo_numero_periodo,
    p_fecha_inicio,
    p_fecha_fin,
    p_tipo_periodo,
    p_es_actual,
    user_id
  ) RETURNING id INTO periodo_id;
  
  RETURN periodo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para hacer prórroga (via novedad)
CREATE OR REPLACE FUNCTION extend_contract_period(
  contract_uuid UUID,
  p_nueva_fecha_fin DATE,
  p_tipo_periodo TEXT DEFAULT 'prorroga_automatica',
  p_motivo TEXT DEFAULT NULL,
  user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  periodo_actual_id UUID;
  fecha_inicio_nueva DATE;
  nuevo_periodo_id UUID;
  status_actual JSONB;
BEGIN
  -- Verificar que existe período actual
  SELECT id, fecha_fin INTO periodo_actual_id, fecha_inicio_nueva
  FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid AND es_periodo_actual = true;
  
  IF periodo_actual_id IS NULL THEN
    RAISE EXCEPTION 'No hay período actual para este contrato';
  END IF;
  
  -- Calcular fecha inicio (día siguiente al fin del período actual)
  fecha_inicio_nueva := fecha_inicio_nueva + interval '1 day';
  
  -- Desactivar período actual
  UPDATE historial_contratos_fijos 
  SET es_periodo_actual = false 
  WHERE id = periodo_actual_id;
  
  -- Crear nuevo período
  nuevo_periodo_id := create_contract_period(
    contract_uuid,
    fecha_inicio_nueva,
    p_nueva_fecha_fin,
    p_tipo_periodo,
    true,
    user_id
  );
  
  -- Obtener estado actualizado
  status_actual := get_contract_fixed_status(contract_uuid);
  
  RETURN jsonb_build_object(
    'success', true,
    'nuevo_periodo_id', nuevo_periodo_id,
    'estado_contrato', status_actual
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE historial_contratos_fijos IS 'Historial de períodos de contratos a término fijo (incluye historial previo y prórrogas actuales)';
COMMENT ON COLUMN historial_contratos_fijos.numero_periodo IS 'Número secuencial del período (1=inicial, 2=primera prórroga, etc.)';
COMMENT ON COLUMN historial_contratos_fijos.tipo_periodo IS 'Tipo de período: inicial, prorroga_automatica, prorroga_acordada';
COMMENT ON COLUMN historial_contratos_fijos.es_periodo_actual IS 'Indica si es el período activo actual del contrato';
COMMENT ON COLUMN historial_contratos_fijos.fecha_inicio IS 'Fecha de inicio del período';
COMMENT ON COLUMN historial_contratos_fijos.fecha_fin IS 'Fecha de fin del período';

COMMENT ON FUNCTION get_contract_fixed_status(UUID) IS 'Obtiene el estado completo del historial de un contrato fijo';
COMMENT ON FUNCTION create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, UUID) IS 'Crea un nuevo período en el historial del contrato';
COMMENT ON FUNCTION extend_contract_period(UUID, DATE, TEXT, TEXT, UUID) IS 'Extiende un contrato fijo con una nueva prórroga';

-- =====================================================
-- 8. GRANTS DE SEGURIDAD
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON historial_contratos_fijos TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_fixed_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_contract_period(UUID, DATE, TEXT, TEXT, UUID) TO authenticated;

-- =====================================================
-- 9. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que las columnas nuevas existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'historial_contratos_fijos' AND column_name = 'numero_periodo'
  ) THEN
    RAISE EXCEPTION 'Error: La columna numero_periodo no fue creada correctamente';
  END IF;
  
  -- Verificar que las funciones fueron creadas
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_contract_fixed_status') THEN
    RAISE EXCEPTION 'Error: La función get_contract_fixed_status no fue creada';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Sistema de períodos de contratos fijos implementado';
END $$;
