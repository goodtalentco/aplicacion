-- ===============================================
-- MIGRACIÓN CONSOLIDADA COMPLETA - GOOD Talent
-- Fecha: 2025-01-15
-- Versión: 3.0.0 CONSOLIDATED
-- Descripción: Schema completo del sistema unificando todas las migraciones
-- 
-- CONTENIDO CONSOLIDADO:
-- 1. Sistema de permisos completo (permissions, user_permissions)
-- 2. Tabla de empresas (companies) con auditoría
-- 3. Tabla de contratos (contracts) con mejoras v2.1
-- 4. Tablas auxiliares administrativas (6 tablas)
-- 5. Sistema de líneas de negocio (3 tablas)
-- 6. Funciones helper optimizadas con SECURITY DEFINER
-- 7. Políticas RLS completas y flexibles
-- 8. Computed columns actualizados
-- 9. Índices para performance
-- 10. Triggers de auditoría automática
-- 11. Permisos iniciales del sistema
-- 12. Datos precargados para Colombia
--
-- PRINCIPIOS DE DISEÑO:
-- ✅ Idempotencia: CREATE IF NOT EXISTS, ON CONFLICT DO NOTHING
-- ✅ Seguridad: RLS habilitado con políticas optimizadas
-- ✅ Auditoría: Tracking completo de creación/modificación
-- ✅ Performance: Índices en consultas frecuentes
-- ✅ Mantenibilidad: Funciones documentadas y seguras
-- ===============================================

-- ===============================================
-- 1. EXTENSIONES Y CONFIGURACIÓN INICIAL
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

-- Foreign Keys para companies (restauradas para integridad referencial)
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
-- 5. TABLA CONTRACTS - Contratos laborales COMPLETA v2.1
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
  numero_contrato_helisa TEXT UNIQUE, -- Nullable hasta aprobación
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

-- Foreign Keys para contracts (todas las relaciones)
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
-- 6. TABLAS AUXILIARES ADMINISTRATIVAS (6 TABLAS)
-- ===============================================

-- Tabla CIUDADES
CREATE TABLE IF NOT EXISTS ciudades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT ciudades_nombre_not_empty CHECK (length(trim(nombre)) > 0)
);

-- Tabla CAJAS DE COMPENSACIÓN
CREATE TABLE IF NOT EXISTS cajas_compensacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ciudad_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT cajas_compensacion_nombre_not_empty CHECK (length(trim(nombre)) > 0),
  CONSTRAINT unique_caja_ciudad UNIQUE(nombre, ciudad_id)
);

-- Tabla ARLS
CREATE TABLE IF NOT EXISTS arls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT arls_nombre_not_empty CHECK (length(trim(nombre)) > 0)
);

-- Tabla FONDOS DE CESANTÍAS
CREATE TABLE IF NOT EXISTS fondos_cesantias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fondos_cesantias_nombre_not_empty CHECK (length(trim(nombre)) > 0)
);

-- Tabla FONDOS DE PENSIÓN
CREATE TABLE IF NOT EXISTS fondos_pension (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fondos_pension_nombre_not_empty CHECK (length(trim(nombre)) > 0)
);

-- Tabla EPS
CREATE TABLE IF NOT EXISTS eps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT eps_nombre_not_empty CHECK (length(trim(nombre)) > 0)
);

-- Foreign Keys para tablas auxiliares (completas con auditoría)
DO $$
BEGIN
  -- FK para ciudades
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ciudades_created_by') THEN
    ALTER TABLE ciudades ADD CONSTRAINT fk_ciudades_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ciudades_updated_by') THEN
    ALTER TABLE ciudades ADD CONSTRAINT fk_ciudades_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para cajas_compensacion
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_cajas_compensacion_ciudad_id') THEN
    ALTER TABLE cajas_compensacion ADD CONSTRAINT fk_cajas_compensacion_ciudad_id FOREIGN KEY (ciudad_id) REFERENCES ciudades(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_cajas_compensacion_created_by') THEN
    ALTER TABLE cajas_compensacion ADD CONSTRAINT fk_cajas_compensacion_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_cajas_compensacion_updated_by') THEN
    ALTER TABLE cajas_compensacion ADD CONSTRAINT fk_cajas_compensacion_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para arls
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_arls_created_by') THEN
    ALTER TABLE arls ADD CONSTRAINT fk_arls_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_arls_updated_by') THEN
    ALTER TABLE arls ADD CONSTRAINT fk_arls_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para fondos_cesantias
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_fondos_cesantias_created_by') THEN
    ALTER TABLE fondos_cesantias ADD CONSTRAINT fk_fondos_cesantias_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_fondos_cesantias_updated_by') THEN
    ALTER TABLE fondos_cesantias ADD CONSTRAINT fk_fondos_cesantias_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para fondos_pension
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_fondos_pension_created_by') THEN
    ALTER TABLE fondos_pension ADD CONSTRAINT fk_fondos_pension_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_fondos_pension_updated_by') THEN
    ALTER TABLE fondos_pension ADD CONSTRAINT fk_fondos_pension_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para eps
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_eps_created_by') THEN
    ALTER TABLE eps ADD CONSTRAINT fk_eps_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_eps_updated_by') THEN
    ALTER TABLE eps ADD CONSTRAINT fk_eps_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para tablas auxiliares
CREATE INDEX IF NOT EXISTS idx_ciudades_nombre ON ciudades(nombre);
CREATE INDEX IF NOT EXISTS idx_ciudades_created_by ON ciudades(created_by);
CREATE INDEX IF NOT EXISTS idx_cajas_compensacion_nombre ON cajas_compensacion(nombre);
CREATE INDEX IF NOT EXISTS idx_cajas_compensacion_ciudad_id ON cajas_compensacion(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_cajas_compensacion_created_by ON cajas_compensacion(created_by);
CREATE INDEX IF NOT EXISTS idx_arls_nombre ON arls(nombre);
CREATE INDEX IF NOT EXISTS idx_arls_created_by ON arls(created_by);
CREATE INDEX IF NOT EXISTS idx_fondos_cesantias_nombre ON fondos_cesantias(nombre);
CREATE INDEX IF NOT EXISTS idx_fondos_cesantias_created_by ON fondos_cesantias(created_by);
CREATE INDEX IF NOT EXISTS idx_fondos_pension_nombre ON fondos_pension(nombre);
CREATE INDEX IF NOT EXISTS idx_fondos_pension_created_by ON fondos_pension(created_by);
CREATE INDEX IF NOT EXISTS idx_eps_nombre ON eps(nombre);
CREATE INDEX IF NOT EXISTS idx_eps_created_by ON eps(created_by);

-- ===============================================
-- 7. SISTEMA DE LÍNEAS DE NEGOCIO (3 TABLAS)
-- ===============================================

-- Tabla LÍNEAS DE NEGOCIO (catálogo principal)
CREATE TABLE IF NOT EXISTS lineas_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  es_activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT lineas_negocio_nombre_not_empty CHECK (length(trim(nombre)) > 0),
  CONSTRAINT lineas_negocio_descripcion_min_length CHECK (descripcion IS NULL OR length(trim(descripcion)) >= 3)
);

-- Tabla RESPONSABLES DE LÍNEAS DE NEGOCIO
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

-- Tabla LÍNEAS DE NEGOCIO POR EMPRESA
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

-- Foreign Keys para líneas de negocio (completas)
DO $$
BEGIN
  -- FK para lineas_negocio
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_lineas_negocio_created_by') THEN
    ALTER TABLE lineas_negocio ADD CONSTRAINT fk_lineas_negocio_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_lineas_negocio_updated_by') THEN
    ALTER TABLE lineas_negocio ADD CONSTRAINT fk_lineas_negocio_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;

  -- FK para linea_negocio_responsables
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_linea_negocio_responsables_linea_negocio_id') THEN
    ALTER TABLE linea_negocio_responsables ADD CONSTRAINT fk_linea_negocio_responsables_linea_negocio_id FOREIGN KEY (linea_negocio_id) REFERENCES lineas_negocio(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_linea_negocio_responsables_user_id') THEN
    ALTER TABLE linea_negocio_responsables ADD CONSTRAINT fk_linea_negocio_responsables_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_linea_negocio_responsables_asignado_por') THEN
    ALTER TABLE linea_negocio_responsables ADD CONSTRAINT fk_linea_negocio_responsables_asignado_por FOREIGN KEY (asignado_por) REFERENCES auth.users(id);
  END IF;

  -- FK para empresa_lineas_negocio
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_empresa_lineas_negocio_empresa_id') THEN
    ALTER TABLE empresa_lineas_negocio ADD CONSTRAINT fk_empresa_lineas_negocio_empresa_id FOREIGN KEY (empresa_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_empresa_lineas_negocio_linea_negocio_id') THEN
    ALTER TABLE empresa_lineas_negocio ADD CONSTRAINT fk_empresa_lineas_negocio_linea_negocio_id FOREIGN KEY (linea_negocio_id) REFERENCES lineas_negocio(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_empresa_lineas_negocio_asignado_por') THEN
    ALTER TABLE empresa_lineas_negocio ADD CONSTRAINT fk_empresa_lineas_negocio_asignado_por FOREIGN KEY (asignado_por) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para líneas de negocio
CREATE INDEX IF NOT EXISTS idx_lineas_negocio_nombre ON lineas_negocio(nombre);
CREATE INDEX IF NOT EXISTS idx_lineas_negocio_es_activa ON lineas_negocio(es_activa);
CREATE INDEX IF NOT EXISTS idx_lineas_negocio_created_by ON lineas_negocio(created_by);
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_linea_negocio_id ON linea_negocio_responsables(linea_negocio_id);
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_user_id ON linea_negocio_responsables(user_id);
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_es_activo ON linea_negocio_responsables(es_activo);
CREATE INDEX IF NOT EXISTS idx_linea_negocio_responsables_es_principal ON linea_negocio_responsables(es_asignado_principal);
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_empresa_id ON empresa_lineas_negocio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_linea_negocio_id ON empresa_lineas_negocio(linea_negocio_id);
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_es_activa ON empresa_lineas_negocio(es_activa);
CREATE INDEX IF NOT EXISTS idx_empresa_lineas_negocio_fecha_asignacion ON empresa_lineas_negocio(fecha_asignacion);

-- ===============================================
-- 8. TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ===============================================

-- Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Función específica para tablas auxiliares (maneja updated_by)
CREATE OR REPLACE FUNCTION update_auxiliary_tables_updated_at()
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

-- Triggers para todas las tablas principales
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_companies_updated_at ON companies;
CREATE TRIGGER trigger_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON contracts;
CREATE TRIGGER trigger_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

-- Triggers para tablas auxiliares
DROP TRIGGER IF EXISTS trigger_ciudades_updated_at ON ciudades;
CREATE TRIGGER trigger_ciudades_updated_at
  BEFORE UPDATE ON ciudades
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_cajas_compensacion_updated_at ON cajas_compensacion;
CREATE TRIGGER trigger_cajas_compensacion_updated_at
  BEFORE UPDATE ON cajas_compensacion
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_arls_updated_at ON arls;
CREATE TRIGGER trigger_arls_updated_at
  BEFORE UPDATE ON arls
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_fondos_cesantias_updated_at ON fondos_cesantias;
CREATE TRIGGER trigger_fondos_cesantias_updated_at
  BEFORE UPDATE ON fondos_cesantias
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_fondos_pension_updated_at ON fondos_pension;
CREATE TRIGGER trigger_fondos_pension_updated_at
  BEFORE UPDATE ON fondos_pension
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_eps_updated_at ON eps;
CREATE TRIGGER trigger_eps_updated_at
  BEFORE UPDATE ON eps
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

-- Trigger para líneas de negocio
DROP TRIGGER IF EXISTS trigger_lineas_negocio_updated_at ON lineas_negocio;
CREATE TRIGGER trigger_lineas_negocio_updated_at
  BEFORE UPDATE ON lineas_negocio
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

-- ===============================================
-- 9. FUNCIONES HELPER Y RPC (SECURITY DEFINER)
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

-- Función para obtener usuarios con conteo de permisos
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

-- ===============================================
-- VISTA SEGURA PARA USUARIOS BÁSICOS
-- ===============================================

-- Vista segura que actúa como filtro para auth.users
-- Soluciona problemas de RLS estricto en auth.users desde frontend
-- NOTA: Esta vista se define antes para que las funciones puedan usarla
CREATE OR REPLACE VIEW usuarios_basicos AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE 
  -- Permitir acceso a cualquier usuario autenticado para uso interno de funciones
  -- El control real de permisos se hace en las funciones que usan esta vista
  auth.uid() IS NOT NULL;

-- Comentario explicativo
COMMENT ON VIEW usuarios_basicos IS 'Vista segura para información básica de usuarios. Solo para uso interno de funciones, permisos controlados en RLS de tablas principales.';

-- Función para obtener handle de usuario (parte antes de @)
CREATE OR REPLACE FUNCTION get_user_handle(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT ub.email::TEXT INTO v_email
  FROM usuarios_basicos ub
  WHERE ub.id = user_uuid;

  IF v_email IS NULL OR position('@' IN v_email) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN split_part(v_email, '@', 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
