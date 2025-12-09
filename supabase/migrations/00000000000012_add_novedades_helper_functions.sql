-- ===============================================
-- MIGRACIÓN: Funciones Helper para Sistema de Novedades
-- Fecha: 2025-01-16
-- Descripción: Funciones utilitarias para cálculos y validaciones
-- ===============================================

-- ===============================================
-- 1. FUNCIÓN: get_total_contract_count
-- Calcula el total de contratos fijos (historial + actual)
-- ===============================================

CREATE OR REPLACE FUNCTION get_total_contract_count(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  historial_count INTEGER := 0;
  current_count INTEGER := 0;
  total_count INTEGER;
  debe_ser_indefinido BOOLEAN;
  tiempo_total_meses INTEGER := 0;
BEGIN
  -- 1. Contar contratos del historial previo
  SELECT COALESCE(COUNT(*), 0) 
  INTO historial_count
  FROM historial_contratos_fijos 
  WHERE contract_id = contract_uuid;
  
  -- 2. Contar contrato actual + prórrogas en el sistema actual
  SELECT 1 + COALESCE(COUNT(ntl.id), 0)  -- 1 inicial + prórrogas
  INTO current_count
  FROM contracts c
  LEFT JOIN novedades_tiempo_laboral ntl ON ntl.contract_id = c.id 
    AND ntl.tipo_tiempo = 'prorroga'
  WHERE c.id = contract_uuid;
  
  -- 3. Calcular total
  total_count := historial_count + current_count;
  
  -- 4. Determinar si debe ser indefinido (≥ 3 contratos)
  debe_ser_indefinido := total_count >= 3;
  
  RETURN jsonb_build_object(
    'contratos_anteriores', historial_count,
    'contratos_actuales', current_count, 
    'total_contratos', total_count,
    'debe_ser_indefinido', debe_ser_indefinido,
    'alerta_legal', CASE 
      WHEN total_count >= 3 THEN 'DEBE SER INDEFINIDO POR LEY'
      WHEN total_count = 2 THEN 'PRÓXIMA PRÓRROGA SERÁ INDEFINIDO'
      ELSE 'OK - Puede seguir a término fijo'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 2. FUNCIÓN: get_contract_current_economic_state
-- Obtiene el estado económico actual de un contrato
-- ===============================================

CREATE OR REPLACE FUNCTION get_contract_current_economic_state(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  base_contract RECORD;
  current_state JSONB;
  latest_salario NUMERIC;
  latest_auxilio_salarial NUMERIC;
  latest_auxilio_no_salarial NUMERIC;
  latest_auxilio_transporte NUMERIC;
BEGIN
  -- 1. Obtener contrato base
  SELECT salario, auxilio_salarial, auxilio_no_salarial, auxilio_transporte
  INTO base_contract
  FROM contracts 
  WHERE id = contract_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contrato no encontrado');
  END IF;
  
  -- 2. Obtener última novedad salarial
  SELECT valor_nuevo INTO latest_salario
  FROM novedades_economicas 
  WHERE contract_id = contract_uuid AND tipo = 'salario'
  ORDER BY created_at DESC LIMIT 1;
  
  -- 3. Obtener último auxilio salarial
  SELECT valor_nuevo INTO latest_auxilio_salarial
  FROM novedades_economicas 
  WHERE contract_id = contract_uuid AND tipo = 'auxilio_salarial'
  ORDER BY created_at DESC LIMIT 1;
  
  -- 4. Obtener último auxilio no salarial
  SELECT valor_nuevo INTO latest_auxilio_no_salarial
  FROM novedades_economicas 
  WHERE contract_id = contract_uuid AND tipo = 'auxilio_no_salarial'
  ORDER BY created_at DESC LIMIT 1;
  
  -- 5. Obtener último auxilio de transporte
  SELECT valor_nuevo INTO latest_auxilio_transporte
  FROM novedades_economicas 
  WHERE contract_id = contract_uuid AND tipo = 'auxilio_transporte'
  ORDER BY created_at DESC LIMIT 1;
  
  -- 6. Construir estado actual
  RETURN jsonb_build_object(
    'salario_actual', COALESCE(latest_salario, base_contract.salario),
    'auxilio_salarial_actual', COALESCE(latest_auxilio_salarial, base_contract.auxilio_salarial),
    'auxilio_no_salarial_actual', COALESCE(latest_auxilio_no_salarial, base_contract.auxilio_no_salarial),
    'auxilio_transporte_actual', COALESCE(latest_auxilio_transporte, base_contract.auxilio_transporte),
    'salario_base', base_contract.salario,
    'auxilio_salarial_base', base_contract.auxilio_salarial,
    'auxilio_no_salarial_base', base_contract.auxilio_no_salarial,
    'auxilio_transporte_base', base_contract.auxilio_transporte
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 3. FUNCIÓN: get_contract_current_personal_data
-- Obtiene los datos personales actuales de un contrato
-- ===============================================

CREATE OR REPLACE FUNCTION get_contract_current_personal_data(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  base_contract RECORD;
  latest_celular TEXT;
  latest_email TEXT;
  latest_direccion TEXT;
BEGIN
  -- 1. Obtener datos base del contrato
  SELECT celular, email
  INTO base_contract
  FROM contracts 
  WHERE id = contract_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contrato no encontrado');
  END IF;
  
  -- 2. Obtener últimos datos personales
  SELECT valor_nuevo INTO latest_celular
  FROM novedades_datos_personales 
  WHERE contract_id = contract_uuid AND campo = 'celular'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT valor_nuevo INTO latest_email
  FROM novedades_datos_personales 
  WHERE contract_id = contract_uuid AND campo = 'email'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT valor_nuevo INTO latest_direccion
  FROM novedades_datos_personales 
  WHERE contract_id = contract_uuid AND campo = 'direccion'
  ORDER BY created_at DESC LIMIT 1;
  
  -- 3. Construir estado actual
  RETURN jsonb_build_object(
    'celular_actual', COALESCE(latest_celular, base_contract.celular),
    'email_actual', COALESCE(latest_email, base_contract.email),
    'direccion_actual', latest_direccion, -- No existe en contrato base
    'celular_base', base_contract.celular,
    'email_base', base_contract.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 4. FUNCIÓN: get_contract_current_entities
-- Obtiene las entidades actuales (EPS, Pensión, Cesantías)
-- ===============================================

CREATE OR REPLACE FUNCTION get_contract_current_entities(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  base_contract RECORD;
  latest_eps TEXT;
  latest_pension TEXT;
  latest_cesantias TEXT;
BEGIN
  -- 1. Obtener entidades base del contrato
  SELECT fondo_pension, fondo_cesantias
  INTO base_contract
  FROM contracts 
  WHERE id = contract_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contrato no encontrado');
  END IF;
  
  -- 2. Obtener últimas entidades
  SELECT entidad_nueva INTO latest_eps
  FROM novedades_entidades 
  WHERE contract_id = contract_uuid AND tipo = 'eps'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT entidad_nueva INTO latest_pension
  FROM novedades_entidades 
  WHERE contract_id = contract_uuid AND tipo = 'fondo_pension'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT entidad_nueva INTO latest_cesantias
  FROM novedades_entidades 
  WHERE contract_id = contract_uuid AND tipo = 'fondo_cesantias'
  ORDER BY created_at DESC LIMIT 1;
  
  -- 3. Construir estado actual
  RETURN jsonb_build_object(
    'eps_actual', latest_eps, -- No existe en contrato base
    'fondo_pension_actual', COALESCE(latest_pension, base_contract.fondo_pension),
    'fondo_cesantias_actual', COALESCE(latest_cesantias, base_contract.fondo_cesantias),
    'fondo_pension_base', base_contract.fondo_pension,
    'fondo_cesantias_base', base_contract.fondo_cesantias
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 5. FUNCIÓN: get_contract_current_beneficiaries
-- Obtiene los beneficiarios actuales de un contrato
-- ===============================================

CREATE OR REPLACE FUNCTION get_contract_current_beneficiaries(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  base_contract RECORD;
  latest_hijo INTEGER;
  latest_madre INTEGER;
  latest_padre INTEGER;
  latest_conyuge INTEGER;
BEGIN
  -- 1. Obtener beneficiarios base del contrato
  SELECT beneficiario_hijo, beneficiario_madre, beneficiario_padre, beneficiario_conyuge
  INTO base_contract
  FROM contracts 
  WHERE id = contract_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contrato no encontrado');
  END IF;
  
  -- 2. Obtener últimos beneficiarios
  SELECT valor_nuevo INTO latest_hijo
  FROM novedades_beneficiarios 
  WHERE contract_id = contract_uuid AND tipo_beneficiario = 'hijo'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT valor_nuevo INTO latest_madre
  FROM novedades_beneficiarios 
  WHERE contract_id = contract_uuid AND tipo_beneficiario = 'madre'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT valor_nuevo INTO latest_padre
  FROM novedades_beneficiarios 
  WHERE contract_id = contract_uuid AND tipo_beneficiario = 'padre'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT valor_nuevo INTO latest_conyuge
  FROM novedades_beneficiarios 
  WHERE contract_id = contract_uuid AND tipo_beneficiario = 'conyuge'
  ORDER BY created_at DESC LIMIT 1;
  
  -- 3. Construir estado actual
  RETURN jsonb_build_object(
    'hijo_actual', COALESCE(latest_hijo, base_contract.beneficiario_hijo),
    'madre_actual', COALESCE(latest_madre, base_contract.beneficiario_madre),
    'padre_actual', COALESCE(latest_padre, base_contract.beneficiario_padre),
    'conyuge_actual', COALESCE(latest_conyuge, base_contract.beneficiario_conyuge),
    'hijo_base', base_contract.beneficiario_hijo,
    'madre_base', base_contract.beneficiario_madre,
    'padre_base', base_contract.beneficiario_padre,
    'conyuge_base', base_contract.beneficiario_conyuge
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 6. FUNCIÓN: get_contract_full_current_state
-- Obtiene el estado completo actual de un contrato
-- ===============================================

CREATE OR REPLACE FUNCTION get_contract_full_current_state(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  economic_state JSONB;
  personal_data JSONB;
  entities_data JSONB;
  beneficiaries_data JSONB;
  contract_count JSONB;
  latest_cargo TEXT;
  is_terminated BOOLEAN := FALSE;
BEGIN
  -- 1. Verificar si el contrato existe
  IF NOT EXISTS (SELECT 1 FROM contracts WHERE id = contract_uuid) THEN
    RETURN jsonb_build_object('error', 'Contrato no encontrado');
  END IF;
  
  -- 2. Verificar si está terminado
  SELECT TRUE INTO is_terminated
  FROM novedades_terminacion 
  WHERE contract_id = contract_uuid
  LIMIT 1;
  
  -- 3. Obtener último cargo
  SELECT cargo_nuevo INTO latest_cargo
  FROM novedades_cambio_cargo 
  WHERE contract_id = contract_uuid
  ORDER BY created_at DESC LIMIT 1;
  
  -- Si no hay cambio de cargo, obtener del contrato base
  IF latest_cargo IS NULL THEN
    SELECT cargo INTO latest_cargo
    FROM contracts WHERE id = contract_uuid;
  END IF;
  
  -- 4. Obtener estados específicos
  SELECT get_contract_current_economic_state(contract_uuid) INTO economic_state;
  SELECT get_contract_current_personal_data(contract_uuid) INTO personal_data;
  SELECT get_contract_current_entities(contract_uuid) INTO entities_data;
  SELECT get_contract_current_beneficiaries(contract_uuid) INTO beneficiaries_data;
  SELECT get_total_contract_count(contract_uuid) INTO contract_count;
  
  -- 5. Construir estado completo
  RETURN jsonb_build_object(
    'contract_id', contract_uuid,
    'is_terminated', COALESCE(is_terminated, FALSE),
    'cargo_actual', latest_cargo,
    'economic_state', economic_state,
    'personal_data', personal_data,
    'entities', entities_data,
    'beneficiaries', beneficiaries_data,
    'contract_history', contract_count,
    'last_updated', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 7. FUNCIÓN: validate_prorroga_legal (DESHABILITADA)
-- Trigger function para validar prórroga legal
-- NOTA: Implementación futura - por ahora solo la función de cálculo
-- ===============================================

-- La función get_total_contract_count() ya permite validar manualmente
-- cuando sea necesario implementar alertas automáticas

-- ===============================================
-- 8. FUNCIÓN: get_novedades_summary_by_contract
-- Resumen de todas las novedades de un contrato
-- ===============================================

CREATE OR REPLACE FUNCTION get_novedades_summary_by_contract(contract_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'contract_id', contract_uuid,
    'datos_personales', (
      SELECT COUNT(*) FROM novedades_datos_personales 
      WHERE contract_id = contract_uuid
    ),
    'cambios_cargo', (
      SELECT COUNT(*) FROM novedades_cambio_cargo 
      WHERE contract_id = contract_uuid
    ),
    'cambios_entidades', (
      SELECT COUNT(*) FROM novedades_entidades 
      WHERE contract_id = contract_uuid
    ),
    'cambios_economicos', (
      SELECT COUNT(*) FROM novedades_economicas 
      WHERE contract_id = contract_uuid
    ),
    'tiempo_laboral', (
      SELECT COUNT(*) FROM novedades_tiempo_laboral 
      WHERE contract_id = contract_uuid
    ),
    'incapacidades', (
      SELECT COUNT(*) FROM novedades_incapacidad 
      WHERE contract_id = contract_uuid
    ),
    'cambios_beneficiarios', (
      SELECT COUNT(*) FROM novedades_beneficiarios 
      WHERE contract_id = contract_uuid
    ),
    'terminaciones', (
      SELECT COUNT(*) FROM novedades_terminacion 
      WHERE contract_id = contract_uuid
    ),
    'historial_previo', (
      SELECT COUNT(*) FROM historial_contratos_fijos 
      WHERE contract_id = contract_uuid
    ),
    'total_novedades', (
      SELECT 
        COALESCE(
          (SELECT COUNT(*) FROM novedades_datos_personales WHERE contract_id = contract_uuid), 0
        ) +
        COALESCE(
          (SELECT COUNT(*) FROM novedades_cambio_cargo WHERE contract_id = contract_uuid), 0
        ) +
        COALESCE(
          (SELECT COUNT(*) FROM novedades_entidades WHERE contract_id = contract_uuid), 0
        ) +
        COALESCE(
          (SELECT COUNT(*) FROM novedades_economicas WHERE contract_id = contract_uuid), 0
        ) +
        COALESCE(
          (SELECT COUNT(*) FROM novedades_tiempo_laboral WHERE contract_id = contract_uuid), 0
        ) +
        COALESCE(
          (SELECT COUNT(*) FROM novedades_incapacidad WHERE contract_id = contract_uuid), 0
        ) +
        COALESCE(
          (SELECT COUNT(*) FROM novedades_beneficiarios WHERE contract_id = contract_uuid), 0
        ) +
        COALESCE(
          (SELECT COUNT(*) FROM novedades_terminacion WHERE contract_id = contract_uuid), 0
        )
    )
  ) INTO summary;
  
  RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 9. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

COMMENT ON FUNCTION get_total_contract_count IS 'Calcula el total de contratos fijos incluyendo historial previo para validación legal colombiana';
COMMENT ON FUNCTION get_contract_current_economic_state IS 'Obtiene el estado económico actual de un contrato aplicando todas las novedades';
COMMENT ON FUNCTION get_contract_current_personal_data IS 'Obtiene los datos personales actuales de un contrato';
COMMENT ON FUNCTION get_contract_current_entities IS 'Obtiene las entidades actuales (EPS, Pensión, Cesantías) de un contrato';
COMMENT ON FUNCTION get_contract_current_beneficiaries IS 'Obtiene los beneficiarios actuales de un contrato';
COMMENT ON FUNCTION get_contract_full_current_state IS 'Obtiene el estado completo actual de un contrato incluyendo todas las novedades';
-- COMMENT ON FUNCTION validate_prorroga_legal IS 'Función trigger deshabilitada - implementación futura';
COMMENT ON FUNCTION get_novedades_summary_by_contract IS 'Obtiene un resumen de todas las novedades de un contrato específico';

-- ===============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===============================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  -- Contar funciones creadas
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname LIKE '%contract%' 
  AND p.proname LIKE '%novedad%' OR p.proname LIKE '%total_contract_count%';
  
  IF function_count >= 6 THEN
    RAISE NOTICE 'SUCCESS: Funciones helper de novedades creadas correctamente (% funciones)', function_count;
  ELSE
    RAISE NOTICE 'INFO: Funciones helper creadas (% funciones)', function_count;
  END IF;

  -- Trigger de prórroga deshabilitado intencionalmente
  RAISE NOTICE 'INFO: Trigger de validación de prórroga deshabilitado (implementación futura)';
  
  RAISE NOTICE 'MIGRACIÓN FUNCIONES COMPLETADA: Funciones helper para sistema de novedades implementadas';
END;
$$;
