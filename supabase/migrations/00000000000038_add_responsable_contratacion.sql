-- ===============================================
-- MIGRACIÓN: Agregar Responsable de Contratación
-- Fecha: 2025-01-22
-- Versión: 38
-- Descripción: Agrega campo responsable_contratacion_id a contracts y permiso Administrador de contratos
-- ===============================================

-- ===============================================
-- 1. AGREGAR CAMPO responsable_contratacion_id A CONTRACTSs
-- ===============================================

-- Agregar columna responsable_contratacion_id (FK a auth.users)
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS responsable_contratacion_id UUID;

-- Agregar foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_contracts_responsable_contratacion'
  ) THEN
    ALTER TABLE contracts 
    ADD CONSTRAINT fk_contracts_responsable_contratacion 
    FOREIGN KEY (responsable_contratacion_id) 
    REFERENCES auth.users(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Agregar índice para búsquedas por responsable
CREATE INDEX IF NOT EXISTS idx_contracts_responsable_contratacion 
ON contracts(responsable_contratacion_id);

-- Comentario en la columna
COMMENT ON COLUMN contracts.responsable_contratacion_id IS 
'Usuario responsable del proceso de contratación y onboarding de este empleado';

-- ===============================================
-- 2. CREAR PERMISO "Administrador de contratos"
-- ===============================================

-- Insertar permiso si no existe
INSERT INTO permissions (table_name, action, description, is_active)
VALUES (
  'contracts',
  'admin',
  'Administrador de contratos - Puede modificar el responsable de contratación',
  true
)
ON CONFLICT (table_name, action) DO UPDATE
SET description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ===============================================
-- 3. ACTUALIZAR POLÍTICAS RLS (si es necesario)
-- ===============================================

-- Las políticas RLS existentes ya permiten ver/editar contratos según permisos
-- El campo responsable_contratacion_id se puede editar con el permiso contracts.edit
-- o contracts.admin (para cambiar responsable específicamente)

-- ===============================================
-- 4. CREAR FUNCIÓN COMPUTED COLUMN PARA HANDLE DEL RESPONSABLE
-- ===============================================

-- Handle del responsable de contratación (computed column)
CREATE OR REPLACE FUNCTION contracts_responsable_contratacion_handle(c contracts)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN ub.email IS NULL THEN NULL
    ELSE split_part(ub.email::TEXT, '@', 1)
  END
  FROM usuarios_basicos ub
  WHERE ub.id = c.responsable_contratacion_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION contracts_responsable_contratacion_handle(contracts) IS 
'Retorna el handle (parte antes de @) del email del responsable de contratación';
