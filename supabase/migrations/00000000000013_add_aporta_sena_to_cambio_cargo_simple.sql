-- Migración simple: agregar campo aporta_sena a novedades_cambio_cargo

BEGIN;

-- Agregar columna aporta_sena
ALTER TABLE novedades_cambio_cargo 
ADD COLUMN aporta_sena BOOLEAN;

-- Comentario
COMMENT ON COLUMN novedades_cambio_cargo.aporta_sena IS 'Indica si el nuevo cargo aporta al SENA';

COMMIT;
