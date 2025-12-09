'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../lib/usePermissions'
import { 
  Bell, 
  LogOut, 
  User as UserIcon,
  ChevronDown,
  Users,
  Settings,
  Database
} from 'lucide-react'

/**
 * Header principal del dashboard con usuario, notificaciones y búsqueda
 */
export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userProfile, setUserProfile] = useState<{alias: string, display_name?: string, notification_email: string} | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user, canManageUsers, canManageAuxTables, logout } = usePermissions()

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  // Cargar perfil del usuario
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return
      
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('alias, display_name, notification_email')
          .eq('user_id', user.id)
          .single()
        
        if (profile) {
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }

    loadUserProfile()
  }, [user?.id])

  const handleLogout = async () => {
    try {
      setShowUserMenu(false) // Cerrar menú inmediatamente
      
      // Usar la función de logout del contexto
      await logout()
      
      // Redirigir después del logout
      router.push('/')
      router.refresh()
      
    } catch (error) {
      console.error('Error during logout:', error)
      // Fallback: forzar redirect
      window.location.href = '/'
    }
  }

  const handleUserManagement = () => {
    setShowUserMenu(false)
    router.push('/dashboard/gestion-usuarios')
  }

  const handleAuxiliaryTables = () => {
    setShowUserMenu(false)
    router.push('/dashboard/tablas-auxiliares')
  }

  return (
    <header className="bg-gradient-to-r from-[#E6F5F7] via-white to-[#E6F5F7] border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 py-4">
        
                {/* Mobile Logo */}
        <div className="lg:hidden flex items-center justify-center">
          <img 
            src="https://irvgruylufihzoveycph.supabase.co/storage/v1/object/public/generales/Logo.png"
            alt="GOOD Talent Logo"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Spacer for desktop - no search */}
        <div className="hidden lg:block flex-1"></div>

        {/* Right Side - Notifications + User */}
        <div className="flex items-center space-x-4">
          
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-[#004C4C] hover:bg-gray-100 rounded-xl transition-all duration-200">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              3
            </span>
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              {/* Avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-[#87E0E0] to-[#5FD3D2] rounded-full flex items-center justify-center">
                {userProfile?.alias ? (
                  <span className="text-[#004C4C] font-semibold text-sm">
                    {userProfile.alias.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <UserIcon className="h-4 w-4 text-[#004C4C]" />
                )}
              </div>
              
              {/* User Info */}
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-gray-900">
                  {userProfile?.alias || user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">
                  {userProfile?.display_name || userProfile?.notification_email || user?.email || 'Usuario'}
                </p>
              </div>
              
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    {userProfile?.alias || user?.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userProfile?.display_name || userProfile?.notification_email || user?.email || 'Usuario'}
                  </p>
                </div>
                
                <div className="py-2">
                  {(canManageUsers() || canManageAuxTables()) && (
                    <>
                      {canManageUsers() && (
                        <button
                          onClick={handleUserManagement}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <Users className="h-4 w-4 mr-3" />
                          Gestión de usuarios
                        </button>
                      )}
                      
                      {canManageAuxTables() && (
                        <button
                          onClick={handleAuxiliaryTables}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <Database className="h-4 w-4 mr-3" />
                          Tablas auxiliares
                        </button>
                      )}
                      
                      <div className="border-t border-gray-100 my-2"></div>
                    </>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
