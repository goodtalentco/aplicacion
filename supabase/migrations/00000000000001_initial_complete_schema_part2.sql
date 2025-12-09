-- ===============================================
-- MIGRACIÓN CONSOLIDADA COMPLETA - PARTE 2
-- Continuación del archivo principal
-- ===============================================

-- ===============================================
-- 10. FUNCIONES ESPECÍFICAS PARA CONTRATOS
-- ===============================================

-- Función para calcular STATUS DE VIGENCIA
CREATE OR REPLACE FUNCTION calculate_contract_status_vigencia(fecha_fin DATE)
RETURNS TEXT AS $$
BEGIN
  -- Si no hay fecha de fin (contrato indefinido), siempre es activo
  IF fecha_fin IS NULL THEN
    RETURN 'activo';
  -- Si la fecha de fin ya pasó, está terminado
  ELSIF fecha_fin <= CURRENT_DATE THEN
    RETURN 'terminado';
  -- Si la fecha de fin es futura, está activo
  ELSE
    RETURN 'activo';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para APROBAR CONTRATO
CREATE OR REPLACE FUNCTION approve_contract(
  contract_id UUID,
  approver_user_id UUID,
  contract_number TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  contract_record RECORD;
  result JSON;
BEGIN
  -- Verificar que el contrato existe y está en borrador
  SELECT * INTO contract_record
  FROM contracts 
  WHERE id = contract_id AND status_aprobacion = 'borrador';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Contrato no encontrado o ya está aprobado'
    );
  END IF;
  
  -- Verificar que el usuario tiene permisos
  IF NOT has_permission(approver_user_id, 'contracts', 'edit') THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'No tienes permisos para aprobar contratos'
    );
  END IF;
  
  -- Si se proporciona número de contrato, verificar que no exista y actualizarlo
  IF contract_number IS NOT NULL AND trim(contract_number) != '' THEN
    IF EXISTS (SELECT 1 FROM contracts WHERE numero_contrato_helisa = contract_number AND id != contract_id) THEN
      RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Ya existe un contrato con ese número'
      );
    END IF;
    
    -- Actualizar el número de contrato
    UPDATE contracts 
    SET numero_contrato_helisa = contract_number
    WHERE id = contract_id;
  END IF;
  
  -- Verificar que ahora tiene número de contrato
  SELECT numero_contrato_helisa INTO contract_number 
  FROM contracts 
  WHERE id = contract_id;
  
  IF contract_number IS NULL OR trim(contract_number) = '' THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Debe proporcionar un número de contrato para aprobar'
    );
  END IF;
  
  -- Aprobar el contrato
  UPDATE contracts 
  SET 
    status_aprobacion = 'aprobado',
    approved_at = NOW(),
    approved_by = approver_user_id,
    updated_at = NOW(),
    updated_by = approver_user_id
  WHERE id = contract_id;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Contrato aprobado exitosamente',
    'approved_at', NOW(),
    'contract_number', contract_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 11. COMPUTED COLUMNS PARA COMPANIES
-- ===============================================

-- Handle del creador (computed column)
CREATE OR REPLACE FUNCTION companies_created_by_handle(c companies)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN ub.email IS NULL THEN NULL
    ELSE split_part(ub.email::TEXT, '@', 1)
  END
  FROM usuarios_basicos ub
  WHERE ub.id = c.created_by
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Handle del editor (computed column)
CREATE OR REPLACE FUNCTION companies_updated_by_handle(c companies)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN ub.email IS NULL THEN NULL
    ELSE split_part(ub.email::TEXT, '@', 1)
  END
  FROM usuarios_basicos ub
  WHERE ub.id = c.updated_by
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ===============================================
-- 12. COMPUTED COLUMNS PARA CONTRACTS
-- ===============================================

-- Handle del creador (computed column)
CREATE OR REPLACE FUNCTION contracts_created_by_handle(c contracts)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN ub.email IS NULL THEN NULL
    ELSE split_part(ub.email::TEXT, '@', 1)
  END
  FROM usuarios_basicos ub
  WHERE ub.id = c.created_by
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Handle del editor (computed column)
CREATE OR REPLACE FUNCTION contracts_updated_by_handle(c contracts)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN ub.email IS NULL THEN NULL
    ELSE split_part(ub.email::TEXT, '@', 1)
  END
  FROM usuarios_basicos ub
  WHERE ub.id = c.updated_by
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Función para obtener nombre completo
CREATE OR REPLACE FUNCTION contracts_full_name(c contracts)
RETURNS TEXT AS $$
  SELECT TRIM(
    CONCAT(
      c.primer_nombre, 
      CASE WHEN c.segundo_nombre IS NOT NULL AND c.segundo_nombre != '' THEN ' ' || c.segundo_nombre ELSE '' END,
      ' ', 
      c.primer_apellido,
      CASE WHEN c.segundo_apellido IS NOT NULL AND c.segundo_apellido != '' THEN ' ' || c.segundo_apellido ELSE '' END
    )
  )
$$ LANGUAGE sql STABLE;

-- Función para calcular progreso de onboarding SIMPLIFICADO (0-100) - 12 pasos
CREATE OR REPLACE FUNCTION contracts_onboarding_progress(c contracts)
RETURNS INTEGER AS $$
  SELECT ROUND(
    (
      -- Exámenes médicos (2 pasos)
      CASE WHEN c.programacion_cita_examenes THEN 1 ELSE 0 END +
      CASE WHEN c.examenes AND c.examenes_fecha IS NOT NULL THEN 1 ELSE 0 END +
      
      -- Contratos (2 pasos)
      CASE WHEN c.envio_contrato THEN 1 ELSE 0 END +
      CASE WHEN c.recibido_contrato_firmado AND c.contrato_fecha_confirmacion IS NOT NULL THEN 1 ELSE 0 END +
      
      -- ARL (2 pasos)
      CASE WHEN c.solicitud_inscripcion_arl THEN 1 ELSE 0 END +
      CASE WHEN c.arl_nombre IS NOT NULL AND c.arl_nombre != '' AND c.arl_fecha_confirmacion IS NOT NULL THEN 1 ELSE 0 END +
      
      -- EPS (2 pasos)
      CASE WHEN c.solicitud_eps THEN 1 ELSE 0 END +
      CASE WHEN c.radicado_eps IS NOT NULL AND c.radicado_eps != '' AND c.eps_fecha_confirmacion IS NOT NULL THEN 1 ELSE 0 END +
      
      -- Caja de Compensación (2 pasos)
      CASE WHEN c.envio_inscripcion_caja THEN 1 ELSE 0 END +
      CASE WHEN c.radicado_ccf IS NOT NULL AND c.radicado_ccf != '' AND c.caja_fecha_confirmacion IS NOT NULL THEN 1 ELSE 0 END +
      
      -- Cesantías (1 paso - confirmación se infiere por datos)
      CASE WHEN c.solicitud_cesantias AND c.fondo_cesantias IS NOT NULL AND c.fondo_cesantias != '' AND c.cesantias_fecha_confirmacion IS NOT NULL THEN 1 ELSE 0 END +
      
      -- Fondo de Pensión (1 paso - confirmación se infiere por datos)
      CASE WHEN c.solicitud_fondo_pension AND c.fondo_pension IS NOT NULL AND c.fondo_pension != '' AND c.pension_fecha_confirmacion IS NOT NULL THEN 1 ELSE 0 END
      
    ) * 100.0 / 12  -- Total de 12 pasos
  )::INTEGER
$$ LANGUAGE sql STABLE;

-- Función helper para obtener estado completo
CREATE OR REPLACE FUNCTION get_contract_full_status(contract_row contracts)
RETURNS JSON AS $$
BEGIN
  RETURN JSON_BUILD_OBJECT(
    'status_aprobacion', contract_row.status_aprobacion,
    'status_vigencia', calculate_contract_status_vigencia(contract_row.fecha_fin),
    'can_edit', CASE 
      WHEN contract_row.status_aprobacion = 'borrador' THEN true 
      ELSE false 
    END,
    'can_delete', CASE 
      WHEN contract_row.status_aprobacion = 'borrador' THEN true 
      ELSE false 
    END,
    'can_approve', CASE 
      WHEN contract_row.status_aprobacion = 'borrador' THEN true 
      ELSE false 
    END,
    'days_until_expiry', CASE
      WHEN contract_row.fecha_fin IS NULL THEN NULL
      WHEN contract_row.fecha_fin <= CURRENT_DATE THEN 0
      ELSE EXTRACT(DAYS FROM contract_row.fecha_fin - CURRENT_DATE)::INTEGER
    END
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===============================================
-- 13. FUNCIONES HELPER PARA LÍNEAS DE NEGOCIO
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
    ub.email,
    lnr.es_asignado_principal,
    lnr.fecha_asignacion
  FROM linea_negocio_responsables lnr
  JOIN usuarios_basicos ub ON lnr.user_id = ub.id
  WHERE lnr.linea_negocio_id = linea_id 
    AND lnr.es_activo = true
  ORDER BY lnr.es_asignado_principal DESC, lnr.fecha_asignacion ASC;
$$;

-- Función segura para el frontend (nombre que espera el frontend) - VERSIÓN ORIGINAL
-- Eliminar función si existe para evitar conflictos de tipo de retorno
DROP FUNCTION IF EXISTS get_linea_negocio_responsables_safe(UUID);

CREATE OR REPLACE FUNCTION get_linea_negocio_responsables_safe(linea_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  es_principal BOOLEAN,
  fecha_asignacion TIMESTAMPTZ,
  es_activo BOOLEAN
) 
LANGUAGE SQL SECURITY DEFINER AS $$
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
      has_permission(auth.uid(), 'linea_negocio_responsables', 'view') OR
      has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
      has_permission(auth.uid(), 'lineas_negocio', 'view') OR
      lnr.user_id = auth.uid()
    )
  ORDER BY lnr.es_asignado_principal DESC, lnr.fecha_asignacion ASC;
$$;

-- Función segura para obtener usuarios disponibles para asignación
DROP FUNCTION IF EXISTS get_users_for_business_line_assignment();

CREATE OR REPLACE FUNCTION get_users_for_business_line_assignment()
RETURNS TABLE (
  id UUID,
  email TEXT
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ub.id,
    ub.email
  FROM usuarios_basicos ub
  WHERE (
    has_permission(auth.uid(), 'linea_negocio_responsables', 'create') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
  )
  ORDER BY ub.email ASC;
$$;

-- Función para obtener líneas de negocio de una empresa
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

-- Función para asignar líneas de negocio a empresa de forma segura
CREATE OR REPLACE FUNCTION assign_business_lines_to_company(
  p_empresa_id UUID,
  p_lineas_negocio_ids UUID[],
  p_asignado_por UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Desactivar todas las asignaciones actuales para esta empresa
  UPDATE empresa_lineas_negocio 
  SET es_activa = false
  WHERE empresa_id = p_empresa_id;

  -- 2. Para cada línea de negocio seleccionada
  IF array_length(p_lineas_negocio_ids, 1) > 0 THEN
    -- Usar INSERT ... ON CONFLICT para manejar duplicados de forma segura
    INSERT INTO empresa_lineas_negocio (
      empresa_id,
      linea_negocio_id,
      asignado_por,
      es_activa,
      fecha_asignacion
    )
    SELECT 
      p_empresa_id,
      unnest(p_lineas_negocio_ids),
      p_asignado_por,
      true,
      now()
    ON CONFLICT (empresa_id, linea_negocio_id) 
    DO UPDATE SET
      es_activa = true,
      asignado_por = p_asignado_por,
      fecha_asignacion = now();
  END IF;
END;
$$;

-- ===============================================
-- 13.1. GRANTS PARA VISTA DE USUARIOS BÁSICOS
-- ===============================================

-- Grant para acceso desde frontend a la vista usuarios_basicos
-- La vista ya fue creada en el archivo anterior
GRANT SELECT ON usuarios_basicos TO authenticated;

-- ===============================================
-- 14. HABILITACIÓN DE RLS
-- ===============================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciudades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajas_compensacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE arls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondos_cesantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondos_pension ENABLE ROW LEVEL SECURITY;
ALTER TABLE eps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE linea_negocio_responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_lineas_negocio ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 15. POLÍTICAS RLS PRINCIPALES
-- ===============================================

-- Políticas para PERMISSIONS
DROP POLICY IF EXISTS "view_permissions" ON permissions;
DROP POLICY IF EXISTS "create_permissions" ON permissions;
DROP POLICY IF EXISTS "update_permissions" ON permissions;
DROP POLICY IF EXISTS "delete_permissions" ON permissions;

CREATE POLICY "view_permissions" ON permissions
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'permissions', 'view') OR is_super_admin(auth.uid()));

CREATE POLICY "create_permissions" ON permissions
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "update_permissions" ON permissions
  FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "delete_permissions" ON permissions
  FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Políticas para USER_PERMISSIONS
DROP POLICY IF EXISTS "view_user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "create_user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "update_user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "delete_user_permissions" ON user_permissions;

CREATE POLICY "view_user_permissions" ON user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_permission(auth.uid(), 'user_permissions', 'view')
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "create_user_permissions" ON user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'create')
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "update_user_permissions" ON user_permissions
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'edit')
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'edit')
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "delete_user_permissions" ON user_permissions
  FOR DELETE TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'delete')
    OR is_super_admin(auth.uid())
  );

-- Políticas para COMPANIES
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
DROP POLICY IF EXISTS "companies_insert_policy" ON companies;
DROP POLICY IF EXISTS "companies_update_policy" ON companies;
DROP POLICY IF EXISTS "companies_delete_policy" ON companies;

CREATE POLICY "companies_select_policy" ON companies
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'companies', 'view'));

CREATE POLICY "companies_insert_policy" ON companies
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'companies', 'create'));

CREATE POLICY "companies_update_policy" ON companies
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'companies', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'companies', 'edit'));

CREATE POLICY "companies_delete_policy" ON companies
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'companies', 'delete'));

-- Políticas para CONTRACTS
DROP POLICY IF EXISTS "contracts_select_policy" ON contracts;
DROP POLICY IF EXISTS "contracts_insert_policy" ON contracts;
DROP POLICY IF EXISTS "contracts_update_policy" ON contracts;
DROP POLICY IF EXISTS "contracts_delete_policy" ON contracts;

CREATE POLICY "contracts_select_policy" ON contracts
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'contracts', 'view'));

CREATE POLICY "contracts_insert_policy" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'contracts', 'create'));

CREATE POLICY "contracts_update_policy" ON contracts
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'contracts', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'contracts', 'edit'));

CREATE POLICY "contracts_delete_policy" ON contracts
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'contracts', 'delete'));
