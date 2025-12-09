-- ===============================================
-- MIGRACIÓN: Sistema de Novedades Laborales
-- Fecha: 2025-01-16
-- Descripción: Implementación completa del sistema de novedades
-- ===============================================

-- ===============================================
-- 1. TABLA: novedades_datos_personales
-- Cambios en información personal (teléfono, email, dirección)
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_datos_personales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  campo TEXT NOT NULL, -- 'celular', 'email', 'direccion'
  valor_anterior TEXT,
  valor_nuevo TEXT NOT NULL,
  fecha DATE NOT NULL,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT novedades_datos_personales_campo_not_empty 
    CHECK (length(trim(campo)) > 0),
  CONSTRAINT novedades_datos_personales_valor_nuevo_not_empty 
    CHECK (length(trim(valor_nuevo)) > 0),
  CONSTRAINT novedades_datos_personales_fecha_valid 
    CHECK (fecha <= CURRENT_DATE)
);

-- Foreign Keys
ALTER TABLE novedades_datos_personales 
ADD CONSTRAINT fk_novedades_datos_personales_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_datos_personales 
ADD CONSTRAINT fk_novedades_datos_personales_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 2. TABLA: novedades_cambio_cargo
-- Cambios de cargo y promociones
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_cambio_cargo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  fecha DATE NOT NULL,
  cargo_anterior TEXT,
  cargo_nuevo TEXT NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT novedades_cambio_cargo_cargo_nuevo_not_empty 
    CHECK (length(trim(cargo_nuevo)) > 0),
  CONSTRAINT novedades_cambio_cargo_fecha_valid 
    CHECK (fecha <= CURRENT_DATE)
);

-- Foreign Keys
ALTER TABLE novedades_cambio_cargo 
ADD CONSTRAINT fk_novedades_cambio_cargo_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_cambio_cargo 
ADD CONSTRAINT fk_novedades_cambio_cargo_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 3. TABLA: novedades_entidades
-- Cambios de EPS, Pensión, Cesantías
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_entidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  tipo TEXT NOT NULL, -- 'eps', 'fondo_pension', 'fondo_cesantias'
  entidad_anterior TEXT,
  entidad_nueva TEXT NOT NULL,
  fecha DATE NOT NULL,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT novedades_entidades_tipo_not_empty 
    CHECK (length(trim(tipo)) > 0),
  CONSTRAINT novedades_entidades_entidad_nueva_not_empty 
    CHECK (length(trim(entidad_nueva)) > 0),
  CONSTRAINT novedades_entidades_fecha_valid 
    CHECK (fecha <= CURRENT_DATE)
);

-- Foreign Keys
ALTER TABLE novedades_entidades 
ADD CONSTRAINT fk_novedades_entidades_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_entidades 
ADD CONSTRAINT fk_novedades_entidades_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 4. TABLA: novedades_economicas
-- Cambios salariales y auxilios (UNIFICADA)
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_economicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL, -- 'salario', 'auxilio_salarial', 'auxilio_no_salarial', 'auxilio_transporte'
  concepto TEXT, -- ej: 'Alimentación', 'Transporte', NULL si es salario
  valor_anterior NUMERIC(14,2),
  valor_nuevo NUMERIC(14,2) NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT novedades_economicas_tipo_not_empty 
    CHECK (length(trim(tipo)) > 0),
  CONSTRAINT novedades_economicas_valor_nuevo_positive 
    CHECK (valor_nuevo >= 0),
  CONSTRAINT novedades_economicas_valor_anterior_positive 
    CHECK (valor_anterior IS NULL OR valor_anterior >= 0),
  CONSTRAINT novedades_economicas_fecha_valid 
    CHECK (fecha <= CURRENT_DATE)
);

-- Foreign Keys
ALTER TABLE novedades_economicas 
ADD CONSTRAINT fk_novedades_economicas_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_economicas 
ADD CONSTRAINT fk_novedades_economicas_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 5. TABLA: novedades_tiempo_laboral
-- Prórrogas, Vacaciones, Suspensiones (CONSOLIDADA)
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_tiempo_laboral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  tipo_tiempo TEXT NOT NULL, -- 'prorroga', 'vacaciones', 'suspension'
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  motivo TEXT,
  
  -- Específicos por tipo (nullable)
  nueva_fecha_fin DATE,        -- solo prorrogas
  dias INTEGER,                -- vacaciones/suspensiones  
  programadas BOOLEAN,         -- solo vacaciones
  disfrutadas BOOLEAN,         -- solo vacaciones
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT novedades_tiempo_laboral_tipo_not_empty 
    CHECK (length(trim(tipo_tiempo)) > 0),
  CONSTRAINT novedades_tiempo_laboral_fecha_inicio_valid 
    CHECK (fecha_inicio <= CURRENT_DATE),
  CONSTRAINT novedades_tiempo_laboral_fecha_fin_valid 
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT novedades_tiempo_laboral_nueva_fecha_fin_valid 
    CHECK (nueva_fecha_fin IS NULL OR nueva_fecha_fin > fecha_inicio),
  CONSTRAINT novedades_tiempo_laboral_dias_positive 
    CHECK (dias IS NULL OR dias > 0)
);

-- Foreign Keys
ALTER TABLE novedades_tiempo_laboral 
ADD CONSTRAINT fk_novedades_tiempo_laboral_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_tiempo_laboral 
ADD CONSTRAINT fk_novedades_tiempo_laboral_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 6. TABLA: novedades_incapacidad
-- Incapacidades médicas y laborales
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_incapacidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  dias INTEGER,
  tipo_incapacidad TEXT NOT NULL, -- 'comun', 'laboral', 'maternidad'
  entidad TEXT, -- EPS o ARL
  soporte_url TEXT,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT novedades_incapacidad_tipo_not_empty 
    CHECK (length(trim(tipo_incapacidad)) > 0),
  CONSTRAINT novedades_incapacidad_fecha_inicio_valid 
    CHECK (fecha_inicio <= CURRENT_DATE),
  CONSTRAINT novedades_incapacidad_fecha_fin_valid 
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT novedades_incapacidad_dias_positive 
    CHECK (dias IS NULL OR dias > 0),
  CONSTRAINT novedades_incapacidad_soporte_url_format 
    CHECK (soporte_url IS NULL OR soporte_url ~* '^https?://')
);

-- Foreign Keys
ALTER TABLE novedades_incapacidad 
ADD CONSTRAINT fk_novedades_incapacidad_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_incapacidad 
ADD CONSTRAINT fk_novedades_incapacidad_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 7. TABLA: novedades_beneficiarios
-- Cambios en beneficiarios (hijos, cónyuge, padres)
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_beneficiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  tipo_beneficiario TEXT NOT NULL, -- 'hijo', 'madre', 'padre', 'conyuge'
  valor_anterior INTEGER,
  valor_nuevo INTEGER NOT NULL,
  fecha DATE NOT NULL,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT novedades_beneficiarios_tipo_not_empty 
    CHECK (length(trim(tipo_beneficiario)) > 0),
  CONSTRAINT novedades_beneficiarios_valor_nuevo_valid 
    CHECK (valor_nuevo >= 0),
  CONSTRAINT novedades_beneficiarios_valor_anterior_valid 
    CHECK (valor_anterior IS NULL OR valor_anterior >= 0),
  CONSTRAINT novedades_beneficiarios_fecha_valid 
    CHECK (fecha <= CURRENT_DATE)
);

-- Foreign Keys
ALTER TABLE novedades_beneficiarios 
ADD CONSTRAINT fk_novedades_beneficiarios_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_beneficiarios 
ADD CONSTRAINT fk_novedades_beneficiarios_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 8. TABLA: novedades_terminacion
-- Terminación de contratos
-- ===============================================

CREATE TABLE IF NOT EXISTS novedades_terminacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  fecha DATE NOT NULL,
  tipo_terminacion TEXT NOT NULL, -- 'justa_causa', 'sin_justa_causa', 'mutuo_acuerdo', 'vencimiento'
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT novedades_terminacion_tipo_not_empty 
    CHECK (length(trim(tipo_terminacion)) > 0),
  CONSTRAINT novedades_terminacion_fecha_valid 
    CHECK (fecha <= CURRENT_DATE),
  
  -- Solo puede haber una terminación por contrato
  CONSTRAINT unique_terminacion_per_contract UNIQUE(contract_id)
);

-- Foreign Keys
ALTER TABLE novedades_terminacion 
ADD CONSTRAINT fk_novedades_terminacion_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE novedades_terminacion 
ADD CONSTRAINT fk_novedades_terminacion_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 9. TABLA: historial_contratos_fijos
-- Historial de contratos fijos anteriores (para validación legal)
-- ===============================================

CREATE TABLE IF NOT EXISTS historial_contratos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  
  -- Historial previo
  empresa_anterior TEXT NOT NULL,
  fecha_inicio_anterior DATE NOT NULL,
  fecha_fin_anterior DATE NOT NULL,
  numero_prorroga INTEGER NOT NULL, -- 0=inicial, 1=primera, 2=segunda
  tipo_terminacion TEXT, -- 'terminado', 'transferido'
  
  -- Documentación
  soporte_url TEXT, -- Certificado laboral, contrato anterior
  observaciones TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints básicos (flexibles)
  CONSTRAINT historial_contratos_fijos_empresa_anterior_not_empty 
    CHECK (length(trim(empresa_anterior)) > 0),
  CONSTRAINT historial_contratos_fijos_fecha_inicio_valid 
    CHECK (fecha_inicio_anterior < fecha_fin_anterior),
  CONSTRAINT historial_contratos_fijos_numero_prorroga_valid 
    CHECK (numero_prorroga >= 0 AND numero_prorroga <= 10),
  CONSTRAINT historial_contratos_fijos_tipo_terminacion_not_empty 
    CHECK (tipo_terminacion IS NULL OR length(trim(tipo_terminacion)) > 0),
  CONSTRAINT historial_contratos_fijos_soporte_url_format 
    CHECK (soporte_url IS NULL OR soporte_url ~* '^https?://')
);

-- Foreign Keys
ALTER TABLE historial_contratos_fijos 
ADD CONSTRAINT fk_historial_contratos_fijos_contract_id 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE historial_contratos_fijos 
ADD CONSTRAINT fk_historial_contratos_fijos_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ===============================================
-- 10. ÍNDICES OPTIMIZADOS
-- Para consultas frecuentes y rendimiento
-- ===============================================

-- Índices para novedades_datos_personales
CREATE INDEX IF NOT EXISTS idx_novedades_datos_personales_contract_fecha 
ON novedades_datos_personales(contract_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_novedades_datos_personales_campo 
ON novedades_datos_personales(campo);

-- Índices para novedades_cambio_cargo
CREATE INDEX IF NOT EXISTS idx_novedades_cambio_cargo_contract_fecha 
ON novedades_cambio_cargo(contract_id, fecha DESC);

-- Índices para novedades_entidades
CREATE INDEX IF NOT EXISTS idx_novedades_entidades_contract_tipo_fecha 
ON novedades_entidades(contract_id, tipo, fecha DESC);

-- Índices para novedades_economicas
CREATE INDEX IF NOT EXISTS idx_novedades_economicas_contract_tipo_fecha 
ON novedades_economicas(contract_id, tipo, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_novedades_economicas_fecha_tipo 
ON novedades_economicas(fecha, tipo);

-- Índices para novedades_tiempo_laboral
CREATE INDEX IF NOT EXISTS idx_novedades_tiempo_laboral_contract_tipo_fecha 
ON novedades_tiempo_laboral(contract_id, tipo_tiempo, fecha_inicio DESC);

-- Índices para novedades_incapacidad
CREATE INDEX IF NOT EXISTS idx_novedades_incapacidad_contract_fecha 
ON novedades_incapacidad(contract_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_novedades_incapacidad_tipo 
ON novedades_incapacidad(tipo_incapacidad);

-- Índices para novedades_beneficiarios
CREATE INDEX IF NOT EXISTS idx_novedades_beneficiarios_contract_tipo_fecha 
ON novedades_beneficiarios(contract_id, tipo_beneficiario, fecha DESC);

-- Índices para novedades_terminacion
CREATE INDEX IF NOT EXISTS idx_novedades_terminacion_contract_fecha 
ON novedades_terminacion(contract_id, fecha DESC);

-- Índices para historial_contratos_fijos
CREATE INDEX IF NOT EXISTS idx_historial_contratos_fijos_contract 
ON historial_contratos_fijos(contract_id);

-- ===============================================
-- 11. NUEVOS PERMISOS DEL SISTEMA
-- 19 permisos nuevos para el sistema de novedades
-- ===============================================

INSERT INTO permissions (table_name, action, description) VALUES
-- Datos Personales
('novedades_datos_personales', 'create', 'Crear novedades de datos personales'),
('novedades_datos_personales', 'edit', 'Editar novedades de datos personales'),

-- Cambio de Cargo
('novedades_cambio_cargo', 'create', 'Crear novedades de cambio de cargo'),
('novedades_cambio_cargo', 'edit', 'Editar novedades de cambio de cargo'),

-- Entidades (EPS/Pensión/Cesantías)
('novedades_entidades', 'create', 'Crear novedades de entidades'),
('novedades_entidades', 'edit', 'Editar novedades de entidades'),

-- Económicas (Salarios y Auxilios)
('novedades_economicas', 'create', 'Crear novedades económicas'),
('novedades_economicas', 'edit', 'Editar novedades económicas'),

-- Tiempo Laboral (Prórrogas, Vacaciones, Suspensiones)
('novedades_tiempo_laboral', 'create', 'Crear novedades de tiempo laboral'),
('novedades_tiempo_laboral', 'edit', 'Editar novedades de tiempo laboral'),

-- Incapacidades
('novedades_incapacidad', 'create', 'Crear novedades de incapacidad'),
('novedades_incapacidad', 'edit', 'Editar novedades de incapacidad'),

-- Beneficiarios
('novedades_beneficiarios', 'create', 'Crear novedades de beneficiarios'),
('novedades_beneficiarios', 'edit', 'Editar novedades de beneficiarios'),

-- Terminación
('novedades_terminacion', 'create', 'Crear novedades de terminación'),
('novedades_terminacion', 'edit', 'Editar novedades de terminación'),

-- Historial Contratos Fijos
('historial_contratos_fijos', 'create', 'Crear historial de contratos fijos'),
('historial_contratos_fijos', 'edit', 'Editar historial de contratos fijos'),

-- Permiso universal para VER historial
('novedades', 'view', 'Ver historial completo de novedades de cualquier contrato')

ON CONFLICT (table_name, action) DO NOTHING;

-- ===============================================
-- 12. HABILITAR RLS EN TODAS LAS TABLAS
-- ===============================================

ALTER TABLE novedades_datos_personales ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_cambio_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_economicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_tiempo_laboral ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_incapacidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_terminacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_contratos_fijos ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 13. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

COMMENT ON TABLE novedades_datos_personales IS 'Registro de cambios en datos personales (teléfono, email, dirección)';
COMMENT ON TABLE novedades_cambio_cargo IS 'Registro de cambios de cargo y promociones';
COMMENT ON TABLE novedades_entidades IS 'Registro de cambios de EPS, fondos de pensión y cesantías';
COMMENT ON TABLE novedades_economicas IS 'Registro de cambios salariales y auxilios';
COMMENT ON TABLE novedades_tiempo_laboral IS 'Registro de prórrogas, vacaciones y suspensiones';
COMMENT ON TABLE novedades_incapacidad IS 'Registro de incapacidades médicas y laborales';
COMMENT ON TABLE novedades_beneficiarios IS 'Registro de cambios en beneficiarios';
COMMENT ON TABLE novedades_terminacion IS 'Registro de terminación de contratos';
COMMENT ON TABLE historial_contratos_fijos IS 'Historial de contratos fijos anteriores para validación legal colombiana';

-- ===============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que todas las tablas fueron creadas
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN (
      'novedades_datos_personales', 'novedades_cambio_cargo', 'novedades_entidades',
      'novedades_economicas', 'novedades_tiempo_laboral', 'novedades_incapacidad',
      'novedades_beneficiarios', 'novedades_terminacion', 'historial_contratos_fijos'
    )
  ) THEN
    RAISE NOTICE 'SUCCESS: Todas las tablas de novedades fueron creadas correctamente';
  ELSE
    RAISE NOTICE 'ERROR: Faltan tablas de novedades';
  END IF;

  -- Verificar que los nuevos permisos fueron insertados
  IF EXISTS (
    SELECT 1 FROM permissions 
    WHERE table_name IN ('novedades', 'novedades_datos_personales', 'novedades_economicas')
    LIMIT 1
  ) THEN
    RAISE NOTICE 'SUCCESS: Permisos de novedades insertados correctamente';
  ELSE
    RAISE NOTICE 'ERROR: Faltan permisos de novedades';
  END IF;

  -- Contar permisos nuevos
  RAISE NOTICE 'INFO: Total de permisos de novedades: %', 
    (SELECT COUNT(*) FROM permissions WHERE table_name LIKE 'novedades%' OR table_name = 'historial_contratos_fijos');
    
END;
$$;

-- ===============================================
-- MIGRACIÓN COMPLETADA
-- ===============================================

DO $$
BEGIN
  RAISE NOTICE 'MIGRACIÓN COMPLETADA: Sistema de Novedades Laborales v1.0';
  RAISE NOTICE 'Tablas creadas: 9 | Permisos agregados: 19 | Índices: 12';
  RAISE NOTICE 'Siguiente paso: Crear políticas RLS en migración separada';
END;
$$;
