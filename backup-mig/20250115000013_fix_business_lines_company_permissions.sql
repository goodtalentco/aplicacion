-- =====================================================
-- MIGRACIÓN: Permitir a usuarios con permisos de empresas usar líneas de negocio
-- =====================================================
-- Fecha: 2025-01-15
-- Descripción: Los usuarios que pueden gestionar empresas necesitan acceso 
-- a las líneas de negocio para asignarlas, aunque no tengan permisos de auxiliares.

-- 1. Actualizar RLS para lineas_negocio - SELECT
-- Permitir lectura a usuarios con permisos de companies o tablas_auxiliares
DROP POLICY IF EXISTS "lineas_negocio_select" ON lineas_negocio;
CREATE POLICY "lineas_negocio_select" ON lineas_negocio
  FOR SELECT
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view')
    OR
    -- Usuarios con acceso a empresas (para poder asignar líneas)
    has_permission(auth.uid(), 'companies', 'view')
    OR has_permission(auth.uid(), 'companies', 'create')
    OR has_permission(auth.uid(), 'companies', 'edit')
  );

-- 2. Actualizar RLS para empresa_lineas_negocio - SELECT
-- Permitir lectura a usuarios con permisos de companies
DROP POLICY IF EXISTS "empresa_lineas_negocio_select" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_select" ON empresa_lineas_negocio
  FOR SELECT
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view')
    OR has_permission(auth.uid(), 'empresa_lineas_negocio', 'view')
    OR
    -- Usuarios con acceso a empresas
    has_permission(auth.uid(), 'companies', 'view')
    OR has_permission(auth.uid(), 'companies', 'create')
    OR has_permission(auth.uid(), 'companies', 'edit')
  );

-- 3. Actualizar RLS para empresa_lineas_negocio - INSERT
-- Permitir inserción a usuarios con permisos de companies
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_insert" ON empresa_lineas_negocio
  FOR INSERT
  WITH CHECK (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
    OR has_permission(auth.uid(), 'empresa_lineas_negocio', 'create')
    OR
    -- Usuarios con acceso a empresas (para crear/editar empresas con líneas)
    has_permission(auth.uid(), 'companies', 'create')
    OR has_permission(auth.uid(), 'companies', 'edit')
  );

-- 4. Actualizar RLS para empresa_lineas_negocio - UPDATE
-- Permitir actualización a usuarios con permisos de companies
DROP POLICY IF EXISTS "empresa_lineas_negocio_update" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_update" ON empresa_lineas_negocio
  FOR UPDATE
  USING (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
    OR has_permission(auth.uid(), 'empresa_lineas_negocio', 'edit')
    OR
    -- Usuarios con acceso a empresas
    has_permission(auth.uid(), 'companies', 'edit')
  )
  WITH CHECK (
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
    OR has_permission(auth.uid(), 'empresa_lineas_negocio', 'edit')
    OR
    -- Usuarios con acceso a empresas
    has_permission(auth.uid(), 'companies', 'edit')
  );

-- 5. Comentario explicativo
COMMENT ON POLICY "lineas_negocio_select" ON lineas_negocio IS 
'Permite leer líneas de negocio a usuarios con permisos de auxiliares O empresas';

COMMENT ON POLICY "empresa_lineas_negocio_select" ON empresa_lineas_negocio IS 
'Permite leer asignaciones de líneas a usuarios con permisos de auxiliares O empresas';

COMMENT ON POLICY "empresa_lineas_negocio_insert" ON empresa_lineas_negocio IS 
'Permite crear asignaciones de líneas a usuarios con permisos de auxiliares O empresas';

COMMENT ON POLICY "empresa_lineas_negocio_update" ON empresa_lineas_negocio IS 
'Permite actualizar asignaciones de líneas a usuarios con permisos de auxiliares O empresas';
