-- Permitir fechas futuras en terminaciones de contratos
-- Esta migración elimina la restricción que impide seleccionar fechas futuras
-- para terminaciones programadas

-- Eliminar la restricción de fecha que impide fechas futuras
ALTER TABLE novedades_terminacion 
DROP CONSTRAINT IF EXISTS novedades_terminacion_fecha_valid;

-- Comentario explicativo: Las terminaciones pueden ser programadas
-- para fechas futuras, por ejemplo:
-- - Vencimiento natural de contratos a término fijo
-- - Terminaciones acordadas con anticipación 
-- - Despidos programados por reestructuraciones
COMMENT ON COLUMN novedades_terminacion.fecha IS 
'Fecha de terminación del contrato. Puede ser futura para terminaciones programadas.';
