-- ===============================================
-- MIGRACIÓN: Agregar campo de moneda a contratos
-- Fecha: 2025-01-22
-- Descripción: Agrega campo moneda a la tabla contracts para soportar múltiples monedas
-- ===============================================

-- ===============================================
-- 1. AGREGAR COLUMNA MONEDA A CONTRATOS
-- ===============================================

-- Agregar columna moneda con default 'COP' y NOT NULL
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'COP';

-- Agregar comentario a la columna
COMMENT ON COLUMN contracts.moneda IS 'Moneda del salario (COP, EUR, u otra moneda personalizada)';

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
    AND column_name = 'moneda'
  ) THEN
    RAISE EXCEPTION 'Error: La columna moneda no se agregó correctamente';
  END IF;
END $$;

-- ===============================================
-- COMENTARIOS:
-- - Todos los contratos existentes tendrán moneda = 'COP' automáticamente
-- - Los nuevos contratos tendrán 'COP' por defecto
-- - El frontend permitirá cambiar a EUR u otra moneda personalizada
-- ===============================================

