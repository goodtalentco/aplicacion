-- =====================================================
-- MIGRACIÓN: Corregir lógica de es_periodo_actual
-- Fecha: 2025-01-26
-- Descripción: Implementa lógica correcta basada en fechas para determinar período actual
-- =====================================================

-- Función para recalcular períodos actuales de un contrato específico
CREATE OR REPLACE FUNCTION recalculate_current_periods_for_contract(contract_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_date_local DATE := CURRENT_DATE;
BEGIN
    -- Primero, marcar todos los períodos como no actuales
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = false 
    WHERE contract_id = contract_uuid;
    
    -- Luego, marcar como actual el período que contiene la fecha de hoy
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = true 
    WHERE contract_id = contract_uuid
      AND fecha_inicio <= current_date_local 
      AND fecha_fin >= current_date_local;
    
    -- Log para debugging
    RAISE NOTICE 'Recalculado período actual para contrato: %', contract_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para recalcular períodos actuales de todos los contratos
CREATE OR REPLACE FUNCTION recalculate_all_current_periods()
RETURNS BOOLEAN AS $$
DECLARE
    contract_record RECORD;
    total_contracts INTEGER := 0;
BEGIN
    -- Recalcular para cada contrato que tenga períodos
    FOR contract_record IN 
        SELECT DISTINCT contract_id 
        FROM historial_contratos_fijos 
    LOOP
        PERFORM recalculate_current_periods_for_contract(contract_record.contract_id);
        total_contracts := total_contracts + 1;
    END LOOP;
    
    RAISE NOTICE 'Recalculados períodos actuales para % contratos', total_contracts;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función trigger que se ejecuta automáticamente
CREATE OR REPLACE FUNCTION trigger_recalculate_current_periods()
RETURNS TRIGGER AS $$
DECLARE
    affected_contract_id UUID;
BEGIN
    -- Determinar qué contrato se vio afectado
    IF TG_OP = 'DELETE' THEN
        affected_contract_id := OLD.contract_id;
    ELSE
        affected_contract_id := NEW.contract_id;
    END IF;
    
    -- Recalcular solo para el contrato afectado
    PERFORM recalculate_current_periods_for_contract(affected_contract_id);
    
    -- Retornar el registro apropiado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger que se ejecuta automáticamente
DROP TRIGGER IF EXISTS update_current_period_trigger ON historial_contratos_fijos;
CREATE TRIGGER update_current_period_trigger
    AFTER INSERT OR UPDATE OR DELETE ON historial_contratos_fijos
    FOR EACH ROW 
    EXECUTE FUNCTION trigger_recalculate_current_periods();

-- Comentarios para documentación
COMMENT ON FUNCTION recalculate_current_periods_for_contract(UUID) IS 'Recalcula el período actual de un contrato específico basándose en la fecha de hoy';
COMMENT ON FUNCTION recalculate_all_current_periods() IS 'Recalcula períodos actuales de todos los contratos';
COMMENT ON FUNCTION trigger_recalculate_current_periods() IS 'Función trigger que recalcula automáticamente el período actual cuando se modifican períodos';

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION recalculate_current_periods_for_contract(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_current_periods() TO authenticated;

-- =====================================================
-- CORRECCIÓN DE DATOS EXISTENTES
-- =====================================================

-- Ejecutar la corrección inmediata de todos los datos existentes
SELECT recalculate_all_current_periods();

-- Verificar que la corrección se aplicó correctamente
DO $$
DECLARE
    total_contracts INTEGER;
    contracts_with_current INTEGER;
    contracts_without_current INTEGER;
BEGIN
    -- Contar contratos únicos
    SELECT COUNT(DISTINCT contract_id) INTO total_contracts
    FROM historial_contratos_fijos;
    
    -- Contar contratos que tienen un período actual
    SELECT COUNT(DISTINCT contract_id) INTO contracts_with_current
    FROM historial_contratos_fijos 
    WHERE es_periodo_actual = true;
    
    -- Contratos sin período actual (períodos todos futuros o todos pasados)
    contracts_without_current := total_contracts - contracts_with_current;
    
    RAISE NOTICE '=== REPORTE DE CORRECCIÓN ===';
    RAISE NOTICE 'Total de contratos con períodos: %', total_contracts;
    RAISE NOTICE 'Contratos con período actual: %', contracts_with_current;
    RAISE NOTICE 'Contratos sin período actual: %', contracts_without_current;
    RAISE NOTICE '================================';
END;
$$;

-- =====================================================
-- VALIDACIONES DE INTEGRIDAD
-- =====================================================

-- Función para validar que no hay más de un período actual por contrato
CREATE OR REPLACE FUNCTION validate_single_current_period()
RETURNS TABLE(
    contract_id UUID,
    current_periods_count BIGINT,
    period_details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hcf.contract_id,
        COUNT(*) as current_periods_count,
        STRING_AGG(
            CONCAT('Período ', hcf.numero_periodo, ': ', hcf.fecha_inicio, ' → ', hcf.fecha_fin), 
            ' | '
        ) as period_details
    FROM historial_contratos_fijos hcf
    WHERE hcf.es_periodo_actual = true
    GROUP BY hcf.contract_id
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_single_current_period() IS 'Valida que cada contrato tenga máximo un período actual';
GRANT EXECUTE ON FUNCTION validate_single_current_period() TO authenticated;

-- Ejecutar validación inmediata
DO $$
DECLARE
    validation_record RECORD;
    invalid_contracts INTEGER := 0;
BEGIN
    FOR validation_record IN SELECT * FROM validate_single_current_period() LOOP
        invalid_contracts := invalid_contracts + 1;
        RAISE WARNING 'CONTRATO CON MÚLTIPLES PERÍODOS ACTUALES: % (% períodos)', 
            validation_record.contract_id, validation_record.current_periods_count;
        RAISE WARNING 'Detalles: %', validation_record.period_details;
    END LOOP;
    
    IF invalid_contracts = 0 THEN
        RAISE NOTICE '✅ VALIDACIÓN EXITOSA: Todos los contratos tienen máximo un período actual';
    ELSE
        RAISE WARNING '❌ ENCONTRADOS % contratos con múltiples períodos actuales', invalid_contracts;
    END IF;
END;
$$;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

/*
FUNCIONES DISPONIBLES:

1. Recalcular un contrato específico:
   SELECT recalculate_current_periods_for_contract('uuid-del-contrato');

2. Recalcular todos los contratos:
   SELECT recalculate_all_current_periods();

3. Validar integridad:
   SELECT * FROM validate_single_current_period();

4. El trigger se ejecuta automáticamente al:
   - Insertar nuevos períodos
   - Actualizar fechas de períodos existentes
   - Eliminar períodos

LÓGICA IMPLEMENTADA:
- es_periodo_actual = true SOLO si fecha_inicio <= HOY <= fecha_fin
- Máximo un período actual por contrato
- Recálculo automático en cada cambio
*/
