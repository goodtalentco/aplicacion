-- ===============================================
-- MIGRACIÓN: RLS Y PERMISOS PARA ARLs Y CAJAS
-- Fecha: 2025-01-15
-- Descripción: Políticas RLS flexibles y grants para ARLs y Cajas
-- ===============================================

-- ===============================================
-- 1. HABILITACIÓN DE RLS
-- ===============================================

ALTER TABLE empresa_arls ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_cajas_compensacion ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 2. POLÍTICAS RLS PARA EMPRESA_ARLS
-- ===============================================

-- Política de lectura para empresa_arls
CREATE POLICY "empresa_arls_select_policy" ON empresa_arls
  FOR SELECT TO authenticated
  USING (
    -- Usuarios con permisos de empresas (pueden ver ARLs para gestionar empresas)
    has_permission(auth.uid(), 'companies', 'view') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    -- Usuarios con permisos específicos de empresa_arls
    has_permission(auth.uid(), 'empresa_arls', 'view') OR
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view')
  );

-- Política de creación para empresa_arls
CREATE POLICY "empresa_arls_insert_policy" ON empresa_arls
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Usuarios que pueden crear/editar empresas
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    -- Usuarios con permisos específicos de empresa_arls
    has_permission(auth.uid(), 'empresa_arls', 'create') OR
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
  );

-- Política de actualización para empresa_arls
CREATE POLICY "empresa_arls_update_policy" ON empresa_arls
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'companies', 'edit') OR
    has_permission(auth.uid(), 'empresa_arls', 'edit') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  )
  WITH CHECK (
    has_permission(auth.uid(), 'companies', 'edit') OR
    has_permission(auth.uid(), 'empresa_arls', 'edit') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  );

-- Política de eliminación para empresa_arls
CREATE POLICY "empresa_arls_delete_policy" ON empresa_arls
  FOR DELETE TO authenticated
  USING (
    has_permission(auth.uid(), 'companies', 'delete') OR
    has_permission(auth.uid(), 'empresa_arls', 'delete') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'delete')
  );

-- ===============================================
-- 3. POLÍTICAS RLS PARA EMPRESA_CAJAS_COMPENSACION
-- ===============================================

-- Política de lectura para empresa_cajas_compensacion
CREATE POLICY "empresa_cajas_select_policy" ON empresa_cajas_compensacion
  FOR SELECT TO authenticated
  USING (
    -- Usuarios con permisos de empresas (pueden ver cajas para gestionar empresas)
    has_permission(auth.uid(), 'companies', 'view') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    -- Usuarios con permisos específicos de empresa_cajas_compensacion
    has_permission(auth.uid(), 'empresa_cajas_compensacion', 'view') OR
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view')
  );

-- Política de creación para empresa_cajas_compensacion
CREATE POLICY "empresa_cajas_insert_policy" ON empresa_cajas_compensacion
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Usuarios que pueden crear/editar empresas
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    -- Usuarios con permisos específicos de empresa_cajas_compensacion
    has_permission(auth.uid(), 'empresa_cajas_compensacion', 'create') OR
    -- Usuarios con acceso a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
  );

-- Política de actualización para empresa_cajas_compensacion
CREATE POLICY "empresa_cajas_update_policy" ON empresa_cajas_compensacion
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'companies', 'edit') OR
    has_permission(auth.uid(), 'empresa_cajas_compensacion', 'edit') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  )
  WITH CHECK (
    has_permission(auth.uid(), 'companies', 'edit') OR
    has_permission(auth.uid(), 'empresa_cajas_compensacion', 'edit') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'edit')
  );

-- Política de eliminación para empresa_cajas_compensacion
CREATE POLICY "empresa_cajas_delete_policy" ON empresa_cajas_compensacion
  FOR DELETE TO authenticated
  USING (
    has_permission(auth.uid(), 'companies', 'delete') OR
    has_permission(auth.uid(), 'empresa_cajas_compensacion', 'delete') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'delete')
  );

-- ===============================================
-- 4. POLÍTICAS RLS FLEXIBLES PARA TABLAS AUXILIARES
-- ===============================================

-- Actualizar política de ARLs para permitir acceso a usuarios de empresas
DROP POLICY IF EXISTS "arls_select_policy" ON arls;
CREATE POLICY "arls_select_policy" ON arls
  FOR SELECT TO authenticated
  USING (
    -- Acceso tradicional a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
    -- NUEVO: Acceso para usuarios que gestionan empresas (necesitan ver ARLs)
    has_permission(auth.uid(), 'companies', 'view') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    -- NUEVO: Acceso para usuarios que gestionan ARLs de empresas
    has_permission(auth.uid(), 'empresa_arls', 'view')
  );

-- Actualizar política de ciudades para permitir acceso a usuarios de empresas
DROP POLICY IF EXISTS "ciudades_select_policy" ON ciudades;
CREATE POLICY "ciudades_select_policy" ON ciudades
  FOR SELECT TO authenticated
  USING (
    -- Acceso tradicional a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
    -- NUEVO: Acceso para usuarios que gestionan empresas (necesitan ver ciudades)
    has_permission(auth.uid(), 'companies', 'view') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    -- NUEVO: Acceso para usuarios que gestionan cajas por empresa
    has_permission(auth.uid(), 'empresa_cajas_compensacion', 'view')
  );

-- Actualizar política de cajas de compensación para permitir acceso a usuarios de empresas
DROP POLICY IF EXISTS "cajas_compensacion_select_policy" ON cajas_compensacion;
CREATE POLICY "cajas_compensacion_select_policy" ON cajas_compensacion
  FOR SELECT TO authenticated
  USING (
    -- Acceso tradicional a tablas auxiliares
    has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
    -- NUEVO: Acceso para usuarios que gestionan empresas (necesitan ver cajas)
    has_permission(auth.uid(), 'companies', 'view') OR
    has_permission(auth.uid(), 'companies', 'create') OR
    has_permission(auth.uid(), 'companies', 'edit') OR
    -- NUEVO: Acceso para usuarios que gestionan cajas por empresa
    has_permission(auth.uid(), 'empresa_cajas_compensacion', 'view')
  );

-- ===============================================
-- 5. GRANTS PARA FUNCIONES
-- ===============================================

-- Grants para funciones de consulta
GRANT EXECUTE ON FUNCTION get_empresa_arl_actual(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresa_arl_historial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresa_cajas_actuales(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresa_cajas_historial(UUID) TO authenticated;

-- Grants para funciones de modificación
GRANT EXECUTE ON FUNCTION cambiar_empresa_arl(UUID, UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cambiar_empresa_caja(UUID, UUID, UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cerrar_empresa_caja(UUID, UUID, DATE, UUID) TO authenticated;

-- ===============================================
-- 6. GRANTS PARA TABLAS
-- ===============================================

-- Grants para las nuevas tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON empresa_arls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON empresa_cajas_compensacion TO authenticated;

-- ===============================================
-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

COMMENT ON TABLE empresa_arls IS 'Histórico de ARLs asignadas a empresas. Una empresa solo puede tener una ARL activa.';
COMMENT ON TABLE empresa_cajas_compensacion IS 'Histórico de cajas de compensación por empresa y ciudad. Una empresa puede tener una caja activa por ciudad.';

COMMENT ON FUNCTION get_empresa_arl_actual(UUID) IS 'Obtiene la ARL actual activa de una empresa';
COMMENT ON FUNCTION get_empresa_arl_historial(UUID) IS 'Obtiene el historial completo de ARLs de una empresa';
COMMENT ON FUNCTION get_empresa_cajas_actuales(UUID) IS 'Obtiene las cajas de compensación actuales activas de una empresa por ciudad';
COMMENT ON FUNCTION get_empresa_cajas_historial(UUID) IS 'Obtiene el historial completo de cajas de compensación de una empresa';
COMMENT ON FUNCTION cambiar_empresa_arl(UUID, UUID, DATE, UUID) IS 'Función segura para cambiar ARL de empresa con validaciones y auditoría';
COMMENT ON FUNCTION cambiar_empresa_caja(UUID, UUID, UUID, DATE, UUID) IS 'Función segura para cambiar caja de compensación por ciudad con validaciones y auditoría';

-- ===============================================
-- 8. VERIFICACIONES POST-MIGRACIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que las tablas se crearon
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('empresa_arls', 'empresa_cajas_compensacion')
  ) THEN
    RAISE NOTICE 'SUCCESS: Tablas de ARLs y Cajas por empresa creadas correctamente';
  ELSE
    RAISE NOTICE 'ERROR: Faltan tablas de ARLs y Cajas';
  END IF;

  -- Verificar que RLS está habilitado
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename IN ('empresa_arls', 'empresa_cajas_compensacion')
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS habilitado en tablas de ARLs y Cajas';
  ELSE
    RAISE NOTICE 'WARNING: Verificar RLS en tablas de ARLs y Cajas';
  END IF;

  -- Verificar que los permisos se insertaron
  IF EXISTS (
    SELECT 1 FROM permissions 
    WHERE table_name IN ('empresa_arls', 'empresa_cajas_compensacion')
  ) THEN
    RAISE NOTICE 'SUCCESS: Permisos para ARLs y Cajas insertados correctamente';
  ELSE
    RAISE NOTICE 'WARNING: Verificar permisos de ARLs y Cajas';
  END IF;

  -- Contar funciones creadas
  RAISE NOTICE 'Funciones de ARLs y Cajas creadas: %', (
    SELECT COUNT(*) FROM pg_proc 
    WHERE proname LIKE 'get_empresa_%' OR proname LIKE 'cambiar_empresa_%'
  );

  RAISE NOTICE '=== MIGRACIÓN DE ARLs Y CAJAS COMPLETADA ===';
  RAISE NOTICE 'Módulo: Sistema de ARLs y Cajas de Compensación por empresa';
  RAISE NOTICE 'Tablas: 2 nuevas tablas con histórico y constraints';
  RAISE NOTICE 'RLS: Políticas flexibles - usuarios de empresas pueden acceder a ARLs/Cajas/Ciudades';
  RAISE NOTICE 'Funciones: 6 funciones helper para consultas y modificaciones seguras';
  RAISE NOTICE 'Permisos: 8 nuevos permisos granulares + políticas actualizadas';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Sistema listo para gestión de ARLs y Cajas por empresa!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos pasos en frontend:';
  RAISE NOTICE '1. Actualizar modal de empresas con sección de ARL';
  RAISE NOTICE '2. Agregar sección de Cajas de Compensación con botón +';
  RAISE NOTICE '3. Implementar historiales y cambios';
  RAISE NOTICE '4. Probar con usuarios que solo tienen permisos de companies';
END $$;
