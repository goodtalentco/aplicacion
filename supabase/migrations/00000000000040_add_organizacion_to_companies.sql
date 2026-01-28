-- ===============================================
-- Agregar columna organizacion a companies
-- ===============================================
-- Descripción: Cada empresa cliente pertenece a una organización interna (Good o CPS).
-- Permite filtrar el directorio y seleccionar organización al crear/editar empresa.
-- ===============================================

-- Columna organizacion: Good o CPS
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS organizacion TEXT;

-- Valores por defecto para empresas existentes
UPDATE companies SET organizacion = 'Good' WHERE organizacion IS NULL;

-- Restricción de valores permitidos
ALTER TABLE companies
DROP CONSTRAINT IF EXISTS companies_organizacion_check;

ALTER TABLE companies
ADD CONSTRAINT companies_organizacion_check
CHECK (organizacion IN ('Good', 'CPS'));

-- Hacer obligatorio para nuevos registros (las existentes ya tienen valor)
ALTER TABLE companies
ALTER COLUMN organizacion SET NOT NULL;

COMMENT ON COLUMN companies.organizacion IS 'Organización interna a la que pertenece el cliente: Good o CPS';

CREATE INDEX IF NOT EXISTS idx_companies_organizacion ON companies (organizacion);
