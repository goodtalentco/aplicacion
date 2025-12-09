-- =====================================================
-- FUNCIÓN: Asignar líneas de negocio a empresa de forma segura
-- =====================================================
-- Fecha: 2025-01-15
-- Descripción: Función SQL que maneja la asignación de líneas de negocio
-- a una empresa de forma transaccional, evitando conflictos de unicidad

CREATE OR REPLACE FUNCTION assign_business_lines_to_company(
  p_empresa_id UUID,
  p_lineas_negocio_ids UUID[],
  p_asignado_por UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Desactivar todas las asignaciones actuales para esta empresa
  UPDATE empresa_lineas_negocio 
  SET es_activa = false
  WHERE empresa_id = p_empresa_id;

  -- 2. Para cada línea de negocio seleccionada
  IF array_length(p_lineas_negocio_ids, 1) > 0 THEN
    -- Usar INSERT ... ON CONFLICT para manejar duplicados de forma segura
    INSERT INTO empresa_lineas_negocio (
      empresa_id,
      linea_negocio_id,
      asignado_por,
      es_activa,
      fecha_asignacion
    )
    SELECT 
      p_empresa_id,
      unnest(p_lineas_negocio_ids),
      p_asignado_por,
      true,
      now()
    ON CONFLICT (empresa_id, linea_negocio_id) 
    DO UPDATE SET
      es_activa = true,
      asignado_por = p_asignado_por,
      fecha_asignacion = now();
  END IF;
END;
$$;

-- Comentario sobre la función
COMMENT ON FUNCTION assign_business_lines_to_company(UUID, UUID[], UUID) IS 
'Asigna líneas de negocio a una empresa de forma transaccional y segura';

-- Grant para usuarios autenticados
GRANT EXECUTE ON FUNCTION assign_business_lines_to_company(UUID, UUID[], UUID) TO authenticated;
