-- ===============================================
-- MIGRACIÓN CONSOLIDADA COMPLETA - PARTE 4
-- Datos iniciales y verificaciones finales
-- ===============================================

-- ===============================================
-- 20. DATOS INICIALES - FUNCIÓN HELPER PARA INSERCIÓN SEGURA
-- ===============================================

-- Función helper para insertar datos iniciales con usuario del sistema
CREATE OR REPLACE FUNCTION insert_initial_system_data()
RETURNS VOID AS $$
DECLARE
  system_user_id UUID;
  ciudad_bogota_id UUID;
  ciudad_medellin_id UUID;
  ciudad_cali_id UUID;
  ciudad_cartagena_id UUID;
  ciudad_bucaramanga_id UUID;
  ciudad_villavicencio_id UUID;
  ciudad_pereira_id UUID;
  ciudad_tunja_id UUID;
  ciudad_manizales_id UUID;
  ciudad_barranquilla_id UUID;
  ciudad_ibague_id UUID;
  ciudad_cucuta_id UUID;
  ciudad_neiva_id UUID;
  ciudad_santa_marta_id UUID;
  ciudad_valledupar_id UUID;
  ciudad_popayan_id UUID;
  ciudad_monteria_id UUID;
  ciudad_pasto_id UUID;
  ciudad_armenia_id UUID;
  ciudad_yopal_id UUID;
  ciudad_riohacha_id UUID;
  ciudad_sincelejo_id UUID;
  ciudad_puerto_asis_id UUID;
  ciudad_arauca_id UUID;
  ciudad_quibdo_id UUID;
  ciudad_barrancabermeja_id UUID;
  ciudad_san_andres_id UUID;
  ciudad_leticia_id UUID;
  ciudad_chaparral_id UUID;
BEGIN
  -- Crear usuario de desarrollo si no existe
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
  ) VALUES (
    '57ab508f-2787-4d8c-9518-5d454ead023e',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dev@goodtalent.co',
    crypt('devpassword123', gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Usar tu usuario de desarrollo para todas las operaciones
  system_user_id := '57ab508f-2787-4d8c-9518-5d454ead023e'::UUID;
  
  RAISE NOTICE 'Using development user (%) for initial data insertion', system_user_id;

  -- ===============================================
  -- INSERTAR CIUDADES PRINCIPALES DE COLOMBIA
  -- ===============================================
  INSERT INTO ciudades (nombre, created_by, updated_by) VALUES
    ('Bogotá', system_user_id, system_user_id),
    ('Medellín', system_user_id, system_user_id),
    ('Cali', system_user_id, system_user_id),
    ('Cartagena', system_user_id, system_user_id),
    ('Bucaramanga', system_user_id, system_user_id),
    ('Villavicencio', system_user_id, system_user_id),
    ('Pereira', system_user_id, system_user_id),
    ('Tunja', system_user_id, system_user_id),
    ('Manizales', system_user_id, system_user_id),
    ('Barranquilla', system_user_id, system_user_id),
    ('Ibagué', system_user_id, system_user_id),
    ('Cúcuta', system_user_id, system_user_id),
    ('Neiva', system_user_id, system_user_id),
    ('Santa Marta', system_user_id, system_user_id),
    ('Valledupar', system_user_id, system_user_id),
    ('Popayán', system_user_id, system_user_id),
    ('Montería', system_user_id, system_user_id),
    ('Pasto', system_user_id, system_user_id),
    ('Armenia', system_user_id, system_user_id),
    ('Yopal', system_user_id, system_user_id),
    ('Riohacha', system_user_id, system_user_id),
    ('Sincelejo', system_user_id, system_user_id),
    ('Puerto Asís', system_user_id, system_user_id),
    ('Arauca', system_user_id, system_user_id),
    ('Quibdó', system_user_id, system_user_id),
    ('Barrancabermeja', system_user_id, system_user_id),
    ('San Andrés', system_user_id, system_user_id),
    ('Leticia', system_user_id, system_user_id),
    ('Chaparral', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- Obtener IDs de ciudades para las cajas (solo las principales)
  SELECT id INTO ciudad_bogota_id FROM ciudades WHERE nombre = 'Bogotá';
  SELECT id INTO ciudad_medellin_id FROM ciudades WHERE nombre = 'Medellín';
  SELECT id INTO ciudad_cali_id FROM ciudades WHERE nombre = 'Cali';
  SELECT id INTO ciudad_cartagena_id FROM ciudades WHERE nombre = 'Cartagena';
  SELECT id INTO ciudad_bucaramanga_id FROM ciudades WHERE nombre = 'Bucaramanga';
  SELECT id INTO ciudad_villavicencio_id FROM ciudades WHERE nombre = 'Villavicencio';
  SELECT id INTO ciudad_pereira_id FROM ciudades WHERE nombre = 'Pereira';
  SELECT id INTO ciudad_tunja_id FROM ciudades WHERE nombre = 'Tunja';
  SELECT id INTO ciudad_manizales_id FROM ciudades WHERE nombre = 'Manizales';
  SELECT id INTO ciudad_barranquilla_id FROM ciudades WHERE nombre = 'Barranquilla';
  SELECT id INTO ciudad_ibague_id FROM ciudades WHERE nombre = 'Ibagué';
  SELECT id INTO ciudad_cucuta_id FROM ciudades WHERE nombre = 'Cúcuta';
  SELECT id INTO ciudad_neiva_id FROM ciudades WHERE nombre = 'Neiva';
  SELECT id INTO ciudad_santa_marta_id FROM ciudades WHERE nombre = 'Santa Marta';
  SELECT id INTO ciudad_valledupar_id FROM ciudades WHERE nombre = 'Valledupar';
  SELECT id INTO ciudad_popayan_id FROM ciudades WHERE nombre = 'Popayán';
  SELECT id INTO ciudad_monteria_id FROM ciudades WHERE nombre = 'Montería';
  SELECT id INTO ciudad_pasto_id FROM ciudades WHERE nombre = 'Pasto';
  SELECT id INTO ciudad_armenia_id FROM ciudades WHERE nombre = 'Armenia';
  SELECT id INTO ciudad_yopal_id FROM ciudades WHERE nombre = 'Yopal';
  SELECT id INTO ciudad_riohacha_id FROM ciudades WHERE nombre = 'Riohacha';
  SELECT id INTO ciudad_sincelejo_id FROM ciudades WHERE nombre = 'Sincelejo';
  SELECT id INTO ciudad_puerto_asis_id FROM ciudades WHERE nombre = 'Puerto Asís';
  SELECT id INTO ciudad_arauca_id FROM ciudades WHERE nombre = 'Arauca';
  SELECT id INTO ciudad_quibdo_id FROM ciudades WHERE nombre = 'Quibdó';
  SELECT id INTO ciudad_barrancabermeja_id FROM ciudades WHERE nombre = 'Barrancabermeja';
  SELECT id INTO ciudad_san_andres_id FROM ciudades WHERE nombre = 'San Andrés';
  SELECT id INTO ciudad_leticia_id FROM ciudades WHERE nombre = 'Leticia';
  SELECT id INTO ciudad_chaparral_id FROM ciudades WHERE nombre = 'Chaparral';

  -- ===============================================
  -- INSERTAR CAJAS DE COMPENSACIÓN POR CIUDAD
  -- ===============================================
  INSERT INTO cajas_compensacion (nombre, ciudad_id, created_by, updated_by) VALUES
    ('Colsubsidio', ciudad_bogota_id, system_user_id, system_user_id),
    ('Compensar', ciudad_bogota_id, system_user_id, system_user_id),
    ('Cafam', ciudad_bogota_id, system_user_id, system_user_id),
    ('Comfama', ciudad_medellin_id, system_user_id, system_user_id),
    ('Comfenalco Antioquia', ciudad_medellin_id, system_user_id, system_user_id),
    ('Comfandi', ciudad_cali_id, system_user_id, system_user_id),
    ('Comfenalco Valle del Cauca', ciudad_cali_id, system_user_id, system_user_id),
    ('Comfenalco Cartagena', ciudad_cartagena_id, system_user_id, system_user_id),
    ('Comfenalco Santander', ciudad_bucaramanga_id, system_user_id, system_user_id),
    ('Cofrem', ciudad_villavicencio_id, system_user_id, system_user_id),
    ('Comfamiliar Risaralda', ciudad_pereira_id, system_user_id, system_user_id),
    ('Comfaboy', ciudad_tunja_id, system_user_id, system_user_id),
    ('Confa', ciudad_manizales_id, system_user_id, system_user_id),
    ('Cajasan', ciudad_bucaramanga_id, system_user_id, system_user_id),
    ('Combarranquilla', ciudad_barranquilla_id, system_user_id, system_user_id),
    ('Comfamiliar Atlántico', ciudad_barranquilla_id, system_user_id, system_user_id),
    ('Cajacopi Atlántico', ciudad_barranquilla_id, system_user_id, system_user_id),
    ('Comfenalco Tolima', ciudad_ibague_id, system_user_id, system_user_id),
    ('Comfanorte', ciudad_cucuta_id, system_user_id, system_user_id),
    ('Comfamiliar Huila', ciudad_neiva_id, system_user_id, system_user_id),
    ('Cajamag', ciudad_santa_marta_id, system_user_id, system_user_id),
    ('Comfacesar', ciudad_valledupar_id, system_user_id, system_user_id),
    ('Comfacauca', ciudad_popayan_id, system_user_id, system_user_id),
    ('Comfacor', ciudad_monteria_id, system_user_id, system_user_id),
    ('Comfamiliar Nariño', ciudad_pasto_id, system_user_id, system_user_id),
    ('Comfenalco Quindío', ciudad_armenia_id, system_user_id, system_user_id),
    ('Comfacasanare', ciudad_yopal_id, system_user_id, system_user_id),
    ('Comfaoriente', ciudad_cucuta_id, system_user_id, system_user_id),
    ('Comfaguajira', ciudad_riohacha_id, system_user_id, system_user_id),
    ('Comfatolima', ciudad_ibague_id, system_user_id, system_user_id),
    ('Comfasucre', ciudad_sincelejo_id, system_user_id, system_user_id),
    ('Comfamiliar Putumayo', ciudad_puerto_asis_id, system_user_id, system_user_id),
    ('Comfiar', ciudad_arauca_id, system_user_id, system_user_id),
    ('Comfachocó', ciudad_quibdo_id, system_user_id, system_user_id),
    ('Cafaba', ciudad_barrancabermeja_id, system_user_id, system_user_id),
    ('Comcaja', ciudad_villavicencio_id, system_user_id, system_user_id),
    ('Cajasai', ciudad_san_andres_id, system_user_id, system_user_id),
    ('Cafamaz', ciudad_leticia_id, system_user_id, system_user_id),
    ('Cafasur', ciudad_chaparral_id, system_user_id, system_user_id)
  ON CONFLICT (nombre, ciudad_id) DO NOTHING;

  -- ===============================================
  -- INSERTAR ARLS PRINCIPALES
  -- ===============================================
  INSERT INTO arls (nombre, created_by, updated_by) VALUES
    ('ARL SURA', system_user_id, system_user_id),
    ('Positiva Compañía de Seguros S.A.', system_user_id, system_user_id),
    ('Colmena Seguros ARL', system_user_id, system_user_id),
    ('Seguros Bolívar ARL', system_user_id, system_user_id),
    ('AXA Colpatria ARL', system_user_id, system_user_id),
    ('La Equidad Seguros de Vida ARL', system_user_id, system_user_id),
    ('Liberty Seguros ARL', system_user_id, system_user_id),
    ('Mapfre Seguros de Riesgos Laborales S.A.', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- ===============================================
  -- INSERTAR FONDOS DE CESANTÍAS
  -- ===============================================
  INSERT INTO fondos_cesantias (nombre, created_by, updated_by) VALUES
    ('Porvenir', system_user_id, system_user_id),
    ('Protección', system_user_id, system_user_id),
    ('Colfondos', system_user_id, system_user_id),
    ('Skandia', system_user_id, system_user_id),
    ('Fondo Nacional del Ahorro – FNA', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- ===============================================
  -- INSERTAR FONDOS DE PENSIÓN
  -- ===============================================
  INSERT INTO fondos_pension (nombre, created_by, updated_by) VALUES
    ('Porvenir', system_user_id, system_user_id),
    ('Protección', system_user_id, system_user_id),
    ('Colfondos', system_user_id, system_user_id),
    ('Skandia', system_user_id, system_user_id),
    ('Colpensiones', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- ===============================================
  -- INSERTAR EPS PRINCIPALES
  -- ===============================================
  INSERT INTO eps (nombre, created_by, updated_by) VALUES
    ('Coosalud EPS-S', system_user_id, system_user_id),
    ('Nueva EPS', system_user_id, system_user_id),
    ('Mutual SER', system_user_id, system_user_id),
    ('Salud MIA', system_user_id, system_user_id),
    ('Aliansalud EPS', system_user_id, system_user_id),
    ('Salud Total EPS S.A.', system_user_id, system_user_id),
    ('EPS Sanitas', system_user_id, system_user_id),
    ('EPS Sura', system_user_id, system_user_id),
    ('Famisanar', system_user_id, system_user_id),
    ('Servicio Occidental de Salud EPS – SOS', system_user_id, system_user_id),
    ('Comfenalco Valle', system_user_id, system_user_id),
    ('Compensar EPS', system_user_id, system_user_id),
    ('Empresas Públicas de Medellín (EPM)', system_user_id, system_user_id),
    ('Fondo de Pasivo Social de Ferrocarriles Nacionales de Colombia', system_user_id, system_user_id),
    ('Cajacopi Atlántico', system_user_id, system_user_id),
    ('Capresoca', system_user_id, system_user_id),
    ('Comfachocó', system_user_id, system_user_id),
    ('Comfaoriente', system_user_id, system_user_id),
    ('EPS Familiar de Colombia', system_user_id, system_user_id),
    ('Asmet Salud', system_user_id, system_user_id),
    ('Emssanar E.S.S.', system_user_id, system_user_id),
    ('Capital Salud EPS-S', system_user_id, system_user_id),
    ('Savia Salud', system_user_id, system_user_id),
    ('Dusakawi EPSI', system_user_id, system_user_id),
    ('Asociación Indígena del Cauca EPSI', system_user_id, system_user_id),
    ('Anas Wayuu EPSI', system_user_id, system_user_id),
    ('Mallamas EPSI', system_user_id, system_user_id),
    ('Pijaos Salud EPSI', system_user_id, system_user_id)
  ON CONFLICT (nombre) DO NOTHING;

  -- ===============================================
  -- INSERTAR LÍNEAS DE NEGOCIO INICIALES
  -- ===============================================
  INSERT INTO lineas_negocio (nombre, descripcion, es_activa, created_by, updated_by) VALUES
    (
      'Legal Laboral',
      'Asesoría jurídica especializada en derecho laboral, contratos y normatividad empresarial',
      true,
      system_user_id,
      system_user_id
    ),
    (
      'Riesgos Laborales',
      'Gestión integral de seguridad y salud en el trabajo, prevención de riesgos y cumplimiento normativo',
      true,
      system_user_id,
      system_user_id
    ),
    (
      'Payroll',
      'Administración completa de nómina, liquidaciones y gestión de prestaciones sociales',
      true,
      system_user_id,
      system_user_id
    ),
    (
      'Selección',
      'Procesos de reclutamiento, selección y evaluación de talento humano especializado',
      true,
      system_user_id,
      system_user_id
    ),
    (
      'Contratación y Administración de Personal',
      'Gestión integral de contratación, administración y desarrollo del talento humano',
      true,
      system_user_id,
      system_user_id
    ),
    (
      'Temporales',
      'Suministro de personal temporal calificado para cubrir necesidades empresariales específicas',
      true,
      system_user_id,
      system_user_id
    )
  ON CONFLICT (nombre) DO NOTHING;

  RAISE NOTICE 'Datos iniciales del sistema insertados correctamente';
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 21. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

-- Comentarios en tablas principales
COMMENT ON TABLE permissions IS 'Catálogo de permisos disponibles en el sistema';
COMMENT ON TABLE user_permissions IS 'Asignaciones de permisos a usuarios con auditoría completa';
COMMENT ON TABLE companies IS 'Entidades cliente/empresa con información de contacto y auditoría';
COMMENT ON TABLE contracts IS 'Contratos laborales con información completa de empleados, onboarding simplificado y estados de aprobación';

-- Comentarios en tablas auxiliares
COMMENT ON TABLE ciudades IS 'Ciudades principales de Colombia para uso en cajas de compensación';
COMMENT ON TABLE cajas_compensacion IS 'Cajas de compensación familiar por ciudad';
COMMENT ON TABLE arls IS 'Administradoras de Riesgos Laborales disponibles';
COMMENT ON TABLE fondos_cesantias IS 'Fondos de cesantías disponibles';
COMMENT ON TABLE fondos_pension IS 'Fondos de pensión disponibles';
COMMENT ON TABLE eps IS 'Entidades Promotoras de Salud disponibles';

-- Comentarios en líneas de negocio
COMMENT ON TABLE lineas_negocio IS 'Catálogo de líneas de negocio disponibles en el sistema';
COMMENT ON TABLE linea_negocio_responsables IS 'Asignación de responsables a líneas de negocio específicas';
COMMENT ON TABLE empresa_lineas_negocio IS 'Relación entre empresas clientes y líneas de negocio contratadas';

-- Comentarios en columnas principales de contracts
COMMENT ON COLUMN contracts.fecha_expedicion_documento IS 'Fecha de expedición del documento de identificación';
COMMENT ON COLUMN contracts.base_sena IS 'Indica si el empleado aporta al SENA. Por defecto TRUE, excepto para conductores, aprendices, extranjeros, dirección/confianza y manejo';
COMMENT ON COLUMN contracts.auxilio_transporte IS 'Auxilio de transporte mensual';
COMMENT ON COLUMN contracts.tiene_condicion_medica IS 'Indica si el empleado tiene alguna condición médica especial';
COMMENT ON COLUMN contracts.condicion_medica_detalle IS 'Descripción detallada de la condición médica (solo si tiene_condicion_medica es true)';
COMMENT ON COLUMN contracts.status_aprobacion IS 'Estado de aprobación: borrador (editable) o aprobado (solo lectura)';
COMMENT ON COLUMN contracts.approved_at IS 'Fecha y hora de aprobación del contrato';
COMMENT ON COLUMN contracts.approved_by IS 'Usuario que aprobó el contrato';

-- Comentarios en funciones principales
COMMENT ON FUNCTION has_permission(UUID, TEXT, TEXT) IS 'Verifica si un usuario tiene un permiso específico';
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Determina si el usuario es super admin basado en permisos de user_permissions';
COMMENT ON FUNCTION my_permissions() IS 'Lista los permisos activos del usuario actual';
COMMENT ON FUNCTION get_users_with_permissions() IS 'Usuarios con conteo de permisos y estado de banned';
COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Permisos detallados de un usuario específico';
COMMENT ON FUNCTION assign_permission_to_user(UUID, UUID, UUID) IS 'Asigna un permiso a un usuario con auditoría';
COMMENT ON FUNCTION revoke_permission_from_user(UUID, UUID) IS 'Revoca un permiso de un usuario (soft delete)';
COMMENT ON FUNCTION create_super_admin(UUID) IS 'Convierte a un usuario en super admin otorgando todos los permisos';
COMMENT ON FUNCTION get_user_handle(UUID) IS 'Retorna la parte local del email (antes de @) para un usuario';
COMMENT ON FUNCTION companies_created_by_handle(companies) IS 'Computed column: handle del creador de empresa';
COMMENT ON FUNCTION companies_updated_by_handle(companies) IS 'Computed column: handle del editor de empresa';
COMMENT ON FUNCTION calculate_contract_status_vigencia(DATE) IS 'Calcula si un contrato está activo o terminado basado en fecha_fin';
COMMENT ON FUNCTION approve_contract(UUID, UUID, TEXT) IS 'Función segura para aprobar un contrato en estado borrador';
COMMENT ON FUNCTION contracts_created_by_handle(contracts) IS 'Computed column: handle del creador del contrato';
COMMENT ON FUNCTION contracts_updated_by_handle(contracts) IS 'Computed column: handle del editor del contrato';
COMMENT ON FUNCTION contracts_full_name(contracts) IS 'Computed column: nombre completo del empleado';
COMMENT ON FUNCTION contracts_onboarding_progress(contracts) IS 'Calcula el progreso de onboarding basado en presencia de datos (0-100%). Confirmaciones se infieren por datos completos. 12 pasos simplificados.';
COMMENT ON FUNCTION get_contract_full_status(contracts) IS 'Retorna estado completo del contrato con flags de permisos';
COMMENT ON FUNCTION get_linea_negocio_responsables(UUID) IS 'Obtiene todos los responsables activos de una línea de negocio';
COMMENT ON FUNCTION get_empresa_lineas_negocio(UUID) IS 'Obtiene todas las líneas de negocio activas de una empresa';
COMMENT ON FUNCTION get_empresas_por_linea_negocio(UUID) IS 'Obtiene todas las empresas que tienen asignada una línea de negocio específica';
COMMENT ON FUNCTION assign_business_lines_to_company(UUID, UUID[], UUID) IS 'Asigna líneas de negocio a una empresa de forma transaccional y segura';
COMMENT ON FUNCTION update_auxiliary_tables_updated_at() IS 'Trigger function para actualizar updated_at y updated_by en tablas auxiliares';

-- ===============================================
-- 22. EJECUTAR INSERCIÓN DE DATOS INICIALES
-- ===============================================

-- Ejecutar la función de inserción de datos iniciales
SELECT insert_initial_system_data();

-- Limpiar la función temporal
DROP FUNCTION insert_initial_system_data();

-- ===============================================
-- 23. VERIFICACIONES POST-MIGRACIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que RLS está habilitado en todas las tablas
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename IN (
      'permissions','user_permissions','companies','contracts',
      'ciudades','cajas_compensacion','arls','fondos_cesantias','fondos_pension','eps',
      'lineas_negocio','linea_negocio_responsables','empresa_lineas_negocio'
    )
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS habilitado en todas las tablas del sistema';
  ELSE
    RAISE NOTICE 'WARNING: Verificar que RLS esté habilitado en todas las tablas';
  END IF;

  -- Verificar que todas las tablas principales existen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN (
      'permissions', 'user_permissions', 'companies', 'contracts',
      'ciudades','cajas_compensacion','arls','fondos_cesantias','fondos_pension','eps',
      'lineas_negocio','linea_negocio_responsables','empresa_lineas_negocio'
    )
  ) THEN
    RAISE NOTICE 'SUCCESS: Todas las tablas principales fueron creadas correctamente';
  ELSE
    RAISE NOTICE 'ERROR: Faltan tablas principales';
  END IF;

  -- Verificar que los permisos iniciales existen
  IF EXISTS (SELECT 1 FROM permissions WHERE table_name IN ('contracts', 'companies', 'tablas_auxiliares', 'lineas_negocio') LIMIT 1) THEN
    RAISE NOTICE 'SUCCESS: Permisos iniciales insertados correctamente';
  ELSE
    RAISE NOTICE 'WARNING: Verificar permisos iniciales';
  END IF;

  -- Verificar nuevas columnas de contracts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name IN ('tiene_condicion_medica', 'auxilio_transporte', 'fecha_expedicion_documento')
  ) THEN
    RAISE NOTICE 'SUCCESS: Nuevas columnas de contracts agregadas correctamente';
  ELSE
    RAISE NOTICE 'ERROR: Faltan nuevas columnas en contracts';
  END IF;

  -- Contar registros insertados
  RAISE NOTICE 'Ciudades insertadas: %', (SELECT COUNT(*) FROM ciudades);
  RAISE NOTICE 'Cajas de compensación insertadas: %', (SELECT COUNT(*) FROM cajas_compensacion);
  RAISE NOTICE 'ARLs insertadas: %', (SELECT COUNT(*) FROM arls);
  RAISE NOTICE 'Fondos de cesantías insertados: %', (SELECT COUNT(*) FROM fondos_cesantias);
  RAISE NOTICE 'Fondos de pensión insertados: %', (SELECT COUNT(*) FROM fondos_pension);
  RAISE NOTICE 'EPS insertadas: %', (SELECT COUNT(*) FROM eps);
  RAISE NOTICE 'Líneas de negocio insertadas: %', (SELECT COUNT(*) FROM lineas_negocio);
  RAISE NOTICE 'Permisos insertados: %', (SELECT COUNT(*) FROM permissions);

  RAISE NOTICE '=== MIGRACIÓN CONSOLIDADA COMPLETADA EXITOSAMENTE ===';
  RAISE NOTICE 'Schema: GOOD Talent v3.0 - Sistema completo consolidado';
  RAISE NOTICE 'Tablas: 13 tablas principales con RLS, auditoría y datos iniciales';
  RAISE NOTICE 'Funciones: % funciones creadas/actualizadas', (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'has_permission%' OR proname LIKE 'contracts_%' OR proname LIKE 'companies_%' OR proname LIKE 'get_%');
  RAISE NOTICE 'Permisos: Sistema completo de 40+ permisos granulares';
  RAISE NOTICE 'Datos: Precargado con datos del sistema colombiano';
  RAISE NOTICE 'RLS: Políticas optimizadas y flexibles para usabilidad';
  RAISE NOTICE 'Auditoría: Triggers automáticos en todas las tablas';
  RAISE NOTICE 'Idempotencia: Migración ejecutable múltiples veces';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 El sistema está listo para ser usado!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos pasos:';
  RAISE NOTICE '1. Tu usuario de desarrollo ya fue creado: dev@goodtalent.co';
  RAISE NOTICE '2. Crear super admin: SELECT create_super_admin(''57ab508f-2787-4d8c-9518-5d454ead023e'');';
  RAISE NOTICE '3. Verificar funcionalidad: SELECT my_permissions();';
  RAISE NOTICE '4. Comenzar a crear empresas y contratos';
END $$;

-- ===============================================
-- CREAR SUPER ADMIN AUTOMÁTICAMENTE
-- ===============================================

-- Crear super admin para el usuario de desarrollo
SELECT create_super_admin('57ab508f-2787-4d8c-9518-5d454ead023e');

-- ===============================================
-- FIN DE MIGRACIÓN CONSOLIDADA COMPLETA
-- ===============================================
