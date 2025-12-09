-- ===============================================
-- MIGRACIÓN: TABLA PARÁMETROS ANUALES
-- Fecha: 2025-01-15
-- Descripción: Tabla para manejar parámetros que cambian año a año
-- ===============================================

-- ===============================================
-- 1. CREAR TABLA PARAMETROS_ANUALES
-- ===============================================

CREATE TABLE IF NOT EXISTS parametros_anuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_parametro TEXT NOT NULL,
  año INTEGER NOT NULL,
  valor_numerico DECIMAL(15,4),
  valor_texto TEXT,
  tipo_dato TEXT NOT NULL CHECK (tipo_dato IN ('numerico', 'texto', 'booleano', 'json')),
  unidad TEXT, -- 'pesos', 'porcentaje', 'dias', etc.
  descripcion TEXT,
  es_activo BOOLEAN NOT NULL DEFAULT true,
  fecha_vigencia_inicio DATE,
  fecha_vigencia_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT parametros_anuales_tipo_not_empty CHECK (length(trim(tipo_parametro)) > 0),
  CONSTRAINT parametros_anuales_año_valido CHECK (año >= 2020 AND año <= 2050),
  CONSTRAINT parametros_anuales_unique_tipo_año UNIQUE(tipo_parametro, año),
  CONSTRAINT parametros_anuales_valor_requerido CHECK (
    (tipo_dato = 'numerico' AND valor_numerico IS NOT NULL) OR
    (tipo_dato IN ('texto', 'booleano', 'json') AND valor_texto IS NOT NULL)
  ),
  
  -- Foreign Keys
  CONSTRAINT parametros_anuales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT parametros_anuales_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);

-- ===============================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_parametros_anuales_tipo_año ON parametros_anuales(tipo_parametro, año);
CREATE INDEX IF NOT EXISTS idx_parametros_anuales_año ON parametros_anuales(año);
CREATE INDEX IF NOT EXISTS idx_parametros_anuales_activo ON parametros_anuales(es_activo);

-- ===============================================
-- 3. TRIGGER PARA UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_parametros_anuales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_parametros_anuales_updated_at
  BEFORE UPDATE ON parametros_anuales
  FOR EACH ROW
  EXECUTE FUNCTION update_parametros_anuales_updated_at();

-- ===============================================
-- 4. HABILITAR RLS
-- ===============================================

ALTER TABLE parametros_anuales ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 5. POLÍTICAS RLS
-- ===============================================

-- Política de lectura
CREATE POLICY "parametros_anuales_select_policy" ON parametros_anuales
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'view'));

-- Política de creación
CREATE POLICY "parametros_anuales_insert_policy" ON parametros_anuales
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'create'));

-- Política de actualización
CREATE POLICY "parametros_anuales_update_policy" ON parametros_anuales
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'tablas_auxiliares', 'edit'));

-- Política de eliminación
CREATE POLICY "parametros_anuales_delete_policy" ON parametros_anuales
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'tablas_auxiliares', 'delete'));

-- ===============================================
-- 6. TABLA CREADA SIN DATOS INICIALES
-- ===============================================
-- Los datos serán creados por los usuarios desde el frontend

-- ===============================================
-- 7. FUNCIÓN HELPER PARA OBTENER PARÁMETROS
-- ===============================================

CREATE OR REPLACE FUNCTION get_parametro_anual(
  p_tipo_parametro TEXT,
  p_año INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  id UUID,
  tipo_parametro TEXT,
  año INTEGER,
  valor_numerico DECIMAL(15,4),
  valor_texto TEXT,
  tipo_dato TEXT,
  unidad TEXT,
  descripcion TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.id,
    pa.tipo_parametro,
    pa.año,
    pa.valor_numerico,
    pa.valor_texto,
    pa.tipo_dato,
    pa.unidad,
    pa.descripcion
  FROM parametros_anuales pa
  WHERE pa.tipo_parametro = p_tipo_parametro 
    AND pa.año = p_año 
    AND pa.es_activo = true
    AND (pa.fecha_vigencia_inicio IS NULL OR pa.fecha_vigencia_inicio <= CURRENT_DATE)
    AND (pa.fecha_vigencia_fin IS NULL OR pa.fecha_vigencia_fin >= CURRENT_DATE)
  ORDER BY pa.created_at DESC
  LIMIT 1;
END;
$$;

-- ===============================================
-- 8. GRANTS DE ACCESO
-- ===============================================

GRANT SELECT ON parametros_anuales TO authenticated;
GRANT INSERT ON parametros_anuales TO authenticated;
GRANT UPDATE ON parametros_anuales TO authenticated;
GRANT DELETE ON parametros_anuales TO authenticated;

GRANT EXECUTE ON FUNCTION get_parametro_anual(TEXT, INTEGER) TO authenticated;
