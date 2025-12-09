-- ===============================================
-- MIGRACIÓN: Agregar campo de nivel de riesgo ARL a contratos
-- Fecha: 2025-01-22
-- Descripción: Agrega campo arl_risk_level a la tabla contracts para gestionar el nivel de riesgo ARL (1-5)
-- ===============================================

-- ===============================================
-- 1. AGREGAR COLUMNA ARL_RISK_LEVEL A CONTRATOS
-- ===============================================

-- Agregar columna arl_risk_level con validación de rango 1-5
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS arl_risk_level INTEGER;

-- Agregar constraint para validar que el valor esté entre 1 y 5
ALTER TABLE contracts
ADD CONSTRAINT check_arl_risk_level_range 
CHECK (arl_risk_level IS NULL OR (arl_risk_level >= 1 AND arl_risk_level <= 5));

-- Agregar comentario a la columna
COMMENT ON COLUMN contracts.arl_risk_level IS 'Nivel de riesgo ARL del empleado (1-5). Puede ser modificado mediante novedades después de la contratación.';

-- ===============================================
-- 2. VERIFICACIÓN
-- ===============================================

-- Verificar que la columna se agregó correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name = 'arl_risk_level'
  ) THEN
    RAISE EXCEPTION 'Error: La columna arl_risk_level no se agregó correctamente';
  END IF;
END $$;

-- ===============================================
-- COMENTARIOS:
-- - El campo es opcional (NULL permitido) para contratos existentes
-- - Los valores válidos son 1, 2, 3, 4 o 5
-- - Puede ser modificado mediante novedades después de la contratación
-- ===============================================

