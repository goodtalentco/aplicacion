/**
 * Context Provider global para gestión de permisos
 * Carga los permisos UNA SOLA VEZ por sesión y los mantiene en memoria
 * 
 * MEJORADO con debugging y manejo robusto de sesiones
 */

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { sessionDebugger } from './sessionDebugger'

export interface UserPermission {
  table_name: string
  action: string
  description: string
  granted_at: string
}

export interface AvailablePermission {
  id: string
  table_name: string
  action: string
  description: string
  is_active: boolean
}

interface PermissionsContextType {
  // Estado del usuario y permisos
  user: User | null
  permissions: UserPermission[]
  loading: boolean
  
  // Funciones de verificación
  hasPermission: (tableName: string, action: string) => boolean
  canManageUsers: () => boolean
  canManageAuxTables: () => boolean
  isSuperAdmin: () => boolean
  
  // Funciones de control
  refreshPermissions: () => Promise<void>
  forceRefresh: () => void
  logout: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

interface PermissionsProviderProps {
  children: React.ReactNode
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Cache de permisos - cache más agresivo para evitar esperas de 15s en cold start
  const CACHE_DURATION = 60 * 60 * 1000 // 1 hora (optimizado para UX)
  
  // Session refresh automático cada 30 segundos para evitar problemas de inactividad
  const SESSION_CHECK_INTERVAL = 30 * 1000 // 30 segundos
  
  // Timeout para llamadas RPC (prevenir cuelgue infinito)
  const RPC_TIMEOUT = 15 * 1000 // 15 segundos
  
  // Tracking de inactividad del usuario
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now())
  
  // NUEVO: Lock para prevenir llamadas duplicadas simultáneas
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)
  const loadingLockRef = useRef(false)

  const fetchUserPermissions = useCallback(async (currentUser: User) => {
    // NUEVO: Verificar lock para prevenir llamadas duplicadas
    if (loadingLockRef.current) {
      sessionDebugger.warning('⚠️ Carga de permisos ya en progreso, saltando llamada duplicada', {
        userId: currentUser.id
      })
      return
    }

    // Activar lock
    loadingLockRef.current = true
    setIsLoadingPermissions(true)
    sessionDebugger.debug('🔒 Lock de carga activado', { userId: currentUser.id })

    try {
      // Verificar cache en localStorage
      const cacheKey = `permissions_${currentUser.id}`
      const cachedData = localStorage.getItem(cacheKey)
      
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData)
          const cacheAge = Date.now() - parsed.timestamp
          
          if (cacheAge < CACHE_DURATION) {
            sessionDebugger.cacheStatus(cacheKey, 'hit')
            setPermissions(parsed.permissions)
            setLastFetch(new Date(parsed.timestamp))
            return
          } else {
            sessionDebugger.cacheStatus(cacheKey, 'stale')
            localStorage.removeItem(cacheKey)
          }
        } catch (e) {
          sessionDebugger.warning('Cache corrupto, limpiando', { cacheKey, error: e })
          localStorage.removeItem(cacheKey)
        }
      } else {
        sessionDebugger.cacheStatus(cacheKey, 'miss')
      }

      // NUEVO: Llamada con timeout para prevenir cuelgue infinito
      sessionDebugger.info('Cargando permisos desde Supabase (timeout: 15s)', { userId: currentUser.id })
      
      const permissionsPromise = supabase.rpc('my_permissions')
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: my_permissions tardó más de 15 segundos')), RPC_TIMEOUT)
      )
      
      const { data, error } = await Promise.race([
        permissionsPromise,
        timeoutPromise
      ]) as any
      
      if (error) {
        sessionDebugger.error('Error cargando permisos', error)
        setPermissions([])
        return
      }

      const permissionsData = data || []
      
      // Guardar en cache
      localStorage.setItem(cacheKey, JSON.stringify({
        permissions: permissionsData,
        timestamp: Date.now()
      }))
      
      sessionDebugger.success('Permisos cargados exitosamente', { 
        count: permissionsData.length,
        cached: true
      })
      
      setPermissions(permissionsData)
      setLastFetch(new Date())
      
    } catch (error) {
      sessionDebugger.error('Excepción cargando permisos', error)
      setPermissions([])
      
      // Si es timeout, dar más información
      if (error instanceof Error && error.message.includes('Timeout')) {
        sessionDebugger.problemDetected('Timeout en carga de permisos', {
          duracion: '> 15 segundos',
          posibleCausa: 'RPC my_permissions no responde',
          solucion: 'Recargar página o verificar conexión'
        })
      }
    } finally {
      // IMPORTANTE: Siempre desactivar lock
      loadingLockRef.current = false
      setIsLoadingPermissions(false)
      sessionDebugger.debug('🔓 Lock de carga desactivado')
    }
  }, []) // SIN dependencias para evitar loops

  const initializeAuth = useCallback(async () => {
    if (isInitialized) {
      sessionDebugger.debug('Auth ya inicializado, saltando')
      return
    }
    
    try {
      sessionDebugger.info('Inicializando autenticación...')
      
      // Obtener sesión actual
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        sessionDebugger.error('Error obteniendo sesión', error)
        setLoading(false)
        setUser(null)
        setPermissions([])
        return
      }

      if (session?.user) {
        sessionDebugger.sessionInitialized(
          session.user, 
          session.expires_at || 0
        )
        setUser(session.user)
        setLastActivityTime(Date.now())
        
        // MEJORA: Verificar si hay cache antes de bloquear
        const cacheKey = `permissions_${session.user.id}`
        const cachedData = localStorage.getItem(cacheKey)
        
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData)
            const cacheAge = Date.now() - parsed.timestamp
            
            // Si hay cache (aunque sea viejo), usarlo inmediatamente
            if (parsed.permissions && parsed.permissions.length > 0) {
              sessionDebugger.info('✨ Usando cache para entrada rápida', {
                age: `${Math.floor(cacheAge / 1000)}s`,
                count: parsed.permissions.length
              })
              setPermissions(parsed.permissions)
              setLastFetch(new Date(parsed.timestamp))
              setLoading(false) // ← IMPORTANTE: Permitir entrada inmediata
              
              // Si el cache es viejo (> 5 min), recargar en background
              if (cacheAge > 5 * 60 * 1000) {
                sessionDebugger.info('🔄 Actualizando permisos en background (cache > 5min)')
                fetchUserPermissions(session.user) // Sin await - en background
              }
              
              setIsInitialized(true)
              return
            }
          } catch (e) {
            sessionDebugger.warning('Cache corrupto en init', e)
          }
        }
        
        // Si NO hay cache, cargar normalmente (bloquear)
        setLoading(true)
        await fetchUserPermissions(session.user)
        setLoading(false)
      } else {
        sessionDebugger.warning('No hay sesión activa')
        setUser(null)
        setPermissions([])
        setLoading(false)
      }
      
      setIsInitialized(true)
    } catch (error) {
      sessionDebugger.error('Error inicializando auth', error)
      setUser(null)
      setPermissions([])
      setLoading(false)
    }
  }, [isInitialized]) // Depende de isInitialized

  // Inicializar al montar - SOLO UNA VEZ
  useEffect(() => {
    initializeAuth()
  }, []) // SIN dependencias - solo al montar

  // Listener MÍNIMO para login/logout - SOLO para eventos críticos
  useEffect(() => {
    let lastEventTime = 0
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Debounce para evitar eventos duplicados
        const now = Date.now()
        if (now - lastEventTime < 1000) {
          sessionDebugger.debug('Evento auth duplicado ignorado', { event })
          return
        }
        lastEventTime = now
        
        sessionDebugger.info(`Auth State Change: ${event}`, { 
          hasSession: !!session, 
          hasUser: !!session?.user 
        })
        
        if (event === 'SIGNED_IN' && session?.user && !user) {
          sessionDebugger.success('Usuario autenticado', { email: session.user.email })
          setUser(session.user)
          setLastActivityTime(Date.now())
          
          // NUEVO: Solo cargar si no está ya cargando (prevenir duplicados)
          if (!loadingLockRef.current) {
            await fetchUserPermissions(session.user)
          } else {
            sessionDebugger.debug('Carga ya en progreso desde initializeAuth, saltando')
          }
        } else if (event === 'SIGNED_OUT') {
          sessionDebugger.warning('Sesión cerrada')
          setUser(null)
          setPermissions([])
          setLastFetch(null)
          setIsInitialized(false)
          // Limpiar cache
          const keys = Object.keys(localStorage)
          keys.forEach(key => {
            if (key.startsWith('permissions_') || key.startsWith('companies_') || key.startsWith('users_')) {
              localStorage.removeItem(key)
              sessionDebugger.cacheStatus(key, 'cleared')
            }
          })
        } else if (event === 'TOKEN_REFRESHED') {
          sessionDebugger.success('Token refrescado por Supabase', {
            expiresAt: session?.expires_at
          })
          setLastActivityTime(Date.now())
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [user]) // Depende de user para evitar duplicados

  // Logout handler - limpiar cache
  const handleLogout = useCallback(async () => {
    try {
      sessionDebugger.info('Iniciando logout...')
      
      // Limpiar cache de localStorage
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('permissions_') || key.startsWith('companies_') || key.startsWith('users_')) {
          localStorage.removeItem(key)
          sessionDebugger.cacheStatus(key, 'cleared')
        }
      })
      
      // Limpiar estado
      setUser(null)
      setPermissions([])
      setLastFetch(null)
      setIsInitialized(false)
      
      // Llamar logout de Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        sessionDebugger.error('Error en signOut', error)
      } else {
        sessionDebugger.success('Logout exitoso')
      }
      
    } catch (error) {
      sessionDebugger.error('Excepción durante logout', error)
    }
  }, [])

  // Session refresh MEJORADO - más proactivo y con mejor diagnóstico
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const now = Date.now() / 1000
          const expiresAt = session.expires_at || 0
          const timeUntilExpiry = Math.floor(expiresAt - now)
          
          // Calcular tiempo de inactividad
          const inactiveTime = Math.floor((Date.now() - lastActivityTime) / 1000)
          const warnings: string[] = []
          
          if (inactiveTime > 300) { // 5 minutos de inactividad
            warnings.push(`Inactivo por ${inactiveTime}s`)
            sessionDebugger.userInactive(inactiveTime)
          }
          
          // CAMBIO CRÍTICO: Refrescar si quedan menos de 10 minutos (antes era 5)
          // Esto da más margen en caso de que el navegador esté en sleep
          if (timeUntilExpiry < 600) {
            warnings.push('Sesión próxima a expirar')
            sessionDebugger.sessionRefreshAttempt(`Quedan ${timeUntilExpiry}s para expiración`)
            
            const { data, error } = await supabase.auth.refreshSession()
            
            if (error) {
              sessionDebugger.sessionRefreshFailed(error)
              
              // Si el refresh falla, verificar si realmente perdimos la sesión
              const { data: { session: currentSession } } = await supabase.auth.getSession()
              if (!currentSession) {
                sessionDebugger.problemDetected('Sesión perdida después de refresh fallido', {
                  lastError: error,
                  inactiveTime,
                  lastActivity: new Date(lastActivityTime).toISOString()
                })
              }
            } else if (data?.session) {
              sessionDebugger.sessionRefreshSuccess(data.session.expires_at || 0)
              setLastActivityTime(Date.now()) // Actualizar última actividad
            }
          } else {
            // Solo log periódico si todo está bien
            sessionDebugger.sessionCheck(true, timeUntilExpiry, warnings.length > 0 ? warnings : undefined)
          }
        } else {
          // No hay sesión - PROBLEMA CRÍTICO
          sessionDebugger.problemDetected('No hay sesión en check periódico', {
            lastActivityTime: new Date(lastActivityTime).toISOString(),
            inactiveDuration: Math.floor((Date.now() - lastActivityTime) / 1000)
          })
        }
      } catch (error) {
        sessionDebugger.error('Session check falló con excepción', error)
      }
    }, SESSION_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [user?.id, lastActivityTime])

  // Funciones de verificación de permisos
  const hasPermission = useCallback((tableName: string, action: string): boolean => {
    return permissions.some(
      permission => 
        permission.table_name === tableName && 
        permission.action === action
    )
  }, [permissions])

  const canManageUsers = useCallback((): boolean => {
    return hasPermission('user_permissions', 'create') && 
           hasPermission('user_permissions', 'view')
  }, [hasPermission])

  const canManageAuxTables = useCallback((): boolean => {
    return hasPermission('tablas_auxiliares', 'view')
  }, [hasPermission])

  const isSuperAdmin = useCallback((): boolean => {
    return hasPermission('user_permissions', 'create') && 
           hasPermission('user_permissions', 'delete')
  }, [hasPermission])

  // Función para refrescar permisos manualmente
  const refreshPermissions = useCallback(async () => {
    if (!user) {
      console.warn('⚠️ Cannot refresh permissions: no user')
      return
    }
    
    console.log('🔄 Manual permissions refresh requested')
    setLoading(true)
    try {
      await fetchUserPermissions(user)
    } finally {
      setLoading(false)
    }
  }, [user]) // Solo depende del usuario

  // Función para forzar refresh completo
  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refresh requested')
    setLastFetch(null) // Resetear cache
    if (user) {
      fetchUserPermissions(user)
    } else {
      initializeAuth()
    }
  }, [user]) // Solo depende del usuario

  // Valores del contexto
  const contextValue: PermissionsContextType = {
    user,
    permissions,
    loading,
    hasPermission,
    canManageUsers,
    canManageAuxTables,
    isSuperAdmin,
    refreshPermissions,
    forceRefresh,
    logout: handleLogout
  }

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  )
}

// Hook para usar el contexto
export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext)
  
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  
  return context
}

// Hook para obtener permisos disponibles (mantener separado)
export function useAvailablePermissions() {
  const [permissions, setPermissions] = useState<AvailablePermission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('permissions')
          .select('*')
          .eq('is_active', true)
          .order('table_name', { ascending: true })
          .order('action', { ascending: true })

        if (error) {
          console.error('Error fetching available permissions:', error)
          return
        }

        setPermissions(data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  // Agrupar permisos por tabla
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.table_name]) {
      acc[permission.table_name] = []
    }
    acc[permission.table_name].push(permission)
    return acc
  }, {} as Record<string, AvailablePermission[]>)

  return {
    permissions,
    groupedPermissions,
    loading
  }
}
