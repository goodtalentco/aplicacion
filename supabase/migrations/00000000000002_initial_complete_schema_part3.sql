-- ===============================================
-- MIGRACIÓN CONSOLIDADA COMPLETA - PARTE 3
-- Continuación: RLS auxiliares, permisos y datos iniciales
-- ===============================================

-- ===============================================
-- 16. POLÍTICAS RLS PARA TABLAS AUXILIARES
-- ===============================================

-- Políticas para CIUDADES
DROP POLICY IF EXISTS "ciudades_select_policy" ON ciudades;
DROP POLICY IF EXISTS "ciudades_insert_policy" ON ciudades;
DROP POLICY IF EXISTS "ciudades_update_policy" ON ciudades;
DROP POLICY IF EXISTS "ciudades_delete_policy" ON ciudades;

CREATE POLICY "ciudades_select_policy" ON ciudades
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

CREATE POLICY "ciudades_insert_policy" ON ciudades
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

CREATE POLICY "ciudades_update_policy" ON ciudades
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

CREATE POLICY "ciudades_delete_policy" ON ciudades
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- Políticas para CAJAS DE COMPENSACIÓN
DROP POLICY IF EXISTS "cajas_compensacion_select_policy" ON cajas_compensacion;
DROP POLICY IF EXISTS "cajas_compensacion_insert_policy" ON cajas_compensacion;
DROP POLICY IF EXISTS "cajas_compensacion_update_policy" ON cajas_compensacion;
DROP POLICY IF EXISTS "cajas_compensacion_delete_policy" ON cajas_compensacion;

CREATE POLICY "cajas_compensacion_select_policy" ON cajas_compensacion
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

CREATE POLICY "cajas_compensacion_insert_policy" ON cajas_compensacion
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

CREATE POLICY "cajas_compensacion_update_policy" ON cajas_compensacion
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

CREATE POLICY "cajas_compensacion_delete_policy" ON cajas_compensacion
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- Políticas para ARLS
DROP POLICY IF EXISTS "arls_select_policy" ON arls;
DROP POLICY IF EXISTS "arls_insert_policy" ON arls;
DROP POLICY IF EXISTS "arls_update_policy" ON arls;
DROP POLICY IF EXISTS "arls_delete_policy" ON arls;

CREATE POLICY "arls_select_policy" ON arls
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

CREATE POLICY "arls_insert_policy" ON arls
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

CREATE POLICY "arls_update_policy" ON arls
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

CREATE POLICY "arls_delete_policy" ON arls
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- Políticas para FONDOS DE CESANTÍAS
DROP POLICY IF EXISTS "fondos_cesantias_select_policy" ON fondos_cesantias;
DROP POLICY IF EXISTS "fondos_cesantias_insert_policy" ON fondos_cesantias;
DROP POLICY IF EXISTS "fondos_cesantias_update_policy" ON fondos_cesantias;
DROP POLICY IF EXISTS "fondos_cesantias_delete_policy" ON fondos_cesantias;

CREATE POLICY "fondos_cesantias_select_policy" ON fondos_cesantias
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

CREATE POLICY "fondos_cesantias_insert_policy" ON fondos_cesantias
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

CREATE POLICY "fondos_cesantias_update_policy" ON fondos_cesantias
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

CREATE POLICY "fondos_cesantias_delete_policy" ON fondos_cesantias
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- Políticas para FONDOS DE PENSIÓN
DROP POLICY IF EXISTS "fondos_pension_select_policy" ON fondos_pension;
DROP POLICY IF EXISTS "fondos_pension_insert_policy" ON fondos_pension;
DROP POLICY IF EXISTS "fondos_pension_update_policy" ON fondos_pension;
DROP POLICY IF EXISTS "fondos_pension_delete_policy" ON fondos_pension;

CREATE POLICY "fondos_pension_select_policy" ON fondos_pension
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

CREATE POLICY "fondos_pension_insert_policy" ON fondos_pension
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

CREATE POLICY "fondos_pension_update_policy" ON fondos_pension
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

CREATE POLICY "fondos_pension_delete_policy" ON fondos_pension
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- Políticas para EPS
DROP POLICY IF EXISTS "eps_select_policy" ON eps;
DROP POLICY IF EXISTS "eps_insert_policy" ON eps;
DROP POLICY IF EXISTS "eps_update_policy" ON eps;
DROP POLICY IF EXISTS "eps_delete_policy" ON eps;

CREATE POLICY "eps_select_policy" ON eps
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

CREATE POLICY "eps_insert_policy" ON eps
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

CREATE POLICY "eps_update_policy" ON eps
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

CREATE POLICY "eps_delete_policy" ON eps
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- ===============================================
-- 17. POLÍTICAS RLS PARA LÍNEAS DE NEGOCIO (OPTIMIZADAS)
-- ===============================================

-- Políticas para LÍNEAS DE NEGOCIO (flexibles para usuarios de empresas)
DROP POLICY IF EXISTS "lineas_negocio_select_final" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_insert_final" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_update_final" ON lineas_negocio;
DROP POLICY IF EXISTS "lineas_negocio_delete_final" ON lineas_negocio;

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

-- Políticas para RESPONSABLES DE LÍNEAS DE NEGOCIO
DROP POLICY IF EXISTS "linea_negocio_responsables_select_final" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_insert_final" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_update_final" ON linea_negocio_responsables;
DROP POLICY IF EXISTS "linea_negocio_responsables_delete_final" ON linea_negocio_responsables;

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

-- Políticas para EMPRESA LÍNEAS DE NEGOCIO (flexibles)
DROP POLICY IF EXISTS "empresa_lineas_negocio_select_final" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_insert_final" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_update_final" ON empresa_lineas_negocio;
DROP POLICY IF EXISTS "empresa_lineas_negocio_delete_final" ON empresa_lineas_negocio;

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

-- ===============================================
-- 18. PERMISOS INICIALES DEL SISTEMA
-- ===============================================

INSERT INTO permissions (table_name, action, description) VALUES
-- Gestión de permisos
('permissions', 'view', 'Ver lista de permisos disponibles'),
('user_permissions', 'view', 'Ver asignaciones de permisos de usuarios'),
('user_permissions', 'create', 'Asignar permisos a usuarios'),
('user_permissions', 'edit', 'Modificar permisos de usuarios'),
('user_permissions', 'delete', 'Revocar permisos de usuarios'),

-- Gestión de empresas
('companies', 'view', 'Ver información de empresas'),
('companies', 'create', 'Crear nuevas empresas'),
('companies', 'edit', 'Editar información de empresas'),
('companies', 'delete', 'Eliminar empresas'),

-- Gestión de contratos
('contracts', 'view', 'Ver contratos laborales'),
('contracts', 'create', 'Crear nuevos contratos'),
('contracts', 'edit', 'Editar contratos existentes'),
('contracts', 'delete', 'Eliminar contratos'),
('contracts', 'archive', 'Archivar contratos'),

-- Gestión legal
('legal', 'view', 'Ver documentos legales'),
('legal', 'create', 'Crear documentos legales'),
('legal', 'edit', 'Editar documentos legales'),
('legal', 'delete', 'Eliminar documentos legales'),

-- Gestión de SST (Seguridad y Salud en el Trabajo)
('sst', 'view', 'Ver información de SST'),
('sst', 'create', 'Crear registros de SST'),
('sst', 'edit', 'Editar registros de SST'),
('sst', 'delete', 'Eliminar registros de SST'),

-- Gestión de novedades
('news', 'view', 'Ver novedades del sistema'),
('news', 'create', 'Crear nuevas novedades'),
('news', 'edit', 'Editar novedades'),
('news', 'delete', 'Eliminar novedades'),

-- Dashboard y reportes
('dashboard', 'view', 'Ver dashboard principal'),
('reports', 'view', 'Ver reportes'),
('reports', 'create', 'Generar reportes'),
('reports', 'export', 'Exportar reportes'),

-- Módulo de tablas auxiliares
('tablas_auxiliares', 'view', 'Ver módulo de tablas auxiliares'),
('tablas_auxiliares', 'create', 'Crear registros en tablas auxiliares'),
('tablas_auxiliares', 'edit', 'Editar registros en tablas auxiliares'),
('tablas_auxiliares', 'delete', 'Eliminar registros en tablas auxiliares'),

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
-- 19. GRANTS PARA ROL AUTHENTICATED
-- ===============================================

-- Grants para funciones helper
GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_permission_to_user(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_permission_from_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_handle(UUID) TO authenticated;

-- Grants para computed columns de companies
GRANT EXECUTE ON FUNCTION companies_created_by_handle(companies) TO authenticated;
GRANT EXECUTE ON FUNCTION companies_updated_by_handle(companies) TO authenticated;

-- Grants para funciones de contracts
GRANT EXECUTE ON FUNCTION calculate_contract_status_vigencia(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_contract(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION contracts_created_by_handle(contracts) TO authenticated;
GRANT EXECUTE ON FUNCTION contracts_updated_by_handle(contracts) TO authenticated;
GRANT EXECUTE ON FUNCTION contracts_full_name(contracts) TO authenticated;
GRANT EXECUTE ON FUNCTION contracts_onboarding_progress(contracts) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_full_status(contracts) TO authenticated;

-- Grants para funciones de líneas de negocio
GRANT EXECUTE ON FUNCTION get_linea_negocio_responsables(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_linea_negocio_responsables_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_business_line_assignment() TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresa_lineas_negocio(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresas_por_linea_negocio(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_business_lines_to_company(UUID, UUID[], UUID) TO authenticated;

-- Grants para triggers
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION update_companies_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION update_contracts_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION update_auxiliary_tables_updated_at() TO authenticated;

-- Grants para tablas principales
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contracts TO authenticated;

-- Grants para tablas auxiliares
GRANT SELECT, INSERT, UPDATE, DELETE ON ciudades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cajas_compensacion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON arls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fondos_cesantias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fondos_pension TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON eps TO authenticated;

-- Grants para líneas de negocio
GRANT SELECT, INSERT, UPDATE, DELETE ON lineas_negocio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linea_negocio_responsables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON empresa_lineas_negocio TO authenticated;
