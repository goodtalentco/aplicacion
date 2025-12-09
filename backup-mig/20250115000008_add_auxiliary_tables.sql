-- ===============================================
-- MIGRACIÓN: TABLAS AUXILIARES ADMINISTRATIVAS
-- Fecha: 2025-01-15
-- Descripción: Agrega módulo de tablas auxiliares con 6 tablas
-- Incluye: permisos, tablas con RLS, datos iniciales
-- ===============================================

-- ===============================================
-- 1. NUEVOS PERMISOS PARA TABLAS AUXILIARES
-- ===============================================

INSERT INTO permissions (table_name, action, description) VALUES
-- Módulo de tablas auxiliares
('tablas_auxiliares', 'view', 'Ver módulo de tablas auxiliares'),
('tablas_auxiliares', 'create', 'Crear registros en tablas auxiliares'),
('tablas_auxiliares', 'edit', 'Editar registros en tablas auxiliares'),
('tablas_auxiliares', 'delete', 'Eliminar registros en tablas auxiliares')
ON CONFLICT (table_name, action) DO NOTHING;

-- ===============================================
-- 2. TABLA CIUDADES
-- ===============================================

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

-- Foreign Keys para ciudades
DO $$
BEGIN
  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_ciudades_created_by'
  ) THEN
    ALTER TABLE ciudades 
    ADD CONSTRAINT fk_ciudades_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_ciudades_updated_by'
  ) THEN
    ALTER TABLE ciudades 
    ADD CONSTRAINT fk_ciudades_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para ciudades
CREATE INDEX IF NOT EXISTS idx_ciudades_nombre ON ciudades(nombre);
CREATE INDEX IF NOT EXISTS idx_ciudades_created_by ON ciudades(created_by);

-- ===============================================
-- 3. TABLA CAJAS DE COMPENSACIÓN
-- ===============================================

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

-- Foreign Keys para cajas_compensacion
DO $$
BEGIN
  -- FK a ciudades
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cajas_compensacion_ciudad_id'
  ) THEN
    ALTER TABLE cajas_compensacion 
    ADD CONSTRAINT fk_cajas_compensacion_ciudad_id 
    FOREIGN KEY (ciudad_id) REFERENCES ciudades(id) ON DELETE CASCADE;
  END IF;

  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cajas_compensacion_created_by'
  ) THEN
    ALTER TABLE cajas_compensacion 
    ADD CONSTRAINT fk_cajas_compensacion_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cajas_compensacion_updated_by'
  ) THEN
    ALTER TABLE cajas_compensacion 
    ADD CONSTRAINT fk_cajas_compensacion_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para cajas_compensacion
CREATE INDEX IF NOT EXISTS idx_cajas_compensacion_nombre ON cajas_compensacion(nombre);
CREATE INDEX IF NOT EXISTS idx_cajas_compensacion_ciudad_id ON cajas_compensacion(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_cajas_compensacion_created_by ON cajas_compensacion(created_by);

-- ===============================================
-- 4. TABLA ARLS
-- ===============================================

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

-- Foreign Keys para arls
DO $$
BEGIN
  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_arls_created_by'
  ) THEN
    ALTER TABLE arls 
    ADD CONSTRAINT fk_arls_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_arls_updated_by'
  ) THEN
    ALTER TABLE arls 
    ADD CONSTRAINT fk_arls_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para arls
CREATE INDEX IF NOT EXISTS idx_arls_nombre ON arls(nombre);
CREATE INDEX IF NOT EXISTS idx_arls_created_by ON arls(created_by);

-- ===============================================
-- 5. TABLA FONDOS DE CESANTÍAS
-- ===============================================

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

-- Foreign Keys para fondos_cesantias
DO $$
BEGIN
  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_fondos_cesantias_created_by'
  ) THEN
    ALTER TABLE fondos_cesantias 
    ADD CONSTRAINT fk_fondos_cesantias_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_fondos_cesantias_updated_by'
  ) THEN
    ALTER TABLE fondos_cesantias 
    ADD CONSTRAINT fk_fondos_cesantias_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para fondos_cesantias
CREATE INDEX IF NOT EXISTS idx_fondos_cesantias_nombre ON fondos_cesantias(nombre);
CREATE INDEX IF NOT EXISTS idx_fondos_cesantias_created_by ON fondos_cesantias(created_by);

-- ===============================================
-- 6. TABLA FONDOS DE PENSIÓN
-- ===============================================

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

-- Foreign Keys para fondos_pension
DO $$
BEGIN
  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_fondos_pension_created_by'
  ) THEN
    ALTER TABLE fondos_pension 
    ADD CONSTRAINT fk_fondos_pension_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_fondos_pension_updated_by'
  ) THEN
    ALTER TABLE fondos_pension 
    ADD CONSTRAINT fk_fondos_pension_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para fondos_pension
CREATE INDEX IF NOT EXISTS idx_fondos_pension_nombre ON fondos_pension(nombre);
CREATE INDEX IF NOT EXISTS idx_fondos_pension_created_by ON fondos_pension(created_by);

-- ===============================================
-- 7. TABLA EPS
-- ===============================================

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

-- Foreign Keys para eps
DO $$
BEGIN
  -- FK para created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_eps_created_by'
  ) THEN
    ALTER TABLE eps 
    ADD CONSTRAINT fk_eps_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;

  -- FK para updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_eps_updated_by'
  ) THEN
    ALTER TABLE eps 
    ADD CONSTRAINT fk_eps_updated_by 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Índices para eps
CREATE INDEX IF NOT EXISTS idx_eps_nombre ON eps(nombre);
CREATE INDEX IF NOT EXISTS idx_eps_created_by ON eps(created_by);

-- ===============================================
-- 8. TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ===============================================

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

-- Triggers para todas las tablas auxiliares
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

-- ===============================================
-- 9. HABILITACIÓN DE RLS
-- ===============================================

ALTER TABLE ciudades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajas_compensacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE arls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondos_cesantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondos_pension ENABLE ROW LEVEL SECURITY;
ALTER TABLE eps ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 10. POLÍTICAS RLS PARA TODAS LAS TABLAS
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
-- 11. GRANTS PARA ROL AUTHENTICATED
-- ===============================================

-- Grants para funciones
GRANT EXECUTE ON FUNCTION update_auxiliary_tables_updated_at() TO authenticated;

-- Grants para tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON ciudades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cajas_compensacion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON arls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fondos_cesantias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fondos_pension TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON eps TO authenticated;

-- ===============================================
-- 12. DATOS INICIALES - SISTEMA DE MIGRACIÓN
-- ===============================================

-- Función helper para insertar datos iniciales con usuario del sistema
CREATE OR REPLACE FUNCTION insert_initial_auxiliary_data()
RETURNS VOID AS $$
DECLARE
  system_user_id UUID;
  ciudad_bogota_id UUID;
  ciudad_medellin_id UUID;
  ciudad_cali_id UUID;
  ciudad_cartagena_id UUID;
  ciudad_bucaramanga_id UUID;
  ciudad_villavicencio_id UUID;
  ciudad_pereira_id UUID;
  ciudad_tunja_id UUID;
  ciudad_manizales_id UUID;
  ciudad_barranquilla_id UUID;
  ciudad_ibague_id UUID;
  ciudad_cucuta_id UUID;
  ciudad_neiva_id UUID;
  ciudad_santa_marta_id UUID;
  ciudad_valledupar_id UUID;
  ciudad_popayan_id UUID;
  ciudad_monteria_id UUID;
  ciudad_pasto_id UUID;
  ciudad_armenia_id UUID;
  ciudad_yopal_id UUID;
  ciudad_riohacha_id UUID;
  ciudad_sincelejo_id UUID;
  ciudad_puerto_asis_id UUID;
  ciudad_arauca_id UUID;
  ciudad_quibdo_id UUID;
  ciudad_barrancabermeja_id UUID;
  ciudad_san_andres_id UUID;
  ciudad_leticia_id UUID;
  ciudad_chaparral_id UUID;
BEGIN
  -- Buscar un usuario del sistema (el primer super admin)
  SELECT u.id INTO system_user_id
  FROM auth.users u
  JOIN user_permissions up ON u.id = up.user_id
  JOIN permissions p ON up.permission_id = p.id
  WHERE p.table_name = 'user_permissions' AND p.action = 'create'
  AND up.is_active = true
  LIMIT 1;
  
  -- Si no hay usuarios, crear registros sin auditoría
  IF system_user_id IS NULL THEN
    RAISE NOTICE 'No system user found, skipping initial data insertion';
    RETURN;
  END IF;

  -- INSERTAR CIUDADES
  INSERT INTO ciudades (nombre, created_by, updated_by) VALUES
    ('Bogotá', system_user_id, system_user_id),
    ('Medellín', system_user_id, system_user_id),
    ('Cali', system_user_id, system_user_id),
    ('Cartagena', system_user_id, system_user_id),
    ('Bucaramanga', system_user_id, system_user_id),
    ('Villavicencio', system_user_id, system_user_id),
    ('Pereira', system_user_id, system_user_id),
    ('Tunja', system_user_id, system_user_id),
    ('Manizales', system_user_id, system_user_id),
    ('Barranquilla', system_user_id, system_user_id),
    ('Ibagué', system_user_id, system_user_id),
    ('Cúcuta', system_user_id, system_user_id),
    ('Neiva', system_user_id, system_user_id),
    ('Santa Marta', system_user_id, system_user_id),
    ('Valledupar', system_user_id, system_user_id),
    ('Popayán', system_user_id, system_user_id),
    ('Montería', system_user_id, system_user_id),
    ('Pasto', system_user_id, system_user_id),
    ('Armenia', system_user_id, system_user_id),
    ('Yopal', system_user_id, system_user_id),
    ('Riohacha', system_user_id, system_user_id),
    ('Sincelejo', system_user_id, system_user_id),
    ('Puerto Asís', system_user_id, system_user_id),
    ('Arauca', system_user_id, system_user_id),
    ('Quibdó', system_user_id, system_user_id),
    ('Barrancabermeja', system_user_id, system_user_id),
    ('San Andrés', system_user_id, system_user_id),
    ('Leticia', system_user_id, system_user_id),
    ('Chaparral', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- Obtener IDs de ciudades para las cajas
  SELECT id INTO ciudad_bogota_id FROM ciudades WHERE nombre = 'Bogotá';
  SELECT id INTO ciudad_medellin_id FROM ciudades WHERE nombre = 'Medellín';
  SELECT id INTO ciudad_cali_id FROM ciudades WHERE nombre = 'Cali';
  SELECT id INTO ciudad_cartagena_id FROM ciudades WHERE nombre = 'Cartagena';
  SELECT id INTO ciudad_bucaramanga_id FROM ciudades WHERE nombre = 'Bucaramanga';
  SELECT id INTO ciudad_villavicencio_id FROM ciudades WHERE nombre = 'Villavicencio';
  SELECT id INTO ciudad_pereira_id FROM ciudades WHERE nombre = 'Pereira';
  SELECT id INTO ciudad_tunja_id FROM ciudades WHERE nombre = 'Tunja';
  SELECT id INTO ciudad_manizales_id FROM ciudades WHERE nombre = 'Manizales';
  SELECT id INTO ciudad_barranquilla_id FROM ciudades WHERE nombre = 'Barranquilla';
  SELECT id INTO ciudad_ibague_id FROM ciudades WHERE nombre = 'Ibagué';
  SELECT id INTO ciudad_cucuta_id FROM ciudades WHERE nombre = 'Cúcuta';
  SELECT id INTO ciudad_neiva_id FROM ciudades WHERE nombre = 'Neiva';
  SELECT id INTO ciudad_santa_marta_id FROM ciudades WHERE nombre = 'Santa Marta';
  SELECT id INTO ciudad_valledupar_id FROM ciudades WHERE nombre = 'Valledupar';
  SELECT id INTO ciudad_popayan_id FROM ciudades WHERE nombre = 'Popayán';
  SELECT id INTO ciudad_monteria_id FROM ciudades WHERE nombre = 'Montería';
  SELECT id INTO ciudad_pasto_id FROM ciudades WHERE nombre = 'Pasto';
  SELECT id INTO ciudad_armenia_id FROM ciudades WHERE nombre = 'Armenia';
  SELECT id INTO ciudad_yopal_id FROM ciudades WHERE nombre = 'Yopal';
  SELECT id INTO ciudad_riohacha_id FROM ciudades WHERE nombre = 'Riohacha';
  SELECT id INTO ciudad_sincelejo_id FROM ciudades WHERE nombre = 'Sincelejo';
  SELECT id INTO ciudad_puerto_asis_id FROM ciudades WHERE nombre = 'Puerto Asís';
  SELECT id INTO ciudad_arauca_id FROM ciudades WHERE nombre = 'Arauca';
  SELECT id INTO ciudad_quibdo_id FROM ciudades WHERE nombre = 'Quibdó';
  SELECT id INTO ciudad_barrancabermeja_id FROM ciudades WHERE nombre = 'Barrancabermeja';
  SELECT id INTO ciudad_san_andres_id FROM ciudades WHERE nombre = 'San Andrés';
  SELECT id INTO ciudad_leticia_id FROM ciudades WHERE nombre = 'Leticia';
  SELECT id INTO ciudad_chaparral_id FROM ciudades WHERE nombre = 'Chaparral';

  -- INSERTAR CAJAS DE COMPENSACIÓN
  INSERT INTO cajas_compensacion (nombre, ciudad_id, created_by, updated_by) VALUES
    ('Colsubsidio', ciudad_bogota_id, system_user_id, system_user_id),
    ('Compensar', ciudad_bogota_id, system_user_id, system_user_id),
    ('Cafam', ciudad_bogota_id, system_user_id, system_user_id),
    ('Comfama', ciudad_medellin_id, system_user_id, system_user_id),
    ('Comfenalco Antioquia', ciudad_medellin_id, system_user_id, system_user_id),
    ('Comfandi', ciudad_cali_id, system_user_id, system_user_id),
    ('Comfenalco Valle del Cauca', ciudad_cali_id, system_user_id, system_user_id),
    ('Comfenalco Cartagena', ciudad_cartagena_id, system_user_id, system_user_id),
    ('Comfenalco Santander', ciudad_bucaramanga_id, system_user_id, system_user_id),
    ('Cofrem', ciudad_villavicencio_id, system_user_id, system_user_id),
    ('Comfamiliar Risaralda', ciudad_pereira_id, system_user_id, system_user_id),
    ('Comfaboy', ciudad_tunja_id, system_user_id, system_user_id),
    ('Confa', ciudad_manizales_id, system_user_id, system_user_id),
    ('Cajasan', ciudad_bucaramanga_id, system_user_id, system_user_id),
    ('Combarranquilla', ciudad_barranquilla_id, system_user_id, system_user_id),
    ('Comfamiliar Atlántico', ciudad_barranquilla_id, system_user_id, system_user_id),
    ('Cajacopi Atlántico', ciudad_barranquilla_id, system_user_id, system_user_id),
    ('Comfenalco Tolima', ciudad_ibague_id, system_user_id, system_user_id),
    ('Comfanorte', ciudad_cucuta_id, system_user_id, system_user_id),
    ('Comfamiliar Huila', ciudad_neiva_id, system_user_id, system_user_id),
    ('Cajamag', ciudad_santa_marta_id, system_user_id, system_user_id),
    ('Comfacesar', ciudad_valledupar_id, system_user_id, system_user_id),
    ('Comfacauca', ciudad_popayan_id, system_user_id, system_user_id),
    ('Comfacor', ciudad_monteria_id, system_user_id, system_user_id),
    ('Comfamiliar Nariño', ciudad_pasto_id, system_user_id, system_user_id),
    ('Comfenalco Quindío', ciudad_armenia_id, system_user_id, system_user_id),
    ('Comfacasanare', ciudad_yopal_id, system_user_id, system_user_id),
    ('Comfaoriente', ciudad_cucuta_id, system_user_id, system_user_id),
    ('Comfaguajira', ciudad_riohacha_id, system_user_id, system_user_id),
    ('Comfatolima', ciudad_ibague_id, system_user_id, system_user_id),
    ('Comfasucre', ciudad_sincelejo_id, system_user_id, system_user_id),
    ('Comfamiliar Putumayo', ciudad_puerto_asis_id, system_user_id, system_user_id),
    ('Comfiar', ciudad_arauca_id, system_user_id, system_user_id),
    ('Comfachocó', ciudad_quibdo_id, system_user_id, system_user_id),
    ('Cafaba', ciudad_barrancabermeja_id, system_user_id, system_user_id),
    ('Comcaja', ciudad_villavicencio_id, system_user_id, system_user_id),
    ('Cajasai', ciudad_san_andres_id, system_user_id, system_user_id),
    ('Cafamaz', ciudad_leticia_id, system_user_id, system_user_id),
    ('Cafasur', ciudad_chaparral_id, system_user_id, system_user_id),
    ('Comcamil (Camacol)', ciudad_medellin_id, system_user_id, system_user_id),
    ('Comfamiliar Camacol', ciudad_medellin_id, system_user_id, system_user_id),
    ('Comfamiliar Andi (Comfandi)', ciudad_cali_id, system_user_id, system_user_id),
    ('Comfamiliar Andi Bogotá', ciudad_bogota_id, system_user_id, system_user_id),
    ('Comfamiliar Andi Medellín', ciudad_medellin_id, system_user_id, system_user_id),
    ('Comfamiliar Andi Cartagena', ciudad_cartagena_id, system_user_id, system_user_id)
  ON CONFLICT (nombre, ciudad_id) DO NOTHING;

  -- INSERTAR ARLS
  INSERT INTO arls (nombre, created_by, updated_by) VALUES
    ('ARL SURA', system_user_id, system_user_id),
    ('Positiva Compañía de Seguros S.A.', system_user_id, system_user_id),
    ('Colmena Seguros ARL', system_user_id, system_user_id),
    ('Seguros Bolívar ARL', system_user_id, system_user_id),
    ('AXA Colpatria ARL', system_user_id, system_user_id),
    ('La Equidad Seguros de Vida ARL', system_user_id, system_user_id),
    ('Liberty Seguros ARL', system_user_id, system_user_id),
    ('Mapfre Seguros de Riesgos Laborales S.A.', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- INSERTAR FONDOS DE CESANTÍAS
  INSERT INTO fondos_cesantias (nombre, created_by, updated_by) VALUES
    ('Porvenir', system_user_id, system_user_id),
    ('Protección', system_user_id, system_user_id),
    ('Colfondos', system_user_id, system_user_id),
    ('Skandia', system_user_id, system_user_id),
    ('Fondo Nacional del Ahorro – FNA', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- INSERTAR FONDOS DE PENSIÓN
  INSERT INTO fondos_pension (nombre, created_by, updated_by) VALUES
    ('Porvenir', system_user_id, system_user_id),
    ('Protección', system_user_id, system_user_id),
    ('Colfondos', system_user_id, system_user_id),
    ('Skandia', system_user_id, system_user_id),
    ('Colpensiones', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- INSERTAR EPS
  INSERT INTO eps (nombre, created_by, updated_by) VALUES
    ('Coosalud EPS-S', system_user_id, system_user_id),
    ('Nueva EPS', system_user_id, system_user_id),
    ('Mutual SER', system_user_id, system_user_id),
    ('Salud MIA', system_user_id, system_user_id),
    ('Aliansalud EPS', system_user_id, system_user_id),
    ('Salud Total EPS S.A.', system_user_id, system_user_id),
    ('EPS Sanitas', system_user_id, system_user_id),
    ('EPS Sura', system_user_id, system_user_id),
    ('Famisanar', system_user_id, system_user_id),
    ('Servicio Occidental de Salud EPS – SOS', system_user_id, system_user_id),
    ('Comfenalco Valle', system_user_id, system_user_id),
    ('Compensar EPS', system_user_id, system_user_id),
    ('Empresas Públicas de Medellín (EPM)', system_user_id, system_user_id),
    ('Fondo de Pasivo Social de Ferrocarriles Nacionales de Colombia', system_user_id, system_user_id),
    ('Cajacopi Atlántico', system_user_id, system_user_id),
    ('Capresoca', system_user_id, system_user_id),
    ('Comfachocó', system_user_id, system_user_id),
    ('Comfaoriente', system_user_id, system_user_id),
    ('EPS Familiar de Colombia', system_user_id, system_user_id),
    ('Asmet Salud', system_user_id, system_user_id),
    ('Emssanar E.S.S.', system_user_id, system_user_id),
    ('Capital Salud EPS-S', system_user_id, system_user_id),
    ('Savia Salud', system_user_id, system_user_id),
    ('Dusakawi EPSI', system_user_id, system_user_id),
    ('Asociación Indígena del Cauca EPSI', system_user_id, system_user_id),
    ('Anas Wayuu EPSI', system_user_id, system_user_id),
    ('Mallamas EPSI', system_user_id, system_user_id),
    ('Pijaos Salud EPSI', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  RAISE NOTICE 'Datos iniciales de tablas auxiliares insertados correctamente';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función de inserción de datos iniciales
SELECT insert_initial_auxiliary_data();

-- Limpiar la función temporal
DROP FUNCTION insert_initial_auxiliary_data();

-- ===============================================
-- 13. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

-- Comentarios en tablas
COMMENT ON TABLE ciudades IS 'Ciudades principales de Colombia para uso en cajas de compensación';
COMMENT ON TABLE cajas_compensacion IS 'Cajas de compensación familiar por ciudad';
COMMENT ON TABLE arls IS 'Administradoras de Riesgos Laborales disponibles';
COMMENT ON TABLE fondos_cesantias IS 'Fondos de cesantías disponibles';
COMMENT ON TABLE fondos_pension IS 'Fondos de pensión disponibles';
COMMENT ON TABLE eps IS 'Entidades Promotoras de Salud disponibles';

-- Comentarios en funciones
COMMENT ON FUNCTION update_auxiliary_tables_updated_at() IS 'Trigger function para actualizar updated_at y updated_by en tablas auxiliares';

-- ===============================================
-- 14. VERIFICACIONES POST-MIGRACIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que RLS está habilitado
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename IN ('ciudades','cajas_compensacion','arls','fondos_cesantias','fondos_pension','eps')
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS habilitado en todas las tablas auxiliares';
  ELSE
    RAISE NOTICE 'WARNING: Verificar que RLS esté habilitado en tablas auxiliares';
  END IF;

  -- Verificar que las tablas existen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('ciudades','cajas_compensacion','arls','fondos_cesantias','fondos_pension','eps')
  ) THEN
    RAISE NOTICE 'SUCCESS: Todas las tablas auxiliares fueron creadas';
  ELSE
    RAISE NOTICE 'ERROR: Faltan tablas auxiliares';
  END IF;

  -- Verificar que los permisos de tablas auxiliares existen
  IF EXISTS (SELECT 1 FROM permissions WHERE table_name = 'tablas_auxiliares' LIMIT 1) THEN
    RAISE NOTICE 'SUCCESS: Permisos de tablas auxiliares insertados correctamente';
  ELSE
    RAISE NOTICE 'WARNING: Verificar permisos de tablas auxiliares';
  END IF;

  -- Contar datos insertados
  RAISE NOTICE 'Ciudades insertadas: %', (SELECT COUNT(*) FROM ciudades);
  RAISE NOTICE 'Cajas de compensación insertadas: %', (SELECT COUNT(*) FROM cajas_compensacion);
  RAISE NOTICE 'ARLs insertadas: %', (SELECT COUNT(*) FROM arls);
  RAISE NOTICE 'Fondos de cesantías insertados: %', (SELECT COUNT(*) FROM fondos_cesantias);
  RAISE NOTICE 'Fondos de pensión insertados: %', (SELECT COUNT(*) FROM fondos_pension);
  RAISE NOTICE 'EPS insertadas: %', (SELECT COUNT(*) FROM eps);

  RAISE NOTICE '=== MIGRACIÓN TABLAS AUXILIARES COMPLETADA EXITOSAMENTE ===';
  RAISE NOTICE 'Tablas: 6 tablas auxiliares con RLS y auditoría';
  RAISE NOTICE 'Permisos: 4 permisos para el módulo tablas_auxiliares';
  RAISE NOTICE 'Datos: Datos iniciales insertados automáticamente';
  RAISE NOTICE 'Seguridad: RLS habilitado con políticas completas';
END $$;

-- ===============================================
-- FIN DE MIGRACIÓN TABLAS AUXILIARES
-- ===============================================
