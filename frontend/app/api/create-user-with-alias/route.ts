/**
 * API Route para crear usuarios con alias y contraseña temporal
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

interface CreateUserRequest {
  alias: string
  notification_email: string
  display_name?: string
  temporary_password?: string
  userToken: string
}

export async function POST(request: NextRequest) {
  try {
    const { 
      alias, 
      notification_email, 
      display_name, 
      temporary_password,
      userToken 
    }: CreateUserRequest = await request.json()

    // Validaciones básicas
    if (!alias || !notification_email || !userToken) {
      return NextResponse.json(
        { error: 'Alias, email de notificaciones y token de usuario son requeridos' },
        { status: 400 }
      )
    }

    // Validar formato de alias
    const aliasRegex = /^[a-z0-9._-]+$/
    if (!aliasRegex.test(alias.toLowerCase())) {
      return NextResponse.json(
        { error: 'El alias solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(notification_email)) {
      return NextResponse.json(
        { error: 'El email de notificaciones no tiene un formato válido' },
        { status: 400 }
      )
    }

    // Debug logging solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Create User API - Request:', {
        alias: alias.substring(0, 3) + '***',
        notification_email: notification_email.substring(0, 3) + '***',
        display_name,
        has_temp_password: !!temporary_password,
        timestamp: new Date().toISOString()
      })
    }

    // Verificar permisos del usuario
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

    const canCreateUsers = permissions?.some(
      (p: any) => p.table_name === 'user_permissions' && p.action === 'create'
    )

    if (!canCreateUsers) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear usuarios' },
        { status: 403 }
      )
    }

    // Verificar si el alias ya existe - simplificado
    try {
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('alias')
        .eq('alias', alias.toLowerCase())
        .maybeSingle() // No falla si no encuentra nada
      
      if (existingProfile) {
        return NextResponse.json(
          { error: 'El alias ya está en uso. Por favor elige otro.' },
          { status: 400 }
        )
      }
    } catch (err) {
      console.error('Error checking alias:', err)
      // Continuar sin verificar - dejamos que la constraint UNIQUE maneje duplicados
    }

    // Generar email interno único - simplificado
    const randomSuffix = Math.random().toString(36).substring(2, 10)
    const internalEmail = `${alias.toLowerCase()}_${randomSuffix}@goodtalent.internal`

    // Generar contraseña temporal si no se proporciona
    const tempPassword = temporary_password || generateTempPassword()

    // Crear usuario en auth.users con email interno
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: tempPassword,
      email_confirm: true // Marcar email como confirmado automáticamente
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: `Error creando usuario: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Error: No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    // Obtener usuario actual para created_by
    const { data: currentUserData } = await userSupabase.auth.getUser()
    
    // Crear perfil de usuario - simplificado
    const { error: profileCreateError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        alias: alias.toLowerCase(),
        notification_email: notification_email.toLowerCase(),
        display_name: display_name || null,
        is_temp_password: true,
        temp_password_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        created_by: currentUserData.user?.id || null
      })

    if (profileCreateError) {
      console.error('Error creating user profile:', profileCreateError)
      
      // Limpiar usuario de auth si falla la creación del perfil
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: 'Error creando perfil de usuario' },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🎉 User created successfully:', {
        userId: authData.user.id.substring(0, 8) + '***',
        alias: alias.substring(0, 3) + '***',
        internalEmail: internalEmail.substring(0, 3) + '***',
        tempPassword: tempPassword.substring(0, 2) + '***',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: authData.user.id,
        alias,
        notification_email,
        display_name,
        internal_email: internalEmail,
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
