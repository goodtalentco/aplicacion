-- ===============================================
-- MIGRACIÓN: Agregar Soft Delete a Tablas Auxiliares
-- Fecha: 2025-01-15
-- Propósito: Implementar es_activa en todas las tablas de catálogo
--           para preservar historial y evitar eliminación física
-- ===============================================

-- ===============================================
-- 1. AGREGAR CAMPO es_activa A TABLAS DE CATÁLOGO
-- ===============================================

-- Ciudades
ALTER TABLE ciudades 
ADD COLUMN IF NOT EXISTS es_activa BOOLEAN DEFAULT true;

-- Cajas de Compensación
ALTER TABLE cajas_compensacion 
ADD COLUMN IF NOT EXISTS es_activa BOOLEAN DEFAULT true;

-- ARLs (Administradoras de Riesgos Laborales)
ALTER TABLE arls 
ADD COLUMN IF NOT EXISTS es_activa BOOLEAN DEFAULT true;

-- Fondos de Cesantías
ALTER TABLE fondos_cesantias 
ADD COLUMN IF NOT EXISTS es_activa BOOLEAN DEFAULT true;

-- Fondos de Pensión
ALTER TABLE fondos_pension 
ADD COLUMN IF NOT EXISTS es_activa BOOLEAN DEFAULT true;

-- EPS (Entidades Promotoras de Salud)
ALTER TABLE eps 
ADD COLUMN IF NOT EXISTS es_activa BOOLEAN DEFAULT true;

-- ===============================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- ===============================================

-- Índices para campos es_activa (mejora performance en filtros)
CREATE INDEX IF NOT EXISTS idx_ciudades_es_activa ON ciudades(es_activa);
CREATE INDEX IF NOT EXISTS idx_cajas_compensacion_es_activa ON cajas_compensacion(es_activa);
CREATE INDEX IF NOT EXISTS idx_arls_es_activa ON arls(es_activa);
CREATE INDEX IF NOT EXISTS idx_fondos_cesantias_es_activa ON fondos_cesantias(es_activa);
CREATE INDEX IF NOT EXISTS idx_fondos_pension_es_activa ON fondos_pension(es_activa);
CREATE INDEX IF NOT EXISTS idx_eps_es_activa ON eps(es_activa);

-- ===============================================
-- 3. MARCAR TODOS LOS REGISTROS EXISTENTES COMO ACTIVOS
-- ===============================================

-- Actualizar registros existentes (por defecto todos activos)
UPDATE ciudades SET es_activa = true WHERE es_activa IS NULL;
UPDATE cajas_compensacion SET es_activa = true WHERE es_activa IS NULL;
UPDATE arls SET es_activa = true WHERE es_activa IS NULL;
UPDATE fondos_cesantias SET es_activa = true WHERE es_activa IS NULL;
UPDATE fondos_pension SET es_activa = true WHERE es_activa IS NULL;
UPDATE eps SET es_activa = true WHERE es_activa IS NULL;

-- ===============================================
-- 4. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

-- Comentarios explicativos para cada tabla
COMMENT ON COLUMN ciudades.es_activa IS 'Indica si la ciudad está activa para nuevas asignaciones. false = desactivada pero preserva historial';
COMMENT ON COLUMN cajas_compensacion.es_activa IS 'Indica si la caja está activa para nuevas asignaciones. false = desactivada pero preserva historial';
COMMENT ON COLUMN arls.es_activa IS 'Indica si la ARL está activa para nuevas asignaciones. false = desactivada pero preserva historial';
COMMENT ON COLUMN fondos_cesantias.es_activa IS 'Indica si el fondo está activo para nuevas asignaciones. false = desactivado pero preserva historial';
COMMENT ON COLUMN fondos_pension.es_activa IS 'Indica si el fondo está activo para nuevas asignaciones. false = desactivado pero preserva historial';
COMMENT ON COLUMN eps.es_activa IS 'Indica si la EPS está activa para nuevas asignaciones. false = desactivada pero preserva historial';

-- ===============================================
-- 5. VERIFICACIÓN POST-MIGRACIÓN
-- ===============================================

-- Verificar que todos los campos se agregaron correctamente
DO $$
BEGIN
  -- Verificar ciudades
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ciudades' AND column_name = 'es_activa') THEN
    RAISE EXCEPTION 'Error: Campo es_activa no se agregó a tabla ciudades';
  END IF;
  
  -- Verificar cajas_compensacion
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'cajas_compensacion' AND column_name = 'es_activa') THEN
    RAISE EXCEPTION 'Error: Campo es_activa no se agregó a tabla cajas_compensacion';
  END IF;
  
  -- Verificar arls
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'arls' AND column_name = 'es_activa') THEN
    RAISE EXCEPTION 'Error: Campo es_activa no se agregó a tabla arls';
  END IF;
  
  -- Verificar fondos_cesantias
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'fondos_cesantias' AND column_name = 'es_activa') THEN
    RAISE EXCEPTION 'Error: Campo es_activa no se agregó a tabla fondos_cesantias';
  END IF;
  
  -- Verificar fondos_pension
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'fondos_pension' AND column_name = 'es_activa') THEN
    RAISE EXCEPTION 'Error: Campo es_activa no se agregó a tabla fondos_pension';
  END IF;
  
  -- Verificar eps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'eps' AND column_name = 'es_activa') THEN
    RAISE EXCEPTION 'Error: Campo es_activa no se agregó a tabla eps';
  END IF;
  
  -- Si llegamos aquí, todo está bien
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '✅ Campos es_activa agregados a 6 tablas auxiliares';
  RAISE NOTICE '✅ Índices creados para mejor performance';
  RAISE NOTICE '✅ Todos los registros existentes marcados como activos';
  RAISE NOTICE '📋 Próximo paso: Actualizar frontend para usar filtros es_activa = true';
  
END $$;
