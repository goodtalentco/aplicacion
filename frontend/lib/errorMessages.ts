/**
 * Utility para traducir mensajes de error de Supabase al español
 * y proporcionar mensajes más amigables para usuarios
 */

interface ErrorTranslations {
  [key: string]: string
}

const ERROR_TRANSLATIONS: ErrorTranslations = {
  // Auth errors - Login
  'Invalid login credentials': 'Credenciales incorrectas. Verifica tu correo y contraseña.',
  'Email not confirmed': 'Por favor confirma tu correo electrónico antes de iniciar sesión.',
  'Invalid email or password': 'Correo o contraseña incorrectos.',
  'User not found': 'No existe una cuenta con este correo electrónico.',
  'Wrong password': 'La contraseña es incorrecta.',
  'Account not found': 'No se encontró una cuenta con este correo.',
  
  // Auth errors - Password Reset
  'Unable to validate email address: invalid format': 'El formato del correo electrónico no es válido.',
  'User with this email not found': 'No existe una cuenta registrada con este correo electrónico.',
  'Email address not confirmed': 'La dirección de correo no ha sido confirmada.',
  
  // Auth errors - Password Update
  'New password should be different from the old password': 'La nueva contraseña debe ser diferente a la anterior.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  
  // Network errors
  'Failed to fetch': 'Error de conexión. Verifica tu internet e intenta nuevamente.',
  'Network request failed': 'Error de red. Intenta nuevamente.',
  
  // Session errors
  'JWT expired': 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
  'Invalid JWT': 'Sesión inválida. Por favor inicia sesión nuevamente.',
  'No authorization header': 'Error de autorización. Inicia sesión nuevamente.',
  
  // Generic errors
  'Something went wrong': 'Algo salió mal. Intenta nuevamente.',
  'Internal server error': 'Error interno del servidor. Intenta más tarde.',
  'Service temporarily unavailable': 'Servicio temporalmente no disponible.',
}

/**
 * Traduce mensajes de error de Supabase al español
 */
export function translateError(error: string | null | undefined): string {
  if (!error) return 'Error desconocido'
  
  // Buscar traducciones exactas
  if (ERROR_TRANSLATIONS[error]) {
    return ERROR_TRANSLATIONS[error]
  }
  
  // Buscar traducciones parciales
  for (const [englishError, spanishError] of Object.entries(ERROR_TRANSLATIONS)) {
    if (error.toLowerCase().includes(englishError.toLowerCase())) {
      return spanishError
    }
  }
  
  // Si no hay traducción, devolver mensaje genérico en español
  return `Error: ${error}`
}

/**
 * Mensajes específicos para validaciones de correo
 */
export const EMAIL_VALIDATION_MESSAGES = {
  NOT_FOUND: 'No existe una cuenta registrada con este correo electrónico.',
  INVALID_FORMAT: 'Por favor ingresa un correo electrónico válido.',
  ALREADY_EXISTS: 'Ya existe una cuenta con este correo electrónico.',
  REQUIRED: 'El correo electrónico es obligatorio.',
}

/**
 * Mensajes específicos para validaciones de contraseña
 */
export const PASSWORD_VALIDATION_MESSAGES = {
  TOO_SHORT: 'La contraseña debe tener al menos 6 caracteres.',
  NO_MATCH: 'Las contraseñas no coinciden.',
  REQUIRED: 'La contraseña es obligatoria.',
  INVALID: 'La contraseña es incorrecta.',
}

/**
 * Verifica si un correo existe usando resetPasswordForEmail
 * Si el correo no existe, Supabase devuelve un error específico
 */
export async function checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
  try {
    const { supabase } = await import('./supabaseClient')
    
    // Intentar hacer reset password para verificar si el email existe
    // Supabase enviará el email solo si el usuario existe
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) {
      // Traducir el error para determinar si el email existe
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('user not found') || 
          errorMessage.includes('email not found') ||
          errorMessage.includes('no user found')) {
        return { exists: false }
      }
      
      // Otros errores pueden indicar que el email existe pero hay otro problema
      return { exists: true, error: translateError(error.message) }
    }
    
    // Si no hay error, el email existe y se envió el correo
    return { exists: true }
  } catch (error) {
    return { exists: true, error: 'Error al verificar el correo' }
  }
}
