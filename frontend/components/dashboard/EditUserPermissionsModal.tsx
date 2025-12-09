/**
 * Modal para editar permisos de usuarios existentes
 * Permite activar/desactivar permisos específicos
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAvailablePermissions, type AvailablePermission } from '@/lib/usePermissions'
import { 
  X, 
  Shield, 
  Check,
  AlertCircle,
  Loader2,
  Save,
  History
} from 'lucide-react'

interface EditUserPermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: {
    id: string
    email: string
  } | null
}

interface UserPermission {
  permission_id: string
  table_name: string
  action: string
  description: string
  granted_at: string
  granted_by: string
  is_active: boolean
}

interface PermissionChange {
  permission_id: string
  table_name: string
  action: string
  was_active: boolean
  will_be_active: boolean
}

export default function EditUserPermissionsModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  user 
}: EditUserPermissionsModalProps) {
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [changes, setChanges] = useState<PermissionChange[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const { groupedPermissions, loading: permissionsLoading } = useAvailablePermissions()

  useEffect(() => {
    if (isOpen && user) {
      fetchUserPermissions()
    }
  }, [isOpen, user])

  if (!isOpen || !user) return null

  const fetchUserPermissions = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase.rpc('get_user_permissions', {
        target_user_id: user.id
      })

      if (error) {
        throw error
      }

      setUserPermissions(data || [])
      setChanges([]) // Reset changes when loading fresh data
    } catch (error: any) {
      console.error('Error fetching user permissions:', error)
      setError('Error al cargar permisos del usuario')
    } finally {
      setLoading(false)
    }
  }

  const retryFetch = async () => {
    await fetchUserPermissions()
  }

  const isPermissionActive = (tableName: string, action: string): boolean => {
    // Check if there's a pending change for this permission
    const change = changes.find((c: PermissionChange) => c.table_name === tableName && c.action === action)
    if (change) {
      return change.will_be_active
    }

    // Check current state
    const permission = userPermissions.find((p: UserPermission) => p.table_name === tableName && p.action === action)
    return permission?.is_active || false
  }

  const togglePermission = (tableName: string, action: string, permissionId: string) => {
    const currentlyActive = isPermissionActive(tableName, action)
    const originalPermission = userPermissions.find(p => p.table_name === tableName && p.action === action)
    const wasOriginallyActive = originalPermission?.is_active || false

    setChanges(prev => {
      // Remove any existing change for this permission
      const filtered = prev.filter(c => !(c.table_name === tableName && c.action === action))
      
      // If toggling back to original state, don't add a change
      if (wasOriginallyActive === !currentlyActive) {
        return filtered
      }

      // Add new change
      return [...filtered, {
        permission_id: permissionId,
        table_name: tableName,
        action: action,
        was_active: wasOriginallyActive,
        will_be_active: !currentlyActive
      }]
    })
  }

  const getPermissionId = (tableName: string, action: string): string => {
    // First check user permissions
    const userPermission = userPermissions.find((p: UserPermission) => p.table_name === tableName && p.action === action)
    if (userPermission) {
      return userPermission.permission_id
    }

    // Then check available permissions
    const permissions = groupedPermissions[tableName] || []
    const permission = permissions.find((p: AvailablePermission) => p.action === action)
    return permission?.id || ''
  }

  const toggleAllModulePermissions = (tableName: string, permissions: AvailablePermission[]) => {
    const activeCount = permissions.filter((p: AvailablePermission) => isPermissionActive(tableName, p.action)).length
    const shouldActivateAll = activeCount < permissions.length

    permissions.forEach((permission: AvailablePermission) => {
      const currentlyActive = isPermissionActive(tableName, permission.action)
      const originalPermission = userPermissions.find((p: UserPermission) => p.table_name === tableName && p.action === permission.action)
      const wasOriginallyActive = originalPermission?.is_active || false

      // Si shouldActivateAll es true, activar todos
      // Si shouldActivateAll es false, desactivar todos
      if (currentlyActive !== shouldActivateAll) {
        togglePermission(tableName, permission.action, permission.id)
      }
    })
  }

  const handleSave = async () => {
    if (changes.length === 0) {
      onClose()
      return
    }

    try {
      setSaving(true)
      setError('')

      const currentUser = await supabase.auth.getUser()
      const assignedBy = currentUser.data.user?.id

      if (!assignedBy) {
        throw new Error('Usuario no autenticado')
      }

      for (const change of changes) {
        if (change.will_be_active) {
          // Assign/Activate permission
          const { error } = await supabase.rpc('assign_permission_to_user', {
            target_user_id: user.id,
            target_permission_id: change.permission_id,
            assigned_by: assignedBy
          })

          if (error) {
            throw new Error(`Error asignando permiso ${change.table_name}.${change.action}: ${error.message}`)
          }
        } else {
          // Revoke permission
          const { error } = await supabase.rpc('revoke_permission_from_user', {
            target_user_id: user.id,
            target_permission_id: change.permission_id
          })

          if (error) {
            throw new Error(`Error revocando permiso ${change.table_name}.${change.action}: ${error.message}`)
          }
        }
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving permissions:', error)
      setError(error.message || 'Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setChanges([])
      setError('')
      onClose()
    }
  }

  const getChangesCount = () => changes.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-xl w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col">
        
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#87E0E0] bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#004C4C]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-[#004C4C] truncate">Editar Permisos</h3>
                <p className="text-xs sm:text-sm text-[#065C5C] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
              disabled={saving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* Changes Summary */}
          {changes.length > 0 && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
              <div className="flex items-center space-x-2 mb-2">
                <History className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-medium text-blue-800">
                  {getChangesCount()} cambio{getChangesCount() !== 1 ? 's' : ''} pendiente{getChangesCount() !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {changes.map((change, index) => (
                  <div key={index} className="text-xs text-blue-700">
                    {change.will_be_active ? '✓ Activar' : '✗ Desactivar'} {change.table_name}.{change.action}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
          <div className="mb-4 sm:mb-6 flex items-center justify-between text-red-600 bg-red-50 p-3 rounded-lg flex-shrink-0">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
            <button onClick={retryFetch} className="text-sm px-3 py-1 bg-white border border-red-200 rounded hover:bg-red-100 transition-colors">
              Reintentar
            </button>
          </div>
          )}

          {/* Permissions List */}
          <div className="space-y-3 sm:space-y-4">
            {loading || permissionsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5FD3D2]" />
                <p className="text-sm text-gray-500 mt-2">Cargando permisos...</p>
              </div>
            ) : (
              Object.entries(groupedPermissions).map(([tableName, permissions]) => {
                const activeCount = permissions.filter((p: AvailablePermission) => isPermissionActive(tableName, p.action)).length
                
                return (
                  <div key={tableName} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                          onClick={() => toggleAllModulePermissions(tableName, permissions)}
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                            activeCount === permissions.length
                              ? 'bg-[#5FD3D2] border-[#5FD3D2] text-white'
                              : activeCount > 0
                              ? 'bg-[#5FD3D2] border-[#5FD3D2]'
                              : 'border-gray-300 hover:border-[#5FD3D2]'
                          }`}
                          disabled={saving}
                        >
                          {activeCount === permissions.length && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          {activeCount > 0 && activeCount < permissions.length && (
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
                          )}
                        </button>
                        <h4 className="font-medium text-sm sm:text-base text-[#004C4C] capitalize">
                          {tableName.replace('_', ' ')}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {activeCount}/{permissions.length} activos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      {permissions.map((permission: AvailablePermission) => {
                        const isActive = isPermissionActive(tableName, permission.action)
                        const hasChange = changes.some((c: PermissionChange) => c.table_name === tableName && c.action === permission.action)
                        const permissionId = getPermissionId(tableName, permission.action)
                        
                        return (
                          <button
                            key={permission.id}
                            onClick={() => togglePermission(tableName, permission.action, permissionId)}
                            className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg text-left transition-all ${
                              isActive
                                ? 'bg-[#87E0E0] bg-opacity-20 text-[#004C4C] border-2 border-[#5FD3D2]'
                                : 'hover:bg-gray-50 text-gray-700 border-2 border-transparent'
                            } ${hasChange ? 'ring-2 ring-blue-300' : ''}`}
                            disabled={saving}
                          >
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isActive
                                ? 'bg-[#5FD3D2] border-[#5FD3D2] text-white'
                                : 'border-gray-300'
                            }`}>
                              {isActive && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs sm:text-sm font-medium">{permission.action}</div>
                              <div className="text-xs text-gray-500 truncate hidden sm:block">{permission.description}</div>
                            </div>
                            {hasChange && (
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Spacer to ensure footer doesn't overlap content */}
          <div className="h-4 sm:h-6 flex-shrink-0"></div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              {getChangesCount()} cambio{getChangesCount() !== 1 ? 's' : ''} pendiente{getChangesCount() !== 1 ? 's' : ''}
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-center rounded-lg"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || changes.length === 0}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all disabled:opacity-50 font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span className="text-sm">Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
