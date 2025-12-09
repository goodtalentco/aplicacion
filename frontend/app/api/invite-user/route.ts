/**
 * API Route para invitar usuarios usando Service Role Key
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
    const { email, redirectTo, userToken } = await request.json()

    if (!email || !userToken) {
      return NextResponse.json(
        { error: 'Email y token de usuario son requeridos' },
        { status: 400 }
      )
    }

    // Obtener el origin del request para determinar la URL base
    const origin = request.headers.get('origin') || 
                  request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                  `https://${request.headers.get('host')}`

    // Debug logging solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 API Route - Request Headers:', {
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        host: request.headers.get('host')
        // user-agent removido por privacidad
      })
      console.log('🔍 API Route - Determined origin:', origin)
      console.log('🔍 API Route - Request body:', { 
        email: email.substring(0, 3) + '***', // Email parcialmente oculto
        redirectTo 
      })
    }

    // Verificar que el usuario tiene permisos de admin
    // Crear cliente con el token del usuario para verificar permisos
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

    const canInviteUsers = permissions?.some(
      (p: any) => p.table_name === 'user_permissions' && p.action === 'create'
    )

    if (!canInviteUsers) {
      return NextResponse.json(
        { error: 'No tienes permisos para invitar usuarios' },
        { status: 403 }
      )
    }

    // Usar el redirectTo del frontend o construir con el origin del request
    const finalRedirectTo = redirectTo || `${origin}/auth/callback`
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 API Route - Final invite config:', {
        email: email.substring(0, 3) + '***',
        finalRedirectTo,
        originalRedirectTo: redirectTo,
        origin,
        timestamp: new Date().toISOString()
      })
    }
    
    // Invitar usuario usando Service Role Key
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: finalRedirectTo
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 API Route - Supabase invite response:', {
        success: !error,
        userId: data?.user?.id ? data.user.id.substring(0, 8) + '***' : undefined, // User ID parcialmente oculto
        error: error?.message,
        timestamp: new Date().toISOString()
      })
    }

    if (error) {
      console.error('Error inviting user:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      user: data.user 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
