-- =====================================================
-- MIGRACIÓN: Agregar observaciones a create_contract_period
-- Fecha: 2025-01-22
-- Descripción: Actualizar función para que guarde observaciones (motivo de prórroga)
-- =====================================================

-- =====================================================
-- 1. ACTUALIZAR create_contract_period PARA INCLUIR OBSERVACIONES
-- =====================================================

CREATE OR REPLACE FUNCTION create_contract_period(
  contract_uuid UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_tipo_periodo TEXT DEFAULT 'inicial',
  p_es_actual BOOLEAN DEFAULT false,
  p_observaciones TEXT DEFAULT NULL,
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
    observaciones,
    created_by
  ) VALUES (
    contract_uuid,
    nuevo_numero_periodo,
    p_fecha_inicio,
    p_fecha_fin,
    p_tipo_periodo,
    p_es_actual,
    p_observaciones,
    user_id
  ) RETURNING id INTO periodo_id;
  
  RETURN periodo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. ACTUALIZAR extend_contract_period PARA PASAR OBSERVACIONES
-- =====================================================

CREATE OR REPLACE FUNCTION extend_contract_period(
  contract_uuid UUID,
  p_nueva_fecha_fin DATE,
  p_tipo_periodo TEXT DEFAULT 'prorroga_automatica',
  p_motivo TEXT DEFAULT NULL,
  user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  periodo_actual_info JSONB;
  periodo_actual_id UUID;
  fecha_inicio_nueva DATE;
  nuevo_periodo_id UUID;
  status_actual JSONB;
BEGIN
  -- Obtener información del período actual
  periodo_actual_info := get_current_period_for_contract(contract_uuid);
  
  IF NOT (periodo_actual_info->>'found')::boolean THEN
    RAISE EXCEPTION 'No hay período actual para este contrato';
  END IF;
  
  periodo_actual_id := (periodo_actual_info->>'id')::UUID;
  
  -- La nueva prórroga empieza el día siguiente al fin del período actual
  fecha_inicio_nueva := (periodo_actual_info->>'fecha_fin')::DATE + interval '1 day';
  
  -- Marcar el período actual como no actual (pasa a historial)
  UPDATE historial_contratos_fijos 
  SET es_periodo_actual = false 
  WHERE id = periodo_actual_id;
  
  -- Crear el nuevo período (prórroga) CON OBSERVACIONES
  nuevo_periodo_id := create_contract_period(
    contract_uuid,
    fecha_inicio_nueva,
    p_nueva_fecha_fin,
    p_tipo_periodo,
    true, -- Este es el nuevo período actual
    p_motivo, -- Esto va a observaciones
    user_id
  );
  
  -- Obtener estado actualizado
  status_actual := get_contract_fixed_status(contract_uuid);
  
  RETURN jsonb_build_object(
    'success', true,
    'nuevo_periodo_id', nuevo_periodo_id,
    'periodo_anterior_id', periodo_actual_id,
    'fecha_inicio_nueva', fecha_inicio_nueva,
    'estado_contrato', status_actual,
    'mensaje', format('Prórroga creada: período #%s hasta %s', 
      (status_actual->>'periodo_actual')::text, 
      p_nueva_fecha_fin::text)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. ACTUALIZAR GRANTS DE SEGURIDAD
-- =====================================================

GRANT EXECUTE ON FUNCTION create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_contract_period(UUID, DATE, TEXT, TEXT, UUID) TO authenticated;

-- =====================================================
-- 4. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, TEXT, UUID) IS 'Crea un nuevo período en el historial del contrato - ACTUALIZADO para incluir observaciones';
COMMENT ON FUNCTION extend_contract_period(UUID, DATE, TEXT, TEXT, UUID) IS 'Extiende un contrato con prórroga, guardando el motivo en observaciones - ACTUALIZADO';

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que las funciones fueron actualizadas correctamente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'create_contract_period' 
    AND routine_schema = 'public'
    AND array_length(regexp_split_to_array(routine_definition, 'p_observaciones'), 1) > 1
  ) THEN
    RAISE EXCEPTION 'Error: create_contract_period no fue actualizada correctamente';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'extend_contract_period' 
    AND routine_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Error: extend_contract_period no existe';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Funciones actualizadas para incluir observaciones';
  RAISE NOTICE 'RESULTADO: El motivo de prórroga ahora se guarda en la columna observaciones del historial';
END $$;
