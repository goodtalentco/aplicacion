/**
 * API Route para que admins puedan resetear contraseñas de usuarios
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

interface ResetPasswordRequest {
  user_id: string
  new_password?: string
  userToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { 
      user_id, 
      new_password,
      userToken 
    }: ResetPasswordRequest = await request.json()

    // Validaciones básicas
    if (!user_id || !userToken) {
      return NextResponse.json(
        { error: 'ID de usuario y token son requeridos' },
        { status: 400 }
      )
    }

    // Debug logging solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Admin Reset Password API - Request:', {
        user_id: user_id.substring(0, 8) + '***',
        has_new_password: !!new_password,
        timestamp: new Date().toISOString()
      })
    }

    // Verificar permisos del usuario que hace la solicitud
    const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    })

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
        { error: 'No tienes permisos para resetear contraseñas' },
        { status: 403 }
      )
    }

    // Obtener información del usuario actual (quien hace la solicitud)
    const { data: currentUserData } = await userSupabase.auth.getUser()
    
    // Prevenir que un admin se resetee su propia contraseña por seguridad
    if (currentUserData.user?.id === user_id) {
      return NextResponse.json(
        { error: 'No puedes resetear tu propia contraseña. Usa el proceso de recuperación normal.' },
        { status: 400 }
      )
    }

    // Verificar que el usuario objetivo existe
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    
    if (userError || !targetUser.user) {
      console.error('Error finding target user:', userError)
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Generar nueva contraseña temporal si no se proporciona
    const tempPassword = new_password || generateTempPassword()

    // Actualizar contraseña del usuario
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: tempPassword }
    )

    if (updateError) {
      console.error('Error updating user password:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando contraseña' },
        { status: 500 }
      )
    }

    // Marcar como contraseña temporal en el perfil
    const { error: profileUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        is_temp_password: true,
        temp_password_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        updated_at: new Date(),
        updated_by: currentUserData.user?.id
      })
      .eq('user_id', user_id)

    if (profileUpdateError) {
      console.error('Error updating user profile:', profileUpdateError)
      // No fallar la operación por esto, la contraseña ya se actualizó
    }

    // Obtener información del perfil para la respuesta
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('alias, notification_email')
      .eq('user_id', user_id)
      .single()

    if (process.env.NODE_ENV === 'development') {
      console.log('🎉 Password reset successfully:', {
        userId: user_id.substring(0, 8) + '***',
        alias: userProfile?.alias?.substring(0, 3) + '***',
        tempPassword: tempPassword.substring(0, 2) + '***',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: user_id,
        alias: userProfile?.alias,
        notification_email: userProfile?.notification_email,
        temporary_password: tempPassword,
        is_temp_password: true
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Genera una contraseña temporal segura
 */
function generateTempPassword(): string {
  const adjectives = ['Rapido', 'Fuerte', 'Nuevo', 'Activo', 'Facil', 'Seguro']
  const nouns = ['Usuario', 'Acceso', 'Inicio', 'Portal', 'Sistema', 'Cuenta']
  const numbers = Math.floor(Math.random() * 999) + 100
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  
  return `${adjective}${noun}${numbers}`
}
