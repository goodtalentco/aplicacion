-- ===============================================
-- MIGRACIÓN: Agregar campos de archivado/anulación a contratos
-- Fecha: 2025-01-22
-- Descripción: Agrega campos para anular contratos (archivado soft delete) con motivo obligatorio
-- ===============================================

-- ===============================================
-- 1. AGREGAR COLUMNAS DE ARCHIVADO A CONTRATOS
-- ===============================================

-- Agregar columna archived_at
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Agregar columna archived_by
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Agregar columna motivo_anulacion
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

-- Agregar constraint para validar lógica de archivado
ALTER TABLE contracts
ADD CONSTRAINT check_contracts_archived_logic 
CHECK (
  (archived_at IS NULL AND archived_by IS NULL AND motivo_anulacion IS NULL) OR 
  (archived_at IS NOT NULL AND archived_by IS NOT NULL AND motivo_anulacion IS NOT NULL AND length(trim(motivo_anulacion)) > 0)
);

-- Agregar foreign key para archived_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_contracts_archived_by'
  ) THEN
    ALTER TABLE contracts
    ADD CONSTRAINT fk_contracts_archived_by
    FOREIGN KEY (archived_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN contracts.archived_at IS 'Fecha de anulación/archivado del contrato. Si es NULL, el contrato está activo.';
COMMENT ON COLUMN contracts.archived_by IS 'Usuario que anuló/archivó el contrato. Obligatorio si archived_at no es NULL.';
COMMENT ON COLUMN contracts.motivo_anulacion IS 'Motivo de anulación del contrato. Obligatorio si el contrato está anulado.';

-- ===============================================
-- 2. CREAR ÍNDICE PARA FILTRAR CONTRATOS NO ANULADOS
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_contracts_archived_at 
ON contracts(archived_at) 
WHERE archived_at IS NULL;

-- ===============================================
-- 3. FUNCIÓN RPC PARA ANULAR CONTRATOS
-- ===============================================

CREATE OR REPLACE FUNCTION anular_contract(
  contract_id UUID,
  anulador_user_id UUID,
  motivo TEXT
) RETURNS JSON AS $$
DECLARE
  contract_record RECORD;
  result JSON;
BEGIN
  -- Verificar que el contrato existe y no está ya anulado
  SELECT * INTO contract_record
  FROM contracts 
  WHERE id = contract_id AND archived_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Contrato no encontrado o ya está anulado'
    );
  END IF;
  
  -- Verificar que el usuario tiene permisos para editar contratos
  IF NOT has_permission(anulador_user_id, 'contracts', 'edit') THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'No tienes permisos para anular contratos'
    );
  END IF;
  
  -- Validar que el motivo no esté vacío
  IF motivo IS NULL OR trim(motivo) = '' THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'El motivo de anulación es obligatorio'
    );
  END IF;
  
  -- Anular el contrato
  UPDATE contracts 
  SET 
    archived_at = NOW(),
    archived_by = anulador_user_id,
    motivo_anulacion = trim(motivo),
    updated_at = NOW(),
    updated_by = anulador_user_id
  WHERE id = contract_id;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Contrato anulado exitosamente',
    'archived_at', NOW(),
    'motivo', trim(motivo)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION anular_contract(UUID, UUID, TEXT) IS 'Anula un contrato estableciendo archived_at, archived_by y motivo_anulacion. Requiere permisos de edición y motivo obligatorio.';

-- ===============================================
-- 4. VERIFICACIÓN
-- ===============================================

-- Verificar que las columnas se agregaron correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name = 'archived_at'
  ) THEN
    RAISE EXCEPTION 'Error: La columna archived_at no se agregó correctamente';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name = 'archived_by'
  ) THEN
    RAISE EXCEPTION 'Error: La columna archived_by no se agregó correctamente';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name = 'motivo_anulacion'
  ) THEN
    RAISE EXCEPTION 'Error: La columna motivo_anulacion no se agregó correctamente';
  END IF;
END $$;

-- ===============================================
-- COMENTARIOS:
-- - Los contratos anulados tienen archived_at, archived_by y motivo_anulacion
-- - El motivo es obligatorio (validado por constraint y función RPC)
-- - Los contratos anulados deben filtrarse en las consultas (archived_at IS NULL)
-- - Solo usuarios con permiso contracts.edit pueden anular contratos
-- ===============================================

