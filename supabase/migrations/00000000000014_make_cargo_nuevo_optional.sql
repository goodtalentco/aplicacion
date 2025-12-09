-- Hacer cargo_nuevo opcional en novedades_cambio_cargo
-- Permite cambiar solo SENA sin cambiar cargo

BEGIN;

-- Eliminar constraint que hace cargo_nuevo obligatorio
ALTER TABLE novedades_cambio_cargo 
DROP CONSTRAINT IF EXISTS novedades_cambio_cargo_cargo_nuevo_not_empty;

-- Permitir que cargo_nuevo sea NULL (para casos donde solo se cambia SENA)
ALTER TABLE novedades_cambio_cargo 
ALTER COLUMN cargo_nuevo DROP NOT NULL;

COMMIT;
