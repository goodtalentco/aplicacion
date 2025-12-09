/**
 * Modal para crear nuevos usuarios con alias y contraseña temporal
 * Reemplaza el sistema de invitaciones por email
 */

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAvailablePermissions } from '@/lib/usePermissions'
import { 
  X, 
  User, 
  UserPlus, 
  Shield, 
  Check,
  AlertCircle,
  Loader2,
  Mail,
  Key,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SelectedPermissions {
  [key: string]: string[] // table_name -> actions[]
}

interface AvailablePermission {
  id: string
  table_name: string
  action: string
  description: string
  is_active: boolean
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [alias, setAlias] = useState('')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<SelectedPermissions>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [step, setStep] = useState<'info' | 'permissions' | 'confirm' | 'success'>('info')
  const [createdUser, setCreatedUser] = useState<any>(null)
  
  const { groupedPermissions, loading: permissionsLoading } = useAvailablePermissions()

  if (!isOpen) return null

  const resetForm = () => {
    setAlias('')
    setNotificationEmail('')
    setDisplayName('')
    setTemporaryPassword('')
    setSelectedPermissions({})
    setError('')
    setStatusMessage('')
    setStep('info')
    setCreatedUser(null)
    setShowPassword(false)
  }

  const handleInfoSubmit = () => {
    // Validaciones
    if (!alias.trim()) {
      setError('El alias es requerido')
      return
    }
    
    if (!/^[a-z0-9._-]+$/.test(alias.toLowerCase())) {
      setError('El alias solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos')
      return
    }
    
    if (!notificationEmail.trim()) {
      setError('El email de notificaciones es requerido')
      return
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
      setError('Por favor ingresa un email válido')
      return
    }
    
    setError('')
    setStep('permissions')
  }

  const togglePermission = (tableName: string, action: string) => {
    setSelectedPermissions(prev => {
      const tablePermissions = prev[tableName] || []
      const hasPermission = tablePermissions.includes(action)
      
      if (hasPermission) {
        // Remover permiso
        const newPermissions = tablePermissions.filter(a => a !== action)
        if (newPermissions.length === 0) {
          const { [tableName]: removed, ...rest } = prev
          return rest
        }
        return { ...prev, [tableName]: newPermissions }
      } else {
        // Agregar permiso
        return { ...prev, [tableName]: [...tablePermissions, action] }
      }
    })
  }

  const toggleAllPermissions = (tableName: string) => {
    const tablePermissions = groupedPermissions[tableName] || []
    const currentPermissions = selectedPermissions[tableName] || []
    const allActions = tablePermissions.map(p => p.action)
    
    if (currentPermissions.length === allActions.length) {
      // Desmarcar todos
      const { [tableName]: removed, ...rest } = selectedPermissions
      setSelectedPermissions(rest)
    } else {
      // Marcar todos
      setSelectedPermissions(prev => ({
        ...prev,
        [tableName]: allActions
      }))
    }
  }

  const handleCreateSuperUser = () => {
    // Marcar todos los permisos disponibles
    const allPermissions: SelectedPermissions = {}
    
    Object.entries(groupedPermissions).forEach(([tableName, permissions]) => {
      allPermissions[tableName] = permissions.map(p => p.action)
    })
    
    setSelectedPermissions(allPermissions)
  }

  const handleCreateUser = async () => {
    try {
      setLoading(true)
      setError('')
      setStatusMessage('Creando usuario...')
      setProgressCurrent(0)
      setProgressTotal(2)

      // 1. Obtener sesión actual
      const { data: session } = await supabase.auth.getSession()
      
      setProgressCurrent(1)
      setStatusMessage('Configurando usuario...')

      // 2. Crear usuario usando API simple
      const response = await fetch('/api/create-user-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias: alias.toLowerCase(),
          notification_email: notificationEmail.toLowerCase(),
          display_name: displayName || null,
          temporary_password: temporaryPassword || undefined,
          userToken: session.session?.access_token
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error creando usuario')
      }

      setCreatedUser(result.user)
      setProgressCurrent(2)
      setStatusMessage('Asignando permisos...')

      // 3. Asignar permisos si se seleccionaron
      const totalPermissions = Object.values(selectedPermissions).flat().length
      if (totalPermissions > 0) {
        let assignedCount = 0
        
        for (const [tableName, actions] of Object.entries(selectedPermissions)) {
          for (const action of actions) {
            try {
              const { error: permError } = await supabase.rpc('assign_permission_to_user', {
                target_user_id: result.user.id,
                target_permission_id: groupedPermissions[tableName]?.find(p => p.action === action)?.id,
                assigned_by: session.session?.user?.id
              })

              if (permError) {
                console.error(`Error assigning ${tableName}.${action}:`, permError)
              } else {
                assignedCount++
              }
            } catch (err) {
              console.error(`Error assigning permission ${tableName}.${action}:`, err)
            }
          }
        }
        
        if (assignedCount > 0) {
          setStatusMessage(`Usuario creado con ${assignedCount} permisos asignados`)
        }
      }

      setStep('success')

    } catch (error: any) {
      console.error('Error creating user:', error)
      setError(error.message || 'Error inesperado al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Error copying to clipboard:', err)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSuccess = () => {
    resetForm()
    onSuccess()
  }

  // Calcular total de permisos seleccionados
  const totalSelectedPermissions = Object.values(selectedPermissions).reduce(
    (total, actions) => total + actions.length, 0
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#87E0E0] to-[#5FD3D2] rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#004C4C]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#004C4C]">
                  Crear Nuevo Usuario
                </h3>
                <p className="text-sm text-[#065C5C]">
                  {step === 'info' && 'Información básica del usuario'}
                  {step === 'permissions' && 'Asignar permisos al usuario'}
                  {step === 'confirm' && 'Confirmar creación del usuario'}
                  {step === 'success' && 'Usuario creado exitosamente'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress bar */}
          {loading && progressTotal > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{statusMessage}</span>
                <span>{progressCurrent}/{progressTotal}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progressCurrent / progressTotal) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Step 1: Información básica */}
          {step === 'info' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="alias" className="block text-sm font-medium text-[#004C4C] mb-2">
                  Alias de usuario *
                </label>
                <input
                  id="alias"
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value.toLowerCase())}
                  placeholder="ej: jcanal, mperez"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo letras minúsculas, números, puntos, guiones y guiones bajos
                </p>
              </div>

              <div>
                <label htmlFor="notification-email" className="block text-sm font-medium text-[#004C4C] mb-2">
                  Email de notificaciones *
                </label>
                <input
                  id="notification-email"
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="comercial@grupogood.co"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email donde se enviarán las notificaciones del sistema
                </p>
              </div>

              <div>
                <label htmlFor="display-name" className="block text-sm font-medium text-[#004C4C] mb-2">
                  Nombre para mostrar (opcional)
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Juan Canal"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="temp-password" className="block text-sm font-medium text-[#004C4C] mb-2">
                  Contraseña temporal (opcional)
                </label>
                <div className="relative">
                  <input
                    id="temp-password"
                    type={showPassword ? 'text' : 'password'}
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Se generará automáticamente si se deja vacío"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  El usuario deberá cambiar esta contraseña en su primer acceso
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInfoSubmit}
                  className="px-6 py-2 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white font-semibold rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all duration-200"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Permisos */}
          {step === 'permissions' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Asignar Permisos</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Selecciona los permisos que tendrá el usuario <strong>{alias}</strong> en el sistema.
                      Puedes modificar estos permisos más tarde desde la gestión de usuarios.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateSuperUser}
                    className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center space-x-1"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Super Usuario</span>
                  </button>
                </div>
              </div>

              {permissionsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Cargando permisos...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([tableName, permissions]) => {
                    const selectedActions = selectedPermissions[tableName] || []
                    const allActions = permissions.map(p => p.action)
                    const isAllSelected = selectedActions.length === allActions.length
                    const isSomeSelected = selectedActions.length > 0

                    return (
                      <div key={tableName} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleAllPermissions(tableName)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isAllSelected
                                  ? 'bg-[#5FD3D2] border-[#5FD3D2] text-white'
                                  : isSomeSelected
                                  ? 'bg-[#87E0E0] border-[#87E0E0] text-white'
                                  : 'border-gray-300 hover:border-[#87E0E0]'
                              }`}
                            >
                              {isAllSelected && <Check className="w-3 h-3" />}
                              {isSomeSelected && !isAllSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </button>
                            <h4 className="font-semibold text-[#004C4C] capitalize">
                              {tableName.replace(/_/g, ' ')}
                            </h4>
                          </div>
                          <span className="text-xs text-gray-500">
                            {selectedActions.length}/{allActions.length} seleccionados
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {permissions.map((permission) => {
                            const isSelected = selectedActions.includes(permission.action)
                            return (
                              <button
                                key={permission.id}
                                onClick={() => togglePermission(tableName, permission.action)}
                                className={`text-left p-2 rounded-lg border transition-all text-sm ${
                                  isSelected
                                    ? 'bg-[#87E0E0] bg-opacity-20 border-[#87E0E0] text-[#004C4C]'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#87E0E0] hover:bg-[#87E0E0] hover:bg-opacity-10'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                                    isSelected ? 'bg-[#5FD3D2] border-[#5FD3D2]' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <Check className="w-2 h-2 text-white" />}
                                  </div>
                                  <span className="capitalize font-medium">
                                    {permission.action}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{totalSelectedPermissions}</span> permisos seleccionados
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep('info')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="px-6 py-2 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white font-semibold rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all duration-200"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmación */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-[#004C4C] mb-4">Resumen del usuario</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alias:</span>
                    <span className="font-medium">{alias}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email de notificaciones:</span>
                    <span className="font-medium">{notificationEmail}</span>
                  </div>
                  {displayName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nombre para mostrar:</span>
                      <span className="font-medium">{displayName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contraseña temporal:</span>
                    <span className="font-medium">
                      {temporaryPassword ? 'Personalizada' : 'Se generará automáticamente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Permisos:</span>
                    <span className="font-medium">{totalSelectedPermissions} seleccionados</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('permissions')}
                  disabled={loading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
                >
                  Atrás
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white font-semibold rounded-lg hover:from-[#065C5C] hover:to-[#0A6A6A] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando usuario...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Crear Usuario</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Éxito */}
          {step === 'success' && createdUser && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  ¡Usuario creado exitosamente!
                </h4>
                <p className="text-gray-600">
                  El usuario <strong>{createdUser.alias}</strong> ha sido creado y puede acceder al sistema.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 text-left">
                <h5 className="font-semibold text-[#004C4C] mb-4">Credenciales de acceso</h5>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <span className="text-sm text-gray-600">Alias de usuario:</span>
                      <div className="font-mono font-medium text-[#004C4C]">{createdUser.alias}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdUser.alias)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copiar alias"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <span className="text-sm text-gray-600">Contraseña temporal:</span>
                      <div className="font-mono font-medium text-[#004C4C]">{createdUser.temporary_password}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdUser.temporary_password)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copiar contraseña"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Key className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Importante:</strong> El usuario deberá cambiar esta contraseña temporal en su primer acceso al sistema.
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSuccess}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white font-semibold rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all duration-200"
              >
                Finalizar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
