/**
 * Página de callback para confirmación de email y establecimiento de contraseña
 * Maneja el proceso de invitación de usuarios
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isValidToken, setIsValidToken] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Processing auth callback...')
        }
        
        // Verificar si hay hash fragments (Supabase usa #)
        const hash = window.location.hash
        const search = window.location.search
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Hash available:', !!hash)
          console.log('🔍 Search available:', !!search)
        }
        
        // Primero intentar obtener la sesión actual
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          setError('Error procesando la invitación')
          setLoading(false)
          return
        }

        // Si hay hash con type=invite, es definitivamente una invitación
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const type = hashParams.get('type')
          const accessToken = hashParams.get('access_token')
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Hash type:', type)
            console.log('🔍 Has access token:', !!accessToken)
          }
          
          if (type === 'invite' && accessToken) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🎯 Detected invite type from hash')
            }
            
            if (sessionData.session?.user) {
              const user = sessionData.session.user
              if (process.env.NODE_ENV === 'development') {
                console.log('🔍 User from session:', user.email?.substring(0, 3) + '***')
              }
              
              setUserEmail(user.email || '')
              setIsValidToken(true)
              setLoading(false)
              return
            }
          }
        }

        // Método alternativo más robusto: verificar query parameters
        const urlParams = new URLSearchParams(search)
        const type = urlParams.get('type')
        
        if (type === 'invite') {
          if (process.env.NODE_ENV === 'development') {
            console.log('🎯 Detected invite type from query params')
          }
          
          if (sessionData.session?.user) {
            const user = sessionData.session.user
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 User from session:', user.email?.substring(0, 3) + '***')
            }
            
            setUserEmail(user.email || '')
            setIsValidToken(true)
            setLoading(false)
            return
          }
        }

        // Método de respaldo: verificar por características del usuario
        if (sessionData.session?.user) {
          const user = sessionData.session.user
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Checking user characteristics:', {
              email: user.email?.substring(0, 3) + '***',
              email_confirmed_at: !!user.email_confirmed_at,
              created_at: !!user.created_at,
              last_sign_in_at: !!user.last_sign_in_at
            })
          }
          
          // Si el usuario nunca ha hecho login pero está confirmado = invitación
          if (user.email_confirmed_at && !user.last_sign_in_at) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🎯 Detected invite by login pattern')
            }
            setUserEmail(user.email || '')
            setIsValidToken(true)
            setLoading(false)
            return
          }
          
          // Si ya hay sesión establecida y ha hecho login antes, ir al dashboard
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Existing user, redirecting to dashboard')
          }
          router.push('/dashboard')
          return
        }

        // Si llegamos aquí, no hay sesión válida
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ No valid session found')
        }
        setError('Link de invitación inválido o expirado')
        
      } catch (err) {
        console.error('Callback error:', err)
        setError('Error procesando la invitación')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      // Actualizar la contraseña del usuario
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      // Redirigir al dashboard
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Error setting password:', error)
      setError(error.message || 'Error estableciendo la contraseña')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5F7] via-white to-[#87E0E0] flex items-center justify-center p-4">
        <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#5FD3D2] mb-4" />
          <p className="text-[#004C4C] font-medium">Procesando invitación...</p>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E6F5F7] via-white to-[#87E0E0] flex items-center justify-center p-4">
        <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#004C4C] mb-2">
            Invitación Inválida
          </h1>
          <p className="text-[#065C5C] mb-6">
            {error || 'El link de invitación es inválido o ha expirado.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-[#5FD3D2] text-white rounded-lg hover:bg-[#58BFC2] transition-colors font-medium"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F5F7] via-white to-[#87E0E0] flex items-center justify-center p-4">
      <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#004C4C] mb-2">
            ¡Bienvenido a GOOD Talent!
          </h1>
          <p className="text-[#065C5C]">
            Hola <span className="font-medium">{userEmail}</span>, establece tu contraseña para completar el registro.
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-6">
          {/* Nueva contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#004C4C] mb-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#004C4C] mb-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
                placeholder="Repite tu contraseña"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password || !confirmPassword}
            className="w-full py-3 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Estableciendo contraseña...</span>
              </>
            ) : (
              <span>Establecer contraseña</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
