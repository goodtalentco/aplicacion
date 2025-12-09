'use client'

import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'

/**
 * Badge de estado para contratos con alertas visuales
 * Maneja contratos fijos e indefinidos con cálculos automáticos
 */

interface ContractStatusBadgeProps {
  contractType: 'fijo' | 'indefinido' | string
  fechaFin?: string | null
  contractStatus?: {
    total_periodos?: number
    periodo_actual?: number
    años_totales?: number
    debe_ser_indefinido?: boolean
    alerta_legal?: string
  } | null
  className?: string
}

interface AlertLevel {
  type: 'success' | 'warning' | 'danger' | 'info'
  icon: React.ComponentType<any>
  bgColor: string
  textColor: string
  borderColor: string
  label: string
  description?: string
}

export default function ContractStatusBadge({
  contractType,
  fechaFin,
  contractStatus,
  className = ''
}: ContractStatusBadgeProps) {

  // Calcular días hasta vencimiento para contratos fijos
  const calculateDaysToExpiration = (): number | null => {
    if (contractType !== 'fijo' || !fechaFin) return null
    
    const today = new Date()
    const endDate = new Date(fechaFin)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  // Determinar nivel de alerta
  const getAlertLevel = (): AlertLevel => {
    // Contratos indefinidos
    if (contractType === 'indefinido') {
      return {
        type: 'success',
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        label: 'Indefinido',
        description: 'Activo'
      }
    }

    // Contratos fijos
    if (contractType === 'fijo') {
      const daysToExpiration = calculateDaysToExpiration()

      // Debe ser indefinido (4+ años)
      if (contractStatus?.debe_ser_indefinido) {
        return {
          type: 'danger',
          icon: XCircle,
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          label: 'Debe ser Indefinido',
          description: '4+ años trabajados'
        }
      }

      // Crítico - 7 días o menos
      if (daysToExpiration !== null && daysToExpiration <= 7) {
        return {
          type: 'danger',
          icon: XCircle,
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          label: 'Crítico - Renovar YA',
          description: `${daysToExpiration} días`
        }
      }

      // Próximo a vencer - 30 días o menos
      if (daysToExpiration !== null && daysToExpiration <= 30) {
        return {
          type: 'warning',
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          label: 'Próximo a Vencer',
          description: `${daysToExpiration} días`
        }
      }

      // 5ta prórroga = mínimo 1 año
      if (contractStatus?.periodo_actual === 4) {
        return {
          type: 'warning',
          icon: AlertTriangle,
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200',
          label: 'Siguiente: Mín. 1 año',
          description: '5ta prórroga'
        }
      }

      // Normal - vigente
      return {
        type: 'success',
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        label: 'Vigente',
        description: daysToExpiration ? `${daysToExpiration} días` : 'Activo'
      }
    }

    // Otros tipos de contrato
    return {
      type: 'info',
      icon: Clock,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
      label: contractType,
      description: 'Activo'
    }
  }

  const alert = getAlertLevel()
  const Icon = alert.icon

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${alert.bgColor} ${alert.textColor} ${alert.borderColor} ${className}`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold truncate">
          {alert.label}
        </span>
        {alert.description && (
          <span className="text-xs opacity-75 truncate">
            {alert.description}
          </span>
        )}
      </div>
    </div>
  )
}

// Componente adicional para mostrar período actual en contratos fijos
export function ContractPeriodBadge({
  contractStatus,
  className = ''
}: {
  contractStatus?: {
    periodo_actual?: number
    total_periodos?: number
  } | null
  className?: string
}) {
  if (!contractStatus?.periodo_actual) return null

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-800 rounded-md border border-blue-200 ${className}`}>
      <span className="text-xs font-medium">
        Período #{contractStatus.periodo_actual}
      </span>
      {contractStatus.total_periodos && contractStatus.total_periodos > 1 && (
        <span className="text-xs opacity-75">
          de {contractStatus.total_periodos}
        </span>
      )}
    </div>
  )
}
