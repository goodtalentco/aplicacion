/**
 * Utilidades para validación de fechas
 * Previene errores de entrada de fechas con años inválidos
 */

/**
 * Valida si una fecha está en un rango razonable
 */
export const isValidDateRange = (date: string): boolean => {
  if (!date) return true // Permitir vacío
  
  const year = new Date(date).getFullYear()
  return year >= 1900 && year <= 2100
}

/**
 * Obtiene límites de fecha según el tipo
 */
export const getDateLimits = (type: 'birth' | 'document' | 'work' | 'future' | 'past') => {
  const today = new Date().toISOString().split('T')[0]
  
  switch (type) {
    case 'birth':
      // Fecha de nacimiento: 1900 hasta hoy
      return {
        min: '1900-01-01',
        max: today,
        errorMessage: 'La fecha de nacimiento debe estar entre 1900 y hoy'
      }
    
    case 'document':
      // Expedición de documento: 1900 hasta hoy
      return {
        min: '1900-01-01',
        max: today,
        errorMessage: 'La fecha de expedición debe estar entre 1900 y hoy'
      }
    
    case 'work':
      // Fechas laborales (ingreso, terminación): 1900 hasta 10 años en el futuro
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 10)
      return {
        min: '1900-01-01',
        max: futureDate.toISOString().split('T')[0],
        errorMessage: 'La fecha debe estar entre 1900 y 10 años en el futuro'
      }
    
    case 'future':
      // Fechas futuras (citas, programaciones): hoy hasta 10 años adelante
      const maxFuture = new Date()
      maxFuture.setFullYear(maxFuture.getFullYear() + 10)
      return {
        min: today,
        max: maxFuture.toISOString().split('T')[0],
        errorMessage: 'La fecha debe ser hoy o en el futuro (máximo 10 años)'
      }
    
    case 'past':
      // Fechas pasadas: 1900 hasta hoy
      return {
        min: '1900-01-01',
        max: today,
        errorMessage: 'La fecha debe estar entre 1900 y hoy'
      }
    
    default:
      return {
        min: '1900-01-01',
        max: '2100-12-31',
        errorMessage: 'La fecha debe estar entre 1900 y 2100'
      }
  }
}

/**
 * Verifica si una fecha está completa (formato YYYY-MM-DD)
 */
export const isCompleteDate = (value: string): boolean => {
  if (!value) return false
  // Verificar formato YYYY-MM-DD (10 caracteres)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(value)
}

/**
 * Valida una fecha según su tipo y muestra alerta si es inválida
 * Solo valida si la fecha está completa (formato YYYY-MM-DD)
 */
export const validateDateInput = (
  value: string,
  type: 'birth' | 'document' | 'work' | 'future' | 'past',
  showAlert: boolean = true,
  onlyIfComplete: boolean = true
): boolean => {
  if (!value) return true // Permitir vacío
  
  // Si onlyIfComplete es true, solo validar si la fecha está completa
  if (onlyIfComplete && !isCompleteDate(value)) {
    return true // Permitir escribir sin validar hasta que esté completo
  }
  
  const limits = getDateLimits(type)
  const date = new Date(value)
  const minDate = new Date(limits.min)
  const maxDate = new Date(limits.max)
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    return true // Si no es una fecha válida, permitir (puede estar incompleta)
  }
  
  if (date < minDate || date > maxDate) {
    if (showAlert) {
      alert(limits.errorMessage)
    }
    return false
  }
  
  return true
}

/**
 * Handler genérico para onChange de inputs de fecha
 */
export const createDateChangeHandler = (
  onChange: (value: string) => void,
  type: 'birth' | 'document' | 'work' | 'future' | 'past'
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    if (validateDateInput(value, type)) {
      onChange(value)
    }
  }
}

