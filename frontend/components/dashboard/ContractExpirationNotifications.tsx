/**
 * Componente para mostrar notificaciones in-app de contratos próximos a vencer
 * Muestra contratos que vencen en los próximos días según la configuración
 */

'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, X, Calendar, User, Building, ChevronRight, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/lib/usePermissions'
import { formatDateColombia } from '@/utils/dateUtils'
import { useRouter } from 'next/navigation'

interface ExpiringContract {
  id: string
  nombre_completo: string
  cedula: string
  empresa?: string
  fecha_vencimiento: string
  dias_restantes: number
}

export default function ContractExpirationNotifications() {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [notifications, setNotifications] = useState<ExpiringContract[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const canViewContracts = hasPermission('contracts', 'view')

  useEffect(() => {
    if (canViewContracts) {
      loadNotifications()
    }
  }, [canViewContracts])

  const loadNotifications = async () => {
    try {
      setLoading(true)

      // Obtener configuración para saber qué días antes del vencimiento se notifica
      const { data: config } = await supabase
        .from('contract_expiration_notifications_config')
        .select('days_before_expiration')
        .limit(1)
        .single()

      if (!config || !config.days_before_expiration || config.days_before_expiration.length === 0) {
        setNotifications([])
        return
      }

      const daysBefore: number[] = config.days_before_expiration || [14]
      const maxDays = Math.max(...daysBefore)

      // Obtener contratos que vencen en los próximos días
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const maxDate = new Date(today)
      maxDate.setDate(today.getDate() + maxDays)
      maxDate.setHours(23, 59, 59, 999)

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          primer_nombre,
          segundo_nombre,
          primer_apellido,
          segundo_apellido,
          numero_identificacion,
          empresa_final_id,
          fecha_fin,
          status_aprobacion,
          archived_at,
          companies:empresa_final_id (
            name
          )
        `)
        .eq('status_aprobacion', 'aprobado')
        .is('archived_at', null)
        .not('fecha_fin', 'is', null)
        .gte('fecha_fin', today.toISOString().split('T')[0])
        .lte('fecha_fin', maxDate.toISOString().split('T')[0])
        .order('fecha_fin', { ascending: true })
        .limit(10)

      if (error) {
        console.error('Error loading expiring contracts:', error)
        return
      }

      if (!contracts) {
        setNotifications([])
        return
      }

      // Filtrar contratos que están en los días configurados
      const expiringContracts: ExpiringContract[] = []
      const todayStr = today.toISOString().split('T')[0]

      for (const contract of contracts) {
        if (!contract.fecha_fin) continue

        const expirationDate = new Date(contract.fecha_fin)
        const diffTime = expirationDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Solo incluir si está en uno de los días configurados
        if (daysBefore.includes(diffDays)) {
          const nombreCompleto = [
            contract.primer_nombre,
            contract.segundo_nombre,
            contract.primer_apellido,
            contract.segundo_apellido
          ].filter(Boolean).join(' ').trim()

          const empresa = (contract.companies as any)?.name || 'Sin empresa'

          expiringContracts.push({
            id: contract.id,
            nombre_completo,
            cedula: contract.numero_identificacion,
            empresa,
            fecha_vencimiento: contract.fecha_fin,
            dias_restantes: diffDays
          })
        }
      }

      setNotifications(expiringContracts)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (contractId: string) => {
    // Marcar notificación como leída (opcional, para tracking)
    // Por ahora solo removemos de la lista local
    setNotifications(prev => prev.filter(n => n.id !== contractId))
  }

  const handleViewContract = (contractId: string) => {
    router.push(`/dashboard/contratos?contractId=${contractId}`)
    setIsOpen(false)
  }

  if (!canViewContracts || notifications.length === 0) {
    return null
  }

  return (
    <>
      {/* Botón de notificaciones en el header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-[#004C4C] hover:bg-gray-100 rounded-xl transition-all duration-200"
        title={`${notifications.length} contrato${notifications.length > 1 ? 's' : ''} próximo${notifications.length > 1 ? 's' : ''} a vencer`}
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4 pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Contratos Próximos a Vencer
                  </h3>
                  <p className="text-white text-opacity-90 text-sm">
                    {notifications.length} {notifications.length === 1 ? 'contrato' : 'contratos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista de notificaciones */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#87E0E0] mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando notificaciones...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No hay contratos próximos a vencer</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewContract(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.dias_restantes <= 7
                            ? 'bg-red-100'
                            : notification.dias_restantes <= 14
                            ? 'bg-amber-100'
                            : 'bg-blue-100'
                        }`}>
                          <Calendar className={`h-5 w-5 ${
                            notification.dias_restantes <= 7
                              ? 'text-red-600'
                              : notification.dias_restantes <= 14
                              ? 'text-amber-600'
                              : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {notification.nombre_completo}
                            </p>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              notification.dias_restantes <= 7
                                ? 'bg-red-100 text-red-700'
                                : notification.dias_restantes <= 14
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {notification.dias_restantes} {notification.dias_restantes === 1 ? 'día' : 'días'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                            <User className="h-3 w-3" />
                            <span>{notification.cedula}</span>
                          </div>
                          {notification.empresa && (
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                              <Building className="h-3 w-3" />
                              <span className="truncate">{notification.empresa}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-gray-600 mt-2">
                            <Calendar className="h-3 w-3" />
                            <span>Vence: {formatDateColombia(notification.fecha_vencimiento)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <button
                  onClick={() => router.push('/dashboard/contratos?filterVigencia=por_vencer')}
                  className="w-full text-center text-sm text-[#065C5C] hover:text-[#004C4C] font-medium"
                >
                  Ver todos los contratos próximos a vencer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
