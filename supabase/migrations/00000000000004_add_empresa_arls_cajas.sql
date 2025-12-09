-- ===============================================
-- MIGRACIÓN: SISTEMA DE ARLs Y CAJAS POR EMPRESA
-- Fecha: 2025-01-15
-- Descripción: Agrega módulo de ARLs y Cajas de Compensación por empresa
-- Incluye: 2 tablas nuevas, RLS flexible, funciones helper
-- ===============================================

-- ===============================================
-- 1. NUEVOS PERMISOS PARA ARLs Y CAJAS DE EMPRESA
-- ===============================================

INSERT INTO permissions (table_name, action, description) VALUES
-- Gestión de ARLs por empresa
('empresa_arls', 'view', 'Ver ARLs asignadas a empresas'),
('empresa_arls', 'create', 'Asignar ARLs a empresas'),
('empresa_arls', 'edit', 'Modificar asignaciones de ARLs'),
('empresa_arls', 'delete', 'Eliminar asignaciones de ARLs'),

-- Gestión de Cajas de Compensación por empresa
('empresa_cajas_compensacion', 'view', 'Ver cajas de compensación asignadas a empresas'),
('empresa_cajas_compensacion', 'create', 'Asignar cajas de compensación a empresas'),
('empresa_cajas_compensacion', 'edit', 'Modificar asignaciones de cajas de compensación'),
('empresa_cajas_compensacion', 'delete', 'Eliminar asignaciones de cajas de compensación')

ON CONFLICT (table_name, action) DO NOTHING;

-- ===============================================
-- 2. TABLA EMPRESA_ARLS (HISTÓRICO DE ARL)
-- ===============================================

CREATE TABLE IF NOT EXISTS empresa_arls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  arl_id UUID NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT empresa_arls_fecha_fin_logic CHECK (
    (estado = 'activa' AND fecha_fin IS NULL) OR 
    (estado = 'inactiva' AND fecha_fin IS NOT NULL)
  ),
  CONSTRAINT empresa_arls_fecha_orden CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  
  -- Una empresa solo puede tener UNA ARL activa a la vez
  CONSTRAINT unique_empresa_arl_activa EXCLUDE (
    empresa_id WITH =, 
    estado WITH = 
  ) WHERE (estado = 'activa')
);

-- ===============================================
-- 3. TABLA EMPRESA_CAJAS_COMPENSACION (POR CIUDAD)
-- ===============================================

CREATE TABLE IF NOT EXISTS empresa_cajas_compensacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  ciudad_id UUID NOT NULL,
  caja_compensacion_id UUID NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT empresa_cajas_fecha_fin_logic CHECK (
    (estado = 'activa' AND fecha_fin IS NULL) OR 
    (estado = 'inactiva' AND fecha_fin IS NOT NULL)
  ),
  CONSTRAINT empresa_cajas_fecha_orden CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  
  -- Una empresa solo puede tener UNA caja activa por ciudad
  CONSTRAINT unique_empresa_ciudad_caja_activa EXCLUDE (
    empresa_id WITH =, 
    ciudad_id WITH =,
    estado WITH = 
  ) WHERE (estado = 'activa')
);

-- ===============================================
-- 4. FOREIGN KEYS
-- ===============================================

-- FK para empresa_arls
ALTER TABLE empresa_arls 
ADD CONSTRAINT fk_empresa_arls_empresa_id 
FOREIGN KEY (empresa_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE empresa_arls 
ADD CONSTRAINT fk_empresa_arls_arl_id 
FOREIGN KEY (arl_id) REFERENCES arls(id) ON DELETE RESTRICT;

ALTER TABLE empresa_arls 
ADD CONSTRAINT fk_empresa_arls_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE empresa_arls 
ADD CONSTRAINT fk_empresa_arls_updated_by 
FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- FK para empresa_cajas_compensacion
ALTER TABLE empresa_cajas_compensacion 
ADD CONSTRAINT fk_empresa_cajas_empresa_id 
FOREIGN KEY (empresa_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE empresa_cajas_compensacion 
ADD CONSTRAINT fk_empresa_cajas_ciudad_id 
FOREIGN KEY (ciudad_id) REFERENCES ciudades(id) ON DELETE RESTRICT;

ALTER TABLE empresa_cajas_compensacion 
ADD CONSTRAINT fk_empresa_cajas_caja_id 
FOREIGN KEY (caja_compensacion_id) REFERENCES cajas_compensacion(id) ON DELETE RESTRICT;

ALTER TABLE empresa_cajas_compensacion 
ADD CONSTRAINT fk_empresa_cajas_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE empresa_cajas_compensacion 
ADD CONSTRAINT fk_empresa_cajas_updated_by 
FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- ===============================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ===============================================

-- Índices para empresa_arls
CREATE INDEX IF NOT EXISTS idx_empresa_arls_empresa_id ON empresa_arls(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_arls_arl_id ON empresa_arls(arl_id);
CREATE INDEX IF NOT EXISTS idx_empresa_arls_estado ON empresa_arls(estado);
CREATE INDEX IF NOT EXISTS idx_empresa_arls_fecha_inicio ON empresa_arls(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_empresa_arls_empresa_estado ON empresa_arls(empresa_id, estado);

-- Índices para empresa_cajas_compensacion
CREATE INDEX IF NOT EXISTS idx_empresa_cajas_empresa_id ON empresa_cajas_compensacion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_cajas_ciudad_id ON empresa_cajas_compensacion(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_empresa_cajas_caja_id ON empresa_cajas_compensacion(caja_compensacion_id);
CREATE INDEX IF NOT EXISTS idx_empresa_cajas_estado ON empresa_cajas_compensacion(estado);
CREATE INDEX IF NOT EXISTS idx_empresa_cajas_fecha_inicio ON empresa_cajas_compensacion(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_empresa_cajas_empresa_ciudad_estado ON empresa_cajas_compensacion(empresa_id, ciudad_id, estado);

-- ===============================================
-- 6. TRIGGERS DE AUDITORÍA
-- ===============================================

-- Trigger para empresa_arls
DROP TRIGGER IF EXISTS trigger_empresa_arls_updated_at ON empresa_arls;
CREATE TRIGGER trigger_empresa_arls_updated_at
  BEFORE UPDATE ON empresa_arls
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

-- Trigger para empresa_cajas_compensacion
DROP TRIGGER IF EXISTS trigger_empresa_cajas_updated_at ON empresa_cajas_compensacion;
CREATE TRIGGER trigger_empresa_cajas_updated_at
  BEFORE UPDATE ON empresa_cajas_compensacion
  FOR EACH ROW
  EXECUTE FUNCTION update_auxiliary_tables_updated_at();

-- ===============================================
-- 7. FUNCIONES HELPER PARA ARLs Y CAJAS
-- ===============================================

-- Función para obtener ARL actual de una empresa
DROP FUNCTION IF EXISTS get_empresa_arl_actual(UUID);
CREATE OR REPLACE FUNCTION get_empresa_arl_actual(empresa_uuid UUID)
RETURNS TABLE (
  id UUID,
  arl_id UUID,
  arl_nombre TEXT,
  fecha_inicio DATE
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ea.id,
    ea.arl_id,
    a.nombre as arl_nombre,
    ea.fecha_inicio
  FROM empresa_arls ea
  JOIN arls a ON ea.arl_id = a.id
  WHERE ea.empresa_id = empresa_uuid 
    AND ea.estado = 'activa'
  LIMIT 1;
$$;

-- Función para obtener historial de ARLs de una empresa
DROP FUNCTION IF EXISTS get_empresa_arl_historial(UUID);
CREATE OR REPLACE FUNCTION get_empresa_arl_historial(empresa_uuid UUID)
RETURNS TABLE (
  id UUID,
  arl_id UUID,
  arl_nombre TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ea.id,
    ea.arl_id,
    a.nombre as arl_nombre,
    ea.fecha_inicio,
    ea.fecha_fin,
    ea.estado
  FROM empresa_arls ea
  JOIN arls a ON ea.arl_id = a.id
  WHERE ea.empresa_id = empresa_uuid
  ORDER BY ea.fecha_inicio DESC;
$$;

-- Función para obtener cajas actuales de una empresa por ciudad
DROP FUNCTION IF EXISTS get_empresa_cajas_actuales(UUID);
CREATE OR REPLACE FUNCTION get_empresa_cajas_actuales(empresa_uuid UUID)
RETURNS TABLE (
  id UUID,
  ciudad_id UUID,
  ciudad_nombre TEXT,
  caja_id UUID,
  caja_nombre TEXT,
  fecha_inicio DATE
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ecc.id,
    ecc.ciudad_id,
    c.nombre as ciudad_nombre,
    ecc.caja_compensacion_id as caja_id,
    cc.nombre as caja_nombre,
    ecc.fecha_inicio
  FROM empresa_cajas_compensacion ecc
  JOIN ciudades c ON ecc.ciudad_id = c.id
  JOIN cajas_compensacion cc ON ecc.caja_compensacion_id = cc.id
  WHERE ecc.empresa_id = empresa_uuid 
    AND ecc.estado = 'activa'
  ORDER BY c.nombre ASC;
$$;

-- Función para obtener historial completo de cajas de una empresa
DROP FUNCTION IF EXISTS get_empresa_cajas_historial(UUID);
CREATE OR REPLACE FUNCTION get_empresa_cajas_historial(empresa_uuid UUID)
RETURNS TABLE (
  id UUID,
  ciudad_id UUID,
  ciudad_nombre TEXT,
  caja_id UUID,
  caja_nombre TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    ecc.id,
    ecc.ciudad_id,
    c.nombre as ciudad_nombre,
    ecc.caja_compensacion_id as caja_id,
    cc.nombre as caja_nombre,
    ecc.fecha_inicio,
    ecc.fecha_fin,
    ecc.estado
  FROM empresa_cajas_compensacion ecc
  JOIN ciudades c ON ecc.ciudad_id = c.id
  JOIN cajas_compensacion cc ON ecc.caja_compensacion_id = cc.id
  WHERE ecc.empresa_id = empresa_uuid
  ORDER BY c.nombre ASC, ecc.fecha_inicio DESC;
$$;

-- Función para cambiar ARL de empresa (cerrar anterior y crear nueva)
DROP FUNCTION IF EXISTS cambiar_empresa_arl(UUID, UUID, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS cambiar_empresa_arl(UUID, UUID, DATE, UUID);
CREATE OR REPLACE FUNCTION cambiar_empresa_arl(
  p_empresa_id UUID,
  p_nueva_arl_id UUID,
  p_fecha_cambio DATE,
  p_usuario_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Verificar permisos
  IF NOT (
    has_permission(p_usuario_id, 'empresa_arls', 'create') OR
    has_permission(p_usuario_id, 'companies', 'edit')
  ) THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'No tienes permisos para cambiar ARL'
    );
  END IF;
  
  -- Cerrar ARL actual si existe
  UPDATE empresa_arls 
  SET 
    fecha_fin = CASE 
      WHEN p_fecha_cambio <= fecha_inicio THEN fecha_inicio
      ELSE p_fecha_cambio - INTERVAL '1 day'
    END,
    estado = 'inactiva',
    updated_at = NOW(),
    updated_by = p_usuario_id
  WHERE empresa_id = p_empresa_id AND estado = 'activa';
  
  -- Crear nueva ARL
  INSERT INTO empresa_arls (
    empresa_id, arl_id, fecha_inicio, created_by, updated_by
  ) VALUES (
    p_empresa_id, p_nueva_arl_id, p_fecha_cambio, p_usuario_id, p_usuario_id
  );
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'ARL cambiada exitosamente'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN JSON_BUILD_OBJECT(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar caja de compensación por ciudad
DROP FUNCTION IF EXISTS cambiar_empresa_caja(UUID, UUID, UUID, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS cambiar_empresa_caja(UUID, UUID, UUID, DATE, UUID);
CREATE OR REPLACE FUNCTION cambiar_empresa_caja(
  p_empresa_id UUID,
  p_ciudad_id UUID,
  p_nueva_caja_id UUID,
  p_fecha_cambio DATE,
  p_usuario_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Verificar permisos
  IF NOT (
    has_permission(p_usuario_id, 'empresa_cajas_compensacion', 'create') OR
    has_permission(p_usuario_id, 'companies', 'edit')
  ) THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'No tienes permisos para cambiar caja de compensación'
    );
  END IF;
  
  -- Cerrar caja actual si existe para esa ciudad
  UPDATE empresa_cajas_compensacion 
  SET 
    fecha_fin = CASE 
      WHEN p_fecha_cambio <= fecha_inicio THEN fecha_inicio
      ELSE p_fecha_cambio - INTERVAL '1 day'
    END,
    estado = 'inactiva',
    updated_at = NOW(),
    updated_by = p_usuario_id
  WHERE empresa_id = p_empresa_id 
    AND ciudad_id = p_ciudad_id 
    AND estado = 'activa';
  
  -- Crear nueva caja
  INSERT INTO empresa_cajas_compensacion (
    empresa_id, ciudad_id, caja_compensacion_id, fecha_inicio, created_by, updated_by
  ) VALUES (
    p_empresa_id, p_ciudad_id, p_nueva_caja_id, p_fecha_cambio, p_usuario_id, p_usuario_id
  );
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Caja de compensación cambiada exitosamente'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN JSON_BUILD_OBJECT(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cerrar/desactivar una caja de compensación
CREATE OR REPLACE FUNCTION cerrar_empresa_caja(
  p_empresa_id UUID,
  p_ciudad_id UUID,
  p_fecha_cierre DATE,
  p_usuario_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Verificar permisos
  IF NOT (
    has_permission(p_usuario_id, 'empresa_cajas_compensacion', 'delete') OR
    has_permission(p_usuario_id, 'companies', 'edit')
  ) THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'No tienes permisos para cerrar caja de compensación'
    );
  END IF;
  
  -- Cerrar caja activa para esa ciudad
  UPDATE empresa_cajas_compensacion 
  SET 
    fecha_fin = CASE 
      WHEN p_fecha_cierre <= fecha_inicio THEN fecha_inicio
      ELSE p_fecha_cierre
    END,
    estado = 'inactiva',
    updated_at = NOW(),
    updated_by = p_usuario_id
  WHERE empresa_id = p_empresa_id 
    AND ciudad_id = p_ciudad_id 
    AND estado = 'activa';
  
  -- Verificar si se actualizó algún registro
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'No se encontró una caja activa para cerrar'
    );
  END IF;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Caja de compensación cerrada exitosamente'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN JSON_BUILD_OBJECT(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;