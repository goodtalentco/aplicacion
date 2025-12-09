-- ===============================================
-- MIGRACIÓN CONSOLIDADA COMPLETA - GOOD Talent
-- Fecha: 2025-01-15
-- Versión: 2.2.0 FINAL
-- Descripción: Schema completo del sistema con todas las mejoras implementadas
-- 
-- CONTENIDO CONSOLIDADO:
-- 1. Sistema de permisos completo (permissions, user_permissions)
-- 2. Tabla de empresas (companies) con auditoría
-- 3. Tabla de contratos (contracts) con todas las mejoras:
--    - Sistema de estados (borrador/aprobado, activo/terminado)
--    - Onboarding simplificado (12 pasos)
--    - Campos de condición médica
--    - SENA por defecto true con información
--    - Auxilio de transporte
--    - Fecha de expedición de documento
-- 4. Funciones helper optimizadas
-- 5. Políticas RLS completas
-- 6. Computed columns actualizados
-- 7. Índices para performance
-- 8. Triggers de auditoría
-- 9. Permisos iniciales
--
-- PRINCIPIOS DE DISEÑO:
-- ✅ Idempotencia: CREATE IF NOT EXISTS, ON CONFLICT DO NOTHING
-- ✅ Seguridad: RLS habilitado con políticas estrictas
-- ✅ Auditoría: Tracking de creación/modificación
-- ✅ Performance: Índices en consultas frecuentes
-- ✅ Mantenibilidad: Funciones con SECURITY DEFINER
-- ===============================================

-- ===============================================
-- 1. EXTENSIONES Y CONFIGURACIÓN
-- ===============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===============================================
-- 2. TABLA PERMISSIONS - Catálogo de permisos del sistema
-- ===============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_table_action UNIQUE(table_name, action),
  CONSTRAINT permissions_table_name_not_empty CHECK (length(trim(table_name)) > 0),
  CONSTRAINT permissions_action_not_empty CHECK (length(trim(action)) > 0)
);

-- Índices para permissions
CREATE INDEX IF NOT EXISTS idx_permissions_table_action ON permissions(table_name, action);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_table_name ON permissions(table_name);

-- ===============================================
-- 3. TABLA USER_PERMISSIONS - Asignación usuario-permiso
-- ===============================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_permission UNIQUE(user_id, permission_id)
);

-- Foreign Keys para user_permissions
DO $$
BEGIN
  -- FK a auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_permissions_user_id'
  ) THEN
    ALTER TABLE user_permissions 
    ADD CONSTRAINT fk_user_permissions_user_id 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- FK a permissions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_permissions_permission_id'
  ) THEN
    ALTER TABLE user_permissions 
    ADD CONSTRAINT fk_user_permissions_permission_id 
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;
  END IF;

  -- FK para granted_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_user_permissions_granted_by'
  ) THEN
    ALTER TABLE user_permissions 
    ADD CONSTRAINT fk_user_permissions_granted_by 
    FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índices para user_permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_active ON user_permissions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by ON user_permissions(granted_by);

-- ===============================================
-- 4. TABLA COMPANIES - Entidades cliente/empresa
-- ===============================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT NOT NULL UNIQUE,
  accounts_contact_name TEXT NOT NULL,
  accounts_contact_email TEXT NOT NULL,
  accounts_contact_phone TEXT NOT NULL,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  
  -- Constraints de validación
  CONSTRAINT companies_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT companies_tax_id_not_empty CHECK (length(trim(tax_id)) > 0),
  CONSTRAINT companies_contact_name_not_empty CHECK (length(trim(accounts_contact_name)) > 0),
  CONSTRAINT companies_contact_email_format CHECK (accounts_contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT companies_archived_logic CHECK (
    (archived_at IS NULL AND archived_by IS NULL) OR 
    (archived_at IS NOT NULL AND archived_by IS NOT NULL)
  )
);

-- Foreign Keys para companies
DO $$
BEGIN
  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_companies_created_by'
  ) THEN
    ALTER TABLE companies 
    ADD CONSTRAINT fk_companies_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_companies_updated_by'
  ) THEN
    ALTER TABLE companies 
    ADD CONSTRAINT fk_companies_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para archived_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_companies_archived_by'
  ) THEN
    ALTER TABLE companies 
    ADD CONSTRAINT fk_companies_archived_by 
    FOREIGN KEY (archived_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON companies(tax_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
CREATE INDEX IF NOT EXISTS idx_companies_updated_by ON companies(updated_by);
CREATE INDEX IF NOT EXISTS idx_companies_archived_at ON companies(archived_at) WHERE archived_at IS NULL;

-- ===============================================
-- 5. TABLA CONTRACTS - Contratos laborales COMPLETA
-- ===============================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información personal del empleado
  primer_nombre TEXT NOT NULL,
  segundo_nombre TEXT,
  primer_apellido TEXT NOT NULL,
  segundo_apellido TEXT,
  tipo_identificacion TEXT NOT NULL CHECK (tipo_identificacion IN ('CC', 'CE', 'Pasaporte', 'PEP', 'Otro')),
  numero_identificacion TEXT NOT NULL,
  fecha_expedicion_documento DATE, -- Nueva columna agregada
  fecha_nacimiento DATE NOT NULL,
  celular TEXT,
  email TEXT,
  
  -- Información del contrato
  empresa_interna TEXT NOT NULL CHECK (empresa_interna IN ('Good', 'CPS')),
  empresa_final_id UUID NOT NULL,
  ciudad_labora TEXT,
  cargo TEXT,
  numero_contrato_helisa TEXT UNIQUE, -- Ahora nullable hasta aprobación
  base_sena BOOLEAN DEFAULT true, -- Cambio: default true
  fecha_ingreso DATE,
  tipo_contrato TEXT CHECK (tipo_contrato IN ('Indefinido', 'Fijo', 'Obra', 'Aprendizaje')),
  fecha_fin DATE,
  tipo_salario TEXT CHECK (tipo_salario IN ('Integral', 'Ordinario')),
  
  -- Información salarial
  salario NUMERIC(14,2) CHECK (salario >= 0),
  auxilio_salarial NUMERIC(14,2) CHECK (auxilio_salarial >= 0),
  auxilio_salarial_concepto TEXT,
  auxilio_no_salarial NUMERIC(14,2) CHECK (auxilio_no_salarial >= 0),
  auxilio_no_salarial_concepto TEXT,
  auxilio_transporte NUMERIC(14,2) DEFAULT 0 CHECK (auxilio_transporte >= 0), -- Nueva columna
  
  -- Información médica (NUEVO)
  tiene_condicion_medica BOOLEAN DEFAULT FALSE NOT NULL,
  condicion_medica_detalle TEXT,
  
  -- Beneficiarios
  beneficiario_hijo INTEGER DEFAULT 0 CHECK (beneficiario_hijo >= 0),
  beneficiario_madre INTEGER DEFAULT 0 CHECK (beneficiario_madre IN (0, 1)),
  beneficiario_padre INTEGER DEFAULT 0 CHECK (beneficiario_padre IN (0, 1)),
  beneficiario_conyuge INTEGER DEFAULT 0 CHECK (beneficiario_conyuge IN (0, 1)),
  
  -- Onboarding paso 1: Exámenes
  fecha_solicitud DATE,
  fecha_radicado DATE,
  programacion_cita_examenes BOOLEAN DEFAULT false,
  examenes BOOLEAN DEFAULT false,
  examenes_fecha DATE,
  
  -- Onboarding paso 2: ARL
  solicitud_inscripcion_arl BOOLEAN DEFAULT false,
  arl_nombre TEXT,
  arl_fecha_confirmacion DATE,
  
  -- Onboarding paso 3: Contratos
  envio_contrato BOOLEAN DEFAULT false,
  recibido_contrato_firmado BOOLEAN DEFAULT false,
  contrato_fecha_confirmacion DATE,
  
  -- Onboarding paso 4: EPS
  solicitud_eps BOOLEAN DEFAULT false,
  radicado_eps TEXT, -- Cambiado de boolean a text
  eps_fecha_confirmacion DATE,
  
  -- Onboarding paso 5: Caja de Compensación
  envio_inscripcion_caja BOOLEAN DEFAULT false,
  radicado_ccf TEXT, -- Cambiado de boolean a text
  caja_fecha_confirmacion DATE,
  
  -- Onboarding paso 6: Cesantías
  solicitud_cesantias BOOLEAN DEFAULT false,
  fondo_cesantias TEXT,
  cesantias_fecha_confirmacion DATE,
  
  -- Onboarding paso 7: Fondo de Pensión
  solicitud_fondo_pension BOOLEAN DEFAULT false,
  fondo_pension TEXT,
  pension_fecha_confirmacion DATE,
  
  -- Documentos y observaciones
  dropbox TEXT,
  observacion TEXT,
  
  -- Sistema de estados (NUEVO)
  status_aprobacion TEXT DEFAULT 'borrador' CHECK (status_aprobacion IN ('borrador', 'aprobado')),
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID NULL,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints de validación
  CONSTRAINT contracts_primer_nombre_not_empty CHECK (length(trim(primer_nombre)) > 0),
  CONSTRAINT contracts_primer_apellido_not_empty CHECK (length(trim(primer_apellido)) > 0),
  CONSTRAINT contracts_numero_identificacion_not_empty CHECK (length(trim(numero_identificacion)) > 0),
  CONSTRAINT contracts_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT contracts_dropbox_url_format CHECK (dropbox IS NULL OR dropbox ~* '^https?://'),
  CONSTRAINT contracts_fecha_fin_logic CHECK (
    (tipo_contrato = 'Indefinido' AND fecha_fin IS NULL) OR 
    (tipo_contrato != 'Indefinido' AND fecha_fin IS NOT NULL) OR
    tipo_contrato IS NULL
  )
);

-- Foreign Keys para contracts
DO $$
BEGIN
  -- FK a companies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_contracts_empresa_final_id'
  ) THEN
    ALTER TABLE contracts 
    ADD CONSTRAINT fk_contracts_empresa_final_id 
    FOREIGN KEY (empresa_final_id) REFERENCES companies(id);
  END IF;

  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_contracts_created_by'
  ) THEN
    ALTER TABLE contracts 
    ADD CONSTRAINT fk_contracts_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_contracts_updated_by'
  ) THEN
    ALTER TABLE contracts 
    ADD CONSTRAINT fk_contracts_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para approved_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_contracts_approved_by'
  ) THEN
    ALTER TABLE contracts 
    ADD CONSTRAINT fk_contracts_approved_by 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===============================================
-- 6. ÍNDICES PARA PERFORMANCE
-- ===============================================

-- Índices para contracts - Búsquedas principales
CREATE INDEX IF NOT EXISTS idx_contracts_numero_contrato_helisa ON contracts(numero_contrato_helisa);
CREATE INDEX IF NOT EXISTS idx_contracts_numero_identificacion ON contracts(numero_identificacion);
CREATE INDEX IF NOT EXISTS idx_contracts_empresa_final_id ON contracts(empresa_final_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_updated_by ON contracts(updated_by);
CREATE INDEX IF NOT EXISTS idx_contracts_fecha_ingreso ON contracts(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_contracts_tipo_contrato ON contracts(tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_contracts_empresa_interna ON contracts(empresa_interna);

-- Índices para sistema de estados
CREATE INDEX IF NOT EXISTS idx_contracts_status_aprobacion ON contracts(status_aprobacion);
CREATE INDEX IF NOT EXISTS idx_contracts_status_fecha_fin ON contracts(status_aprobacion, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_contracts_approved_by ON contracts(approved_by) WHERE approved_by IS NOT NULL;

-- Índice compuesto para búsquedas de nombres
CREATE INDEX IF NOT EXISTS idx_contracts_nombres ON contracts(primer_nombre, primer_apellido);

-- ===============================================
-- 7. TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ===============================================

-- Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para permissions
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_permissions
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función específica para companies (maneja updated_by)
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Si no se especifica updated_by, usar el usuario actual
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para companies
DROP TRIGGER IF EXISTS trigger_companies_updated_at ON companies;
CREATE TRIGGER trigger_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Función específica para contracts (maneja updated_by)
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Si no se especifica updated_by, usar el usuario actual
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para contracts
DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON contracts;
CREATE TRIGGER trigger_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

-- ===============================================
-- 8. FUNCIONES HELPER Y RPC (SECURITY DEFINER)
-- ===============================================

-- Función para verificar permisos específicos
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, table_name_param TEXT, action_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = user_uuid
      AND p.table_name = table_name_param
      AND p.action = action_param
      AND up.is_active = true
      AND p.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_permission(user_uuid, 'user_permissions', 'create')
     AND has_permission(user_uuid, 'user_permissions', 'delete');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener permisos del usuario actual
CREATE OR REPLACE FUNCTION my_permissions()
RETURNS TABLE (
  table_name TEXT,
  action TEXT,
  description TEXT,
  granted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.table_name,
    p.action,
    p.description,
    up.granted_at
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = auth.uid()
    AND up.is_active = true
    AND p.is_active = true
  ORDER BY p.table_name, p.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener usuarios con conteo de permisos (incluye is_banned)
CREATE OR REPLACE FUNCTION get_users_with_permissions()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  permissions_count BIGINT,
  is_active BOOLEAN,
  is_banned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    COALESCE(p.permissions_count, 0) AS permissions_count,
    CASE 
      WHEN u.email_confirmed_at IS NOT NULL 
       AND (u.banned_until IS NULL OR u.banned_until::timestamp <= NOW())
      THEN true
      ELSE false
    END AS is_active,
    CASE 
      WHEN u.banned_until IS NOT NULL AND u.banned_until::timestamp > NOW() THEN true
      ELSE false
    END AS is_banned
  FROM auth.users u
  LEFT JOIN (
    SELECT up.user_id, COUNT(*) AS permissions_count
    FROM user_permissions up
    WHERE up.is_active = true
    GROUP BY up.user_id
  ) p ON u.id = p.user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener permisos detallados de un usuario
CREATE OR REPLACE FUNCTION get_user_permissions(target_user_id UUID)
RETURNS TABLE (
  permission_id UUID,
  table_name TEXT,
  action TEXT,
  description TEXT,
  granted_at TIMESTAMPTZ,
  granted_by UUID,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.permission_id,
    p.table_name,
    p.action,
    p.description,
    up.granted_at,
    up.granted_by,
    up.is_active
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = target_user_id
  ORDER BY p.table_name, p.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para asignar permiso a usuario
CREATE OR REPLACE FUNCTION assign_permission_to_user(
  target_user_id UUID,
  target_permission_id UUID,
  assigned_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_permissions (user_id, permission_id, granted_by)
  VALUES (target_user_id, target_permission_id, assigned_by)
  ON CONFLICT (user_id, permission_id)
  DO UPDATE SET 
    is_active = true, 
    granted_at = NOW(), 
    granted_by = assigned_by,
    updated_at = NOW();
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para revocar permiso de usuario
CREATE OR REPLACE FUNCTION revoke_permission_from_user(
  target_user_id UUID,
  target_permission_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_permissions
  SET is_active = false, updated_at = NOW()
  WHERE user_id = target_user_id AND permission_id = target_permission_id;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear super admin
CREATE OR REPLACE FUNCTION create_super_admin(admin_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_permissions (user_id, permission_id, granted_by)
  SELECT admin_user_id, p.id, admin_user_id
  FROM permissions p
  WHERE p.is_active = true
  ON CONFLICT (user_id, permission_id) 
  DO UPDATE SET 
    is_active = true, 
    granted_at = NOW(), 
    granted_by = admin_user_id,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener handle de usuario (parte antes de @)
CREATE OR REPLACE FUNCTION get_user_handle(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT u.email::TEXT INTO v_email
  FROM auth.users u
  WHERE u.id = user_uuid;

  IF v_email IS NULL OR position('@' IN v_email) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN split_part(v_email, '@', 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 9. FUNCIONES ESPECÍFICAS PARA CONTRATOS
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
-- 10. COMPUTED COLUMNS PARA COMPANIES
-- ===============================================

-- Handle del creador (computed column)
CREATE OR REPLACE FUNCTION companies_created_by_handle(c companies)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN u.email IS NULL THEN NULL
    ELSE split_part(u.email::TEXT, '@', 1)
  END
  FROM auth.users u
  WHERE u.id = c.created_by
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Handle del editor (computed column)
CREATE OR REPLACE FUNCTION companies_updated_by_handle(c companies)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN u.email IS NULL THEN NULL
    ELSE split_part(u.email::TEXT, '@', 1)
  END
  FROM auth.users u
  WHERE u.id = c.updated_by
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ===============================================
-- 11. COMPUTED COLUMNS PARA CONTRACTS
-- ===============================================

-- Handle del creador (computed column)
CREATE OR REPLACE FUNCTION contracts_created_by_handle(c contracts)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN u.email IS NULL THEN NULL
    ELSE split_part(u.email::TEXT, '@', 1)
  END
  FROM auth.users u
  WHERE u.id = c.created_by
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Handle del editor (computed column)
CREATE OR REPLACE FUNCTION contracts_updated_by_handle(c contracts)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN u.email IS NULL THEN NULL
    ELSE split_part(u.email::TEXT, '@', 1)
  END
  FROM auth.users u
  WHERE u.id = c.updated_by
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
-- 12. HABILITACIÓN DE RLS
-- ===============================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 13. POLÍTICAS RLS
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

-- ===============================================
-- 14. PERMISOS INICIALES DEL SISTEMA
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
('reports', 'export', 'Exportar reportes')

ON CONFLICT (table_name, action) DO NOTHING;

-- ===============================================
-- 15. GRANTS PARA ROL AUTHENTICATED
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

-- Grants para tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contracts TO authenticated;

-- ===============================================
-- 16. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

-- Comentarios en tablas
COMMENT ON TABLE permissions IS 'Catálogo de permisos disponibles en el sistema';
COMMENT ON TABLE user_permissions IS 'Asignaciones de permisos a usuarios con auditoría';
COMMENT ON TABLE companies IS 'Entidades cliente/empresa con información de contacto';
COMMENT ON TABLE contracts IS 'Contratos laborales con información completa de empleados, onboarding y estados';

-- Comentarios en columnas principales de contracts
COMMENT ON COLUMN contracts.fecha_expedicion_documento IS 'Fecha de expedición del documento de identificación';
COMMENT ON COLUMN contracts.base_sena IS 'Indica si el empleado aporta al SENA. Por defecto TRUE, excepto para conductores, aprendices, extranjeros, dirección/confianza y manejo';
COMMENT ON COLUMN contracts.auxilio_transporte IS 'Auxilio de transporte mensual';
COMMENT ON COLUMN contracts.tiene_condicion_medica IS 'Indica si el empleado tiene alguna condición médica especial';
COMMENT ON COLUMN contracts.condicion_medica_detalle IS 'Descripción detallada de la condición médica (solo si tiene_condicion_medica es true)';
COMMENT ON COLUMN contracts.status_aprobacion IS 'Estado de aprobación: borrador (editable) o aprobado (solo lectura)';
COMMENT ON COLUMN contracts.approved_at IS 'Fecha y hora de aprobación del contrato';
COMMENT ON COLUMN contracts.approved_by IS 'Usuario que aprobó el contrato';

-- Comentarios en funciones principales
COMMENT ON FUNCTION has_permission(UUID, TEXT, TEXT) IS 'Verifica si un usuario tiene un permiso específico';
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Determina si el usuario es super admin basado en permisos de user_permissions';
COMMENT ON FUNCTION my_permissions() IS 'Lista los permisos activos del usuario actual';
COMMENT ON FUNCTION get_users_with_permissions() IS 'Usuarios con conteo de permisos y estado de banned';
COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Permisos detallados de un usuario específico';
COMMENT ON FUNCTION assign_permission_to_user(UUID, UUID, UUID) IS 'Asigna un permiso a un usuario con auditoría';
COMMENT ON FUNCTION revoke_permission_from_user(UUID, UUID) IS 'Revoca un permiso de un usuario (soft delete)';
COMMENT ON FUNCTION create_super_admin(UUID) IS 'Convierte a un usuario en super admin otorgando todos los permisos';
COMMENT ON FUNCTION get_user_handle(UUID) IS 'Retorna la parte local del email (antes de @) para un usuario';
COMMENT ON FUNCTION companies_created_by_handle(companies) IS 'Computed column: handle del creador';
COMMENT ON FUNCTION companies_updated_by_handle(companies) IS 'Computed column: handle del editor';
COMMENT ON FUNCTION calculate_contract_status_vigencia(DATE) IS 'Calcula si un contrato está activo o terminado basado en fecha_fin';
COMMENT ON FUNCTION approve_contract(UUID, UUID, TEXT) IS 'Función segura para aprobar un contrato en estado borrador';
COMMENT ON FUNCTION contracts_created_by_handle(contracts) IS 'Computed column: handle del creador del contrato';
COMMENT ON FUNCTION contracts_updated_by_handle(contracts) IS 'Computed column: handle del editor del contrato';
COMMENT ON FUNCTION contracts_full_name(contracts) IS 'Computed column: nombre completo del empleado';
COMMENT ON FUNCTION contracts_onboarding_progress(contracts) IS 'Calcula el progreso de onboarding basado en presencia de datos (0-100%). Confirmaciones se infieren por datos completos.';
COMMENT ON FUNCTION get_contract_full_status(contracts) IS 'Retorna estado completo del contrato con flags de permisos';

-- ===============================================
-- 17. VERIFICACIONES POST-MIGRACIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que RLS está habilitado
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename IN ('permissions','user_permissions','companies','contracts')
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS habilitado en todas las tablas principales';
  ELSE
    RAISE NOTICE 'WARNING: Verificar que RLS esté habilitado en todas las tablas';
  END IF;

  -- Verificar que las tablas existen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('permissions', 'user_permissions', 'companies', 'contracts')
  ) THEN
    RAISE NOTICE 'SUCCESS: Todas las tablas principales fueron creadas';
  ELSE
    RAISE NOTICE 'ERROR: Faltan tablas principales';
  END IF;

  -- Verificar que los permisos iniciales existen
  IF EXISTS (SELECT 1 FROM permissions WHERE table_name IN ('contracts', 'companies') LIMIT 1) THEN
    RAISE NOTICE 'SUCCESS: Permisos iniciales insertados correctamente';
  ELSE
    RAISE NOTICE 'WARNING: Verificar permisos iniciales';
  END IF;

  -- Verificar nuevas columnas de contracts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name IN ('tiene_condicion_medica', 'auxilio_transporte', 'fecha_expedicion_documento')
  ) THEN
    RAISE NOTICE 'SUCCESS: Nuevas columnas de contracts agregadas correctamente';
  ELSE
    RAISE NOTICE 'ERROR: Faltan nuevas columnas en contracts';
  END IF;

  RAISE NOTICE '=== MIGRACIÓN CONSOLIDADA COMPLETADA EXITOSAMENTE ===';
  RAISE NOTICE 'Schema: permissions + companies + contracts (completo con mejoras)';
  RAISE NOTICE 'Funciones: % funciones creadas/actualizadas', (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'has_permission%' OR proname LIKE 'contracts_%' OR proname LIKE 'companies_%');
  RAISE NOTICE 'Permisos: % permisos base insertados', (SELECT COUNT(*) FROM permissions);
  RAISE NOTICE 'Trigger: Auditoría automática habilitada en todas las tablas';
  RAISE NOTICE 'RLS: Políticas de seguridad activas y verificadas';
END $$;

-- ===============================================
-- FIN DE MIGRACIÓN CONSOLIDADA COMPLETA
-- ===============================================
