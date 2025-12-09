/**
 * Modal para cambio obligatorio de contraseña temporal
 * Se muestra cuando un usuario se loguea con contraseña temporal
 */

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { translateError, PASSWORD_VALIDATION_MESSAGES } from '@/lib/errorMessages'
import { Eye, EyeOff, Lock, Check, AlertCircle, X } from 'lucide-react'

interface ChangePasswordModalProps {
  isOpen: boolean
  onSuccess: () => void
  userAlias?: string
  isRequired?: boolean // Si es true, no se puede cerrar el modal
}

export default function ChangePasswordModal({ 
  isOpen, 
  onSuccess, 
  userAlias,
  isRequired = false 
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Auto-ocultar errores después de 4 segundos
  const setErrorWithTimeout = (errorMessage: string) => {
    setError(errorMessage)
    if (errorMessage) {
      setTimeout(() => setError(''), 4000)
    }
  }

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const validatePassword = (password: string): string[] => {
    const issues = []
    if (password.length < 8) issues.push('Mínimo 8 caracteres')
    if (!/[A-Z]/.test(password)) issues.push('Al menos una mayúscula')
    if (!/[a-z]/.test(password)) issues.push('Al menos una minúscula')
    if (!/[0-9]/.test(password)) issues.push('Al menos un número')
    return issues
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validaciones
    if (!currentPassword) {
      setErrorWithTimeout('Ingresa tu contraseña actual')
      setLoading(false)
      return
    }

    const passwordIssues = validatePassword(newPassword)
    if (passwordIssues.length > 0) {
      setErrorWithTimeout(`La nueva contraseña debe tener: ${passwordIssues.join(', ')}`)
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorWithTimeout('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (currentPassword === newPassword) {
      setErrorWithTimeout('La nueva contraseña debe ser diferente a la actual')
      setLoading(false)
      return
    }

    try {
      // Primero verificar la contraseña actual intentando hacer login
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) {
        setErrorWithTimeout('Sesión expirada. Por favor inicia sesión nuevamente.')
        setLoading(false)
        return
      }

      // Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setErrorWithTimeout(translateError(updateError.message))
        setLoading(false)
        return
      }

      // Marcar la contraseña como permanente en el perfil
      const { error: profileError } = await supabase
        .rpc('mark_password_as_permanent', { user_uuid: currentUser.user.id })

      if (profileError) {
        console.error('Error marking password as permanent:', profileError)
        // No fallar por esto, la contraseña ya se cambió
      }

      setSuccess(true)
      
      // Esperar un momento y llamar onSuccess
      setTimeout(() => {
        resetForm()
        onSuccess()
      }, 2000)

    } catch (err) {
      setErrorWithTimeout('Error inesperado al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            ¡Contraseña actualizada!
          </h3>
          <p className="text-gray-600">
            Tu contraseña se ha cambiado exitosamente. Ya puedes usar el sistema normalmente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#87E0E0] to-[#5FD3D2] rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#004C4C]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#004C4C]">
                  {isRequired ? 'Cambio de Contraseña Obligatorio' : 'Cambiar Contraseña'}
                </h3>
                {userAlias && (
                  <p className="text-sm text-[#065C5C]">Usuario: {userAlias}</p>
                )}
              </div>
            </div>
            {!isRequired && (
              <button
                onClick={() => {
                  resetForm()
                  onSuccess()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {isRequired && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Debes cambiar tu contraseña temporal antes de continuar usando el sistema.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          
          {/* Contraseña Actual */}
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-[#004C4C] mb-2">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200 pr-12"
                placeholder="Tu contraseña temporal"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-[#004C4C] mb-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200 pr-12"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Validación de contraseña en tiempo real */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                {validatePassword(newPassword).map((issue, index) => (
                  <p key={index} className="text-xs text-red-600 flex items-center space-x-1">
                    <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                    <span>{issue}</span>
                  </p>
                ))}
                {validatePassword(newPassword).length === 0 && (
                  <p className="text-xs text-green-600 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Contraseña válida</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-[#004C4C] mb-2">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200 pr-12"
                placeholder="Repite la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Validación de coincidencia */}
            {confirmPassword && (
              <div className="mt-1">
                {newPassword === confirmPassword ? (
                  <p className="text-xs text-green-600 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Las contraseñas coinciden</span>
                  </p>
                ) : (
                  <p className="text-xs text-red-600">Las contraseñas no coinciden</p>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || validatePassword(newPassword).length > 0 || newPassword !== confirmPassword}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white rounded-xl font-medium hover:from-[#065C5C] hover:to-[#0A6A6A] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Cambiando contraseña...</span>
                </div>
              ) : (
                'Cambiar Contraseña'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
