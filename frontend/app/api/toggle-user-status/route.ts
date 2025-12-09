/**
 * API Route para activar/desactivar usuarios usando Service Role Key
 * Solo disponible para usuarios con permisos de admin
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

// Cliente admin para operaciones administrativas
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { userId, action, userToken } = await request.json()

    if (!userId || !action || !userToken) {
      return NextResponse.json(
        { error: 'userId, action y token de usuario son requeridos' },
        { status: 400 }
      )
    }

    if (!['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Action debe ser "activate" o "deactivate"' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tiene permisos de admin
    const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    })

    // Verificar permisos del usuario
    const { data: permissions, error: permError } = await userSupabase.rpc('my_permissions')
    
    if (permError) {
      console.error('Error checking permissions:', permError)
      return NextResponse.json(
        { error: 'Error verificando permisos' },
        { status: 403 }
      )
    }

    const canManageUsers = permissions?.some(
      (p: any) => p.table_name === 'user_permissions' && p.action === 'edit'
    )

    if (!canManageUsers) {
      return NextResponse.json(
        { error: 'No tienes permisos para gestionar usuarios' },
        { status: 403 }
      )
    }

    // Obtener usuario que está haciendo la acción
    const { data: { user: actionUser } } = await userSupabase.auth.getUser()
    
    // Prevenir autodesactivación
    if (action === 'deactivate' && actionUser?.id === userId) {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propia cuenta' },
        { status: 400 }
      )
    }

    // Obtener información del usuario actual DESPUÉS de las validaciones básicas
    const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (!currentUser.user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Debug del estado actual del usuario
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Current user state:', {
        userId: userId.substring(0, 8) + '***',
        banned_until: (currentUser.user as any).banned_until,
        email_confirmed_at: currentUser.user.email_confirmed_at,
        user_metadata: currentUser.user.user_metadata,
        app_metadata: currentUser.user.app_metadata
      })
    }

    // Ejecutar acción usando Service Role Key (sin validaciones previas de estado)
    let result
    if (action === 'activate') {
      // Activar usuario - remover ban
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Activating user with ban_duration: none')
      }
      result = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none'
      })
    } else {
      // Desactivar usuario - agregar ban indefinido
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Deactivating user with ban_duration: 876000h')
      }
      result = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h' // ~100 años en horas
      })
    }
    
    // Debug logging del resultado
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Supabase action result:', {
        success: !result.error,
        error: result.error?.message,
        userId: userId.substring(0, 8) + '***',
        newUserState: result.data?.user ? {
          banned_until: (result.data.user as any).banned_until,
          email: result.data.user.email?.substring(0, 3) + '***'
        } : 'no user data'
      })
    }

    if (result.error) {
      console.error('Error updating user status:', result.error)
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    // Debug logging solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 User ${action}d successfully:`, {
        userId: userId.substring(0, 8) + '***',
        action,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Usuario ${action === 'activate' ? 'activado' : 'desactivado'} correctamente`,
      user: result.data.user
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
