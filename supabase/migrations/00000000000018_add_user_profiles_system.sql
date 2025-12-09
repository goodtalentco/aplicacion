-- ===============================================
-- MIGRACIÓN: Sistema de Perfiles de Usuario con Alias
-- Fecha: 2025-01-22
-- Descripción: Implementa sistema de alias para usuarios sin afectar RLS
-- ===============================================

-- ===============================================
-- 1. TABLA USER_PROFILES
-- ===============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT UNIQUE NOT NULL,
  notification_email TEXT NOT NULL,
  display_name TEXT,
  is_temp_password BOOLEAN DEFAULT true, -- Indica si tiene contraseña temporal
  temp_password_expires_at TIMESTAMPTZ, -- Cuándo expira la contraseña temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_profiles_alias ON user_profiles(alias);
CREATE INDEX IF NOT EXISTS idx_user_profiles_notification_email ON user_profiles(notification_email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_temp_password ON user_profiles(is_temp_password);

-- Restricciones
ALTER TABLE user_profiles 
  ADD CONSTRAINT check_alias_not_empty CHECK (length(trim(alias)) > 0),
  ADD CONSTRAINT check_notification_email_format CHECK (notification_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT check_alias_format CHECK (alias ~* '^[a-z0-9._-]+$'); -- Solo letras, números, puntos, guiones

-- Comentarios
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario con alias y email de notificaciones';
COMMENT ON COLUMN user_profiles.alias IS 'Alias único del usuario para login (ej: jcanal)';
COMMENT ON COLUMN user_profiles.notification_email IS 'Email real para notificaciones (puede ser compartido)';
COMMENT ON COLUMN user_profiles.display_name IS 'Nombre para mostrar en la interfaz';
COMMENT ON COLUMN user_profiles.is_temp_password IS 'Si tiene contraseña temporal que debe cambiar';

-- ===============================================
-- 2. FUNCIONES HELPER
-- ===============================================

-- Limpiar funciones existentes si existen
DROP FUNCTION IF EXISTS get_user_id_by_alias(TEXT);
DROP FUNCTION IF EXISTS get_alias_by_user_id(UUID);
DROP FUNCTION IF EXISTS get_user_profile_by_alias(TEXT);
DROP FUNCTION IF EXISTS get_all_user_profiles();
DROP FUNCTION IF EXISTS mark_password_as_permanent(UUID);
DROP FUNCTION IF EXISTS generate_internal_email(TEXT);

-- Función para obtener user_id por alias
CREATE OR REPLACE FUNCTION get_user_id_by_alias(alias_param TEXT)
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT user_id INTO user_uuid
  FROM user_profiles
  WHERE alias = lower(trim(alias_param));
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener alias por user_id
CREATE OR REPLACE FUNCTION get_alias_by_user_id(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_alias TEXT;
BEGIN
  SELECT alias INTO user_alias
  FROM user_profiles
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(user_alias, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener perfil completo por alias
CREATE OR REPLACE FUNCTION get_user_profile_by_alias(alias_param TEXT)
RETURNS TABLE (
  user_id UUID,
  alias TEXT,
  notification_email TEXT,
  display_name TEXT,
  is_temp_password BOOLEAN,
  auth_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.alias,
    up.notification_email,
    up.display_name,
    up.is_temp_password,
    au.email::TEXT as auth_email
  FROM user_profiles up
  JOIN auth.users au ON up.user_id = au.id
  WHERE up.alias = lower(trim(alias_param));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener todos los perfiles con información de auth
CREATE OR REPLACE FUNCTION get_all_user_profiles()
RETURNS TABLE (
  user_id UUID,
  alias TEXT,
  notification_email TEXT,
  display_name TEXT,
  is_temp_password BOOLEAN,
  auth_email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  is_active BOOLEAN,
  is_banned BOOLEAN,
  permissions_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.alias,
    up.notification_email,
    up.display_name,
    up.is_temp_password,
    au.email::TEXT as auth_email,
    au.email_confirmed_at,
    au.last_sign_in_at,
    -- is_active: confirmado y no baneado
    (au.email_confirmed_at IS NOT NULL AND au.banned_until IS NULL) as is_active,
    -- is_banned: tiene banned_until
    (au.banned_until IS NOT NULL) as is_banned,
    -- Contar permisos activos
    COALESCE(perm_count.count, 0) as permissions_count
  FROM user_profiles up
  JOIN auth.users au ON up.user_id = au.id
  LEFT JOIN (
    SELECT 
      uper.user_id, 
      COUNT(*) as count
    FROM user_permissions uper
    JOIN permissions p ON uper.permission_id = p.id
    WHERE uper.is_active = true AND p.is_active = true
    GROUP BY uper.user_id
  ) perm_count ON up.user_id = perm_count.user_id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar contraseña como permanente
CREATE OR REPLACE FUNCTION mark_password_as_permanent(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_profiles
  SET 
    is_temp_password = false,
    temp_password_expires_at = NULL,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE user_id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar email interno único
CREATE OR REPLACE FUNCTION generate_internal_email(alias_param TEXT)
RETURNS TEXT AS $$
DECLARE
  internal_email TEXT;
  random_suffix TEXT;
BEGIN
  -- Generar sufijo aleatorio para garantizar unicidad
  SELECT substring(gen_random_uuid()::text from 1 for 8) INTO random_suffix;
  
  -- Formato: alias_sufijo@goodtalent.internal
  internal_email := lower(trim(alias_param)) || '_' || random_suffix || '@goodtalent.internal';
  
  RETURN internal_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- 3. TRIGGERS
-- ===============================================

-- Limpiar trigger y función existente
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
DROP FUNCTION IF EXISTS update_user_profiles_updated_at();

-- Función de trigger para actualizar updated_at y updated_by
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Si no se especifica updated_by, usar el usuario actual
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para user_profiles
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- ===============================================
-- 4. RLS POLICIES
-- ===============================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "view_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "create_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "update_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "delete_user_profiles" ON user_profiles;

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Solo usuarios con permisos de gestión de usuarios
CREATE POLICY "view_user_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'view')
    OR is_super_admin(auth.uid())
    OR user_id = auth.uid() -- Usuarios pueden ver su propio perfil
  );

-- Política de creación: Solo usuarios con permisos de gestión
CREATE POLICY "create_user_profiles" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'create')
    OR is_super_admin(auth.uid())
  );

-- Política de actualización: Solo usuarios con permisos de gestión o el propio usuario
CREATE POLICY "update_user_profiles" ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'user_permissions', 'edit')
    OR is_super_admin(auth.uid())
    OR user_id = auth.uid() -- Usuarios pueden actualizar su propio perfil
  )
  WITH CHECK (
    has_permission(auth.uid(), 'user_permissions', 'edit')
    OR is_super_admin(auth.uid())
    OR user_id = auth.uid()
  );

-- Política de eliminación: Solo super admins
CREATE POLICY "delete_user_profiles" ON user_profiles
  FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Política especial para service_role (operaciones administrativas)
CREATE POLICY "service_role_all_access" ON user_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 5. GRANTS
-- ===============================================

-- Otorgar permisos al rol authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Otorgar permisos al service_role para operaciones administrativas
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO service_role;

-- ===============================================
-- 6. COMENTARIOS Y VERIFICACIÓN
-- ===============================================

-- Verificar que la tabla se creó correctamente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE '✅ Tabla user_profiles creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Tabla user_profiles no se creó';
  END IF;
  
  -- Verificar funciones
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_id_by_alias') THEN
    RAISE NOTICE '✅ Funciones helper creadas correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Funciones helper no se crearon';
  END IF;
  
  RAISE NOTICE '🎉 Migración completada: Sistema de perfiles de usuario con alias';
END $$;
