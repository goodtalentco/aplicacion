/**
 * Backward compatibility file
 * Re-exports everything from PermissionsProvider to avoid breaking existing imports
 */

export {
  usePermissions,
  useAvailablePermissions,
  PermissionsProvider,
  type UserPermission,
  type AvailablePermission
} from './PermissionsProvider'
