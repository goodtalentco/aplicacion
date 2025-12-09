-- =====================================================
-- MIGRACIÓN: Lógica inteligente de período actual
-- Fecha: 2025-01-22
-- Descripción: Implementar lógica que calcule automáticamente el período actual basado en fechas
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN PARA RECALCULAR PERÍODOS ACTUALES
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_current_periods()
RETURNS INTEGER AS $$
DECLARE
  total_updates INTEGER := 0;
  contract_record RECORD;
  current_period_id UUID;
BEGIN
  -- Iterar por cada contrato que tiene períodos
  FOR contract_record IN 
    SELECT DISTINCT contract_id 
    FROM historial_contratos_fijos
  LOOP
    -- Buscar el período que debería ser actual (fecha de hoy está en el rango)
    SELECT id INTO current_period_id
    FROM historial_contratos_fijos
    WHERE contract_id = contract_record.contract_id
      AND fecha_inicio <= CURRENT_DATE
      AND fecha_fin >= CURRENT_DATE
    ORDER BY numero_periodo DESC
    LIMIT 1;
    
    -- Si no hay período actual por fechas, buscar el más reciente que no haya terminado
    IF current_period_id IS NULL THEN
      SELECT id INTO current_period_id
      FROM historial_contratos_fijos
      WHERE contract_id = contract_record.contract_id
        AND fecha_fin >= CURRENT_DATE
      ORDER BY numero_periodo DESC
      LIMIT 1;
    END IF;
    
    -- Actualizar todos los períodos de este contrato
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = (id = current_period_id)
    WHERE contract_id = contract_record.contract_id;
    
    total_updates := total_updates + 1;
    
    RAISE NOTICE 'Contrato %: Período actual actualizado a %', 
      contract_record.contract_id, 
      COALESCE(current_period_id::text, 'ninguno');
  END LOOP;
  
  RETURN total_updates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FUNCIÓN PARA OBTENER PERÍODO ACTUAL POR CONTRATO
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_period_for_contract(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  current_period RECORD;
  result JSONB;
BEGIN
  -- Buscar el período actual basado en fechas
  SELECT 
    id,
    numero_periodo,
    fecha_inicio,
    fecha_fin,
    tipo_periodo,
    es_periodo_actual,
    CASE 
      WHEN fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE THEN 'vigente'
      WHEN fecha_fin < CURRENT_DATE THEN 'vencido'
      WHEN fecha_inicio > CURRENT_DATE THEN 'futuro'
      ELSE 'indefinido'
    END as estado_por_fecha
  INTO current_period
  FROM historial_contratos_fijos
  WHERE contract_id = contract_uuid
    AND (
      -- Período vigente por fechas
      (fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE)
      OR
      -- Si no hay vigente, el más reciente que no haya terminado
      (fecha_fin >= CURRENT_DATE AND id = (
        SELECT id FROM historial_contratos_fijos 
        WHERE contract_id = contract_uuid AND fecha_fin >= CURRENT_DATE
        ORDER BY numero_periodo DESC LIMIT 1
      ))
    )
  ORDER BY 
    -- Priorizar el que esté vigente por fechas
    CASE WHEN fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE THEN 1 ELSE 2 END,
    numero_periodo DESC
  LIMIT 1;
  
  IF current_period IS NULL THEN
    RETURN jsonb_build_object(
      'found', false,
      'message', 'No hay períodos para este contrato'
    );
  END IF;
  
  result := jsonb_build_object(
    'found', true,
    'id', current_period.id,
    'numero_periodo', current_period.numero_periodo,
    'fecha_inicio', current_period.fecha_inicio,
    'fecha_fin', current_period.fecha_fin,
    'tipo_periodo', current_period.tipo_periodo,
    'es_periodo_actual_bd', current_period.es_periodo_actual,
    'estado_por_fecha', current_period.estado_por_fecha,
    'es_realmente_actual', current_period.estado_por_fecha = 'vigente'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. MEJORAR FUNCIÓN extend_contract_period
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
  
  -- Crear el nuevo período (prórroga)
  nuevo_periodo_id := create_contract_period(
    contract_uuid,
    fecha_inicio_nueva,
    p_nueva_fecha_fin,
    p_tipo_periodo,
    true, -- Este es el nuevo período actual
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
-- 4. TRIGGER PARA RECALCULAR AUTOMÁTICAMENTE - DESHABILITADO
-- =====================================================

-- NOTA: El trigger automático causa bucles infinitos porque:
-- 1. Trigger se dispara en UPDATE
-- 2. Función hace UPDATE en la misma tabla
-- 3. UPDATE dispara el trigger nuevamente = BUCLE INFINITO
--
-- SOLUCIÓN: Llamar recalculate_current_periods() manualmente cuando sea necesario

/*
-- TRIGGER COMENTADO PARA EVITAR BUCLES INFINITOS
CREATE OR REPLACE FUNCTION trigger_recalculate_current_periods()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_current_periods();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_recalculate_current_periods
  AFTER INSERT OR UPDATE OR DELETE ON historial_contratos_fijos
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_recalculate_current_periods();
*/

-- =====================================================
-- 5. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION recalculate_current_periods() IS 'Recalcula qué períodos son actuales basándose en las fechas y la fecha de hoy';
COMMENT ON FUNCTION get_current_period_for_contract(UUID) IS 'Obtiene el período actual de un contrato basándose en fechas, no en el flag es_periodo_actual';
COMMENT ON FUNCTION extend_contract_period(UUID, DATE, TEXT, TEXT, UUID) IS 'Extiende un contrato con prórroga, manejando automáticamente el cambio de período actual';

-- =====================================================
-- 6. GRANTS DE SEGURIDAD
-- =====================================================

GRANT EXECUTE ON FUNCTION recalculate_current_periods() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_period_for_contract(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_contract_period(UUID, DATE, TEXT, TEXT, UUID) TO authenticated;

-- =====================================================
-- 7. EJECUTAR RECÁLCULO INICIAL - COMENTADO PARA EVITAR PROBLEMAS
-- =====================================================

-- NOTA: No ejecutar automáticamente en la migración para evitar problemas
-- Ejecutar manualmente cuando sea necesario:
-- SELECT recalculate_current_periods() as contratos_actualizados;

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que las funciones fueron creadas
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'recalculate_current_periods') THEN
    RAISE EXCEPTION 'Error: La función recalculate_current_periods no fue creada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_period_for_contract') THEN
    RAISE EXCEPTION 'Error: La función get_current_period_for_contract no fue creada';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Lógica inteligente de período actual implementada';
END $$;
