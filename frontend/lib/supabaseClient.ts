/**
 * Supabase client configuration for GOOD Talent authentication
 * Initializes the Supabase client using environment variables
 * 
 * CONFIGURACIÓN EXPLÍCITA para garantizar comportamiento consistente en producción
 */

import { createClient } from '@supabase/supabase-js'
import { sessionDebugger } from './sessionDebugger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cliente normal para operaciones de usuario
// Configuración explícita de auth para garantizar consistencia en producción
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Refrescar token automáticamente antes de expirar
    autoRefreshToken: true,
    
    // Persistir sesión en localStorage
    persistSession: true,
    
    // Detectar sesión en URL (para callbacks de auth)
    detectSessionInUrl: true,
    
    // Storage explícito (localStorage del navegador)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    
    // Flow type para autenticación
    flowType: 'pkce'
  }
})

// Log de inicialización
if (typeof window !== 'undefined') {
  sessionDebugger.success('Cliente Supabase inicializado', {
    url: supabaseUrl,
    config: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
}

// Cliente admin para operaciones administrativas (solo en servidor)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null