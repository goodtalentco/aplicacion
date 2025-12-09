-- ===============================================
-- MIGRACIÓN: CONTACTO COMERCIAL EN EMPRESAS
-- Fecha: 2025-01-15
-- Descripción: Agrega contacto comercial a la tabla companies
-- ===============================================

-- ===============================================
-- 1. AGREGAR COLUMNAS DE CONTACTO COMERCIAL
-- ===============================================

-- Agregar columnas de contacto comercial
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS comercial_contact_name TEXT,
ADD COLUMN IF NOT EXISTS comercial_contact_email TEXT,
ADD COLUMN IF NOT EXISTS comercial_contact_phone TEXT;

-- ===============================================
-- 2. HACER CONTACTO DE CARTERA OPCIONAL
-- ===============================================

-- Remover NOT NULL de contacto de cartera (ya no es obligatorio)
ALTER TABLE companies 
ALTER COLUMN accounts_contact_name DROP NOT NULL,
ALTER COLUMN accounts_contact_email DROP NOT NULL,
ALTER COLUMN accounts_contact_phone DROP NOT NULL;

-- ===============================================
-- 3. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

COMMENT ON COLUMN companies.comercial_contact_name IS 'Nombre del contacto comercial de la empresa';
COMMENT ON COLUMN companies.comercial_contact_email IS 'Email del contacto comercial de la empresa';
COMMENT ON COLUMN companies.comercial_contact_phone IS 'Teléfono del contacto comercial de la empresa';

COMMENT ON COLUMN companies.accounts_contact_name IS 'Nombre del contacto de cartera (opcional)';
COMMENT ON COLUMN companies.accounts_contact_email IS 'Email del contacto de cartera (opcional)';
COMMENT ON COLUMN companies.accounts_contact_phone IS 'Teléfono del contacto de cartera (opcional)';

-- ===============================================
-- 4. VERIFICACIÓN
-- ===============================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRACIÓN CONTACTO COMERCIAL COMPLETADA ===';
  RAISE NOTICE 'Se agregaron columnas de contacto comercial';
  RAISE NOTICE 'Se hizo opcional el contacto de cartera';
  RAISE NOTICE '🎉 ¡Empresas con doble contacto implementado!';
END $$;
