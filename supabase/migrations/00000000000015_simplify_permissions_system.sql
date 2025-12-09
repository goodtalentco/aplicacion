-- ===============================================
-- MIGRACIÓN: Simplificación del Sistema de Permisos
-- Fecha: 2025-01-17
-- Descripción: Elimina permisos redundantes y simplifica la lógica
-- ===============================================

-- ===============================================
-- 1. ELIMINAR PERMISOS REDUNDANTES
-- ===============================================

-- Eliminar permiso redundante de novedades (todos pueden leer si ven contratos)
-- Este permiso fue insertado en 00000000000010_add_novedades_system.sql línea 431
DELETE FROM permissions 
WHERE table_name = 'novedades' AND action = 'view';

-- Eliminar permisos redundantes de empresa_arls (heredan de companies)
-- Estos permisos fueron insertados en 00000000000004_add_empresa_arls_cajas.sql líneas 14-17
DELETE FROM permissions 
WHERE table_name = 'empresa_arls' AND action IN ('view', 'create', 'edit', 'delete');

-- Eliminar permisos redundantes de empresa_cajas_compensacion (heredan de companies)
-- Estos permisos fueron insertados en 00000000000004_add_empresa_arls_cajas.sql líneas 20-23
DELETE FROM permissions 
WHERE table_name = 'empresa_cajas_compensacion' AND action IN ('view', 'create', 'edit', 'delete');

-- Eliminar permisos redundantes de user_permissions (heredan de permissions)
-- Estos permisos fueron insertados en 00000000000002_initial_complete_schema_part3.sql líneas 298-301
DELETE FROM permissions 
WHERE table_name = 'user_permissions' AND action IN ('view', 'create', 'edit', 'delete');

-- Eliminar permisos específicos de historial_contratos_fijos (heredarán de contracts)
-- Estos permisos fueron insertados en 00000000000010_add_novedades_system.sql líneas 427-428
DELETE FROM permissions 
WHERE table_name = 'historial_contratos_fijos' AND action IN ('create', 'edit');

-- ===============================================
-- 2. ACTUALIZAR POLÍTICAS RLS - NOVEDADES
-- ===============================================

-- Actualizar políticas de SELECT para todas las tablas de novedades
-- Cambiar de permiso específico 'novedades.view' a permiso base 'contracts.view'

DROP POLICY IF EXISTS "Users can view novedades_datos_personales with view permission" ON novedades_datos_personales;
DROP POLICY IF EXISTS "Users can view novedades_datos_personales with contracts view permission" ON novedades_datos_personales;
CREATE POLICY "Users can view novedades_datos_personales with contracts view permission"
  ON novedades_datos_personales FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

DROP POLICY IF EXISTS "Users can view novedades_cambio_cargo with view permission" ON novedades_cambio_cargo;
DROP POLICY IF EXISTS "Users can view novedades_cambio_cargo with contracts view permission" ON novedades_cambio_cargo;
CREATE POLICY "Users can view novedades_cambio_cargo with contracts view permission"
  ON novedades_cambio_cargo FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

DROP POLICY IF EXISTS "Users can view novedades_entidades with view permission" ON novedades_entidades;
DROP POLICY IF EXISTS "Users can view novedades_entidades with contracts view permission" ON novedades_entidades;
CREATE POLICY "Users can view novedades_entidades with contracts view permission"
  ON novedades_entidades FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

DROP POLICY IF EXISTS "Users can view novedades_economicas with view permission" ON novedades_economicas;
DROP POLICY IF EXISTS "Users can view novedades_economicas with contracts view permission" ON novedades_economicas;
CREATE POLICY "Users can view novedades_economicas with contracts view permission"
  ON novedades_economicas FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

DROP POLICY IF EXISTS "Users can view novedades_tiempo_laboral with view permission" ON novedades_tiempo_laboral;
DROP POLICY IF EXISTS "Users can view novedades_tiempo_laboral with contracts view permission" ON novedades_tiempo_laboral;
CREATE POLICY "Users can view novedades_tiempo_laboral with contracts view permission"
  ON novedades_tiempo_laboral FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

DROP POLICY IF EXISTS "Users can view novedades_incapacidad with view permission" ON novedades_incapacidad;
DROP POLICY IF EXISTS "Users can view novedades_incapacidad with contracts view permission" ON novedades_incapacidad;
CREATE POLICY "Users can view novedades_incapacidad with contracts view permission"
  ON novedades_incapacidad FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

DROP POLICY IF EXISTS "Users can view novedades_beneficiarios with view permission" ON novedades_beneficiarios;
DROP POLICY IF EXISTS "Users can view novedades_beneficiarios with contracts view permission" ON novedades_beneficiarios;
CREATE POLICY "Users can view novedades_beneficiarios with contracts view permission"
  ON novedades_beneficiarios FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

DROP POLICY IF EXISTS "Users can view novedades_terminacion with view permission" ON novedades_terminacion;
DROP POLICY IF EXISTS "Users can view novedades_terminacion with contracts view permission" ON novedades_terminacion;
CREATE POLICY "Users can view novedades_terminacion with contracts view permission"
  ON novedades_terminacion FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

-- ===============================================
-- 3. ACTUALIZAR POLÍTICAS RLS - HISTORIAL CONTRATOS FIJOS
-- ===============================================

-- Actualizar historial_contratos_fijos para heredar de contracts
-- La política de view usaba 'novedades.view' que acabamos de eliminar
DROP POLICY IF EXISTS "Users can view historial_contratos_fijos with view permission" ON historial_contratos_fijos;
DROP POLICY IF EXISTS "Users can view historial_contratos_fijos with contracts view permission" ON historial_contratos_fijos;
CREATE POLICY "Users can view historial_contratos_fijos with contracts view permission"
  ON historial_contratos_fijos FOR SELECT
  USING (has_permission(auth.uid(), 'contracts', 'view'));

-- Actualizar create y edit para usar contracts en lugar de historial_contratos_fijos específico
DROP POLICY IF EXISTS "Users can create historial_contratos_fijos with create permission" ON historial_contratos_fijos;
DROP POLICY IF EXISTS "Users can create historial_contratos_fijos with contracts create permission" ON historial_contratos_fijos;
CREATE POLICY "Users can create historial_contratos_fijos with contracts create permission"
  ON historial_contratos_fijos FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'contracts', 'create'));

DROP POLICY IF EXISTS "Users can update historial_contratos_fijos with edit permission" ON historial_contratos_fijos;
DROP POLICY IF EXISTS "Users can update historial_contratos_fijos with contracts edit permission" ON historial_contratos_fijos;
CREATE POLICY "Users can update historial_contratos_fijos with contracts edit permission"
  ON historial_contratos_fijos FOR UPDATE
  USING (has_permission(auth.uid(), 'contracts', 'edit'));

-- ===============================================
-- 4. ACTUALIZAR POLÍTICAS RLS - EMPRESA ARLS
-- ===============================================

-- Actualizar empresa_arls para heredar de companies
-- Limpiar todas las políticas existentes primero
DROP POLICY IF EXISTS "Users can view empresa_arls" ON empresa_arls;
DROP POLICY IF EXISTS "Users can view empresa_arls with companies view permission" ON empresa_arls;
DROP POLICY IF EXISTS "Users can create empresa_arls" ON empresa_arls;
DROP POLICY IF EXISTS "Users can create empresa_arls with companies edit permission" ON empresa_arls;
DROP POLICY IF EXISTS "Users can update empresa_arls" ON empresa_arls;
DROP POLICY IF EXISTS "Users can update empresa_arls with companies edit permission" ON empresa_arls;
DROP POLICY IF EXISTS "Users can delete empresa_arls" ON empresa_arls;
DROP POLICY IF EXISTS "Users can delete empresa_arls with companies edit permission" ON empresa_arls;

-- Crear nuevas políticas
CREATE POLICY "Users can view empresa_arls with companies view permission"
  ON empresa_arls FOR SELECT
  USING (has_permission(auth.uid(), 'companies', 'view'));

CREATE POLICY "Users can create empresa_arls with companies edit permission"
  ON empresa_arls FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'companies', 'edit'));

CREATE POLICY "Users can update empresa_arls with companies edit permission"
  ON empresa_arls FOR UPDATE
  USING (has_permission(auth.uid(), 'companies', 'edit'));

CREATE POLICY "Users can delete empresa_arls with companies edit permission"
  ON empresa_arls FOR DELETE
  USING (has_permission(auth.uid(), 'companies', 'edit'));

-- ===============================================
-- 5. ACTUALIZAR POLÍTICAS RLS - EMPRESA CAJAS COMPENSACION
-- ===============================================

-- Actualizar empresa_cajas_compensacion para heredar de companies
-- Limpiar todas las políticas existentes primero
DROP POLICY IF EXISTS "Users can view empresa_cajas_compensacion" ON empresa_cajas_compensacion;
DROP POLICY IF EXISTS "Users can view empresa_cajas_compensacion with companies view permission" ON empresa_cajas_compensacion;
DROP POLICY IF EXISTS "Users can create empresa_cajas_compensacion" ON empresa_cajas_compensacion;
DROP POLICY IF EXISTS "Users can create empresa_cajas_compensacion with companies edit permission" ON empresa_cajas_compensacion;
DROP POLICY IF EXISTS "Users can update empresa_cajas_compensacion" ON empresa_cajas_compensacion;
DROP POLICY IF EXISTS "Users can update empresa_cajas_compensacion with companies edit permission" ON empresa_cajas_compensacion;
DROP POLICY IF EXISTS "Users can delete empresa_cajas_compensacion" ON empresa_cajas_compensacion;
DROP POLICY IF EXISTS "Users can delete empresa_cajas_compensacion with companies edit permission" ON empresa_cajas_compensacion;

-- Crear nuevas políticas
CREATE POLICY "Users can view empresa_cajas_compensacion with companies view permission"
  ON empresa_cajas_compensacion FOR SELECT
  USING (has_permission(auth.uid(), 'companies', 'view'));

CREATE POLICY "Users can create empresa_cajas_compensacion with companies edit permission"
  ON empresa_cajas_compensacion FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'companies', 'edit'));

CREATE POLICY "Users can update empresa_cajas_compensacion with companies edit permission"
  ON empresa_cajas_compensacion FOR UPDATE
  USING (has_permission(auth.uid(), 'companies', 'edit'));

CREATE POLICY "Users can delete empresa_cajas_compensacion with companies edit permission"
  ON empresa_cajas_compensacion FOR DELETE
  USING (has_permission(auth.uid(), 'companies', 'edit'));

-- ===============================================
-- 6. VERIFICACIÓN POST-MIGRACIÓN
-- ===============================================

DO $$
DECLARE
  permissions_count INTEGER;
  policies_count INTEGER;
  rec RECORD;
BEGIN
  -- Verificar que se eliminaron los permisos redundantes
  SELECT COUNT(*) INTO permissions_count
  FROM permissions 
  WHERE (table_name = 'novedades' AND action = 'view')
     OR (table_name = 'empresa_arls' AND action IN ('view', 'create', 'edit', 'delete'))
     OR (table_name = 'empresa_cajas_compensacion' AND action IN ('view', 'create', 'edit', 'delete'))
     OR (table_name = 'user_permissions' AND action IN ('view', 'create', 'edit', 'delete'))
     OR (table_name = 'historial_contratos_fijos' AND action IN ('create', 'edit'));
  
  IF permissions_count = 0 THEN
    RAISE NOTICE 'SUCCESS: Permisos redundantes eliminados correctamente';
  ELSE
    RAISE NOTICE 'WARNING: Aún quedan % permisos redundantes', permissions_count;
  END IF;

  -- Verificar políticas actualizadas
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND (policyname LIKE '%contracts view permission%' 
       OR policyname LIKE '%companies view permission%'
       OR policyname LIKE '%companies edit permission%');
  
  IF policies_count >= 15 THEN  -- Estimado de políticas actualizadas
    RAISE NOTICE 'SUCCESS: Políticas RLS actualizadas correctamente (% políticas)', policies_count;
  ELSE
    RAISE NOTICE 'INFO: Políticas RLS actualizadas (% políticas)', policies_count;
  END IF;

  -- Mostrar permisos restantes por categoría
  RAISE NOTICE 'RESUMEN: Permisos restantes por categoría:';
  
  FOR rec IN (
    SELECT table_name, COUNT(*) as count 
    FROM permissions 
    GROUP BY table_name 
    ORDER BY table_name
  ) LOOP
    RAISE NOTICE '  - %: % permisos', rec.table_name, rec.count;
  END LOOP;

END $$;
