-- =====================================================
-- MIGRACIÓN: Limpiar triggers que causan bucles infinitos
-- Fecha: 2025-01-22
-- Descripción: Eliminar cualquier trigger problemático que cause recursión infinita
-- =====================================================

-- =====================================================
-- 1. ELIMINAR TRIGGERS PROBLEMÁTICOS
-- =====================================================

-- Eliminar trigger automático que causa bucles
DROP TRIGGER IF EXISTS auto_recalculate_current_periods ON historial_contratos_fijos;

-- Eliminar función del trigger
DROP FUNCTION IF EXISTS trigger_recalculate_current_periods();

-- =====================================================
-- 2. DOCUMENTACIÓN Y EXPLICACIÓN
-- =====================================================

COMMENT ON FUNCTION recalculate_current_periods() IS 'Recalcula períodos actuales - LLAMAR MANUALMENTE para evitar bucles infinitos';
COMMENT ON FUNCTION get_current_period_for_contract(UUID) IS 'Obtiene período actual por fechas - Método seguro sin triggers';

-- =====================================================
-- 3. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que el trigger problemático fue eliminado
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'auto_recalculate_current_periods'
    AND event_object_table = 'historial_contratos_fijos'
  ) THEN
    RAISE EXCEPTION 'Error: El trigger problemático aún existe';
  END IF;
  
  -- Verificar que las funciones principales existen
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'recalculate_current_periods') THEN
    RAISE EXCEPTION 'Error: La función recalculate_current_periods no existe';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_period_for_contract') THEN
    RAISE EXCEPTION 'Error: La función get_current_period_for_contract no existe';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Triggers problemáticos eliminados, funciones preservadas';
  RAISE NOTICE 'IMPORTANTE: Llamar recalculate_current_periods() manualmente cuando sea necesario';
END $$;
