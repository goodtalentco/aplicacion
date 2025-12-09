-- ===============================================
-- MIGRACIÓN: Políticas RLS para Sistema de Novedades
-- Fecha: 2025-01-16
-- Descripción: Políticas de seguridad Row Level Security para novedades
-- ===============================================

-- ===============================================
-- POLÍTICAS RLS: novedades_datos_personales
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_datos_personales with view permission"
  ON novedades_datos_personales FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_datos_personales with create permission"
  ON novedades_datos_personales FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_datos_personales', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_datos_personales with edit permission"
  ON novedades_datos_personales FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_datos_personales', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: novedades_cambio_cargo
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_cambio_cargo with view permission"
  ON novedades_cambio_cargo FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_cambio_cargo with create permission"
  ON novedades_cambio_cargo FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_cambio_cargo', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_cambio_cargo with edit permission"
  ON novedades_cambio_cargo FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_cambio_cargo', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: novedades_entidades
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_entidades with view permission"
  ON novedades_entidades FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_entidades with create permission"
  ON novedades_entidades FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_entidades', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_entidades with edit permission"
  ON novedades_entidades FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_entidades', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: novedades_economicas
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_economicas with view permission"
  ON novedades_economicas FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_economicas with create permission"
  ON novedades_economicas FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_economicas', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_economicas with edit permission"
  ON novedades_economicas FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_economicas', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: novedades_tiempo_laboral
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_tiempo_laboral with view permission"
  ON novedades_tiempo_laboral FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_tiempo_laboral with create permission"
  ON novedades_tiempo_laboral FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_tiempo_laboral', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_tiempo_laboral with edit permission"
  ON novedades_tiempo_laboral FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_tiempo_laboral', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: novedades_incapacidad
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_incapacidad with view permission"
  ON novedades_incapacidad FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_incapacidad with create permission"
  ON novedades_incapacidad FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_incapacidad', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_incapacidad with edit permission"
  ON novedades_incapacidad FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_incapacidad', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: novedades_beneficiarios
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_beneficiarios with view permission"
  ON novedades_beneficiarios FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_beneficiarios with create permission"
  ON novedades_beneficiarios FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_beneficiarios', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_beneficiarios with edit permission"
  ON novedades_beneficiarios FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_beneficiarios', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: novedades_terminacion
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view novedades_terminacion with view permission"
  ON novedades_terminacion FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create novedades_terminacion with create permission"
  ON novedades_terminacion FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'novedades_terminacion', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update novedades_terminacion with edit permission"
  ON novedades_terminacion FOR UPDATE
  USING (has_permission(auth.uid(), 'novedades_terminacion', 'edit'));

-- ===============================================
-- POLÍTICAS RLS: historial_contratos_fijos
-- ===============================================

-- Ver: Solo con permiso universal de novedades
CREATE POLICY "Users can view historial_contratos_fijos with view permission"
  ON historial_contratos_fijos FOR SELECT
  USING (has_permission(auth.uid(), 'novedades', 'view'));

-- Crear: Solo con permiso específico
CREATE POLICY "Users can create historial_contratos_fijos with create permission"
  ON historial_contratos_fijos FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'historial_contratos_fijos', 'create'));

-- Editar: Solo con permiso específico
CREATE POLICY "Users can update historial_contratos_fijos with edit permission"
  ON historial_contratos_fijos FOR UPDATE
  USING (has_permission(auth.uid(), 'historial_contratos_fijos', 'edit'));

-- ===============================================
-- GRANTS PARA ROL AUTHENTICATED
-- Permisos básicos para usuarios autenticados
-- ===============================================

-- Grants para todas las tablas de novedades
GRANT SELECT, INSERT, UPDATE ON novedades_datos_personales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON novedades_cambio_cargo TO authenticated;
GRANT SELECT, INSERT, UPDATE ON novedades_entidades TO authenticated;
GRANT SELECT, INSERT, UPDATE ON novedades_economicas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON novedades_tiempo_laboral TO authenticated;
GRANT SELECT, INSERT, UPDATE ON novedades_incapacidad TO authenticated;
GRANT SELECT, INSERT, UPDATE ON novedades_beneficiarios TO authenticated;
GRANT SELECT, INSERT, UPDATE ON novedades_terminacion TO authenticated;
GRANT SELECT, INSERT, UPDATE ON historial_contratos_fijos TO authenticated;

-- Grants para secuencias (necesario para INSERT)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ===============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Contar políticas RLS creadas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename LIKE 'novedades_%' OR tablename = 'historial_contratos_fijos';
  
  IF policy_count >= 27 THEN  -- 3 políticas por tabla × 9 tablas = 27
    RAISE NOTICE 'SUCCESS: Políticas RLS creadas correctamente (% políticas)', policy_count;
  ELSE
    RAISE NOTICE 'WARNING: Número de políticas RLS menor al esperado (% políticas)', policy_count;
  END IF;

  -- Verificar que RLS está habilitado
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename LIKE 'novedades_%' OR tablename = 'historial_contratos_fijos'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS habilitado en todas las tablas de novedades';
  ELSE
    RAISE NOTICE 'WARNING: Verificar que RLS esté habilitado en todas las tablas';
  END IF;
  
  RAISE NOTICE 'MIGRACIÓN RLS COMPLETADA: Políticas de seguridad para novedades implementadas';
END;
$$;
