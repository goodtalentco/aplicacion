-- ===============================================
-- MIGRACIÓN: Eliminar constraints CHECK de campos de selección
-- Fecha: 2025-01-15
-- Descripción: 
-- Elimina las restricciones CHECK de los campos que son listas desplegables
-- para permitir mayor flexibilidad y futuras opciones sin cambios en BD
-- ===============================================

-- 1. ELIMINAR CONSTRAINT DE EMPRESA_INTERNA
-- Actualmente: CHECK (empresa_interna IN ('Good', 'CPS'))
-- Nuevo: Campo de texto libre (controlado por frontend)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_empresa_interna_check;

-- 2. ELIMINAR CONSTRAINT DE TIPO_CONTRATO  
-- Actualmente: CHECK (tipo_contrato IN ('Indefinido', 'Fijo', 'Obra', 'Aprendizaje'))
-- Nuevo: Campo de texto libre (controlado por frontend)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_tipo_contrato_check;

-- 3. ELIMINAR CONSTRAINT DE TIPO_SALARIO
-- Actualmente: CHECK (tipo_salario IN ('Integral', 'Ordinario'))
-- Nuevo: Campo de texto libre (controlado por frontend)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_tipo_salario_check;

-- 4. ELIMINAR CONSTRAINT DE TIPO_IDENTIFICACION
-- Actualmente: CHECK (tipo_identificacion IN ('CC', 'CE', 'Pasaporte', 'PEP', 'Otro'))
-- Nuevo: Campo de texto libre (controlado por frontend)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_tipo_identificacion_check;

-- 5. ELIMINAR CONSTRAINT DE FECHA_FIN_LOGIC
-- Actualmente: CHECK ((tipo_contrato = 'Indefinido' AND fecha_fin IS NULL) OR (tipo_contrato != 'Indefinido' AND fecha_fin IS NOT NULL) OR tipo_contrato IS NULL)
-- Nuevo: Sin restricción (controlado por frontend)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_fecha_fin_logic;

-- 6. ELIMINAR CONSTRAINT DE STATUS_APROBACION (opcional - mantener control de estados)
-- Este se mantiene porque es crítico para el flujo de negocio
-- ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_aprobacion_check;

-- ===============================================
-- COMENTARIOS:
-- - Los valores permitidos ahora se controlan únicamente desde el frontend
-- - Esto permite agregar nuevas opciones sin cambios en la base de datos
-- - Los campos siguen siendo NOT NULL donde corresponde
-- - La integridad se mantiene a nivel de aplicación
-- ===============================================

-- Verificar que las restricciones se eliminaron correctamente
DO $$
BEGIN
    RAISE NOTICE 'Constraints CHECK eliminados exitosamente para mayor flexibilidad';
    RAISE NOTICE 'Los valores permitidos ahora se controlan desde el frontend';
END $$;
