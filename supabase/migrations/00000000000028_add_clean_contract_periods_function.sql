-- =====================================================
-- MIGRACIÓN: Función para limpiar períodos de contrato
-- Fecha: 2025-01-26
-- Descripción: Agrega función con permisos para limpiar períodos en edición
-- =====================================================

-- Función para limpiar todos los períodos de un contrato
-- Se usa en edición para evitar duplicados
CREATE OR REPLACE FUNCTION clean_contract_periods(contract_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Eliminar todos los períodos del contrato
  DELETE FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para documentación
COMMENT ON FUNCTION clean_contract_periods(UUID) IS 'Limpia todos los períodos de un contrato para evitar duplicados en edición';

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION clean_contract_periods(UUID) TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  -- Verificar que la función fue creada
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'clean_contract_periods') THEN
    RAISE EXCEPTION 'Error: La función clean_contract_periods no fue creada';
  END IF;
  
  RAISE NOTICE 'Función clean_contract_periods creada exitosamente';
END $$;
