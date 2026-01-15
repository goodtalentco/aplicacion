/**
 * Página de Configuración
 * Reorganizada con secciones claras para:
 * - Resúmenes Diarios de Contratación
 * - Notificaciones de Vencimiento de Contratos
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
  Loader2,
  Bell,
  FileText
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

interface ExpirationNotificationsConfig {
  id: string
  recipient_emails: string[]
  days_before_expiration: number[]
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
  
  // Estados para Resumen Diario
  const [dailyConfig, setDailyConfig] = useState<DailySummaryConfig | null>(null)
  const [dailyRecipientEmails, setDailyRecipientEmails] = useState<string[]>([])
  const [dailyNewEmail, setDailyNewEmail] = useState('')
  const [dailySendTime, setDailySendTime] = useState('08:00')
  const [dailySendDays, setDailySendDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [dailyIsEnabled, setDailyIsEnabled] = useState(false)
  const [dailySaving, setDailySaving] = useState(false)
  const [dailySending, setDailySending] = useState(false)
  
  // Estados para Notificaciones de Vencimiento
  const [expirationConfig, setExpirationConfig] = useState<ExpirationNotificationsConfig | null>(null)
  const [expirationRecipientEmails, setExpirationRecipientEmails] = useState<string[]>([])
  const [expirationNewEmail, setExpirationNewEmail] = useState('')
  const [expirationDaysBefore, setExpirationDaysBefore] = useState<number[]>([14])
  const [expirationNewDay, setExpirationNewDay] = useState('')
  const [expirationSendTime, setExpirationSendTime] = useState('08:00')
  const [expirationSendDays, setExpirationSendDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [expirationIsEnabled, setExpirationIsEnabled] = useState(false)
  const [expirationSaving, setExpirationSaving] = useState(false)
  const [expirationSending, setExpirationSending] = useState(false)
  
  const [loading, setLoading] = useState(true)
  
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

  // Cargar configuraciones
  useEffect(() => {
    if (!permissionsLoading && permissions.length > 0 && hasPermission) {
      loadConfigs()
    }
  }, [permissionsLoading, permissions.length, hasPermission])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      
      // Cargar configuración de resumen diario
      await loadDailyConfig()
      
      // Cargar configuración de notificaciones de vencimiento
      await loadExpirationConfig()
    } catch (error: any) {
      console.error('Error loading configs:', error)
      showNotification('Error', 'Error al cargar las configuraciones. Por favor, intenta de nuevo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadDailyConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_contracts_summary_config')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newConfig } = await supabase.rpc('ensure_daily_contracts_summary_config')
          if (newConfig) {
            setDailyConfig(newConfig)
            setDailyRecipientEmails(newConfig.recipient_emails || [])
            setDailySendTime(newConfig.send_time || '08:00')
            setDailySendDays(newConfig.send_days_of_week || [1, 2, 3, 4, 5])
            setDailyIsEnabled(newConfig.is_enabled || false)
            return
          }
        }
        throw error
      }

      setDailyConfig(data)
      setDailyRecipientEmails(data.recipient_emails || [])
      setDailySendTime(data.send_time || '08:00')
      setDailySendDays(data.send_days_of_week || [1, 2, 3, 4, 5])
      setDailyIsEnabled(data.is_enabled || false)
    } catch (error: any) {
      console.error('Error loading daily config:', error)
    }
  }

  const loadExpirationConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_expiration_notifications_config')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newConfig } = await supabase.rpc('ensure_contract_expiration_notifications_config')
          if (newConfig) {
            setExpirationConfig(newConfig)
            setExpirationRecipientEmails(newConfig.recipient_emails || [])
            setExpirationDaysBefore(newConfig.days_before_expiration || [14])
            setExpirationSendTime(newConfig.send_time || '08:00')
            setExpirationSendDays(newConfig.send_days_of_week || [1, 2, 3, 4, 5])
            setExpirationIsEnabled(newConfig.is_enabled || false)
            return
          }
        }
        throw error
      }

      setExpirationConfig(data)
      setExpirationRecipientEmails(data.recipient_emails || [])
      setExpirationDaysBefore(data.days_before_expiration || [14])
      setExpirationSendTime(data.send_time || '08:00')
      setExpirationSendDays(data.send_days_of_week || [1, 2, 3, 4, 5])
      setExpirationIsEnabled(data.is_enabled || false)
    } catch (error: any) {
      console.error('Error loading expiration config:', error)
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

  // Funciones para Resumen Diario
  const handleDailyAddEmail = () => {
    const email = dailyNewEmail.trim().toLowerCase()
    
    if (!email) {
      showNotification('Error', 'Por favor, ingresa un email válido', 'error')
      return
    }

    if (!validateEmail(email)) {
      showNotification('Error', 'El formato del email no es válido', 'error')
      return
    }

    if (dailyRecipientEmails.includes(email)) {
      showNotification('Error', 'Este email ya está en la lista', 'error')
      return
    }

    setDailyRecipientEmails([...dailyRecipientEmails, email])
    setDailyNewEmail('')
  }

  const handleDailyRemoveEmail = (emailToRemove: string) => {
    setDailyRecipientEmails(dailyRecipientEmails.filter(email => email !== emailToRemove))
  }

  const handleDailyToggleDay = (day: number) => {
    if (dailySendDays.includes(day)) {
      setDailySendDays(dailySendDays.filter(d => d !== day))
    } else {
      setDailySendDays([...dailySendDays, day].sort())
    }
  }

  const handleDailySave = async () => {
    if (dailyIsEnabled && dailyRecipientEmails.length === 0) {
      showNotification('Error', 'Debes agregar al menos un email destinatario cuando el envío automático está activado', 'error')
      return
    }

    if (dailyIsEnabled && dailySendDays.length === 0) {
      showNotification('Error', 'Debes seleccionar al menos un día de la semana cuando el envío automático está activado', 'error')
      return
    }

    try {
      setDailySaving(true)

      if (!dailyConfig) {
        const { data: newConfig } = await supabase.rpc('ensure_daily_contracts_summary_config')
        if (newConfig) {
          setDailyConfig(newConfig)
        } else {
          showNotification('Error', 'No se encontró configuración. Por favor, recarga la página.', 'error')
          return
        }
      }

      const { error } = await supabase
        .from('daily_contracts_summary_config')
        .update({
          recipient_emails: dailyRecipientEmails,
          send_time: dailySendTime,
          send_days_of_week: dailySendDays,
          is_enabled: dailyIsEnabled
        })
        .eq('id', dailyConfig!.id)

      if (error) throw error

      await loadDailyConfig()

      showNotification(
        'Configuración Guardada',
        'La configuración de resumen diario se ha guardado exitosamente',
        'success'
      )
    } catch (error: any) {
      console.error('Error saving daily config:', error)
      showNotification(
        'Error',
        error.message || 'Error al guardar la configuración. Por favor, intenta de nuevo.',
        'error'
      )
    } finally {
      setDailySaving(false)
    }
  }

  const handleDailySendManual = async () => {
    try {
      setDailySending(true)

      const { data, error } = await supabase.functions.invoke('send-daily-contracts-summary', {
        body: {}
      })

      if (error) {
        const errorMessage = error.message || data?.error || 'Error al enviar el resumen'
        throw new Error(errorMessage)
      }

      if (data && !data.success && data.error) {
        throw new Error(data.error)
      }

      await loadDailyConfig()

      showNotification(
        'Resumen Enviado',
        data?.message || 'El resumen se ha enviado exitosamente',
        'success'
      )
    } catch (error: any) {
      console.error('Error sending manual summary:', error)
      const errorMessage = error.message || 'Error al enviar el resumen. Revisa los logs de la Edge Function en Supabase Dashboard para más detalles.'
      showNotification('Error', errorMessage, 'error')
    } finally {
      setDailySending(false)
    }
  }

  // Funciones para Notificaciones de Vencimiento
  const handleExpirationAddEmail = () => {
    const email = expirationNewEmail.trim().toLowerCase()
    
    if (!email) {
      showNotification('Error', 'Por favor, ingresa un email válido', 'error')
      return
    }

    if (!validateEmail(email)) {
      showNotification('Error', 'El formato del email no es válido', 'error')
      return
    }

    if (expirationRecipientEmails.includes(email)) {
      showNotification('Error', 'Este email ya está en la lista', 'error')
      return
    }

    setExpirationRecipientEmails([...expirationRecipientEmails, email])
    setExpirationNewEmail('')
  }

  const handleExpirationRemoveEmail = (emailToRemove: string) => {
    setExpirationRecipientEmails(expirationRecipientEmails.filter(email => email !== emailToRemove))
  }

  const handleExpirationAddDay = () => {
    const day = parseInt(expirationNewDay)
    
    if (isNaN(day) || day < 1 || day > 60) {
      showNotification('Error', 'Debes ingresar un número entre 1 y 60 días', 'error')
      return
    }

    if (expirationDaysBefore.includes(day)) {
      showNotification('Error', 'Este día ya está en la lista', 'error')
      return
    }

    setExpirationDaysBefore([...expirationDaysBefore, day].sort((a, b) => b - a))
    setExpirationNewDay('')
  }

  const handleExpirationRemoveDay = (dayToRemove: number) => {
    setExpirationDaysBefore(expirationDaysBefore.filter(day => day !== dayToRemove))
  }

  const handleExpirationToggleDay = (day: number) => {
    if (expirationSendDays.includes(day)) {
      setExpirationSendDays(expirationSendDays.filter(d => d !== day))
    } else {
      setExpirationSendDays([...expirationSendDays, day].sort())
    }
  }

  const handleExpirationSave = async () => {
    if (expirationIsEnabled && expirationRecipientEmails.length === 0) {
      showNotification('Error', 'Debes agregar al menos un email destinatario cuando el envío automático está activado', 'error')
      return
    }

    if (expirationIsEnabled && expirationDaysBefore.length === 0) {
      showNotification('Error', 'Debes agregar al menos un día antes del vencimiento', 'error')
      return
    }

    if (expirationIsEnabled && expirationSendDays.length === 0) {
      showNotification('Error', 'Debes seleccionar al menos un día de la semana cuando el envío automático está activado', 'error')
      return
    }

    try {
      setExpirationSaving(true)

      if (!expirationConfig) {
        const { data: newConfig } = await supabase.rpc('ensure_contract_expiration_notifications_config')
        if (newConfig) {
          setExpirationConfig(newConfig)
        } else {
          showNotification('Error', 'No se encontró configuración. Por favor, recarga la página.', 'error')
          return
        }
      }

      const { error } = await supabase
        .from('contract_expiration_notifications_config')
        .update({
          recipient_emails: expirationRecipientEmails,
          days_before_expiration: expirationDaysBefore,
          send_time: expirationSendTime,
          send_days_of_week: expirationSendDays,
          is_enabled: expirationIsEnabled
        })
        .eq('id', expirationConfig!.id)

      if (error) throw error

      await loadExpirationConfig()

      showNotification(
        'Configuración Guardada',
        'La configuración de notificaciones de vencimiento se ha guardado exitosamente',
        'success'
      )
    } catch (error: any) {
      console.error('Error saving expiration config:', error)
      showNotification(
        'Error',
        error.message || 'Error al guardar la configuración. Por favor, intenta de nuevo.',
        'error'
      )
    } finally {
      setExpirationSaving(false)
    }
  }

  const handleExpirationSendManual = async () => {
    try {
      setExpirationSending(true)

      const { data, error } = await supabase.functions.invoke('notify-contract-expirations', {
        body: {}
      })

      if (error) {
        const errorMessage = error.message || data?.error || 'Error al enviar las notificaciones'
        throw new Error(errorMessage)
      }

      if (data && !data.success && data.error) {
        throw new Error(data.error)
      }

      await loadExpirationConfig()

      showNotification(
        'Notificaciones Enviadas',
        data?.message || 'Las notificaciones se han enviado exitosamente',
        'success'
      )
    } catch (error: any) {
      console.error('Error sending manual notifications:', error)
      const errorMessage = error.message || 'Error al enviar las notificaciones. Revisa los logs de la Edge Function en Supabase Dashboard para más detalles.'
      showNotification('Error', errorMessage, 'error')
    } finally {
      setExpirationSending(false)
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
            Configuración de notificaciones y resúmenes automáticos
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECCIÓN 1: Resumen Diario de Contratación */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Resumen Diario de Contratación
            </h2>
            <p className="text-sm text-gray-600">
              Configuración de resúmenes diarios de contrataciones pendientes
            </p>
          </div>
        </div>

        {/* Emails Destinatarios */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-[#065C5C]" />
            Emails Destinatarios
          </h3>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <input
                type="email"
                value={dailyNewEmail}
                onChange={(e) => setDailyNewEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleDailyAddEmail()
                  }
                }}
                placeholder="Ingresa el email destinatario"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              onClick={handleDailyAddEmail}
              className="px-6 py-3 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar</span>
            </button>
          </div>

          {dailyRecipientEmails.length > 0 ? (
            <div className="space-y-2">
              {dailyRecipientEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{email}</span>
                  </div>
                  <button
                    onClick={() => handleDailyRemoveEmail(email)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar email"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
              No hay emails destinatarios configurados
            </div>
          )}
        </div>

        {/* Programación de Envío */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-[#065C5C]" />
            Programación de Envío
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Envío (Hora Colombia)
              </label>
              <input
                type="time"
                value={dailySendTime}
                onChange={(e) => setDailySendTime(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
              <p className="text-xs text-gray-500 mt-1">
                La hora se interpreta en zona horaria de Colombia (America/Bogota)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Días de la Semana
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = dailySendDays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      onClick={() => handleDailyToggleDay(day.value)}
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
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <Power className="h-5 w-5 mr-2 text-[#065C5C]" />
                Envío Automático
              </h3>
              <p className="text-sm text-gray-600">
                Activa o desactiva el envío automático de resúmenes según la programación configurada
              </p>
            </div>
            <button
              onClick={() => setDailyIsEnabled(!dailyIsEnabled)}
              className={`
                relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#87E0E0] focus:ring-offset-2
                ${dailyIsEnabled ? 'bg-[#065C5C]' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                  ${dailyIsEnabled ? 'translate-x-7' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              {dailyIsEnabled ? (
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

        {/* Estado del Sistema */}
        {dailyConfig && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-[#065C5C]" />
              Estado del Sistema
            </h3>

            <div className="space-y-4">
              {dailyConfig.last_sent_at && (
                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-green-900">Último Envío Exitoso</div>
                    <div className="text-sm text-green-700 mt-1">
                      {formatDateColombia(dailyConfig.last_sent_at)}
                    </div>
                  </div>
                </div>
              )}

              {dailyConfig.last_error && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-red-900">Último Error</div>
                    <div className="text-sm text-red-700 mt-1">{dailyConfig.last_error}</div>
                    {dailyConfig.last_executed_at && (
                      <div className="text-xs text-red-600 mt-1">
                        Ocurrió el {formatDateColombia(dailyConfig.last_executed_at)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!dailyConfig.last_sent_at && !dailyConfig.last_error && (
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
            onClick={handleDailySave}
            disabled={dailySaving}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {dailySaving ? (
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
            onClick={handleDailySendManual}
            disabled={dailySending || dailyRecipientEmails.length === 0}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#87E0E0] text-[#004C4C] rounded-xl hover:bg-[#5FD3D2] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {dailySending ? (
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
      </div>

      {/* ============================================ */}
      {/* SECCIÓN 2: Notificaciones de Vencimiento */}
      {/* ============================================ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Bell className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Notificaciones de Vencimiento de Contratos
            </h2>
            <p className="text-sm text-gray-600">
              Configuración de notificaciones automáticas para contratos próximos a vencer
            </p>
          </div>
        </div>

        {/* Emails Destinatarios */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-[#065C5C]" />
            Emails Destinatarios
          </h3>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <input
                type="email"
                value={expirationNewEmail}
                onChange={(e) => setExpirationNewEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleExpirationAddEmail()
                  }
                }}
                placeholder="Ingresa el email destinatario"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              onClick={handleExpirationAddEmail}
              className="px-6 py-3 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar</span>
            </button>
          </div>

          {expirationRecipientEmails.length > 0 ? (
            <div className="space-y-2">
              {expirationRecipientEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{email}</span>
                  </div>
                  <button
                    onClick={() => handleExpirationRemoveEmail(email)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar email"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
              No hay emails destinatarios configurados
            </div>
          )}
        </div>

        {/* Días Antes del Vencimiento */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-[#065C5C]" />
            Días Antes del Vencimiento
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Selecciona los días antes del vencimiento en los que se enviarán las notificaciones (ej: 14, 7, 3 días)
          </p>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <input
                type="number"
                min="1"
                max="60"
                value={expirationNewDay}
                onChange={(e) => setExpirationNewDay(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleExpirationAddDay()
                  }
                }}
                placeholder="Ej: 14 (días antes del vencimiento)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              onClick={handleExpirationAddDay}
              className="px-6 py-3 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar</span>
            </button>
          </div>

          {expirationDaysBefore.length > 0 ? (
            <div className="space-y-2">
              {expirationDaysBefore.map((day, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span className="text-gray-900 font-medium">
                      {day} {day === 1 ? 'día' : 'días'} antes del vencimiento
                    </span>
                  </div>
                  <button
                    onClick={() => handleExpirationRemoveDay(day)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar día"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
              No hay días configurados. Agrega al menos un día antes del vencimiento.
            </div>
          )}
        </div>

        {/* Programación de Envío */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-[#065C5C]" />
            Programación de Envío
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Envío (Hora Colombia)
              </label>
              <input
                type="time"
                value={expirationSendTime}
                onChange={(e) => setExpirationSendTime(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
              <p className="text-xs text-gray-500 mt-1">
                La hora se interpreta en zona horaria de Colombia (America/Bogota)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Días de la Semana
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = expirationSendDays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      onClick={() => handleExpirationToggleDay(day.value)}
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
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <Power className="h-5 w-5 mr-2 text-[#065C5C]" />
                Envío Automático
              </h3>
              <p className="text-sm text-gray-600">
                Activa o desactiva el envío automático de notificaciones según la programación configurada
              </p>
            </div>
            <button
              onClick={() => setExpirationIsEnabled(!expirationIsEnabled)}
              className={`
                relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#87E0E0] focus:ring-offset-2
                ${expirationIsEnabled ? 'bg-[#065C5C]' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                  ${expirationIsEnabled ? 'translate-x-7' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              {expirationIsEnabled ? (
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

        {/* Estado del Sistema */}
        {expirationConfig && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-[#065C5C]" />
              Estado del Sistema
            </h3>

            <div className="space-y-4">
              {expirationConfig.last_sent_at && (
                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-green-900">Último Envío Exitoso</div>
                    <div className="text-sm text-green-700 mt-1">
                      {formatDateColombia(expirationConfig.last_sent_at)}
                    </div>
                  </div>
                </div>
              )}

              {expirationConfig.last_error && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-red-900">Último Error</div>
                    <div className="text-sm text-red-700 mt-1">{expirationConfig.last_error}</div>
                    {expirationConfig.last_executed_at && (
                      <div className="text-xs text-red-600 mt-1">
                        Ocurrió el {formatDateColombia(expirationConfig.last_executed_at)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!expirationConfig.last_sent_at && !expirationConfig.last_error && (
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
            onClick={handleExpirationSave}
            disabled={expirationSaving}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {expirationSaving ? (
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
            onClick={handleExpirationSendManual}
            disabled={expirationSending || expirationRecipientEmails.length === 0}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#87E0E0] text-[#004C4C] rounded-xl hover:bg-[#5FD3D2] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {expirationSending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Enviar Notificaciones Manualmente</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">Nota Importante</h3>
            <p className="text-sm text-blue-800 mb-3">
              El envío automático requiere que esté configurado pg_cron en Supabase. 
              Si no está configurado, solo podrás enviar notificaciones manualmente.
            </p>
            <p className="text-xs text-blue-700">
              Las notificaciones de vencimiento se enviarán a los emails configurados cuando un contrato esté próximo a vencer según los días configurados.
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
