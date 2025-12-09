'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../lib/usePermissions'
import { sessionDebugger } from '../../lib/sessionDebugger'
import { supabase } from '../../lib/supabaseClient'
import Sidebar from '../../components/dashboard/Sidebar'
import Header from '../../components/dashboard/Header'
import BottomNavigation from '../../components/dashboard/BottomNavigation'

/**
 * Layout principal del dashboard con autenticación y navegación
 * MEJORADO con tracking de visibilidad y recuperación de sesión
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = usePermissions()
  const router = useRouter()
  const lastVisibleTime = useRef<number>(Date.now())

  // Redirigir si no hay usuario logueado
  useEffect(() => {
    if (!loading && !user) {
      sessionDebugger.warning('No hay usuario, redirigiendo a login')
      router.push('/')
    }
  }, [user, loading, router])

  // Tracking de visibilidad de pestaña para detectar inactividad
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Usuario dejó la pestaña
        lastVisibleTime.current = Date.now()
        sessionDebugger.info('⏸️  Pestaña oculta (usuario inactivo)')
      } else {
        // Usuario regresó a la pestaña
        const inactiveDuration = Math.floor((Date.now() - lastVisibleTime.current) / 1000)
        sessionDebugger.userReturned(inactiveDuration)
        
        // Si estuvo inactivo más de 5 minutos, verificar sesión activamente
        if (inactiveDuration > 300 && user) {
          sessionDebugger.info('Verificando sesión después de inactividad prolongada...')
          
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            sessionDebugger.error('Error verificando sesión al regresar', error)
          } else if (!session) {
            sessionDebugger.problemDetected('Sesión perdida durante inactividad', {
              inactiveDuration,
              lastVisibleTime: new Date(lastVisibleTime.current).toISOString()
            })
            // Sesión perdida - redirigir a login
            router.push('/')
          } else {
            // Sesión válida
            const now = Math.floor(Date.now() / 1000)
            const expiresAt = session.expires_at || 0
            const timeUntilExpiry = expiresAt - now
            
            sessionDebugger.success('Sesión válida al regresar', {
              expiresIn: `${timeUntilExpiry}s`
            })
            
            // Si está próximo a expirar, refrescar proactivamente
            if (timeUntilExpiry < 600) {
              sessionDebugger.sessionRefreshAttempt('Refresh proactivo al regresar')
              const { error: refreshError } = await supabase.auth.refreshSession()
              
              if (refreshError) {
                sessionDebugger.sessionRefreshFailed(refreshError)
              } else {
                sessionDebugger.success('Sesión refrescada al regresar')
              }
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#87E0E0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#065C5C] font-medium">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Se está redirigiendo
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  )
}
