'use client'

import { Calendar, Clock, FileText, AlertCircle } from 'lucide-react'

/**
 * Timeline completo del historial de períodos de contratos fijos
 * Responsive: Desktop (tabla), Tablet/Mobile (cards apiladas)
 */

interface Period {
  id: string
  numero_periodo: number
  fecha_inicio: string
  fecha_fin: string
  tipo_periodo: 'inicial' | 'prorroga_automatica' | 'prorroga_acordada'
  es_periodo_actual: boolean
  observaciones?: string | null
  dias?: number
}

interface ContractHistoryTimelineProps {
  periods: Period[]
  contractStatus?: {
    total_periodos?: number
    periodo_actual?: number
    años_totales?: number
    dias_totales?: number
    debe_ser_indefinido?: boolean
    alerta_legal?: string
  } | null
  className?: string
}

export default function ContractHistoryTimeline({
  periods,
  contractStatus,
  className = ''
}: ContractHistoryTimelineProps) {

  // Calcular días de un período (sin problemas de zona horaria)
  const calculatePeriodDays = (fechaInicio: string, fechaFin: string): number => {
    // Parsear fechas sin problemas de zona horaria
    const [startYear, startMonth, startDay] = fechaInicio.split('-').map(Number)
    const [endYear, endMonth, endDay] = fechaFin.split('-').map(Number)
    
    const start = new Date(startYear, startMonth - 1, startDay)
    const end = new Date(endYear, endMonth - 1, endDay)
    
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 para incluir ambos días
  }

  // Formatear fecha para mostrar (sin problemas de zona horaria)
  const formatDate = (dateString: string): string => {
    // Parsear la fecha sin crear problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number)
    
    // Crear objeto Date con valores locales
    const date = new Date(year, month - 1, day)
    
    // Formatear manualmente para evitar problemas de zona horaria
    const dayStr = String(date.getDate()).padStart(2, '0')
    const monthStr = String(date.getMonth() + 1).padStart(2, '0')
    const yearStr = date.getFullYear()
    
    return `${dayStr}/${monthStr}/${yearStr}`
  }

  // Obtener label del tipo de período
  const getPeriodTypeLabel = (tipo: string, numero: number): string => {
    if (numero === 1) return 'Inicial'
    if (tipo === 'prorroga_automatica') return 'Prórroga Automática'
    if (tipo === 'prorroga_acordada') return 'Prórroga Acordada'
    return 'Prórroga'
  }

  // Obtener colores del período
  const getPeriodColors = (periodo: Period) => {
    if (periodo.es_periodo_actual) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        badge: 'bg-blue-100 text-blue-800'
      }
    }
    
    if (periodo.numero_periodo === 1) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        badge: 'bg-green-100 text-green-800'
      }
    }

    return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      badge: 'bg-gray-100 text-gray-800'
    }
  }

  // Ordenar períodos por número
  const sortedPeriods = [...periods].sort((a, b) => a.numero_periodo - b.numero_periodo)

  if (periods.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No hay historial de períodos disponible</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con información general */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 lg:p-6 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Historial Completo de Períodos</span>
        </h4>
        
        {contractStatus && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <span className="text-blue-600 text-xs font-medium block">Total Períodos:</span>
              <span className="text-blue-900 font-bold text-lg">{contractStatus.total_periodos || 0}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <span className="text-blue-600 text-xs font-medium block">Período Actual:</span>
              <span className="text-blue-900 font-bold text-lg">#{contractStatus.periodo_actual || 0}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <span className="text-blue-600 text-xs font-medium block">Tiempo Total:</span>
              <span className="text-blue-900 font-bold text-lg">{contractStatus.años_totales?.toFixed(1) || 0} años</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100">
              <span className="text-blue-600 text-xs font-medium block">Total Días:</span>
              <span className="text-blue-900 font-bold text-lg">{contractStatus.dias_totales || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Timeline de períodos - Desktop (tabla) */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Observaciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPeriods.map((period) => {
                const colors = getPeriodColors(period)
                const dias = calculatePeriodDays(period.fecha_inicio, period.fecha_fin)
                
                return (
                  <tr key={period.id} className={`${period.es_periodo_actual ? 'bg-blue-25' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                          #{period.numero_periodo}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPeriodTypeLabel(period.tipo_periodo, period.numero_periodo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>{formatDate(period.fecha_inicio)}</div>
                        <div className="text-gray-500">→ {formatDate(period.fecha_fin)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="font-medium">{dias} días</div>
                        <div className="text-gray-500">{(dias / 365).toFixed(1)} años</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={period.observaciones || 'Sin observaciones'}>
                        {period.observaciones || <span className="text-gray-400 italic">Sin observaciones</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {period.es_periodo_actual ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🔴 ACTUAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ✅ Completado
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline de períodos - Mobile/Tablet (cards) */}
      <div className="lg:hidden space-y-4">
        {sortedPeriods.map((period) => {
          const colors = getPeriodColors(period)
          const dias = calculatePeriodDays(period.fecha_inicio, period.fecha_fin)
          
          return (
            <div key={period.id} className={`${colors.bg} p-4 rounded-xl border ${colors.border}`}>
              {/* Header del card */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                    Período #{period.numero_periodo}
                  </span>
                  {period.es_periodo_actual && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      🔴 ACTUAL
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {getPeriodTypeLabel(period.tipo_periodo, period.numero_periodo)}
                </span>
              </div>

              {/* Información del período */}
              <div className="space-y-3">
                {/* Fechas */}
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className={colors.text}>
                    {formatDate(period.fecha_inicio)} → {formatDate(period.fecha_fin)}
                  </span>
                </div>

                {/* Duración */}
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className={colors.text}>
                    {dias} días ({(dias / 365).toFixed(1)} años)
                  </span>
                </div>

                {/* Observaciones */}
                {period.observaciones && (
                  <div className="flex items-start space-x-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className={colors.text}>
                      {period.observaciones}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Alerta legal si existe */}
      {contractStatus?.alerta_legal && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 lg:p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-orange-900 mb-2">Alerta Legal</h5>
              <p className="text-sm text-orange-800">{contractStatus.alerta_legal}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
