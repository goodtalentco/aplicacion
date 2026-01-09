-- ===============================================
-- MIGRACIÓN: Agregar columnas fuero y pensionado a contracts
-- Fecha: 2025-01-22
-- Descripción: Agrega las columnas fuero, fuero_detalle y pensionado que son opcionales
-- ===============================================

-- ===============================================
-- 1. AGREGAR COLUMNAS FUERO Y PENSIONADO
-- ===============================================

-- Columna fuero (opcional, default false)
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS fuero BOOLEAN DEFAULT false NOT NULL;

-- Columna fuero_detalle (opcional, nullable)
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS fuero_detalle TEXT;

-- Columna pensionado (opcional, default false)
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS pensionado BOOLEAN DEFAULT false NOT NULL;

-- ===============================================
-- 2. COMENTARIOS
-- ===============================================

COMMENT ON COLUMN contracts.fuero IS 'Indica si el empleado tiene fuero sindical o de otro tipo (opcional)';
COMMENT ON COLUMN contracts.fuero_detalle IS 'Detalle del tipo de fuero si está marcado (opcional)';
COMMENT ON COLUMN contracts.pensionado IS 'Indica si el empleado está pensionado (opcional)';

-- ===============================================
-- 3. ACTUALIZAR VALORES POR DEFECTO PARA REGISTROS EXISTENTES
-- ===============================================

-- Los valores por defecto ya se aplicarán automáticamente a los nuevos registros
-- Para registros existentes, establecer valores por defecto si son NULL
UPDATE contracts 
SET fuero = false 
WHERE fuero IS NULL;

UPDATE contracts 
SET pensionado = false 
WHERE pensionado IS NULL;
