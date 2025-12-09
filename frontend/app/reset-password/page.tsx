'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { translateError, PASSWORD_VALIDATION_MESSAGES } from '../../lib/errorMessages'

/**
 * Página para restablecer contraseña
 * Los usuarios llegan aquí desde el enlace enviado por correo
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)

  // Auto-ocultar errores después de 4 segundos
  const setErrorWithTimeout = (errorMessage: string) => {
    setError(errorMessage)
    if (errorMessage) {
      setTimeout(() => setError(''), 4000)
    }
  }

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Verificar si hay una sesión válida para reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setValidSession(true)
      } else {
        // Si no hay sesión, verificar si hay tokens en la URL
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (!error) {
            setValidSession(true)
          } else {
            setErrorWithTimeout('Enlace de recuperación inválido o expirado')
          }
        } else {
          setErrorWithTimeout('Enlace de recuperación inválido o expirado')
        }
      }
    }

    checkSession()
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validaciones
    if (password.length < 6) {
      setErrorWithTimeout(PASSWORD_VALIDATION_MESSAGES.TOO_SHORT)
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setErrorWithTimeout(PASSWORD_VALIDATION_MESSAGES.NO_MATCH)
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setErrorWithTimeout(translateError(error.message))
      } else {
        setSuccess(true)
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch (err) {
      setErrorWithTimeout('Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!validSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#004C4C] to-[#0A6A6A]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#87E0E0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#E6F5F7]">Verificando enlace de recuperación...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#004C4C] to-[#0A6A6A]">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#004C4C] mb-2">
              ¡Contraseña actualizada!
            </h1>
            <p className="text-gray-600 mb-6">
              Tu contraseña ha sido actualizada exitosamente. Serás redirigido al inicio de sesión.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-[#87E0E0] h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#004C4C] to-[#0A6A6A] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#004C4C] mb-2">
            Restablecer contraseña
          </h1>
          <p className="text-gray-600 text-sm">
            Ingresa tu nueva contraseña
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          
          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-[#004C4C] mb-2">
              Nueva contraseña
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-[#004C4C] mb-2">
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="Confirma tu nueva contraseña"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white rounded-xl font-medium hover:from-[#065C5C] hover:to-[#0A6A6A] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Actualizando...</span>
              </div>
            ) : (
              'Actualizar contraseña'
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-[#58BFC2] text-sm hover:text-[#004C4C] transition-colors font-medium"
            >
              Volver al inicio de sesión
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
