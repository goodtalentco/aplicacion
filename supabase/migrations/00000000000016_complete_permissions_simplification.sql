-- ===============================================
-- MIGRACIÓN: Completar Simplificación de Permisos
-- Fecha: 2025-01-17
-- Descripción: Elimina permisos redundantes restantes de líneas de negocio
-- ===============================================

-- ===============================================
-- 1. ELIMINAR PERMISOS REDUNDANTES DE LÍNEAS DE NEGOCIO
-- ===============================================

-- Eliminar permisos de lineas_negocio (heredan de tablas_auxiliares)
DELETE FROM permissions 
WHERE table_name = 'lineas_negocio' AND action IN ('view', 'create', 'edit', 'delete');

-- Eliminar permisos de linea_negocio_responsables (heredan de tablas_auxiliares)
DELETE FROM permissions 
WHERE table_name = 'linea_negocio_responsables' AND action IN ('view', 'create', 'edit', 'delete');

-- Eliminar permisos de empresa_lineas_negocio (heredan de companies)
DELETE FROM permissions 
WHERE table_name = 'empresa_lineas_negocio' AND action IN ('view', 'create', 'edit', 'delete');

-- ===============================================
-- 2. ACTUALIZAR POLÍTICAS RLS - LÍNEAS DE NEGOCIO
-- ===============================================

-- Actualizar líneas_negocio para heredar de tablas_auxiliares
DROP POLICY IF EXISTS "lineas_negocio_select_final" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_select_tablas_auxiliares" ON lineas_negocio;
CREATE POLICY "lineas_negocio_select_tablas_auxiliares"
  ON lineas_negocio FOR SELECT
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

DROP POLICY IF EXISTS "lineas_negocio_insert_final" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_insert_tablas_auxiliares" ON lineas_negocio;
CREATE POLICY "lineas_negocio_insert_tablas_auxiliares"
  ON lineas_negocio FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

DROP POLICY IF EXISTS "lineas_negocio_update_final" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_update_tablas_auxiliares" ON lineas_negocio;
CREATE POLICY "lineas_negocio_update_tablas_auxiliares"
  ON lineas_negocio FOR UPDATE
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

DROP POLICY IF EXISTS "lineas_negocio_delete_final" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_delete_tablas_auxiliares" ON lineas_negocio;
CREATE POLICY "lineas_negocio_delete_tablas_auxiliares"
  ON lineas_negocio FOR DELETE
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- ===============================================
-- 3. ACTUALIZAR POLÍTICAS RLS - RESPONSABLES DE LÍNEAS DE NEGOCIO
-- ===============================================

-- Actualizar linea_negocio_responsables para heredar de tablas_auxiliares
DROP POLICY IF EXISTS "linea_negocio_responsables_select_final" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_select_tablas_auxiliares" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_select_tablas_auxiliares"
  ON linea_negocio_responsables FOR SELECT
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

DROP POLICY IF EXISTS "linea_negocio_responsables_insert_final" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_insert_tablas_auxiliares" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_insert_tablas_auxiliares"
  ON linea_negocio_responsables FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

DROP POLICY IF EXISTS "linea_negocio_responsables_update_final" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_update_tablas_auxiliares" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_update_tablas_auxiliares"
  ON linea_negocio_responsables FOR UPDATE
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

DROP POLICY IF EXISTS "linea_negocio_responsables_delete_final" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_delete_tablas_auxiliares" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_delete_tablas_auxiliares"
  ON linea_negocio_responsables FOR DELETE
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- ===============================================
-- 4. ACTUALIZAR POLÍTICAS RLS - EMPRESA LÍNEAS DE NEGOCIO
-- ===============================================

-- Actualizar empresa_lineas_negocio para heredar de companies
DROP POLICY IF EXISTS "empresa_lineas_negocio_select_final" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_select_companies" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_select_companies"
  ON empresa_lineas_negocio FOR SELECT
  USING (has_permission(auth.uid(), 'companies', 'view'));

DROP POLICY IF EXISTS "empresa_lineas_negocio_insert_final" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert_companies" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_insert_companies"
  ON empresa_lineas_negocio FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'companies', 'edit'));

DROP POLICY IF EXISTS "empresa_lineas_negocio_update_final" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_update_companies" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_update_companies"
  ON empresa_lineas_negocio FOR UPDATE
  USING (has_permission(auth.uid(), 'companies', 'edit'));

DROP POLICY IF EXISTS "empresa_lineas_negocio_delete_final" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_delete_companies" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_delete_companies"
  ON empresa_lineas_negocio FOR DELETE
  USING (has_permission(auth.uid(), 'companies', 'edit'));

-- ===============================================
-- 5. ACTUALIZAR FUNCIONES QUE REFERENCIAN PERMISOS ELIMINADOS
-- ===============================================

-- Actualizar función get_linea_negocio_responsables_safe
CREATE OR REPLACE FUNCTION get_linea_negocio_responsables_safe(linea_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  es_principal BOOLEAN,
  fecha_asignacion TIMESTAMPTZ,
  es_activo BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    lnr.id,
    lnr.user_id,
    COALESCE(ub.email, 'Usuario no disponible') as email,
    lnr.es_asignado_principal as es_principal,
    lnr.fecha_asignacion,
    lnr.es_activo
  FROM linea_negocio_responsables lnr
  LEFT JOIN usuarios_basicos ub ON lnr.user_id = ub.id
  WHERE lnr.linea_negocio_id = linea_id 
    AND lnr.es_activo = true
    AND (
      has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
      lnr.user_id = auth.uid()
    )
  ORDER BY lnr.es_asignado_principal DESC, lnr.fecha_asignacion ASC;
$$;

-- Actualizar función get_available_responsables
CREATE OR REPLACE FUNCTION get_available_responsables()
RETURNS TABLE (
  id UUID,
  email TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ub.id,
    ub.email
  FROM usuarios_basicos ub
  WHERE has_permission(auth.uid(), 'tablas_auxiliares', 'create')
  ORDER BY ub.email ASC;
$$;

-- ===============================================
-- 6. VERIFICACIÓN POST-MIGRACIÓN
-- ===============================================

DO $$
DECLARE
  permissions_count INTEGER;
  policies_count INTEGER;
  rec RECORD;
BEGIN
  -- Verificar que se eliminaron los permisos redundantes restantes
  SELECT COUNT(*) INTO permissions_count
  FROM permissions 
  WHERE (table_name = 'lineas_negocio' AND action IN ('view', 'create', 'edit', 'delete'))
     OR (table_name = 'linea_negocio_responsables' AND action IN ('view', 'create', 'edit', 'delete'))
     OR (table_name = 'empresa_lineas_negocio' AND action IN ('view', 'create', 'edit', 'delete'));
  
  IF permissions_count = 0 THEN
    RAISE NOTICE 'SUCCESS: Permisos redundantes de líneas de negocio eliminados correctamente';
  ELSE
    RAISE NOTICE 'WARNING: Aún quedan % permisos redundantes de líneas de negocio', permissions_count;
  END IF;

  -- Verificar políticas actualizadas
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND (policyname LIKE '%tablas_auxiliares%' OR policyname LIKE '%companies%')
  AND (tablename LIKE '%linea%' OR tablename = 'empresa_lineas_negocio');
  
  IF policies_count >= 12 THEN  -- 4 políticas por tabla × 3 tablas = 12
    RAISE NOTICE 'SUCCESS: Políticas RLS de líneas de negocio actualizadas (% políticas)', policies_count;
  ELSE
    RAISE NOTICE 'INFO: Políticas RLS de líneas de negocio actualizadas (% políticas)', policies_count;
  END IF;

  -- Mostrar resumen final de permisos
  RAISE NOTICE 'RESUMEN FINAL: Permisos restantes por categoría:';
  
  FOR rec IN (
    SELECT table_name, COUNT(*) as count 
    FROM permissions 
    GROUP BY table_name 
    ORDER BY table_name
  ) LOOP
    RAISE NOTICE '  - %: % permisos', rec.table_name, rec.count;
  END LOOP;

  -- Mostrar total
  SELECT COUNT(*) INTO permissions_count FROM permissions;
  RAISE NOTICE 'TOTAL: % permisos en el sistema', permissions_count;

END $$;
