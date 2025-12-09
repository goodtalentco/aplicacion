'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Calendar, 
  User, 
  DollarSign, 
  Building, 
  Heart, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  Users,
  Briefcase,
  Home,
  Activity,
  Award,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  History
} from 'lucide-react'
import { Contract } from '../../types/contract'
import { supabase } from '../../lib/supabaseClient'
import { formatDateColombia } from '../../utils/dateUtils'
import { formatCurrency } from '../../types/contract'

/**
 * Modal de Historial de Contrato - La mejor UX para mostrar la biografía completa
 * Diseño de línea de tiempo interactiva con animaciones y microinteracciones
 */

interface ContractHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  contract: Contract | null
}

interface HistoryEvent {
  id: string
  date: string
  type: 'creation' | 'approval' | 'economic' | 'personal' | 'cargo' | 'entities' | 'beneficiaries' | 'time' | 'incapacity' | 'termination'
  title: string
  description: string
  details?: any
  icon: any
  color: string
  bgColor: string
  borderColor: string
  impact: 'positive' | 'neutral' | 'negative'
  user?: string
  userId?: string
  expanded?: boolean
}

const EVENT_CONFIGS = {
  creation: {
    icon: FileText,
    color: 'text-[#004C4C]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#87E0E0]',
    impact: 'neutral' as const
  },
  approval: {
    icon: CheckCircle,
    color: 'text-[#065C5C]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#5FD3D2]',
    impact: 'positive' as const
  },
  economic: {
    icon: DollarSign,
    color: 'text-[#0A6A6A]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#58BFC2]',
    impact: 'positive' as const
  },
  personal: {
    icon: User,
    color: 'text-[#004C4C]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#87E0E0]',
    impact: 'neutral' as const
  },
  cargo: {
    icon: Briefcase,
    color: 'text-[#065C5C]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#5FD3D2]',
    impact: 'positive' as const
  },
  entities: {
    icon: Building,
    color: 'text-[#0A6A6A]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#58BFC2]',
    impact: 'neutral' as const
  },
  beneficiaries: {
    icon: Heart,
    color: 'text-[#065C5C]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#5FD3D2]',
    impact: 'positive' as const
  },
  time: {
    icon: Clock,
    color: 'text-[#0A6A6A]',
    bgColor: 'bg-[#E6F5F7]',
    borderColor: 'border-[#58BFC2]',
    impact: 'positive' as const
  },
  incapacity: {
    icon: Activity,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    impact: 'negative' as const
  },
  termination: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    impact: 'negative' as const
  }
}

export default function ContractHistoryModal({ isOpen, onClose, contract }: ContractHistoryModalProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [stats, setStats] = useState({
    totalEvents: 0,
    positiveEvents: 0,
    duration: 0,
    totalSalaryIncreases: 0
  })

  const formatDate = formatDateColombia

  // Cargar historial cuando se abre el modal
  useEffect(() => {
    const loadContractHistory = async () => {
    if (!contract?.id) return

    setLoading(true)
    try {
      const historyEvents: HistoryEvent[] = []

      // 1. Evento de creación
      historyEvents.push({
        id: 'creation',
        date: contract.created_at || contract.fecha_ingreso || new Date().toISOString(),
        type: 'creation',
        title: 'Contrato Creado',
        description: `Contrato ${contract.numero_contrato_helisa} creado para ${contract.primer_nombre} ${contract.primer_apellido}`,
        details: {
          numero: contract.numero_contrato_helisa,
          tipo: contract.tipo_contrato,
          salario_inicial: contract.salario,
          cargo_inicial: contract.cargo
        },
        ...EVENT_CONFIGS.creation
      })

      // 2. Evento de aprobación con snapshot completo
      if (contract.approved_at) {
        historyEvents.push({
          id: 'approval',
          date: contract.approved_at,
          type: 'approval',
          title: 'Contrato Aprobado',
          description: 'El contrato fue aprobado y activado oficialmente',
          user: contract.approved_by || 'Sistema RRHH',
          details: {
            // Snapshot completo del contrato al momento de aprobación
            salario_aprobado: contract.salario,
            cargo_aprobado: contract.cargo,
            tipo_contrato: contract.tipo_contrato,
            fecha_ingreso: contract.fecha_ingreso,
            auxilio_transporte: contract.auxilio_transporte,
            auxilio_alimentacion: (contract as any).auxilio_alimentacion,
            bonificacion: (contract as any).bonificacion,
            ciudad_labora: contract.ciudad_labora,
            eps: (contract as any).eps,
            pension: (contract as any).pension,
            arl: (contract as any).arl,
            caja_compensacion: (contract as any).caja_compensacion,
            cesantias: (contract as any).cesantias,
            beneficiario_hijo: contract.beneficiario_hijo,
            beneficiario_madre: contract.beneficiario_madre,
            beneficiario_padre: contract.beneficiario_padre,
            beneficiario_conyuge: contract.beneficiario_conyuge,
            fecha_aprobacion: contract.approved_at,
            aprobado_por: contract.approved_by || 'Sistema RRHH'
          },
          ...EVENT_CONFIGS.approval
        })
      }

      // 3. Cargar novedades económicas con información del usuario
      const { data: economicEvents } = await supabase
        .from('novedades_economicas')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (
            email
          )
        `)
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: true })

      economicEvents?.forEach((event, index) => {
        const userInfo = event.usuario?.email || 'Usuario desconocido'
        
        historyEvents.push({
          id: `economic_${event.id}`,
          date: event.created_at, // ✅ Usar timestamp de creación
          type: 'economic',
          title: 'Cambio Económico',
          description: `Actualización en ${event.tipo}: ${formatCurrency(event.valor_nuevo)}`,
          user: userInfo,
          details: {
            tipo: event.tipo,
            valor_anterior: event.valor_anterior,
            valor_nuevo: event.valor_nuevo,
            concepto: event.concepto,
            motivo: event.motivo,
            observacion: event.observacion,
            fecha_aplicacion: event.fecha, // Fecha de aplicación como detalle
            fecha_creacion: event.created_at,
            creado_por: userInfo
          },
          ...EVENT_CONFIGS.economic
        })
      })

      // 4. Cargar cambios de cargo con información del usuario
      const { data: cargoEvents } = await supabase
        .from('novedades_cambio_cargo')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (
            email
          )
        `)
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: true })

      cargoEvents?.forEach(event => {
        const userInfo = event.usuario?.email || 'Usuario desconocido'
        
        historyEvents.push({
          id: `cargo_${event.id}`,
          date: event.created_at, // ✅ Usar timestamp de creación
          type: 'cargo',
          title: 'Cambio de Cargo',
          description: `Promoción: ${event.cargo_anterior} → ${event.cargo_nuevo}`,
          user: userInfo,
          details: {
            cargo_anterior: event.cargo_anterior,
            cargo_nuevo: event.cargo_nuevo,
            salario_anterior: event.salario_anterior,
            salario_nuevo: event.salario_nuevo,
            aporta_sena: event.aporta_sena,
            observacion: event.observacion,
            fecha_aplicacion: event.fecha, // Fecha de aplicación como detalle
            fecha_creacion: event.created_at,
            creado_por: userInfo
          },
          ...EVENT_CONFIGS.cargo
        })
      })

      // 5. Cargar cambios de datos personales con información del usuario
      const { data: personalEvents } = await supabase
        .from('novedades_datos_personales')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (
            email
          )
        `)
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: true })

      personalEvents?.forEach(event => {
        const userInfo = event.usuario?.email || 'Usuario desconocido'
        
        historyEvents.push({
          id: `personal_${event.id}`,
          date: event.created_at, // ✅ Usar timestamp de creación
          type: 'personal',
          title: 'Datos Personales',
          description: `Actualización de ${event.campo}: ${event.valor_nuevo}`,
          user: userInfo,
          details: {
            campo: event.campo,
            valor_anterior: event.valor_anterior,
            valor_nuevo: event.valor_nuevo,
            observacion: event.observacion,
            fecha_aplicacion: event.fecha, // Fecha de aplicación como detalle
            creado_por: userInfo
          },
          ...EVENT_CONFIGS.personal
        })
      })

      // 6-10. Cargar resto de novedades con información del usuario y timestamps correctos
      const noveltyTables = [
        { table: 'novedades_entidades', type: 'entities', dateField: 'fecha' },
        { table: 'novedades_beneficiarios', type: 'beneficiaries', dateField: 'fecha' },
        { table: 'novedades_tiempo_laboral', type: 'time', dateField: 'fecha_inicio' },
        { table: 'novedades_incapacidad', type: 'incapacity', dateField: 'fecha_inicio' },
        { table: 'novedades_terminacion', type: 'termination', dateField: 'fecha' }
      ]

      for (const novelty of noveltyTables) {
        const { data: events } = await supabase
          .from(novelty.table)
          .select(`
            *,
            usuario:usuarios_basicos!created_by (
              email
            )
          `)
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: true })

        events?.forEach((event: any) => {
          const userInfo = event.usuario?.email || 'Usuario desconocido'

          let title = ''
          let description = ''

          switch (novelty.type) {
            case 'entities':
              title = 'Cambio de Entidad'
              description = `${event.tipo}: ${event.entidad_anterior} → ${event.entidad_nueva}`
              break
            case 'beneficiaries':
              title = 'Cambio de Beneficiarios'
              description = `${event.tipo_beneficiario}: ${event.valor_anterior || 0} → ${event.valor_nuevo}`
              break
            case 'time':
              title = event.tipo_tiempo === 'prorroga' ? 'Prórroga de Contrato' : 'Evento de Tiempo'
              description = event.tipo_tiempo === 'prorroga' 
                ? `Prórroga hasta ${formatDate(event.nueva_fecha_fin || '')}`
                : `${event.tipo_tiempo} por ${event.dias} días`
              break
            case 'incapacity':
              title = 'Incapacidad'
              description = `Incapacidad ${event.tipo_incapacidad} por ${event.dias} días`
              break
            case 'termination':
              title = 'Contrato Terminado'
              description = `Terminación por ${event.tipo_terminacion}`
              break
          }

          historyEvents.push({
            id: `${novelty.type}_${event.id}`,
            date: event.created_at, // ✅ Usar timestamp de creación
            type: novelty.type as any,
            title,
            description,
            user: userInfo,
            details: { 
              ...event, 
              fecha_aplicacion: event[novelty.dateField], // Fecha de aplicación como detalle
              creado_por: userInfo 
            },
            ...EVENT_CONFIGS[novelty.type as keyof typeof EVENT_CONFIGS]
          })
        })
      }

      // Ordenar eventos por fecha
      historyEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calcular estadísticas
      const totalEvents = historyEvents.length
      const positiveEvents = historyEvents.filter(e => e.impact === 'positive').length
      const startDate = new Date(contract.fecha_ingreso || new Date())
      const terminationEvent = historyEvents.find(e => e.type === 'termination')
      const endDate = terminationEvent 
        ? new Date(terminationEvent.date)
        : new Date()
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      const totalSalaryIncreases = economicEvents?.filter(e => 
        e.tipo === 'salario' && e.valor_nuevo > (e.valor_anterior || 0)
      ).length || 0

      setStats({
        totalEvents,
        positiveEvents,
        duration,
        totalSalaryIncreases
      })

      setEvents(historyEvents)
    } catch (error) {
      console.error('Error loading contract history:', error)
    } finally {
      setLoading(false)
    }
    }

    if (isOpen && contract) {
      loadContractHistory()
    }
  }, [isOpen, contract?.id])

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const filteredEvents = selectedFilter === 'all' 
    ? events 
    : events.filter(event => event.type === selectedFilter)

  const eventTypes = Array.from(new Set(events.map(e => e.type)))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col">
        {/* Header Compacto con colores GOOD Talent */}
        <div className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white px-6 py-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-[#E6F5F7] bg-opacity-20 p-2 rounded-full">
                <History className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  Historial del Contrato
                </h2>
                <p className="text-[#87E0E0] text-sm">
                  {contract?.primer_nombre} {contract?.primer_apellido} • {contract?.numero_contrato_helisa}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#E6F5F7] hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Estadísticas Compactas */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="bg-[#E6F5F7] bg-opacity-10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{stats.totalEvents}</div>
              <div className="text-xs text-[#87E0E0]">Eventos</div>
            </div>
            <div className="bg-[#E6F5F7] bg-opacity-10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-[#5FD3D2]">{stats.positiveEvents}</div>
              <div className="text-xs text-[#87E0E0]">Positivos</div>
            </div>
            <div className="bg-[#E6F5F7] bg-opacity-10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{stats.duration}</div>
              <div className="text-xs text-[#87E0E0]">Días</div>
            </div>
            <div className="bg-[#E6F5F7] bg-opacity-10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-[#58BFC2]">{stats.totalSalaryIncreases}</div>
              <div className="text-xs text-[#87E0E0]">Aumentos</div>
            </div>
          </div>
        </div>

        {/* Filtros Compactos */}
        <div className="px-6 py-3 border-b bg-gray-50 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-[#004C4C] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({events.length})
            </button>
            {eventTypes.map(type => {
              const config = EVENT_CONFIGS[type as keyof typeof EVENT_CONFIGS]
              const count = events.filter(e => e.type === type).length
              return (
                <button
                  key={type}
                  onClick={() => setSelectedFilter(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedFilter === type
                      ? `${config.bgColor} ${config.color} border ${config.borderColor}`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Timeline con Scroll Correcto */}
        <div className="flex-1 overflow-y-auto p-6" style={{maxHeight: 'calc(90vh - 200px)'}}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#004C4C]"></div>
              <span className="ml-4 text-gray-600">Cargando historia del contrato...</span>
            </div>
          ) : (
            <div className="relative">
              {/* Línea de tiempo vertical compacta */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#87E0E0] via-[#5FD3D2] to-[#87E0E0]"></div>

              {filteredEvents.map((event, index) => {
                const Icon = event.icon
                const isExpanded = expandedEvents.has(event.id)

                return (
                  <div key={event.id} className="relative flex items-start mb-4">
                    {/* Punto en la línea de tiempo más pequeño */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 border-white shadow-md
                      ${event.bgColor} ${event.borderColor} transition-all duration-200 hover:scale-105
                    `}>
                      <Icon className={`h-4 w-4 ${event.color}`} />
                    </div>

                    {/* Contenido del evento compacto */}
                    <div className="flex-1 ml-4">
                      <div 
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
                          ${event.bgColor} ${event.borderColor}
                          ${isExpanded ? 'shadow-sm' : ''}
                        `}
                        onClick={() => toggleEventExpansion(event.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`font-semibold text-sm ${event.color} truncate`}>
                                {event.title}
                              </h3>
                              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full whitespace-nowrap">
                                {formatDate(event.date)}
                              </span>
                            </div>
                            <p className="text-gray-700 text-xs mb-1 overflow-hidden" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {event.description}
                            </p>
                            {event.user && (
                              <p className="text-xs text-gray-500">
                                👤 {event.user}
                              </p>
                            )}
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Detalles expandibles compactos */}
                        {isExpanded && event.details && (
                          <div className="mt-3 pt-3 border-t border-gray-200 bg-white bg-opacity-70 rounded-md p-2">
                            <div className="grid grid-cols-1 gap-2 text-xs">
                              {Object.entries(event.details).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center py-1">
                                  <span className="font-medium text-gray-600 capitalize text-xs">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="text-gray-800 text-xs font-mono">
                                    {typeof value === 'number' && (key.includes('salario') || key.includes('valor')) 
                                      ? formatCurrency(value) 
                                      : String(value || 'N/A')
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Estado final */}
              {filteredEvents.length === 0 && !loading && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay eventos para mostrar
                  </h3>
                  <p className="text-gray-500">
                    {selectedFilter === 'all' 
                      ? 'Este contrato no tiene historial registrado.'
                      : `No hay eventos del tipo "${selectedFilter}" en este contrato.`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer compacto */}
        <div className="border-t bg-gray-50 px-6 py-3 flex-shrink-0 rounded-b-xl">
          <div className="flex items-center justify-between text-xs">
            <div className="text-gray-600">
              📊 {filteredEvents.length} de {events.length} eventos
            </div>
            <div className="text-gray-500">
              💡 Clic para expandir detalles
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
