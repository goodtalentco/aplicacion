-- =====================================================
-- MIGRACIÓN: Arreglar constraint de período actual
-- Fecha: 2025-01-22
-- Descripción: Remover constraint incorrecto que impide múltiples períodos no actuales
-- =====================================================

-- =====================================================
-- 1. ELIMINAR CONSTRAINT PROBLEMÁTICO
-- =====================================================

-- Eliminar el constraint que está causando problemas
-- Este constraint impide tener múltiples registros con (contract_id, false)
ALTER TABLE historial_contratos_fijos 
DROP CONSTRAINT IF EXISTS unique_periodo_actual_por_contrato;

-- =====================================================
-- 2. VERIFICAR QUE EL ÍNDICE CORRECTO EXISTE
-- =====================================================

-- Este índice SÍ está bien - solo permite un período actual=true por contrato
-- Si no existe, crearlo
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_periodo_actual 
ON historial_contratos_fijos (contract_id) 
WHERE es_periodo_actual = true;

-- =====================================================
-- 3. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON INDEX idx_unique_periodo_actual IS 'Permite solo un período actual (es_periodo_actual=true) por contrato';

-- =====================================================
-- 4. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que el constraint problemático fue eliminado
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_periodo_actual_por_contrato'
    AND table_name = 'historial_contratos_fijos'
  ) THEN
    RAISE EXCEPTION 'Error: El constraint problemático aún existe';
  END IF;
  
  -- Verificar que el índice correcto existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_unique_periodo_actual'
    AND tablename = 'historial_contratos_fijos'
  ) THEN
    RAISE EXCEPTION 'Error: El índice correcto no existe';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Constraint de período actual arreglado';
END $$;
