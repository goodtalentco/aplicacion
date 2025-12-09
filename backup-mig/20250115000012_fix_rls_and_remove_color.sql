-- ===============================================
-- MIGRACIÓN: ARREGLAR RLS Y REMOVER COLOR
-- Fecha: 2025-01-15
-- Descripción: Simplifica RLS para usuarios con tablas auxiliares y quita color
-- Problemas: RLS muy restrictivo, columna color innecesaria
-- ===============================================

-- ===============================================
-- 1. SIMPLIFICAR RLS - PERMITIR A USUARIOS CON TABLAS AUXILIARES
-- ===============================================

-- Política más permisiva para líneas de negocio - Ver
DROP POLICY IF EXISTS "lineas_negocio_select_policy" ON lineas_negocio;
CREATE POLICY "lineas_negocio_select_policy" ON lineas_negocio
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
    has_permission(auth.uid(), 'lineas_negocio', 'view')
  );

-- Política más permisiva para líneas de negocio - Crear
DROP POLICY IF EXISTS "lineas_negocio_insert_policy" ON lineas_negocio;
CREATE POLICY "lineas_negocio_insert_policy" ON lineas_negocio
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'tablas_auxiliares', 'create') OR
    has_permission(auth.uid(), 'lineas_negocio', 'create')
  );

-- Política más permisiva para líneas de negocio - Editar
DROP POLICY IF EXISTS "lineas_negocio_update_policy" ON lineas_negocio;
CREATE POLICY "lineas_negocio_update_policy" ON lineas_negocio
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit') OR
    has_permission(auth.uid(), 'lineas_negocio', 'edit')
  )
  WITH CHECK (
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit') OR
    has_permission(auth.uid(), 'lineas_negocio', 'edit')
  );

-- Política más permisiva para líneas de negocio - Eliminar
DROP POLICY IF EXISTS "lineas_negocio_delete_policy" ON lineas_negocio;
CREATE POLICY "lineas_negocio_delete_policy" ON lineas_negocio
  FOR DELETE TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'delete') OR
    has_permission(auth.uid(), 'lineas_negocio', 'delete')
  );

-- ===============================================
-- 2. SIMPLIFICAR RLS PARA RESPONSABLES
-- ===============================================

-- Política más permisiva para responsables - Ver
DROP POLICY IF EXISTS "linea_negocio_responsables_select_policy" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_select_policy" ON linea_negocio_responsables
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
    has_permission(auth.uid(), 'linea_negocio_responsables', 'view') OR
    has_permission(auth.uid(), 'lineas_negocio', 'view') OR
    user_id = auth.uid()
  );

-- Política más permisiva para responsables - Crear
DROP POLICY IF EXISTS "linea_negocio_responsables_insert_policy" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_insert_policy" ON linea_negocio_responsables
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'tablas_auxiliares', 'create') OR
    has_permission(auth.uid(), 'linea_negocio_responsables', 'create')
  );

-- Política más permisiva para responsables - Editar
DROP POLICY IF EXISTS "linea_negocio_responsables_update_policy" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_update_policy" ON linea_negocio_responsables
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit') OR
    has_permission(auth.uid(), 'linea_negocio_responsables', 'edit')
  )
  WITH CHECK (
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit') OR
    has_permission(auth.uid(), 'linea_negocio_responsables', 'edit')
  );

-- Política más permisiva para responsables - Eliminar
DROP POLICY IF EXISTS "linea_negocio_responsables_delete_policy" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_delete_policy" ON linea_negocio_responsables
  FOR DELETE TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'delete') OR
    has_permission(auth.uid(), 'linea_negocio_responsables', 'delete')
  );

-- ===============================================
-- 3. SIMPLIFICAR RLS PARA EMPRESA LÍNEAS NEGOCIO
-- ===============================================

-- Estas políticas ya están bien por la migración anterior, pero las reforzamos
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'tablas_auxiliares', 'create') OR
    has_permission(auth.uid(), 'empresa_lineas_negocio', 'create') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit')
  );

-- ===============================================
-- 4. REMOVER COLUMNA COLOR_HEX
-- ===============================================

-- Remover constraint del color
ALTER TABLE lineas_negocio 
DROP CONSTRAINT IF EXISTS lineas_negocio_color_hex_format;

-- Remover la columna color_hex
ALTER TABLE lineas_negocio 
DROP COLUMN IF EXISTS color_hex;

-- ===============================================
-- 5. ACTUALIZAR FUNCIONES HELPER PARA REMOVER COLOR
-- ===============================================

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS get_empresa_lineas_negocio(UUID);

-- Recrear función para obtener líneas de negocio de empresas sin color
CREATE OR REPLACE FUNCTION get_empresa_lineas_negocio(empresa_uuid UUID)
RETURNS TABLE (
  linea_negocio_id UUID,
  nombre TEXT,
  descripcion TEXT,
  fecha_asignacion TIMESTAMPTZ,
  responsables_count INTEGER
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ln.id,
    ln.nombre,
    ln.descripcion,
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

-- ===============================================
-- 6. DEBUG - FUNCIÓN PARA VERIFICAR PERMISOS DE USUARIO
-- ===============================================

-- Función de debug para verificar permisos de un usuario
CREATE OR REPLACE FUNCTION debug_user_permissions(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  user_id UUID,
  table_name TEXT,
  action TEXT,
  description TEXT,
  has_tablas_auxiliares BOOLEAN
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    up.user_id,
    p.table_name,
    p.action,
    p.description,
    EXISTS(
      SELECT 1 FROM user_permissions up2
      JOIN permissions p2 ON up2.permission_id = p2.id
      WHERE up2.user_id = user_uuid
        AND p2.table_name = 'tablas_auxiliares'
        AND p2.action = 'view'
        AND up2.is_active = true
    ) as has_tablas_auxiliares
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = COALESCE(user_uuid, auth.uid())
    AND up.is_active = true
  ORDER BY p.table_name, p.action;
$$;

-- ===============================================
-- 7. GRANTS Y COMENTARIOS
-- ===============================================

GRANT EXECUTE ON FUNCTION debug_user_permissions(UUID) TO authenticated;

COMMENT ON FUNCTION debug_user_permissions(UUID) IS 'Función de debug para verificar permisos de usuario y diagnosticar problemas de RLS';

-- ===============================================
-- 8. VERIFICACIONES POST-MIGRACIÓN
-- ===============================================

DO $$
DECLARE
  color_column_exists BOOLEAN;
BEGIN
  -- Verificar si la columna color_hex fue removida
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lineas_negocio' 
    AND column_name = 'color_hex'
  ) INTO color_column_exists;

  IF NOT color_column_exists THEN
    RAISE NOTICE 'SUCCESS: Columna color_hex removida correctamente';
  ELSE
    RAISE NOTICE 'WARNING: No se pudo remover la columna color_hex';
  END IF;

  -- Verificar que las políticas fueron actualizadas
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lineas_negocio'
    AND policyname = 'lineas_negocio_insert_policy'
  ) THEN
    RAISE NOTICE 'SUCCESS: Políticas RLS de líneas de negocio actualizadas';
  ELSE
    RAISE NOTICE 'ERROR: No se pudieron actualizar las políticas RLS';
  END IF;

  -- Verificar función de debug
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'debug_user_permissions'
  ) THEN
    RAISE NOTICE 'SUCCESS: Función de debug creada correctamente';
  ELSE
    RAISE NOTICE 'ERROR: No se pudo crear la función de debug';
  END IF;

  RAISE NOTICE '=== CORRECCIONES RLS Y COLUMNA COLOR COMPLETADAS ===';
  RAISE NOTICE 'RLS: Simplificado para usuarios con permisos de tablas_auxiliares';
  RAISE NOTICE 'Color: Columna removida de lineas_negocio';
  RAISE NOTICE 'Debug: Función debug_user_permissions() disponible';
  RAISE NOTICE 'Test: Ejecuta SELECT debug_user_permissions() para verificar permisos';
END $$;

-- ===============================================
-- FIN DE CORRECCIONES RLS Y COLOR
-- ===============================================
