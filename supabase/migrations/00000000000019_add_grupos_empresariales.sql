-- =====================================================
-- MIGRACIÓN: Sistema de Grupos Empresariales
-- Fecha: 2025-01-22
-- Descripción: Agrega tabla grupos_empresariales y campo grupo_empresarial_id a companies
-- =====================================================

-- Crear tabla grupos_empresariales
CREATE TABLE IF NOT EXISTS grupos_empresariales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  
  -- Restricciones
  CONSTRAINT unique_grupo_empresarial_nombre UNIQUE (nombre),
  CONSTRAINT check_nombre_not_empty CHECK (LENGTH(TRIM(nombre)) > 0)
);

-- Comentarios para la tabla
COMMENT ON TABLE grupos_empresariales IS 'Tabla de grupos empresariales para agrupar empresas relacionadas';
COMMENT ON COLUMN grupos_empresariales.id IS 'Identificador único del grupo empresarial';
COMMENT ON COLUMN grupos_empresariales.nombre IS 'Nombre único del grupo empresarial';
COMMENT ON COLUMN grupos_empresariales.descripcion IS 'Descripción opcional del grupo empresarial';
COMMENT ON COLUMN grupos_empresariales.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN grupos_empresariales.created_by IS 'Usuario que creó el registro';
COMMENT ON COLUMN grupos_empresariales.updated_at IS 'Fecha de última actualización';
COMMENT ON COLUMN grupos_empresariales.updated_by IS 'Usuario que realizó la última actualización';

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_grupos_empresariales_nombre ON grupos_empresariales (nombre);
CREATE INDEX IF NOT EXISTS idx_grupos_empresariales_created_at ON grupos_empresariales (created_at);

-- Agregar campo grupo_empresarial_id a tabla companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS grupo_empresarial_id UUID REFERENCES grupos_empresariales(id);

-- Comentario para el nuevo campo
COMMENT ON COLUMN companies.grupo_empresarial_id IS 'Referencia al grupo empresarial al que pertenece la empresa (opcional)';

-- Índice para el nuevo campo
CREATE INDEX IF NOT EXISTS idx_companies_grupo_empresarial_id ON companies (grupo_empresarial_id);

-- Trigger para updated_at en grupos_empresariales
CREATE OR REPLACE FUNCTION update_grupos_empresariales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_grupos_empresariales_updated_at
  BEFORE UPDATE ON grupos_empresariales
  FOR EACH ROW
  EXECUTE FUNCTION update_grupos_empresariales_updated_at();

-- Habilitar RLS en grupos_empresariales
ALTER TABLE grupos_empresariales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para grupos_empresariales
CREATE POLICY "Usuarios con permiso companies.view pueden ver grupos empresariales"
  ON grupos_empresariales FOR SELECT
  USING (has_permission(auth.uid(), 'companies', 'view'));

CREATE POLICY "Usuarios con permiso companies.create pueden crear grupos empresariales"
  ON grupos_empresariales FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'companies', 'create'));

CREATE POLICY "Usuarios con permiso companies.edit pueden editar grupos empresariales"
  ON grupos_empresariales FOR UPDATE
  USING (has_permission(auth.uid(), 'companies', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'companies', 'edit'));

CREATE POLICY "Usuarios con permiso companies.delete pueden eliminar grupos empresariales"
  ON grupos_empresariales FOR DELETE
  USING (has_permission(auth.uid(), 'companies', 'delete'));

-- Función helper para obtener o crear un grupo empresarial
CREATE OR REPLACE FUNCTION get_or_create_grupo_empresarial(grupo_nombre TEXT)
RETURNS UUID AS $$
DECLARE
  grupo_id UUID;
BEGIN
  -- Verificar que el nombre no esté vacío
  IF TRIM(grupo_nombre) = '' OR grupo_nombre IS NULL THEN
    RAISE EXCEPTION 'El nombre del grupo empresarial no puede estar vacío';
  END IF;
  
  -- Buscar si ya existe
  SELECT id INTO grupo_id
  FROM grupos_empresariales
  WHERE nombre = TRIM(grupo_nombre);
  
  -- Si no existe, crearlo
  IF grupo_id IS NULL THEN
    INSERT INTO grupos_empresariales (nombre, created_by, updated_by)
    VALUES (TRIM(grupo_nombre), auth.uid(), auth.uid())
    RETURNING id INTO grupo_id;
  END IF;
  
  RETURN grupo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para la función
COMMENT ON FUNCTION get_or_create_grupo_empresarial(TEXT) IS 'Obtiene el ID de un grupo empresarial existente o lo crea si no existe';

-- Función para obtener empresas por grupo empresarial
CREATE OR REPLACE FUNCTION get_empresas_por_grupo(grupo_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  tax_id TEXT,
  status BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.tax_id,
    c.status,
    c.created_at
  FROM companies c
  WHERE c.grupo_empresarial_id = grupo_id
    AND c.archived_at IS NULL
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para la función
COMMENT ON FUNCTION get_empresas_por_grupo(UUID) IS 'Obtiene todas las empresas que pertenecen a un grupo empresarial específico';

-- Función para obtener todos los grupos empresariales con conteo de empresas
CREATE OR REPLACE FUNCTION get_grupos_empresariales_with_count()
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  descripcion TEXT,
  empresa_count BIGINT,
  created_at TIMESTAMPTZ,
  created_by_handle TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.nombre,
    g.descripcion,
    COUNT(c.id) as empresa_count,
    g.created_at,
    get_user_handle(g.created_by) as created_by_handle
  FROM grupos_empresariales g
  LEFT JOIN companies c ON c.grupo_empresarial_id = g.id AND c.archived_at IS NULL
  GROUP BY g.id, g.nombre, g.descripcion, g.created_at, g.created_by
  ORDER BY g.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para la función
COMMENT ON FUNCTION get_grupos_empresariales_with_count() IS 'Obtiene todos los grupos empresariales con el conteo de empresas asociadas';

-- Grant permisos para la nueva tabla
GRANT SELECT, INSERT, UPDATE, DELETE ON grupos_empresariales TO authenticated;

-- Verificación final
DO $$
BEGIN
  -- Verificar que la tabla fue creada correctamente
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grupos_empresariales') THEN
    RAISE EXCEPTION 'Error: La tabla grupos_empresariales no fue creada correctamente';
  END IF;
  
  -- Verificar que el campo fue agregado a companies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'grupo_empresarial_id'
  ) THEN
    RAISE EXCEPTION 'Error: El campo grupo_empresarial_id no fue agregado a la tabla companies';
  END IF;
  
  -- Verificar que las funciones fueron creadas
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_or_create_grupo_empresarial') THEN
    RAISE EXCEPTION 'Error: La función get_or_create_grupo_empresarial no fue creada';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Sistema de Grupos Empresariales implementado';
END $$;
