-- =====================================================
-- MIGRACIÓN: Arreglar alertas legales de contratos fijos
-- Fecha: 2025-01-22
-- Descripción: Corregir la lógica de alertas legales según ley colombiana
-- =====================================================

-- =====================================================
-- 1. CORREGIR FUNCIÓN get_contract_fixed_status
-- =====================================================

CREATE OR REPLACE FUNCTION get_contract_fixed_status(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  total_periodos INTEGER := 0;
  periodo_actual INTEGER := 0;
  dias_totales INTEGER := 0;
  años_totales NUMERIC(4,2) := 0;
  proximo_periodo INTEGER := 0;
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
  
  -- Calcular próximo período
  proximo_periodo := COALESCE(total_periodos, 0) + 1;
  
  resultado := jsonb_build_object(
    'total_periodos', COALESCE(total_periodos, 0),
    'periodo_actual', COALESCE(periodo_actual, 0),
    'dias_totales', dias_totales,
    'años_totales', años_totales,
    'proximo_periodo', proximo_periodo,
    'debe_ser_indefinido', años_totales >= 4.0,
    'alerta_legal', CASE 
      WHEN años_totales >= 4.0 THEN 'DEBE SER INDEFINIDO - Más de 4 años trabajados'
      WHEN proximo_periodo = 5 THEN 'QUINTA PRÓRROGA - Debe ser mínimo 1 año'
      WHEN años_totales >= 3.5 THEN 'PRECAUCIÓN - Cerca del límite de 4 años'
      ELSE NULL
    END
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION get_contract_fixed_status(UUID) IS 'Obtiene estado de contrato fijo - CORREGIDO según ley colombiana: 4+ años = indefinido, 5ta prórroga = mín 1 año';

-- =====================================================
-- 3. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  -- Verificar que la función fue actualizada correctamente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_contract_fixed_status' 
    AND routine_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Error: La función get_contract_fixed_status no existe';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Alertas legales corregidas';
  RAISE NOTICE 'CAMBIOS: Solo alerta por 4+ años o 5ta prórroga, no por número de períodos';
END $$;
