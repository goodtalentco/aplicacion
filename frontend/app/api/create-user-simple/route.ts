/**
 * API Route SIMPLE para crear usuarios con alias
 * Versión simplificada sin dependencias complejas
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables')
}

// Cliente admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { alias, notification_email, display_name, temporary_password, userToken } = await request.json()

    if (!alias || !notification_email || !userToken) {
      return NextResponse.json(
        { error: 'Alias, email y token son requeridos' },
        { status: 400 }
      )
    }

    console.log('🔍 Creating user with alias:', alias)

    // Generar email interno y contraseña
    const randomSuffix = Math.random().toString(36).substring(2, 10)
    const internalEmail = `${alias.toLowerCase()}_${randomSuffix}@goodtalent.internal`
    const tempPassword = temporary_password || `Temp${Math.floor(Math.random() * 9999)}`

    console.log('🔍 Internal email:', internalEmail)

    // 1. Crear usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: tempPassword,
      email_confirm: true
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: `Error creando usuario: ${authError?.message}` },
        { status: 400 }
      )
    }

    console.log('✅ Auth user created:', authData.user.id)

    // 2. Crear perfil simple
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        alias: alias.toLowerCase(),
        notification_email: notification_email.toLowerCase(),
        display_name: display_name || null,
        is_temp_password: true
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      
      // Limpiar usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: `Error creando perfil: ${profileError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Profile created successfully')

    return NextResponse.json({ 
      success: true,
      user: {
        id: authData.user.id,
        alias: alias.toLowerCase(),
        notification_email: notification_email.toLowerCase(),
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
