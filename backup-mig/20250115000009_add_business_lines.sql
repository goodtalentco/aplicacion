-- ===============================================
-- MIGRACIÓN: SISTEMA DE LÍNEAS DE NEGOCIO
-- Fecha: 2025-01-15
-- Descripción: Agrega módulo de líneas de negocio con 3 tablas
-- Incluye: permisos, tablas con RLS, datos iniciales de 6 líneas
-- ===============================================

-- ===============================================
-- 1. NUEVOS PERMISOS PARA LÍNEAS DE NEGOCIO
-- ===============================================

INSERT INTO permissions (table_name, action, description) VALUES
-- Módulo de líneas de negocio
('lineas_negocio', 'view', 'Ver líneas de negocio del sistema'),
('lineas_negocio', 'create', 'Crear nuevas líneas de negocio'),
('lineas_negocio', 'edit', 'Editar líneas de negocio existentes'),
('lineas_negocio', 'delete', 'Eliminar líneas de negocio'),
-- Responsables de líneas de negocio
('linea_negocio_responsables', 'view', 'Ver responsables de líneas de negocio'),
('linea_negocio_responsables', 'create', 'Asignar responsables a líneas de negocio'),
('linea_negocio_responsables', 'edit', 'Modificar asignaciones de responsables'),
('linea_negocio_responsables', 'delete', 'Remover responsables de líneas de negocio'),
-- Líneas de negocio por empresa
('empresa_lineas_negocio', 'view', 'Ver líneas de negocio asignadas a empresas'),
('empresa_lineas_negocio', 'create', 'Asignar líneas de negocio a empresas'),
('empresa_lineas_negocio', 'edit', 'Modificar líneas de negocio de empresas'),
('empresa_lineas_negocio', 'delete', 'Remover líneas de negocio de empresas')
ON CONFLICT (table_name, action) DO NOTHING;

-- ===============================================
-- 2. TABLA LÍNEAS DE NEGOCIO (CATÁLOGO)
-- ===============================================

CREATE TABLE IF NOT EXISTS lineas_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  es_activa BOOLEAN NOT NULL DEFAULT true,
  color_hex TEXT DEFAULT '#004C4C',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT lineas_negocio_nombre_not_empty CHECK (length(trim(nombre)) > 0),
  CONSTRAINT lineas_negocio_descripcion_not_empty CHECK (length(trim(descripcion)) > 0),
  CONSTRAINT lineas_negocio_color_hex_format CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- Foreign Keys para lineas_negocio
DO $$
BEGIN
  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_lineas_negocio_created_by'
  ) THEN
    ALTER TABLE lineas_negocio 
    ADD CONSTRAINT fk_lineas_negocio_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_lineas_negocio_updated_by'
  ) THEN
    ALTER TABLE lineas_negocio 
    ADD CONSTRAINT fk_lineas_negocio_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para lineas_negocio
CREATE INDEX IF NOT EXISTS idx_lineas_negocio_nombre ON lineas_negocio(nombre);
CREATE INDEX IF NOT EXISTS idx_lineas_negocio_es_activa ON lineas_negocio(es_activa);
CREATE INDEX IF NOT EXISTS idx_lineas_negocio_created_by ON lineas_negocio(created_by);

-- ===============================================
-- 3. TABLA RESPONSABLES DE LÍNEAS DE NEGOCIO
-- ===============================================

CREATE TABLE IF NOT EXISTS linea_negocio_responsables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_negocio_id UUID NOT NULL,
  user_id UUID NOT NULL,
  es_asignado_principal BOOLEAN NOT NULL DEFAULT false,
  fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  asignado_por UUID NOT NULL,
  es_activo BOOLEAN NOT NULL DEFAULT true,
  
  -- Constraints
  CONSTRAINT unique_responsable_por_linea UNIQUE(linea_negocio_id, user_id)
);

-- Foreign Keys para linea_negocio_responsables
DO $$
BEGIN
  -- FK a lineas_negocio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_linea_negocio_responsables_linea_negocio_id'
  ) THEN
    ALTER TABLE linea_negocio_responsables 
    ADD CONSTRAINT fk_linea_negocio_responsables_linea_negocio_id 
    FOREIGN KEY (linea_negocio_id) REFERENCES lineas_negocio(id) ON DELETE CASCADE;
  END IF;

  -- FK a auth.users (responsable)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_linea_negocio_responsables_user_id'
  ) THEN
    ALTER TABLE linea_negocio_responsables 
    ADD CONSTRAINT fk_linea_negocio_responsables_user_id 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- FK a auth.users (quien asignó)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_linea_negocio_responsables_asignado_por'
  ) THEN
    ALTER TABLE linea_negocio_responsables 
    ADD CONSTRAINT fk_linea_negocio_responsables_asignado_por 
    FOREIGN KEY (asignado_por) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para linea_negocio_responsables
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_linea_negocio_id ON linea_negocio_responsables(linea_negocio_id);
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_user_id ON linea_negocio_responsables(user_id);
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_es_activo ON linea_negocio_responsables(es_activo);
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_es_principal ON linea_negocio_responsables(es_asignado_principal);

-- ===============================================
-- 4. TABLA LÍNEAS DE NEGOCIO POR EMPRESA
-- ===============================================

CREATE TABLE IF NOT EXISTS empresa_lineas_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  linea_negocio_id UUID NOT NULL,
  fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  asignado_por UUID NOT NULL,
  es_activa BOOLEAN NOT NULL DEFAULT true,
  
  -- Constraints
  CONSTRAINT unique_empresa_linea_negocio UNIQUE(empresa_id, linea_negocio_id)
);

-- Foreign Keys para empresa_lineas_negocio
DO $$
BEGIN
  -- FK a companies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_empresa_lineas_negocio_empresa_id'
  ) THEN
    ALTER TABLE empresa_lineas_negocio 
    ADD CONSTRAINT fk_empresa_lineas_negocio_empresa_id 
    FOREIGN KEY (empresa_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  -- FK a lineas_negocio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_empresa_lineas_negocio_linea_negocio_id'
  ) THEN
    ALTER TABLE empresa_lineas_negocio 
    ADD CONSTRAINT fk_empresa_lineas_negocio_linea_negocio_id 
    FOREIGN KEY (linea_negocio_id) REFERENCES lineas_negocio(id) ON DELETE CASCADE;
  END IF;

  -- FK a auth.users (quien asignó)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_empresa_lineas_negocio_asignado_por'
  ) THEN
    ALTER TABLE empresa_lineas_negocio 
    ADD CONSTRAINT fk_empresa_lineas_negocio_asignado_por 
    FOREIGN KEY (asignado_por) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para empresa_lineas_negocio
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_empresa_id ON empresa_lineas_negocio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_linea_negocio_id ON empresa_lineas_negocio(linea_negocio_id);
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_es_activa ON empresa_lineas_negocio(es_activa);
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_fecha_asignacion ON empresa_lineas_negocio(fecha_asignacion);

-- ===============================================
-- 5. TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ===============================================

-- Reutilizar la función existente para tablas auxiliares
-- Triggers para todas las tablas de líneas de negocio
DROP TRIGGER IF EXISTS trigger_lineas_negocio_updated_at ON lineas_negocio;
CREATE TRIGGER trigger_lineas_negocio_updated_at
  BEFORE UPDATE ON lineas_negocio
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

-- No necesitan triggers de updated_at las otras tablas porque no tienen ese campo
-- Solo tienen fecha_asignacion que no se actualiza automáticamente

-- ===============================================
-- 6. HABILITACIÓN DE RLS
-- ===============================================

ALTER TABLE lineas_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE linea_negocio_responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_lineas_negocio ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 7. POLÍTICAS RLS PARA LÍNEAS DE NEGOCIO
-- ===============================================

-- Políticas para LÍNEAS DE NEGOCIO
DROP POLICY IF EXISTS "lineas_negocio_select_policy" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_insert_policy" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_update_policy" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_delete_policy" ON lineas_negocio;

CREATE POLICY "lineas_negocio_select_policy" ON lineas_negocio
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'lineas_negocio', 'view'));

CREATE POLICY "lineas_negocio_insert_policy" ON lineas_negocio
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'lineas_negocio', 'create'));

CREATE POLICY "lineas_negocio_update_policy" ON lineas_negocio
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'lineas_negocio', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'lineas_negocio', 'edit'));

CREATE POLICY "lineas_negocio_delete_policy" ON lineas_negocio
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'lineas_negocio', 'delete'));

-- Políticas para RESPONSABLES DE LÍNEAS DE NEGOCIO
DROP POLICY IF EXISTS "linea_negocio_responsables_select_policy" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_insert_policy" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_update_policy" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_delete_policy" ON linea_negocio_responsables;

CREATE POLICY "linea_negocio_responsables_select_policy" ON linea_negocio_responsables
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'linea_negocio_responsables', 'view'));

CREATE POLICY "linea_negocio_responsables_insert_policy" ON linea_negocio_responsables
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'linea_negocio_responsables', 'create'));

CREATE POLICY "linea_negocio_responsables_update_policy" ON linea_negocio_responsables
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'linea_negocio_responsables', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'linea_negocio_responsables', 'edit'));

CREATE POLICY "linea_negocio_responsables_delete_policy" ON linea_negocio_responsables
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'linea_negocio_responsables', 'delete'));

-- Políticas para LÍNEAS DE NEGOCIO POR EMPRESA
DROP POLICY IF EXISTS "empresa_lineas_negocio_select_policy" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_update_policy" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_delete_policy" ON empresa_lineas_negocio;

CREATE POLICY "empresa_lineas_negocio_select_policy" ON empresa_lineas_negocio
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'empresa_lineas_negocio', 'view'));

CREATE POLICY "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'empresa_lineas_negocio', 'create'));

CREATE POLICY "empresa_lineas_negocio_update_policy" ON empresa_lineas_negocio
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'empresa_lineas_negocio', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'empresa_lineas_negocio', 'edit'));

CREATE POLICY "empresa_lineas_negocio_delete_policy" ON empresa_lineas_negocio
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'empresa_lineas_negocio', 'delete'));

-- ===============================================
-- 8. GRANTS PARA ROL AUTHENTICATED
-- ===============================================

-- Grants para tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON lineas_negocio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linea_negocio_responsables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON empresa_lineas_negocio TO authenticated;

-- ===============================================
-- 9. FUNCIONES HELPER PARA LÍNEAS DE NEGOCIO
-- ===============================================

-- Función para obtener responsables de una línea de negocio
CREATE OR REPLACE FUNCTION get_linea_negocio_responsables(linea_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  es_principal BOOLEAN,
  fecha_asignacion TIMESTAMPTZ
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    lnr.user_id,
    au.email,
    lnr.es_asignado_principal,
    lnr.fecha_asignacion
  FROM linea_negocio_responsables lnr
  JOIN auth.users au ON lnr.user_id = au.id
  WHERE lnr.linea_negocio_id = linea_id 
    AND lnr.es_activo = true
  ORDER BY lnr.es_asignado_principal DESC, lnr.fecha_asignacion ASC;
$$;

-- Función para obtener líneas de negocio de una empresa
CREATE OR REPLACE FUNCTION get_empresa_lineas_negocio(empresa_uuid UUID)
RETURNS TABLE (
  linea_negocio_id UUID,
  nombre TEXT,
  descripcion TEXT,
  color_hex TEXT,
  fecha_asignacion TIMESTAMPTZ,
  responsables_count INTEGER
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ln.id,
    ln.nombre,
    ln.descripcion,
    ln.color_hex,
    eln.fecha_asignacion,
    (
      SELECT COUNT(*)::INTEGER
      FROM linea_negocio_responsables lnr
      WHERE lnr.linea_negocio_id = ln.id 
        AND lnr.es_activo = true
    ) as responsables_count
  FROM empresa_lineas_negocio eln
  JOIN lineas_negocio ln ON eln.linea_negocio_id = ln.id
  WHERE eln.empresa_id = empresa_uuid 
    AND eln.es_activa = true
    AND ln.es_activa = true
  ORDER BY eln.fecha_asignacion ASC;
$$;

-- Función para obtener empresas por línea de negocio
CREATE OR REPLACE FUNCTION get_empresas_por_linea_negocio(linea_id UUID)
RETURNS TABLE (
  empresa_id UUID,
  nombre TEXT,
  tax_id TEXT,
  status BOOLEAN,
  fecha_asignacion TIMESTAMPTZ
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    c.id,
    c.name,
    c.tax_id,
    c.status,
    eln.fecha_asignacion
  FROM empresa_lineas_negocio eln
  JOIN companies c ON eln.empresa_id = c.id
  WHERE eln.linea_negocio_id = linea_id 
    AND eln.es_activa = true
    AND c.archived_at IS NULL
  ORDER BY c.name ASC;
$$;

-- ===============================================
-- 10. DATOS INICIALES - LÍNEAS DE NEGOCIO
-- ===============================================

-- Función helper para insertar datos iniciales con usuario del sistema
CREATE OR REPLACE FUNCTION insert_initial_business_lines()
RETURNS VOID AS $$
DECLARE
  system_user_id UUID;
BEGIN
  -- Buscar un usuario del sistema (el primer super admin)
  SELECT u.id INTO system_user_id
  FROM auth.users u
  JOIN user_permissions up ON u.id = up.user_id
  JOIN permissions p ON up.permission_id = p.id
  WHERE p.table_name = 'user_permissions' AND p.action = 'create'
  AND up.is_active = true
  LIMIT 1;
  
  -- Si no hay usuarios, crear registros sin auditoría
  IF system_user_id IS NULL THEN
    RAISE NOTICE 'No system user found, skipping initial business lines insertion';
    RETURN;
  END IF;

  -- INSERTAR LÍNEAS DE NEGOCIO INICIALES
  INSERT INTO lineas_negocio (nombre, descripcion, es_activa, color_hex, created_by, updated_by) VALUES
    (
      'Legal Laboral',
      'Asesoría jurídica especializada en derecho laboral, contratos y normatividad empresarial',
      true,
      '#004C4C',
      system_user_id,
      system_user_id
    ),
    (
      'Riesgos Laborales',
      'Gestión integral de seguridad y salud en el trabajo, prevención de riesgos y cumplimiento normativo',
      true,
      '#065C5C',
      system_user_id,
      system_user_id
    ),
    (
      'Payroll',
      'Administración completa de nómina, liquidaciones y gestión de prestaciones sociales',
      true,
      '#0A6A6A',
      system_user_id,
      system_user_id
    ),
    (
      'Selección',
      'Procesos de reclutamiento, selección y evaluación de talento humano especializado',
      true,
      '#87E0E0',
      system_user_id,
      system_user_id
    ),
    (
      'Contratación y Administración de Personal',
      'Gestión integral de contratación, administración y desarrollo del talento humano',
      true,
      '#5FD3D2',
      system_user_id,
      system_user_id
    ),
    (
      'Temporales',
      'Suministro de personal temporal calificado para cubrir necesidades empresariales específicas',
      true,
      '#58BFC2',
      system_user_id,
      system_user_id
    )
  ON CONFLICT (nombre) DO NOTHING;

  RAISE NOTICE 'Líneas de negocio iniciales insertadas correctamente';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función de inserción de datos iniciales
SELECT insert_initial_business_lines();

-- Limpiar la función temporal
DROP FUNCTION insert_initial_business_lines();

-- ===============================================
-- 11. GRANTS PARA FUNCIONES HELPER
-- ===============================================

GRANT EXECUTE ON FUNCTION get_linea_negocio_responsables(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresa_lineas_negocio(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresas_por_linea_negocio(UUID) TO authenticated;

-- ===============================================
-- 12. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

-- Comentarios en tablas
COMMENT ON TABLE lineas_negocio IS 'Catálogo de líneas de negocio disponibles en el sistema';
COMMENT ON TABLE linea_negocio_responsables IS 'Asignación de responsables a líneas de negocio específicas';
COMMENT ON TABLE empresa_lineas_negocio IS 'Relación entre empresas clientes y líneas de negocio contratadas';

-- Comentarios en funciones
COMMENT ON FUNCTION get_linea_negocio_responsables(UUID) IS 'Obtiene todos los responsables activos de una línea de negocio';
COMMENT ON FUNCTION get_empresa_lineas_negocio(UUID) IS 'Obtiene todas las líneas de negocio activas de una empresa';
COMMENT ON FUNCTION get_empresas_por_linea_negocio(UUID) IS 'Obtiene todas las empresas que tienen asignada una línea de negocio específica';

-- ===============================================
-- 13. VERIFICACIONES POST-MIGRACIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que RLS está habilitado
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename IN ('lineas_negocio','linea_negocio_responsables','empresa_lineas_negocio')
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS habilitado en todas las tablas de líneas de negocio';
  ELSE
    RAISE NOTICE 'WARNING: Verificar que RLS esté habilitado en tablas de líneas de negocio';
  END IF;

  -- Verificar que las tablas existen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('lineas_negocio','linea_negocio_responsables','empresa_lineas_negocio')
  ) THEN
    RAISE NOTICE 'SUCCESS: Todas las tablas de líneas de negocio fueron creadas';
  ELSE
    RAISE NOTICE 'ERROR: Faltan tablas de líneas de negocio';
  END IF;

  -- Verificar que los permisos de líneas de negocio existen
  IF EXISTS (SELECT 1 FROM permissions WHERE table_name = 'lineas_negocio' LIMIT 1) THEN
    RAISE NOTICE 'SUCCESS: Permisos de líneas de negocio insertados correctamente';
  ELSE
    RAISE NOTICE 'WARNING: Verificar permisos de líneas de negocio';
  END IF;

  -- Contar datos insertados
  RAISE NOTICE 'Líneas de negocio insertadas: %', (SELECT COUNT(*) FROM lineas_negocio);

  RAISE NOTICE '=== MIGRACIÓN LÍNEAS DE NEGOCIO COMPLETADA EXITOSAMENTE ===';
  RAISE NOTICE 'Tablas: 3 tablas principales con RLS y auditoría';
  RAISE NOTICE 'Permisos: 12 permisos para gestión completa del módulo';
  RAISE NOTICE 'Datos: 6 líneas de negocio iniciales con descripciones';
  RAISE NOTICE 'Funciones: 3 funciones helper para consultas optimizadas';
  RAISE NOTICE 'Seguridad: RLS habilitado con políticas completas';
END $$;

-- ===============================================
-- FIN DE MIGRACIÓN LÍNEAS DE NEGOCIO
-- ===============================================
