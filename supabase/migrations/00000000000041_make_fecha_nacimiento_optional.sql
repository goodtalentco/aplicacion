-- ===============================================
-- Hacer fecha_nacimiento opcional en contracts
-- ===============================================
-- Descripción: La fecha de nacimiento deja de ser obligatoria.
-- Solo usuarios con permiso contracts.admin pueden editarla (lógica en frontend).
-- ===============================================

ALTER TABLE contracts
ALTER COLUMN fecha_nacimiento DROP NOT NULL;

COMMENT ON COLUMN contracts.fecha_nacimiento IS 'Fecha de nacimiento del empleado (opcional). Editable solo por usuarios con permiso contracts.admin';
