/**
 * Sistema de debugging centralizado para diagnóstico de sesiones
 * Logs detallados para identificar problemas de inactividad y sesión en producción
 */

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'

interface DebugConfig {
  enabled: boolean
  showTimestamps: boolean
  logToConsole: boolean
  logToStorage: boolean
}

// Configuración por defecto - se activa automáticamente en producción
const defaultConfig: DebugConfig = {
  enabled: true,
  showTimestamps: true,
  logToConsole: true,
  logToStorage: true
}

class SessionDebugger {
  private config: DebugConfig
  private logs: Array<{ timestamp: number; level: LogLevel; message: string; data?: any }> = []
  private maxLogs = 100 // Mantener últimos 100 logs

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  private getIcon(level: LogLevel): string {
    const icons = {
      info: '🔵',
      success: '🟢',
      warning: '⚠️',
      error: '🔴',
      debug: '🔍'
    }
    return icons[level]
  }

  private getColor(level: LogLevel): string {
    const colors = {
      info: 'color: #3B82F6',
      success: 'color: #10B981',
      warning: 'color: #F59E0B',
      error: 'color: #EF4444',
      debug: 'color: #6B7280'
    }
    return colors[level]
  }

  log(level: LogLevel, message: string, data?: any) {
    if (!this.config.enabled) return

    const timestamp = Date.now()
    const logEntry = { timestamp, level, message, data }

    // Agregar a historial
    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Log a consola con formato
    if (this.config.logToConsole) {
      const icon = this.getIcon(level)
      const color = this.getColor(level)
      const time = this.formatTimestamp(timestamp)
      const prefix = this.config.showTimestamps 
        ? `%c${icon} [SessionDebug] ${time}` 
        : `%c${icon} [SessionDebug]`

      console.log(`${prefix} - ${message}`, color)
      if (data) {
        console.log('%c   └─', 'color: #9CA3AF', data)
      }
    }

    // Guardar en localStorage para revisión posterior
    if (this.config.logToStorage) {
      try {
        const storedLogs = this.getLogs()
        const updatedLogs = [...storedLogs, logEntry].slice(-this.maxLogs)
        localStorage.setItem('session_debug_logs', JSON.stringify(updatedLogs))
      } catch (e) {
        // Si falla, no importa - es solo debugging
      }
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  success(message: string, data?: any) {
    this.log('success', message, data)
  }

  warning(message: string, data?: any) {
    this.log('warning', message, data)
  }

  error(message: string, data?: any) {
    this.log('error', message, data)
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  // Logs específicos para sesión
  sessionInitialized(user: { email?: string }, expiresAt: number) {
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = expiresAt - now
    this.success('Sesión inicializada', {
      email: user.email,
      expiresIn: `${expiresIn}s (${this.formatDuration(expiresIn)})`,
      expiresAt: new Date(expiresAt * 1000).toLocaleTimeString('es-CO')
    })
  }

  sessionCheck(valid: boolean, expiresIn?: number, warnings?: string[]) {
    if (valid && expiresIn) {
      const level = expiresIn < 600 ? 'warning' : 'info'
      this.log(level, 'Verificación de sesión (intervalo)', {
        status: 'válida',
        expiresIn: `${expiresIn}s (${this.formatDuration(expiresIn)})`,
        warnings: warnings || []
      })
    } else {
      this.error('Verificación de sesión falló', {
        status: 'inválida',
        reason: 'Sesión no encontrada o expirada'
      })
    }
  }

  sessionRefreshAttempt(reason: string) {
    this.info('Intentando refrescar sesión', { reason })
  }

  sessionRefreshSuccess(newExpiresAt: number) {
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = newExpiresAt - now
    this.success('Sesión refrescada exitosamente', {
      newExpiresIn: `${expiresIn}s (${this.formatDuration(expiresIn)})`,
      newExpiresAt: new Date(newExpiresAt * 1000).toLocaleTimeString('es-CO')
    })
  }

  sessionRefreshFailed(error: any) {
    this.error('❌ REFRESH DE SESIÓN FALLÓ', {
      error: error?.message || error,
      timestamp: new Date().toISOString()
    })
  }

  userInactive(duration: number) {
    this.warning('Usuario inactivo detectado', {
      inactiveDuration: `${duration}s (${this.formatDuration(duration)})`,
      tabHidden: document.hidden
    })
  }

  userReturned(wasInactiveFor: number) {
    this.info('👁️  Usuario regresó a la pestaña', {
      inactiveDuration: `${wasInactiveFor}s (${this.formatDuration(wasInactiveFor)})`
    })
  }

  cacheStatus(cacheKey: string, status: 'hit' | 'miss' | 'stale' | 'cleared') {
    const statusEmoji = {
      hit: '✅',
      miss: '❌',
      stale: '⏰',
      cleared: '🗑️'
    }
    this.debug(`Cache ${statusEmoji[status]}`, { key: cacheKey, status })
  }

  problemDetected(issue: string, details: any) {
    this.error(`🚨 PROBLEMA DETECTADO: ${issue}`, details)
  }

  // Obtener logs almacenados
  getLogs() {
    try {
      const stored = localStorage.getItem('session_debug_logs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  // Limpiar logs
  clearLogs() {
    this.logs = []
    localStorage.removeItem('session_debug_logs')
    this.info('Logs limpiados')
  }

  // Exportar logs como texto
  exportLogs(): string {
    const logs = this.getLogs()
    return logs.map((log: any) => {
      const time = this.formatTimestamp(log.timestamp)
      const data = log.data ? `\n   Data: ${JSON.stringify(log.data, null, 2)}` : ''
      return `[${time}] ${log.level.toUpperCase()}: ${log.message}${data}`
    }).join('\n\n')
  }

  // Mostrar resumen en consola
  showSummary() {
    const logs = this.getLogs()
    const errors = logs.filter((l: any) => l.level === 'error')
    const warnings = logs.filter((l: any) => l.level === 'warning')
    
    console.log('%c═══════════════════════════════════════════', 'color: #3B82F6; font-weight: bold')
    console.log('%c📊 SESSION DEBUG SUMMARY', 'color: #3B82F6; font-weight: bold; font-size: 14px')
    console.log('%c═══════════════════════════════════════════', 'color: #3B82F6; font-weight: bold')
    console.log(`%cTotal logs: ${logs.length}`, 'color: #6B7280')
    console.log(`%cErrores: ${errors.length}`, 'color: #EF4444; font-weight: bold')
    console.log(`%cAdvertencias: ${warnings.length}`, 'color: #F59E0B; font-weight: bold')
    
    if (errors.length > 0) {
      console.log('\n%c🔴 ERRORES RECIENTES:', 'color: #EF4444; font-weight: bold')
      errors.slice(-5).forEach((log: any) => {
        console.log(`  • ${log.message}`, log.data)
      })
    }
    
    if (warnings.length > 0) {
      console.log('\n%c⚠️  ADVERTENCIAS RECIENTES:', 'color: #F59E0B; font-weight: bold')
      warnings.slice(-5).forEach((log: any) => {
        console.log(`  • ${log.message}`, log.data)
      })
    }
    
    console.log('%c═══════════════════════════════════════════', 'color: #3B82F6; font-weight: bold')
  }
}

// Instancia global
export const sessionDebugger = new SessionDebugger()

// Exponer en window para debugging manual en producción
if (typeof window !== 'undefined') {
  (window as any).sessionDebug = {
    logs: () => sessionDebugger.getLogs(),
    summary: () => sessionDebugger.showSummary(),
    export: () => sessionDebugger.exportLogs(),
    clear: () => sessionDebugger.clearLogs()
  }
  
  // Info inicial
  console.log('%c🔍 Session Debugger Activo', 'color: #10B981; font-weight: bold; font-size: 12px')
  console.log('%cComandos disponibles:', 'color: #6B7280')
  console.log('%c  • window.sessionDebug.summary()', 'color: #3B82F6', '- Ver resumen')
  console.log('%c  • window.sessionDebug.logs()', 'color: #3B82F6', '- Ver todos los logs')
  console.log('%c  • window.sessionDebug.export()', 'color: #3B82F6', '- Exportar logs como texto')
  console.log('%c  • window.sessionDebug.clear()', 'color: #3B82F6', '- Limpiar logs')
}

export default sessionDebugger

