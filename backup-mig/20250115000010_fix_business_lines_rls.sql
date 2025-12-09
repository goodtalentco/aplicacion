-- ===============================================
-- MIGRACIÓN: CORRECCIÓN RLS LÍNEAS DE NEGOCIO
-- Fecha: 2025-01-15
-- Descripción: Mejora las políticas RLS para mejor usabilidad
-- Problema: RLS muy estricto impide gestión normal de empresas
-- ===============================================

-- ===============================================
-- 1. NUEVAS POLÍTICAS RLS MÁS INTELIGENTES
-- ===============================================

-- ===============================================
-- LÍNEAS DE NEGOCIO (solo lectura más amplia)
-- ===============================================

-- Permitir lectura a usuarios con permisos de empresas o líneas de negocio
DROP POLICY IF EXISTS "lineas_negocio_select_policy" ON lineas_negocio;
CREATE POLICY "lineas_negocio_select_policy" ON lineas_negocio
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'lineas_negocio', 'view') OR
    has_permission(auth.uid(), 'companies', 'view') OR
    has_permission(auth.uid(), 'empresa_lineas_negocio', 'view')
  );

-- ===============================================
-- RESPONSABLES DE LÍNEAS DE NEGOCIO (sin cambios)
-- ===============================================
-- Estas se mantienen estrictas porque son configuración administrativa

-- ===============================================
-- LÍNEAS DE NEGOCIO POR EMPRESA (más flexible)
-- ===============================================

-- LECTURA: Permitir a usuarios con permisos de empresas, líneas de negocio, o específicos
DROP POLICY IF EXISTS "empresa_lineas_negocio_select_policy" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_select_policy" ON empresa_lineas_negocio
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'empresa_lineas_negocio', 'view') OR
    has_permission(auth.uid(), 'companies', 'view') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    has_permission(auth.uid(), 'lineas_negocio', 'view')
  );

-- CREACIÓN: Permitir a usuarios que pueden crear empresas o tienen permisos específicos
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'empresa_lineas_negocio', 'create') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit')
  );

-- EDICIÓN: Permitir a usuarios que pueden editar empresas o tienen permisos específicos
DROP POLICY IF EXISTS "empresa_lineas_negocio_update_policy" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_update_policy" ON empresa_lineas_negocio
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'empresa_lineas_negocio', 'edit') OR
    has_permission(auth.uid(), 'companies', 'edit')
  )
  WITH CHECK (
    has_permission(auth.uid(), 'empresa_lineas_negocio', 'edit') OR
    has_permission(auth.uid(), 'companies', 'edit')
  );

-- ELIMINACIÓN: Permitir a usuarios que pueden editar empresas o tienen permisos específicos
DROP POLICY IF EXISTS "empresa_lineas_negocio_delete_policy" ON empresa_lineas_negocio;
CREATE POLICY "empresa_lineas_negocio_delete_policy" ON empresa_lineas_negocio
  FOR DELETE TO authenticated
  USING (
    has_permission(auth.uid(), 'empresa_lineas_negocio', 'delete') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    has_permission(auth.uid(), 'companies', 'delete')
  );

-- ===============================================
-- 2. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

COMMENT ON POLICY "lineas_negocio_select_policy" ON lineas_negocio IS 
'Permite lectura a usuarios con permisos de líneas de negocio, empresas o específicos';

COMMENT ON POLICY "empresa_lineas_negocio_select_policy" ON empresa_lineas_negocio IS 
'Permite lectura a usuarios con permisos de empresas, líneas de negocio o específicos';

COMMENT ON POLICY "empresa_lineas_negocio_insert_policy" ON empresa_lineas_negocio IS 
'Permite creación a usuarios que pueden crear/editar empresas o tienen permisos específicos';

COMMENT ON POLICY "empresa_lineas_negocio_update_policy" ON empresa_lineas_negocio IS 
'Permite edición a usuarios que pueden editar empresas o tienen permisos específicos';

COMMENT ON POLICY "empresa_lineas_negocio_delete_policy" ON empresa_lineas_negocio IS 
'Permite eliminación a usuarios que pueden editar/eliminar empresas o tienen permisos específicos';

-- ===============================================
-- 3. VERIFICACIONES POST-CORRECCIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que las políticas fueron actualizadas
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'empresa_lineas_negocio'
    AND policyname = 'empresa_lineas_negocio_select_policy'
  ) THEN
    RAISE NOTICE 'SUCCESS: Políticas RLS de líneas de negocio actualizadas correctamente';
  ELSE
    RAISE NOTICE 'ERROR: No se pudieron actualizar las políticas RLS';
  END IF;

  RAISE NOTICE '=== CORRECCIÓN RLS LÍNEAS DE NEGOCIO COMPLETADA ===';
  RAISE NOTICE 'Flexibilidad: Usuarios con permisos de empresas pueden gestionar líneas de negocio';
  RAISE NOTICE 'Seguridad: Mantiene control de acceso pero más usable';
  RAISE NOTICE 'Impacto: Los formularios de empresas funcionarán correctamente';
END $$;

-- ===============================================
-- FIN DE CORRECCIÓN RLS LÍNEAS DE NEGOCIO
-- ===============================================
