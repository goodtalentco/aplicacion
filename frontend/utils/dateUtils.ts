/**
 * Utilidades para manejo de fechas en zona horaria de Colombia
 */

/**
 * Formatea una fecha en zona horaria de Colombia
 * Evita el problema de que las fechas se muestren un día anterior
 */
export const formatDateColombia = (dateString?: string | null): string => {
  if (!dateString) return '-'
  
  try {
    let date: Date
    
    // Si ya tiene timestamp (viene de la DB), usar directamente
    if (dateString.includes('T') || dateString.includes(' ')) {
      date = new Date(dateString)
    } else {
      // Si es solo fecha (YYYY-MM-DD), agregar offset de Colombia
      date = new Date(dateString + 'T00:00:00-05:00')
    }
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Bogota'
    })
  } catch (error) {
    console.error('Error formateando fecha:', error, 'dateString:', dateString)
    return 'Error en fecha'
  }
}

/**
 * Formatea una fecha completa (con mes) en zona horaria de Colombia
 */
export const formatDateColombiaLong = (dateString?: string | null): string => {
  if (!dateString) return '-'
  
  try {
    let date: Date
    
    // Si ya tiene timestamp (viene de la DB), usar directamente
    if (dateString.includes('T') || dateString.includes(' ')) {
      date = new Date(dateString)
    } else {
      // Si es solo fecha (YYYY-MM-DD), agregar offset de Colombia
      date = new Date(dateString + 'T00:00:00-05:00')
    }
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Bogota'
    })
  } catch (error) {
    console.error('Error formateando fecha:', error, 'dateString:', dateString)
    return 'Error en fecha'
  }
}

/**
 * Convierte una fecha de input (YYYY-MM-DD) a formato ISO considerando Colombia
 */
export const dateInputToISO = (dateInput: string): string => {
  if (!dateInput) return ''
  
  // Input viene como YYYY-MM-DD, convertir a fecha de Colombia
  const date = new Date(dateInput + 'T00:00:00-05:00')
  return date.toISOString().split('T')[0]
}

/**
 * Convierte una fecha ISO a formato de input (YYYY-MM-DD) considerando Colombia
 */
export const dateISOToInput = (isoDate?: string | null): string => {
  if (!isoDate) return ''
  
  // Extraer solo la parte de fecha (YYYY-MM-DD) sin conversión de zona horaria
  return isoDate.split('T')[0]
}
