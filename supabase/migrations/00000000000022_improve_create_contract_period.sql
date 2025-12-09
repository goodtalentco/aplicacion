-- =====================================================
-- MIGRACIÓN: Mejorar función create_contract_period
-- Fecha: 2025-01-22
-- Descripción: Mejorar manejo de errores y lógica de períodos actuales
-- =====================================================

-- =====================================================
-- 1. MEJORAR FUNCIÓN create_contract_period
-- =====================================================

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
  periodos_actuales_count INTEGER;
BEGIN
  -- Validar parámetros de entrada
  IF contract_uuid IS NULL THEN
    RAISE EXCEPTION 'contract_uuid no puede ser NULL';
  END IF;
  
  IF p_fecha_inicio IS NULL OR p_fecha_fin IS NULL THEN
    RAISE EXCEPTION 'Las fechas de inicio y fin son obligatorias';
  END IF;
  
  IF p_fecha_inicio >= p_fecha_fin THEN
    RAISE EXCEPTION 'La fecha de inicio debe ser anterior a la fecha de fin';
  END IF;

  -- Obtener el próximo número de período
  SELECT COALESCE(MAX(numero_periodo), 0) + 1 
  INTO nuevo_numero_periodo
  FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid;
  
  -- Si es período actual, verificar y manejar períodos actuales existentes
  IF p_es_actual THEN
    -- Contar períodos actuales existentes
    SELECT COUNT(*) INTO periodos_actuales_count
    FROM historial_contratos_fijos 
    WHERE contract_id = contract_uuid AND es_periodo_actual = true;
    
    -- Si hay períodos actuales, desactivarlos
    IF periodos_actuales_count > 0 THEN
      UPDATE historial_contratos_fijos 
      SET es_periodo_actual = false 
      WHERE contract_id = contract_uuid AND es_periodo_actual = true;
      
      RAISE NOTICE 'Desactivados % períodos actuales existentes', periodos_actuales_count;
    END IF;
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
  
  RAISE NOTICE 'Período creado exitosamente: ID=%, número=%, actual=%', periodo_id, nuevo_numero_periodo, p_es_actual;
  
  RETURN periodo_id;
EXCEPTION
  WHEN unique_violation THEN
    -- Manejar violaciones de unicidad específicamente
    IF SQLERRM LIKE '%unique_numero_periodo_por_contrato%' THEN
      RAISE EXCEPTION 'Ya existe un período con el número % para este contrato', nuevo_numero_periodo;
    ELSIF SQLERRM LIKE '%idx_unique_periodo_actual%' THEN
      RAISE EXCEPTION 'Ya existe un período actual para este contrato. Solo puede haber uno activo.';
    ELSE
      RAISE EXCEPTION 'Error de unicidad: %', SQLERRM;
    END IF;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error inesperado al crear período: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, UUID) IS 'Crea un nuevo período en el historial del contrato con manejo mejorado de errores y validaciones';

-- =====================================================
-- 3. GRANTS DE SEGURIDAD
-- =====================================================

GRANT EXECUTE ON FUNCTION create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, UUID) TO authenticated;

-- =====================================================
-- 4. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que la función fue creada correctamente
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_contract_period') THEN
    RAISE EXCEPTION 'Error: La función create_contract_period no fue creada';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Función create_contract_period mejorada';
END $$;
