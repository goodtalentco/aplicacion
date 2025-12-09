-- =====================================================
-- MIGRACIÓN: Arreglar conflicto de sobrecarga de funciones
-- Fecha: 2025-01-22
-- Descripción: Eliminar función vieja create_contract_period para evitar conflicto
-- =====================================================

-- =====================================================
-- 1. ELIMINAR FUNCIÓN VIEJA (sin observaciones)
-- =====================================================

DROP FUNCTION IF EXISTS create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, UUID);

-- =====================================================
-- 2. VERIFICAR QUE SOLO EXISTE LA FUNCIÓN NUEVA (con observaciones)
-- =====================================================

-- La función correcta ya existe de la migración 25:
-- create_contract_period(UUID, DATE, DATE, TEXT, BOOLEAN, TEXT, UUID)

-- =====================================================
-- 3. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que solo existe una versión de la función
  IF (SELECT COUNT(*) FROM pg_proc WHERE proname = 'create_contract_period') != 1 THEN
    RAISE EXCEPTION 'Error: Debe existir exactamente una función create_contract_period';
  END IF;
  
  -- Verificar que es la versión correcta (con observaciones)
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_contract_period'
    AND n.nspname = 'public'
    AND p.pronargs = 7  -- 7 parámetros (incluyendo observaciones)
  ) THEN
    RAISE EXCEPTION 'Error: La función create_contract_period no tiene el número correcto de parámetros';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Conflicto de sobrecarga resuelto';
  RAISE NOTICE 'RESULTADO: Solo existe create_contract_period con observaciones (7 parámetros)';
END $$;
