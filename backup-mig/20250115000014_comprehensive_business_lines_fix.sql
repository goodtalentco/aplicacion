-- =====================================================
-- MIGRACIÓN: Corrección completa RLS líneas de negocio
-- =====================================================
-- Fecha: 2025-01-15
-- Descripción: Corrección integral de políticas RLS para líneas de negocio
-- sin restricciones por usuario creador

-- 1. LIMPIAR TODAS LAS POLÍTICAS EXISTENTES DE LÍNEAS DE NEGOCIO
DROP POLICY IF EXISTS "lineas_negocio_select" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_select_policy" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_insert_policy" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_update_policy" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_delete_policy" ON lineas_negocio;

-- 2. LIMPIAR TODAS LAS POLÍTICAS EXISTENTES DE EMPRESA_LINEAS_NEGOCIO
DROP POLICY IF EXISTS "empresa_lineas_negocio_select" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_select_policy" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_update" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_update_policy" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_delete_policy" ON empresa_lineas_negocio;

-- 3. CREAR POLÍTICAS LIMPIAS PARA LINEAS_NEGOCIO
-- Solo basadas en permisos de tabla, SIN restricciones por usuario

CREATE POLICY "lineas_negocio_select_final" ON lineas_negocio
  FOR SELECT TO authenticated
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view')
    OR
    -- Usuarios con acceso a empresas (para asignar líneas)
    has_permission(auth.uid(), 'companies', 'view')
    OR has_permission(auth.uid(), 'companies', 'create')
    OR has_permission(auth.uid(), 'companies', 'edit')
  );

CREATE POLICY "lineas_negocio_insert_final" ON lineas_negocio
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Solo usuarios con acceso a tablas auxiliares pueden crear nuevas líneas
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
  );

CREATE POLICY "lineas_negocio_update_final" ON lineas_negocio
  FOR UPDATE TO authenticated
  USING (
    -- Solo usuarios con acceso a tablas auxiliares pueden modificar líneas
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  )
  WITH CHECK (
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  );

CREATE POLICY "lineas_negocio_delete_final" ON lineas_negocio
  FOR DELETE TO authenticated
  USING (
    -- Solo usuarios con acceso a tablas auxiliares pueden eliminar líneas
    has_permission(auth.uid(), 'tablas_auxiliares', 'delete')
  );

-- 4. CREAR POLÍTICAS LIMPIAS PARA EMPRESA_LINEAS_NEGOCIO
-- Permitir a usuarios de empresas Y auxiliares gestionar asignaciones

CREATE POLICY "empresa_lineas_negocio_select_final" ON empresa_lineas_negocio
  FOR SELECT TO authenticated
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view')
    OR
    -- Usuarios con acceso a empresas
    has_permission(auth.uid(), 'companies', 'view')
    OR has_permission(auth.uid(), 'companies', 'create')
    OR has_permission(auth.uid(), 'companies', 'edit')
  );

CREATE POLICY "empresa_lineas_negocio_insert_final" ON empresa_lineas_negocio
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
    OR
    -- Usuarios con acceso a empresas (para asignar líneas al crear/editar empresas)
    has_permission(auth.uid(), 'companies', 'create')
    OR has_permission(auth.uid(), 'companies', 'edit')
  );

CREATE POLICY "empresa_lineas_negocio_update_final" ON empresa_lineas_negocio
  FOR UPDATE TO authenticated
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
    OR
    -- Usuarios con acceso a empresas (para modificar asignaciones al editar empresas)
    has_permission(auth.uid(), 'companies', 'edit')
  )
  WITH CHECK (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
    OR
    -- Usuarios con acceso a empresas
    has_permission(auth.uid(), 'companies', 'edit')
  );

CREATE POLICY "empresa_lineas_negocio_delete_final" ON empresa_lineas_negocio
  FOR DELETE TO authenticated
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'delete')
    OR
    -- Usuarios con acceso a empresas (para remover asignaciones)
    has_permission(auth.uid(), 'companies', 'edit')
    OR has_permission(auth.uid(), 'companies', 'delete')
  );

-- 5. LIMPIAR POLÍTICAS DE LINEA_NEGOCIO_RESPONSABLES TAMBIÉN
DROP POLICY IF EXISTS "linea_negocio_responsables_select_policy" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_insert_policy" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_update_policy" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_delete_policy" ON linea_negocio_responsables;

CREATE POLICY "linea_negocio_responsables_select_final" ON linea_negocio_responsables
  FOR SELECT TO authenticated
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view')
    OR
    -- Usuarios con acceso a empresas (para ver responsables en modal de empresas)
    has_permission(auth.uid(), 'companies', 'view')
    OR has_permission(auth.uid(), 'companies', 'create')
    OR has_permission(auth.uid(), 'companies', 'edit')
  );

CREATE POLICY "linea_negocio_responsables_insert_final" ON linea_negocio_responsables
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Solo usuarios con acceso a tablas auxiliares pueden asignar responsables
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
  );

CREATE POLICY "linea_negocio_responsables_update_final" ON linea_negocio_responsables
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  )
  WITH CHECK (
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  );

CREATE POLICY "linea_negocio_responsables_delete_final" ON linea_negocio_responsables
  FOR DELETE TO authenticated
  USING (
    has_permission(auth.uid(), 'tablas_auxiliares', 'delete')
  );

-- 6. COMENTARIOS EXPLICATIVOS
COMMENT ON POLICY "lineas_negocio_select_final" ON lineas_negocio IS 
'Permite leer líneas de negocio a usuarios con permisos de auxiliares O empresas';

COMMENT ON POLICY "empresa_lineas_negocio_select_final" ON empresa_lineas_negocio IS 
'Permite leer asignaciones a usuarios con permisos de auxiliares O empresas';

COMMENT ON POLICY "empresa_lineas_negocio_insert_final" ON empresa_lineas_negocio IS 
'Permite crear asignaciones a usuarios con permisos de auxiliares O empresas';

COMMENT ON POLICY "empresa_lineas_negocio_update_final" ON empresa_lineas_negocio IS 
'Permite actualizar asignaciones a usuarios con permisos de auxiliares O empresas';

-- 7. VERIFICAR QUE LAS FUNCIONES RPC SIGAN FUNCIONANDO
-- Estas funciones ya están creadas y deberían seguir funcionando con las nuevas políticas
