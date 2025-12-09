'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { translateError, EMAIL_VALIDATION_MESSAGES, checkEmailExists } from '../lib/errorMessages'

interface ForgotPasswordFormProps {
  onClose: () => void
  onSuccess: () => void
}

/**
 * Componente para solicitar restablecimiento de contraseña
 * Envía email de recuperación usando Supabase Auth
 */
export default function ForgotPasswordForm({ onClose, onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-ocultar errores después de 4 segundos
  const setErrorWithTimeout = (errorMessage: string) => {
    setError(errorMessage)
    if (errorMessage) {
      setTimeout(() => setError(''), 4000)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setErrorWithTimeout(EMAIL_VALIDATION_MESSAGES.INVALID_FORMAT)
        setLoading(false)
        return
      }

      // Enfoque estándar más seguro: siempre enviar el email sin verificar existencia
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        // Solo mostrar errores técnicos reales (formato, rate limiting, etc)
        setErrorWithTimeout(translateError(error.message))
      } else {
        // Siempre mostrar éxito, sin revelar si el email existe o no
        onSuccess()
      }

    } catch (err) {
      setErrorWithTimeout('Error al enviar el correo de recuperación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#004C4C] mb-2">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-gray-600 text-sm">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          
          {/* Email Input */}
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-[#004C4C] mb-2">
              Correo electrónico
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="tu@correo.com"
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
            disabled={loading || !email}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white rounded-xl font-medium hover:from-[#065C5C] hover:to-[#0A6A6A] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando...</span>
              </div>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              onClick={onClose}
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
