-- =====================================================
-- MIGRACIÓN: Corregir loop infinito del trigger
-- Fecha: 2025-01-26
-- Descripción: Elimina el trigger automático que causa loop infinito
-- =====================================================

-- QUITAR el trigger automático que causa el loop infinito
DROP TRIGGER IF EXISTS update_current_period_trigger ON historial_contratos_fijos;

-- Modificar la función trigger para evitar recursión
CREATE OR REPLACE FUNCTION trigger_recalculate_current_periods()
RETURNS TRIGGER AS $$
DECLARE
    affected_contract_id UUID;
    current_date_local DATE := CURRENT_DATE;
BEGIN
    -- Determinar qué contrato se vio afectado
    IF TG_OP = 'DELETE' THEN
        affected_contract_id := OLD.contract_id;
    ELSE
        affected_contract_id := NEW.contract_id;
    END IF;
    
    -- RECALCULAR DIRECTAMENTE SIN RECURSIÓN
    -- Primero, marcar todos los períodos del contrato como no actuales
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = false 
    WHERE contract_id = affected_contract_id;
    
    -- Luego, marcar como actual el período que contiene la fecha de hoy
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = true 
    WHERE contract_id = affected_contract_id
      AND fecha_inicio <= current_date_local 
      AND fecha_fin >= current_date_local;
    
    -- Retornar el registro apropiado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- RECREAR el trigger pero solo para INSERT/DELETE (no UPDATE para evitar loop)
CREATE TRIGGER update_current_period_trigger
    AFTER INSERT OR DELETE ON historial_contratos_fijos
    FOR EACH ROW 
    EXECUTE FUNCTION trigger_recalculate_current_periods();

-- Crear función especial para ejecutar manualmente cuando hay cambios en fechas
CREATE OR REPLACE FUNCTION recalculate_current_periods_safe(contract_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_date_local DATE := CURRENT_DATE;
BEGIN
    -- Deshabilitar el trigger temporalmente
    ALTER TABLE historial_contratos_fijos DISABLE TRIGGER update_current_period_trigger;
    
    -- Hacer el recálculo
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = false 
    WHERE contract_id = contract_uuid;
    
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = true 
    WHERE contract_id = contract_uuid
      AND fecha_inicio <= current_date_local 
      AND fecha_fin >= current_date_local;
    
    -- Rehabilitar el trigger
    ALTER TABLE historial_contratos_fijos ENABLE TRIGGER update_current_period_trigger;
    
    RAISE NOTICE '✅ Recalculado período actual para contrato: %', contract_uuid;
    
    RETURN TRUE;
EXCEPTION 
    WHEN OTHERS THEN
        -- Asegurar que el trigger se rehabilite incluso si hay error
        ALTER TABLE historial_contratos_fijos ENABLE TRIGGER update_current_period_trigger;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar la función para todos los contratos
CREATE OR REPLACE FUNCTION recalculate_all_current_periods_safe()
RETURNS BOOLEAN AS $$
DECLARE
    contract_record RECORD;
    total_contracts INTEGER := 0;
    current_date_local DATE := CURRENT_DATE;
BEGIN
    -- Deshabilitar el trigger temporalmente
    ALTER TABLE historial_contratos_fijos DISABLE TRIGGER update_current_period_trigger;
    
    -- Recalcular para todos los contratos en una sola operación
    -- Primero, marcar todos como no actuales
    UPDATE historial_contratos_fijos SET es_periodo_actual = false;
    
    -- Luego, marcar como actuales solo los que contienen la fecha de hoy
    UPDATE historial_contratos_fijos 
    SET es_periodo_actual = true 
    WHERE fecha_inicio <= current_date_local 
      AND fecha_fin >= current_date_local;
    
    -- Contar contratos procesados
    SELECT COUNT(DISTINCT contract_id) INTO total_contracts
    FROM historial_contratos_fijos;
    
    -- Rehabilitar el trigger
    ALTER TABLE historial_contratos_fijos ENABLE TRIGGER update_current_period_trigger;
    
    RAISE NOTICE '✅ Recalculados períodos actuales para % contratos', total_contracts;
    
    RETURN TRUE;
EXCEPTION 
    WHEN OTHERS THEN
        -- Asegurar que el trigger se rehabilite incluso si hay error
        ALTER TABLE historial_contratos_fijos ENABLE TRIGGER update_current_period_trigger;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION recalculate_current_periods_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_current_periods_safe() TO authenticated;

-- EJECUTAR CORRECCIÓN INMEDIATA
SELECT recalculate_all_current_periods_safe();

-- Función simple para validar períodos actuales únicos
CREATE OR REPLACE FUNCTION validate_single_current_period_simple()
RETURNS TABLE(
    contract_id UUID,
    current_periods_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hcf.contract_id,
        COUNT(*) as current_periods_count
    FROM historial_contratos_fijos hcf
    WHERE hcf.es_periodo_actual = true
    GROUP BY hcf.contract_id
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_single_current_period_simple() TO authenticated;

-- Validar que no hay múltiples períodos actuales
DO $$
DECLARE
    validation_record RECORD;
    invalid_contracts INTEGER := 0;
BEGIN
    FOR validation_record IN SELECT * FROM validate_single_current_period_simple() LOOP
        invalid_contracts := invalid_contracts + 1;
        RAISE WARNING 'CONTRATO CON MÚLTIPLES PERÍODOS ACTUALES: % (% períodos)', 
            validation_record.contract_id, validation_record.current_periods_count;
    END LOOP;
    
    IF invalid_contracts = 0 THEN
        RAISE NOTICE '✅ VALIDACIÓN EXITOSA: Todos los contratos tienen máximo un período actual';
    ELSE
        RAISE WARNING '❌ ENCONTRADOS % contratos con múltiples períodos actuales', invalid_contracts;
    END IF;
END;
$$;

-- =====================================================
-- INSTRUCCIONES ACTUALIZADAS
-- =====================================================

/*
FUNCIONES SEGURAS DISPONIBLES:

1. Recalcular un contrato específico (SIN LOOP):
   SELECT recalculate_current_periods_safe('uuid-del-contrato');

2. Recalcular todos los contratos (SIN LOOP):
   SELECT recalculate_all_current_periods_safe();

3. Validar integridad:
   SELECT * FROM validate_single_current_period_simple();

TRIGGER AUTOMÁTICO:
- Se ejecuta solo en INSERT/DELETE (no en UPDATE)
- Evita el loop infinito
- Para cambios en fechas, usa las funciones _safe manualmente

CUÁNDO USAR LAS FUNCIONES SEGURAS:
- Después de modificar fechas de períodos existentes
- Después de importar datos masivos
- Cuando quieras asegurar la consistencia
*/
