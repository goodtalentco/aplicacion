-- ===============================================
-- RESTAURAR PERMISOS DE GESTIÓN DE USUARIOS
-- ===============================================
-- Los permisos de user_permissions.* fueron eliminados por error
-- en las migraciones de simplificación. Los recreamos aquí.

-- Recrear permisos de gestión de usuarios
INSERT INTO permissions (table_name, action, description, is_active) VALUES
('user_permissions', 'view', 'Ver usuarios y sus permisos', true),
('user_permissions', 'create', 'Invitar nuevos usuarios', true),
('user_permissions', 'edit', 'Editar permisos de usuarios', true),
('user_permissions', 'delete', 'Revocar permisos de usuarios', true)
ON CONFLICT (table_name, action) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Asignar todos los permisos de user_permissions al superadmin
INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at)
SELECT 
  '57ab508f-2787-4d8c-9518-5d454ead023e',
  p.id,
  '57ab508f-2787-4d8c-9518-5d454ead023e',
  NOW()
FROM permissions p
WHERE p.table_name = 'user_permissions'
  AND p.is_active = true
ON CONFLICT (user_id, permission_id) DO UPDATE SET
  is_active = true,
  granted_at = NOW(),
  updated_at = NOW();

-- Verificar resultado
SELECT 
  'PERMISOS RESTAURADOS' as status,
  COUNT(*) as permisos_user_permissions
FROM permissions 
WHERE table_name = 'user_permissions' AND is_active = true;

-- Verificar que el superadmin los tiene
SELECT 
  'SUPERADMIN PERMISOS' as status,
  p.table_name,
  p.action,
  p.description
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id = '57ab508f-2787-4d8c-9518-5d454ead023e'
  AND p.table_name = 'user_permissions'
  AND up.is_active = true
ORDER BY p.action;
