'use client'

import { AlertTriangle, XCircle, CheckCircle, Info, Calendar, Clock } from 'lucide-react'

/**
 * Panel de alertas legales para contratos fijos
 * Muestra situación legal actual y predicciones
 */

interface ContractAlertPanelProps {
  contractStatus: {
    total_periodos?: number
    periodo_actual?: number
    años_totales?: number
    proximo_periodo?: number
    debe_ser_indefinido?: boolean
    alerta_legal?: string
  } | null
  nuevaFechaFin?: string
  className?: string
}

interface LegalAlert {
  type: 'success' | 'info' | 'warning' | 'danger'
  icon: React.ComponentType<any>
  title: string
  message: string
  bgColor: string
  borderColor: string
  textColor: string
  iconColor: string
  prediction?: string
}

export default function ContractAlertPanel({
  contractStatus,
  nuevaFechaFin,
  className = ''
}: ContractAlertPanelProps) {

  // Calcular años totales si se hace la prórroga
  const calculateTotalYearsWithExtension = (): number => {
    if (!contractStatus?.años_totales || !nuevaFechaFin) {
      return contractStatus?.años_totales || 0
    }

    // Calcular duración de la nueva prórroga
    const today = new Date()
    const extensionEnd = new Date(nuevaFechaFin)
    const extensionDays = Math.ceil((extensionEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const extensionYears = extensionDays / 365

    return contractStatus.años_totales + extensionYears
  }

  // Determinar alerta legal principal
  const getPrimaryAlert = (): LegalAlert => {
    if (!contractStatus) {
      return {
        type: 'info',
        icon: Info,
        title: 'Información no disponible',
        message: 'No se pudo cargar el estado del contrato',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      }
    }

    const totalYearsWithExtension = calculateTotalYearsWithExtension()
    const currentPeriod = contractStatus.periodo_actual || 0
    const nextPeriod = contractStatus.proximo_periodo || 0

    // Ya debe ser indefinido (4+ años actuales)
    if (contractStatus.debe_ser_indefinido) {
      return {
        type: 'danger',
        icon: XCircle,
        title: '🚨 DEBE SER CONTRATO INDEFINIDO',
        message: `Con ${contractStatus.años_totales?.toFixed(1)} años trabajados, la ley exige que sea contrato indefinido.`,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
        prediction: 'No es posible hacer más prórrogas a término fijo.'
      }
    }

    // La prórroga excederá 4 años
    if (totalYearsWithExtension > 4) {
      return {
        type: 'danger',
        icon: XCircle,
        title: '🚨 PRÓRROGA EXCEDE 4 AÑOS',
        message: `Esta prórroga resultaría en ${totalYearsWithExtension.toFixed(1)} años totales. Por ley colombiana, debe ser contrato indefinido.`,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
        prediction: 'Cambie a contrato indefinido en lugar de prórroga.'
      }
    }

    // 5ta prórroga (mínimo 1 año)
    if (nextPeriod === 5) {
      return {
        type: 'warning',
        icon: AlertTriangle,
        title: '⚠️ QUINTA PRÓRROGA - MÍNIMO 1 AÑO',
        message: `La próxima será la 5ta prórroga. Por ley, debe ser mínimo de 1 año.`,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-600',
        prediction: nuevaFechaFin ? 'Verifique que la duración sea mínimo 365 días.' : 'La próxima prórroga debe ser mínimo 1 año.'
      }
    }

    // Cerca de 4 años (3.5+ años)
    if (totalYearsWithExtension > 3.5) {
      return {
        type: 'warning',
        icon: AlertTriangle,
        title: '⚠️ CERCA DEL LÍMITE DE 4 AÑOS',
        message: `Con esta prórroga tendrá ${totalYearsWithExtension.toFixed(1)} años. Considere contrato indefinido.`,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600',
        prediction: 'La siguiente prórroga podría exceder los 4 años.'
      }
    }

    // Situación normal
    return {
      type: 'success',
      icon: CheckCircle,
      title: '✅ PRÓRROGA PERMITIDA',
      message: `Puede hacer prórroga normal. Actualmente ${contractStatus.años_totales?.toFixed(1)} años trabajados.`,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      prediction: nuevaFechaFin ? `Con esta prórroga: ${totalYearsWithExtension.toFixed(1)} años totales.` : 'Sin restricciones especiales.'
    }
  }

  const primaryAlert = getPrimaryAlert()

  // Información adicional del estado actual
  const getStatusInfo = () => {
    if (!contractStatus) return null

    return [
      {
        label: 'Período Actual',
        value: `#${contractStatus.periodo_actual || 0}`,
        icon: Calendar
      },
      {
        label: 'Próxima Prórroga',
        value: `#${contractStatus.proximo_periodo || 0}`,
        icon: Calendar
      },
      {
        label: 'Años Trabajados',
        value: `${contractStatus.años_totales?.toFixed(1) || 0} años`,
        icon: Clock
      },
      {
        label: 'Con Esta Prórroga',
        value: `${calculateTotalYearsWithExtension().toFixed(1)} años`,
        icon: Clock,
        highlight: calculateTotalYearsWithExtension() > 4
      }
    ]
  }

  const statusInfo = getStatusInfo()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alerta principal */}
      <div className={`${primaryAlert.bgColor} border ${primaryAlert.borderColor} rounded-xl p-4 lg:p-6`}>
        <div className="flex items-start space-x-4">
          <primaryAlert.icon className={`h-6 w-6 ${primaryAlert.iconColor} mt-1 flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold ${primaryAlert.textColor} mb-2`}>
              {primaryAlert.title}
            </h4>
            <p className={`text-sm ${primaryAlert.textColor} mb-3`}>
              {primaryAlert.message}
            </p>
            {primaryAlert.prediction && (
              <div className={`bg-white bg-opacity-50 rounded-lg p-3 border ${primaryAlert.borderColor}`}>
                <p className={`text-xs ${primaryAlert.textColor} font-medium`}>
                  💡 <strong>Predicción:</strong> {primaryAlert.prediction}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información del estado actual */}
      {statusInfo && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6">
          <h5 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Estado Actual del Contrato</span>
          </h5>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statusInfo.map((info, index) => (
              <div key={index} className={`p-3 rounded-lg border ${info.highlight ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <info.icon className={`h-4 w-4 ${info.highlight ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${info.highlight ? 'text-red-600' : 'text-gray-500'}`}>
                    {info.label}:
                  </span>
                </div>
                <span className={`text-sm font-bold ${info.highlight ? 'text-red-800' : 'text-gray-900'}`}>
                  {info.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información legal adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 lg:p-6">
        <h5 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <Info className="h-5 w-5" />
          <span>Marco Legal Colombiano</span>
        </h5>
        
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>4 años máximo:</strong> Después de 4 años de trabajo, el contrato debe ser indefinido.</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>5ta prórroga:</strong> Debe ser mínimo de 1 año de duración.</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>Prórrogas automáticas:</strong> Por disposición legal o reglamentaria.</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span><strong>Prórrogas acordadas:</strong> Por mutuo acuerdo entre las partes.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
