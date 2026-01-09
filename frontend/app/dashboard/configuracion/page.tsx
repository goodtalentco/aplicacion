/**
 * Página de configuración de resúmenes diarios de contrataciones
 * Permite configurar emails, horario, días de la semana y envío automático
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import { supabase } from '@/lib/supabaseClient'
import {
  Settings,
  Mail,
  Clock,
  Calendar,
  Power,
  Send,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import NotificationModal from '@/components/dashboard/NotificationModal'
import { formatDateColombia } from '@/utils/dateUtils'

interface DailySummaryConfig {
  id: string
  recipient_emails: string[]
  send_time: string
  send_days_of_week: number[]
  is_enabled: boolean
  last_sent_at: string | null
  last_executed_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' }
]

export default function ConfiguracionPage() {
  const router = useRouter()
  const { canManageUsers, loading: permissionsLoading, permissions } = usePermissions()
  
  const [config, setConfig] = useState<DailySummaryConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  
  // Form state
  const [recipientEmails, setRecipientEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [sendTime, setSendTime] = useState('08:00')
  const [sendDays, setSendDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [isEnabled, setIsEnabled] = useState(false)
  
  const [notification, setNotification] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const hasPermission = canManageUsers()

  // Redirigir si no tiene permisos
  useEffect(() => {
    if (!permissionsLoading && !hasPermission) {
      router.push('/dashboard')
    }
  }, [hasPermission, permissionsLoading, router])

  // Cargar configuración
  useEffect(() => {
    if (!permissionsLoading && permissions.length > 0 && hasPermission) {
      loadConfig()
    }
  }, [permissionsLoading, permissions.length, hasPermission])

  const loadConfig = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('daily_contracts_summary_config')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        // Si no existe, intentar crear usando RPC (bypass RLS)
        if (error.code === 'PGRST116') {
          console.log('Configuración no existe, intentando crear usando RPC...')
          
          try {
            const { data: newConfig, error: rpcError } = await supabase.rpc('ensure_daily_contracts_summary_config')
            
            if (rpcError) {
              console.error('Error creando configuración vía RPC:', rpcError)
              showNotification(
                'Error',
                `No se pudo crear la configuración: ${rpcError.message || 'Error desconocido'}. Verifica que la migración se haya ejecutado correctamente.`,
                'error'
              )
              return
            }
            
            if (newConfig) {
              setConfig(newConfig)
              setRecipientEmails(newConfig.recipient_emails || [])
              setSendTime(newConfig.send_time || '08:00')
              setSendDays(newConfig.send_days_of_week || [1, 2, 3, 4, 5])
              setIsEnabled(newConfig.is_enabled || false)
              return
            }
          } catch (rpcErr: any) {
            console.error('Excepción en RPC:', rpcErr)
            showNotification(
              'Error',
              `Error al crear configuración: ${rpcErr.message || 'Error desconocido'}`,
              'error'
            )
            return
          }
        } else {
          // Otro tipo de error (probablemente permisos)
          console.error('Error cargando configuración:', error)
          showNotification(
            'Error',
            `Error al cargar la configuración: ${error.message || 'Verifica que tengas los permisos necesarios (user_permissions.view)'}`,
            'error'
          )
          return
        }
      } else {
        setConfig(data)
        setRecipientEmails(data.recipient_emails || [])
        setSendTime(data.send_time || '08:00')
        setSendDays(data.send_days_of_week || [1, 2, 3, 4, 5])
        setIsEnabled(data.is_enabled || false)
      }
    } catch (error: any) {
      console.error('Error loading config:', error)
      showNotification(
        'Error',
        'Error al cargar la configuración. Por favor, intenta de nuevo.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info') => {
    setNotification({
      isOpen: true,
      title,
      message,
      type
    })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase()
    
    if (!email) {
      showNotification('Error', 'Por favor, ingresa un email válido', 'error')
      return
    }

    if (!validateEmail(email)) {
      showNotification('Error', 'El formato del email no es válido', 'error')
      return
    }

    if (recipientEmails.includes(email)) {
      showNotification('Error', 'Este email ya está en la lista', 'error')
      return
    }

    setRecipientEmails([...recipientEmails, email])
    setNewEmail('')
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    setRecipientEmails(recipientEmails.filter(email => email !== emailToRemove))
  }

  const handleToggleDay = (day: number) => {
    if (sendDays.includes(day)) {
      setSendDays(sendDays.filter(d => d !== day))
    } else {
      setSendDays([...sendDays, day].sort())
    }
  }

  const handleSave = async () => {
    // Validaciones
    if (isEnabled && recipientEmails.length === 0) {
      showNotification('Error', 'Debes agregar al menos un email destinatario cuando el envío automático está activado', 'error')
      return
    }

    if (isEnabled && sendDays.length === 0) {
      showNotification('Error', 'Debes seleccionar al menos un día de la semana cuando el envío automático está activado', 'error')
      return
    }

    try {
      setSaving(true)

      if (!config) {
        // Intentar crear configuración usando RPC
        try {
          const { data: newConfig, error: rpcError } = await supabase.rpc('ensure_daily_contracts_summary_config')
          
          if (rpcError) {
            console.error('Error creating config via RPC:', rpcError)
            showNotification(
              'Error',
              `No se encontró configuración y no se pudo crear: ${rpcError.message}`,
              'error'
            )
            return
          }
          
          if (newConfig) {
            setConfig(newConfig)
            setRecipientEmails(newConfig.recipient_emails || [])
            setSendTime(newConfig.send_time || '08:00')
            setSendDays(newConfig.send_days_of_week || [1, 2, 3, 4, 5])
            setIsEnabled(newConfig.is_enabled || false)
            return
          }
        } catch (rpcErr: any) {
          console.error('Error in RPC call:', rpcErr)
          showNotification(
            'Error',
            `Error al crear configuración: ${rpcErr.message || 'Error desconocido'}`,
            'error'
          )
          return
        }
        
        showNotification('Error', 'No se encontró configuración. Por favor, recarga la página.', 'error')
        return
      }

      const { error } = await supabase
        .from('daily_contracts_summary_config')
        .update({
          recipient_emails: recipientEmails,
          send_time: sendTime,
          send_days_of_week: sendDays,
          is_enabled: isEnabled
        })
        .eq('id', config.id)

      if (error) throw error

      // Recargar configuración para obtener datos actualizados
      await loadConfig()

      showNotification(
        'Configuración Guardada',
        'La configuración se ha guardado exitosamente',
        'success'
      )
    } catch (error: any) {
      console.error('Error saving config:', error)
      showNotification(
        'Error',
        error.message || 'Error al guardar la configuración. Por favor, intenta de nuevo.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleSendManual = async () => {
    try {
      setSending(true)

      // Llamar a la Edge Function manualmente usando supabase.functions.invoke
      const { data, error } = await supabase.functions.invoke('send-daily-contracts-summary', {
        body: {}
      })

      if (error) {
        console.error('Error from Edge Function:', error)
        // Si hay un error en data.error, usar ese mensaje también
        const errorMessage = error.message || data?.error || 'Error al enviar el resumen'
        throw new Error(errorMessage)
      }

      // Verificar si data contiene un error (aunque no haya error en la respuesta)
      if (data && !data.success && data.error) {
        throw new Error(data.error)
      }

      // Recargar configuración para obtener last_sent_at actualizado
      await loadConfig()

      showNotification(
        'Resumen Enviado',
        data?.message || 'El resumen se ha enviado exitosamente',
        'success'
      )
    } catch (error: any) {
      console.error('Error sending manual summary:', error)
      const errorMessage = error.message || 'Error al enviar el resumen. Revisa los logs de la Edge Function en Supabase Dashboard para más detalles.'
      showNotification(
        'Error',
        errorMessage,
        'error'
      )
    } finally {
      setSending(false)
    }
  }

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#87E0E0] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Settings className="h-8 w-8 text-[#87E0E0]" />
            <span>Configuración</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Configuración de resúmenes diarios de contrataciones pendientes
          </p>
        </div>
      </div>

      {/* Configuración Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Mail className="h-5 w-5 mr-2 text-[#065C5C]" />
          Emails Destinatarios
        </h2>

        {/* Agregar Email */}
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddEmail()
                  }
                }}
                placeholder="Ingresa el email destinatario"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              onClick={handleAddEmail}
              className="px-6 py-3 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar</span>
            </button>
          </div>
        </div>

        {/* Lista de Emails */}
        {recipientEmails.length > 0 ? (
          <div className="space-y-2 mb-6">
            {recipientEmails.map((email, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{email}</span>
                </div>
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar email"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
            No hay emails destinatarios configurados
          </div>
        )}
      </div>

      {/* Horario y Días */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-[#065C5C]" />
          Programación de Envío
        </h2>

        <div className="space-y-6">
          {/* Horario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Envío (Hora Colombia)
            </label>
            <input
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              La hora se interpreta en zona horaria de Colombia (America/Bogota)
            </p>
          </div>

          {/* Días de la Semana */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Días de la Semana
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = sendDays.includes(day.value)
                return (
                  <button
                    key={day.value}
                    onClick={() => handleToggleDay(day.value)}
                    className={`
                      p-3 rounded-xl border-2 transition-all duration-200 text-center
                      ${isSelected
                        ? 'bg-[#065C5C] text-white border-[#065C5C]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#87E0E0]'
                      }
                    `}
                  >
                    <div className="font-semibold text-sm">{day.short}</div>
                    <div className="text-xs opacity-75">{day.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Activar/Desactivar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
              <Power className="h-5 w-5 mr-2 text-[#065C5C]" />
              Envío Automático
            </h2>
            <p className="text-sm text-gray-600">
              Activa o desactiva el envío automático de resúmenes según la programación configurada
            </p>
          </div>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#87E0E0] focus:ring-offset-2
              ${isEnabled ? 'bg-[#065C5C]' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                ${isEnabled ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Estado */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            {isEnabled ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Envío automático activado
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  Envío automático desactivado
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Información de Último Envío */}
      {config && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-[#065C5C]" />
            Estado del Sistema
          </h2>

          <div className="space-y-4">
            {/* Último Envío Exitoso */}
            {config.last_sent_at && (
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-green-900">Último Envío Exitoso</div>
                  <div className="text-sm text-green-700 mt-1">
                    {formatDateColombia(config.last_sent_at)}
                  </div>
                </div>
              </div>
            )}

            {/* Último Error */}
            {config.last_error && (
              <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-red-900">Último Error</div>
                  <div className="text-sm text-red-700 mt-1">{config.last_error}</div>
                  {config.last_executed_at && (
                    <div className="text-xs text-red-600 mt-1">
                      Ocurrió el {formatDateColombia(config.last_executed_at)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sin historial */}
            {!config.last_sent_at && !config.last_error && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
                Aún no se ha ejecutado ningún envío
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Guardar Configuración</span>
            </>
          )}
        </button>

        <button
          onClick={handleSendManual}
          disabled={sending || recipientEmails.length === 0}
          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#87E0E0] text-[#004C4C] rounded-xl hover:bg-[#5FD3D2] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
        >
          {sending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>Enviar Resumen Manualmente</span>
            </>
          )}
        </button>
      </div>

      {/* Información Adicional */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">Nota Importante</h3>
            <p className="text-sm text-blue-800 mb-3">
              El envío automático requiere que esté configurado pg_cron en Supabase. 
              Si no está configurado, solo podrás enviar resúmenes manualmente.
            </p>
            <p className="text-xs text-blue-700">
              Consulta la documentación en <code className="bg-blue-100 px-2 py-1 rounded">CONFIGURACION_RESUMENES_DIARIOS.md</code> para más información.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  )
}
