-- ===============================================
-- MIGRACIÓN: Agregar campo auxilios (JSON) a contratos
-- Fecha: 2025-01-22
-- Descripción: Reemplaza campos individuales de auxilios por un campo JSON que permite múltiples auxilios
-- ===============================================

-- ===============================================
-- 1. AGREGAR COLUMNA AUXILIOS (JSON)
-- ===============================================

-- Agregar columna auxilios como JSONB para mejor rendimiento y consultas
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS auxilios JSONB DEFAULT '[]'::jsonb;

-- Agregar comentario a la columna
COMMENT ON COLUMN contracts.auxilios IS 'Array JSON de auxilios. Formato: [{"tipo": "salarial"|"no_salarial", "monto": number, "moneda": "COP"|"EUR"|...}]';

-- ===============================================
-- 2. MIGRAR DATOS EXISTENTES
-- ===============================================

-- Migrar auxilios existentes al formato JSON
DO $$
DECLARE
  contract_record RECORD;
  auxilios_array JSONB;
BEGIN
  FOR contract_record IN SELECT id, auxilio_salarial, auxilio_no_salarial, moneda FROM contracts
  LOOP
    auxilios_array := '[]'::jsonb;
    
    -- Agregar auxilio salarial si existe
    IF contract_record.auxilio_salarial IS NOT NULL AND contract_record.auxilio_salarial > 0 THEN
      auxilios_array := auxilios_array || jsonb_build_array(
        jsonb_build_object(
          'tipo', 'salarial',
          'monto', contract_record.auxilio_salarial,
          'moneda', COALESCE(contract_record.moneda, 'COP')
        )
      );
    END IF;
    
    -- Agregar auxilio no salarial si existe
    IF contract_record.auxilio_no_salarial IS NOT NULL AND contract_record.auxilio_no_salarial > 0 THEN
      auxilios_array := auxilios_array || jsonb_build_array(
        jsonb_build_object(
          'tipo', 'no_salarial',
          'monto', contract_record.auxilio_no_salarial,
          'moneda', COALESCE(contract_record.moneda, 'COP')
        )
      );
    END IF;
    
    -- Actualizar el contrato
    UPDATE contracts
    SET auxilios = auxilios_array
    WHERE id = contract_record.id;
  END LOOP;
END $$;

-- Si no hay auxilios, asegurar que sea array vacío
UPDATE contracts
SET auxilios = '[]'::jsonb
WHERE auxilios IS NULL;

-- ===============================================
-- 3. AGREGAR CONSTRAINT PARA VALIDAR ESTRUCTURA JSON
-- ===============================================

-- Constraint para validar que auxilios sea un array
ALTER TABLE contracts
ADD CONSTRAINT check_auxilios_is_array 
CHECK (jsonb_typeof(auxilios) = 'array');

-- Constraint para validar estructura de cada auxilio
ALTER TABLE contracts
ADD CONSTRAINT check_auxilios_structure 
CHECK (
  auxilios = '[]'::jsonb OR
  (
    jsonb_typeof(auxilios) = 'array' AND
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(auxilios) AS auxilio
      WHERE 
        -- Validar que tipo existe y es válido
        (auxilio->>'tipo') IS NULL OR
        (auxilio->>'tipo') NOT IN ('salarial', 'no_salarial') OR
        -- Validar que monto existe, es número y es positivo
        (auxilio->'monto') IS NULL OR
        jsonb_typeof(auxilio->'monto') != 'number' OR
        (auxilio->>'monto')::numeric < 0
    )
  )
);

-- ===============================================
-- 4. CREAR ÍNDICE PARA BÚSQUEDAS EN AUXILIOS
-- ===============================================

-- Índice GIN para búsquedas eficientes en JSONB
CREATE INDEX IF NOT EXISTS idx_contracts_auxilios 
ON contracts USING GIN (auxilios);

-- ===============================================
-- 5. VERIFICACIÓN
-- ===============================================

-- Verificar que la columna se agregó correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name = 'auxilios'
  ) THEN
    RAISE EXCEPTION 'Error: La columna auxilios no se agregó correctamente';
  END IF;
END $$;

-- ===============================================
-- COMENTARIOS:
-- - Los auxilios se guardan como array JSON: [{"tipo": "salarial", "monto": 150000, "moneda": "COP"}, ...]
-- - Los datos existentes se migran automáticamente
-- - Los campos auxilio_salarial, auxilio_salarial_concepto, auxilio_no_salarial, auxilio_no_salarial_concepto
--   se mantienen por compatibilidad pero ya no se usan en el frontend
-- - La moneda por defecto es COP si no se especifica
-- ===============================================

