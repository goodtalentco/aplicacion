/**
 * Ultra-modern LoginForm with glassmorphism design
 * Integrated with new dynamic layout and forgot password functionality
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ForgotPasswordForm from './ForgotPasswordForm'
import { translateError } from '../lib/errorMessages'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const router = useRouter()

  // Auto-ocultar errores después de 4 segundos
  const setErrorWithTimeout = (errorMessage: string) => {
    setError(errorMessage)
    if (errorMessage) {
      setTimeout(() => setError(''), 4000)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let loginEmail = email
      
      // Si no contiene @, asumir que es un alias y convertir a email interno
      if (!email.includes('@')) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .rpc('get_user_profile_by_alias', { alias_param: email.toLowerCase() })
          
          if (profileError || !profileData || profileData.length === 0) {
            setErrorWithTimeout('Usuario no encontrado')
            setLoading(false)
            return
          }
          
          loginEmail = profileData[0].auth_email
        } catch (err) {
          setErrorWithTimeout('Error buscando usuario')
          setLoading(false)
          return
        }
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (authError) {
        setErrorWithTimeout(translateError(authError.message))
      } else {
        // Verificar si tiene contraseña temporal
        if (data.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('is_temp_password, temp_password_expires_at')
            .eq('user_id', data.user.id)
            .single()
          
          if (profileData?.is_temp_password) {
            // Redirigir a cambio de contraseña obligatorio
            router.push('/dashboard?change_password=required')
          } else {
            // Login normal - redirect to dashboard
            router.push('/dashboard')
          }
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      setErrorWithTimeout('Error inesperado durante el inicio de sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-[#004C4C] mb-2 lg:mb-3">
          Acceso seguro
        </h2>
        <p className="text-sm lg:text-base text-[#065C5C] font-medium">
          Ingresa a tu dashboard inteligente
        </p>
        
        {/* Dynamic decoration */}
        <div className="flex justify-center mt-3 lg:mt-4 space-x-1">
          <div className="w-8 h-1 bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] rounded-full"></div>
          <div className="w-4 h-1 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] rounded-full"></div>
          <div className="w-2 h-1 bg-[#58BFC2] rounded-full"></div>
        </div>
      </div>

      {/* Success Message for Password Reset */}
      {forgotPasswordSuccess && (
        <div className="mb-6 p-4 bg-green-50 bg-opacity-80 backdrop-blur-sm border border-green-200 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <p className="text-green-700 text-sm font-medium">
              Si tu correo está registrado, recibirás un enlace de recuperación en tu bandeja de entrada.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 bg-opacity-80 backdrop-blur-sm border border-red-200 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-5 lg:space-y-6">
        
        {/* Email Field */}
        <div className="relative">
          <label htmlFor="email" className="block text-sm font-bold text-[#004C4C] mb-2 lg:mb-3">
            Usuario o Correo electrónico
          </label>
          <div className="relative">
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-white bg-opacity-60 backdrop-blur-sm border-2 border-[#87E0E0] border-opacity-30 rounded-xl lg:rounded-2xl focus:outline-none focus:border-[#5FD3D2] focus:border-opacity-60 focus:bg-opacity-80 transition-all duration-300 text-[#004C4C] placeholder-[#065C5C] placeholder-opacity-60 font-medium text-sm lg:text-base"
              placeholder="tu_alias o ejemplo@goodtalent.com"
            />
            {/* Field accent */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] rounded-full transform scale-x-0 transition-transform duration-300 focus-within:scale-x-100"></div>
          </div>
        </div>

        {/* Password Field */}
        <div className="relative">
          <label htmlFor="password" className="block text-sm font-bold text-[#004C4C] mb-2 lg:mb-3">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 lg:px-5 pr-12 py-3 lg:py-4 bg-white bg-opacity-60 backdrop-blur-sm border-2 border-[#87E0E0] border-opacity-30 rounded-xl lg:rounded-2xl focus:outline-none focus:border-[#5FD3D2] focus:border-opacity-60 focus:bg-opacity-80 transition-all duration-300 text-[#004C4C] font-medium text-sm lg:text-base"
              placeholder="••••••••••••••••"
            />
            
            {/* Password Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-[#065C5C] hover:text-[#004C4C] hover:bg-[#87E0E0] hover:bg-opacity-20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#5FD3D2] focus:ring-opacity-50"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
            
            {/* Field accent */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] rounded-full transform scale-x-0 transition-transform duration-300 focus-within:scale-x-100"></div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full relative overflow-hidden bg-gradient-to-r from-[#004C4C] via-[#065C5C] to-[#0A6A6A] hover:from-[#5FD3D2] hover:via-[#58BFC2] hover:to-[#87E0E0] text-white font-bold py-3 lg:py-4 px-6 rounded-xl lg:rounded-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl group"
        >
          {/* Button glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl lg:rounded-2xl"></div>
          
          <div className="relative z-10">
            {loading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-4 lg:w-5 h-4 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-base lg:text-lg">Accediendo...</span>
              </div>
            ) : (
              <span className="text-base lg:text-lg">Acceder al dashboard</span>
            )}
          </div>
        </button>
      </form>

      {/* Footer Links */}
      <div className="mt-6 lg:mt-8 text-center">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="inline-block text-[#58BFC2] hover:text-[#004C4C] transition-colors duration-200 font-medium border-b-2 border-transparent hover:border-[#58BFC2] pb-1 text-sm lg:text-base"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordForm
          onClose={() => setShowForgotPassword(false)}
          onSuccess={() => {
            setShowForgotPassword(false)
            setForgotPasswordSuccess(true)
            // Ocultar mensaje de éxito después de 5 segundos
            setTimeout(() => setForgotPasswordSuccess(false), 5000)
          }}
        />
      )}
    </div>
  )
}