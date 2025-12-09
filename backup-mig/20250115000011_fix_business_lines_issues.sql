-- ===============================================
-- MIGRACIÓN: CORRECCIONES LÍNEAS DE NEGOCIO
-- Fecha: 2025-01-15
-- Descripción: Soluciona problemas de permisos y validaciones
-- Problemas: Error 400/403, descripción muy restrictiva
-- ===============================================

-- ===============================================
-- 1. HACER DESCRIPCIÓN OPCIONAL Y MENOS RESTRICTIVA
-- ===============================================

-- Modificar la tabla para permitir descripción NULL y más corta
ALTER TABLE lineas_negocio 
ALTER COLUMN descripcion DROP NOT NULL;

-- Actualizar constraint de descripción
ALTER TABLE lineas_negocio 
DROP CONSTRAINT IF EXISTS lineas_negocio_descripcion_not_empty;

-- Nueva constraint más permisiva (solo si no es NULL)
ALTER TABLE lineas_negocio 
ADD CONSTRAINT lineas_negocio_descripcion_min_length 
CHECK (descripcion IS NULL OR length(trim(descripcion)) >= 3);

-- ===============================================
-- 2. CREAR VISTA PARA USUARIOS CON PERMISOS SEGUROS
-- ===============================================

-- Vista segura para obtener información básica de usuarios
CREATE OR REPLACE VIEW usuarios_basicos AS
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE id = auth.uid() OR has_permission(auth.uid(), 'user_permissions', 'view');

-- Grants para la vista
GRANT SELECT ON usuarios_basicos TO authenticated;

-- ===============================================
-- 3. FUNCIÓN SEGURA PARA OBTENER RESPONSABLES
-- ===============================================

-- Función mejorada para obtener responsables con información segura
CREATE OR REPLACE FUNCTION get_linea_negocio_responsables_safe(linea_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  es_principal BOOLEAN,
  fecha_asignacion TIMESTAMPTZ,
  es_activo BOOLEAN
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    lnr.id,
    lnr.user_id,
    COALESCE(au.email, 'Usuario no disponible') as email,
    lnr.es_asignado_principal as es_principal,
    lnr.fecha_asignacion,
    lnr.es_activo
  FROM linea_negocio_responsables lnr
  LEFT JOIN auth.users au ON lnr.user_id = au.id
  WHERE lnr.linea_negocio_id = linea_id 
    AND lnr.es_activo = true
    AND (
      has_permission(auth.uid(), 'linea_negocio_responsables', 'view') OR
      has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
      lnr.user_id = auth.uid()
    )
  ORDER BY lnr.es_asignado_principal DESC, lnr.fecha_asignacion ASC;
$$;

-- ===============================================
-- 4. FUNCIÓN SEGURA PARA OBTENER USUARIOS DISPONIBLES
-- ===============================================

-- Función para obtener usuarios que pueden ser asignados como responsables
CREATE OR REPLACE FUNCTION get_users_for_business_line_assignment()
RETURNS TABLE (
  id UUID,
  email TEXT
) 
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    u.id,
    u.email
  FROM auth.users u
  WHERE (
    has_permission(auth.uid(), 'linea_negocio_responsables', 'create') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'create')
  )
  ORDER BY u.email ASC;
$$;

-- ===============================================
-- 5. MEJORAR POLÍTICAS RLS PARA RESPONSABLES
-- ===============================================

-- Política más permisiva para lectura de responsables
DROP POLICY IF EXISTS "linea_negocio_responsables_select_policy" ON linea_negocio_responsables;
CREATE POLICY "linea_negocio_responsables_select_policy" ON linea_negocio_responsables
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'linea_negocio_responsables', 'view') OR
    has_permission(auth.uid(), 'tablas_auxiliares', 'view') OR
    has_permission(auth.uid(), 'lineas_negocio', 'view') OR
    user_id = auth.uid()  -- Los usuarios pueden ver sus propias asignaciones
  );

-- ===============================================
-- 6. GRANTS PARA NUEVAS FUNCIONES
-- ===============================================

GRANT EXECUTE ON FUNCTION get_linea_negocio_responsables_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_business_line_assignment() TO authenticated;

-- ===============================================
-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- ===============================================

COMMENT ON VIEW usuarios_basicos IS 'Vista segura para información básica de usuarios con permisos apropiados';
COMMENT ON FUNCTION get_linea_negocio_responsables_safe(UUID) IS 'Función segura para obtener responsables de línea de negocio sin exponer datos sensibles';
COMMENT ON FUNCTION get_users_for_business_line_assignment() IS 'Función segura para obtener usuarios disponibles para asignar como responsables';

-- ===============================================
-- 8. ACTUALIZAR LÍNEAS EXISTENTES SIN DESCRIPCIÓN
-- ===============================================

-- Si hay líneas con descripción vacía, asignar una por defecto
UPDATE lineas_negocio 
SET descripcion = 'Línea de negocio especializada en ' || lower(nombre)
WHERE descripcion IS NULL OR trim(descripcion) = '';

-- ===============================================
-- 9. VERIFICACIONES POST-CORRECCIÓN
-- ===============================================

DO $$
BEGIN
  -- Verificar que la vista fue creada
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'usuarios_basicos'
  ) THEN
    RAISE NOTICE 'SUCCESS: Vista usuarios_basicos creada correctamente';
  ELSE
    RAISE NOTICE 'ERROR: No se pudo crear la vista usuarios_basicos';
  END IF;

  -- Verificar que las funciones fueron creadas
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_linea_negocio_responsables_safe'
  ) THEN
    RAISE NOTICE 'SUCCESS: Función get_linea_negocio_responsables_safe creada correctamente';
  ELSE
    RAISE NOTICE 'ERROR: No se pudo crear la función get_linea_negocio_responsables_safe';
  END IF;

  -- Verificar constraint de descripción
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'lineas_negocio_descripcion_min_length'
  ) THEN
    RAISE NOTICE 'SUCCESS: Constraint de descripción actualizado correctamente';
  ELSE
    RAISE NOTICE 'ERROR: No se pudo actualizar el constraint de descripción';
  END IF;

  RAISE NOTICE '=== CORRECCIONES LÍNEAS DE NEGOCIO COMPLETADAS ===';
  RAISE NOTICE 'Descripción: Ahora opcional y mínimo 3 caracteres';
  RAISE NOTICE 'Permisos: Funciones seguras para evitar errores 400/403';
  RAISE NOTICE 'Vista: usuarios_basicos para acceso seguro a usuarios';
  RAISE NOTICE 'RLS: Políticas mejoradas para responsables';
END $$;

-- ===============================================
-- FIN DE CORRECCIONES LÍNEAS DE NEGOCIO
-- ===============================================
