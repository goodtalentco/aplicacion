/**
 * Sección de afiliaciones para la vista expandida de contratos
 * Muestra EPS, Pensión, Cesantías, ARL y Caja de Compensación confirmadas durante el onboarding
 */

import { Loader2, Heart, CheckCircle } from 'lucide-react'
import { Contract } from '../../types/contract'
import { useContractAfiliaciones } from '../../hooks/useContractAfiliaciones'
import { formatDateColombia } from '../../utils/dateUtils'

interface ContractAfiliacionesSectionProps {
  contract: Contract
  refreshTrigger?: number
}

export const ContractAfiliacionesSection: React.FC<ContractAfiliacionesSectionProps> = ({
  contract,
  refreshTrigger
}) => {
  const afiliaciones = useContractAfiliaciones(contract, refreshTrigger)

  // Formatear fecha de confirmación
  const formatDate = (date: string | null | undefined) => {
    if (!date) return null
    return formatDateColombia(date)
  }

  return (
    <div className="w-72">
      <div className="font-semibold text-gray-800 mb-3 text-base h-6 flex items-center space-x-2">
        <Heart className="h-4 w-4 text-blue-500" />
        <span>Afiliaciones Confirmadas</span>
      </div>
      <div className="space-y-3">
        
        {/* EPS */}
        <div className="flex flex-col bg-blue-50 p-2 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-700 text-xs font-semibold">EPS:</span>
            {contract.eps_fecha_confirmacion && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </div>
          <span className="text-gray-900 font-medium text-sm">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>{contract.radicado_eps || 'No registrado'}</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.eps || 'No registrado'
            )}
          </span>
          {contract.eps_fecha_confirmacion && (
            <span className="text-gray-600 text-xs mt-1">
              Confirmado: {formatDate(contract.eps_fecha_confirmacion)}
            </span>
          )}
        </div>

        {/* Pensión */}
        <div className="flex flex-col bg-purple-50 p-2 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-700 text-xs font-semibold">Pensión:</span>
            {contract.pension_fecha_confirmacion && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </div>
          <span className="text-gray-900 font-medium text-sm">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>{contract.fondo_pension || 'No registrado'}</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.pension || 'No registrado'
            )}
          </span>
          {contract.pension_fecha_confirmacion && (
            <span className="text-gray-600 text-xs mt-1">
              Confirmado: {formatDate(contract.pension_fecha_confirmacion)}
            </span>
          )}
        </div>

        {/* Cesantías */}
        <div className="flex flex-col bg-amber-50 p-2 rounded-lg border border-amber-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-700 text-xs font-semibold">Cesantías:</span>
            {contract.cesantias_fecha_confirmacion && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </div>
          <span className="text-gray-900 font-medium text-sm">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>{contract.fondo_cesantias || 'No registrado'}</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.cesantias || 'No registrado'
            )}
          </span>
          {contract.cesantias_fecha_confirmacion && (
            <span className="text-gray-600 text-xs mt-1">
              Confirmado: {formatDate(contract.cesantias_fecha_confirmacion)}
            </span>
          )}
        </div>

        {/* ARL */}
        <div className="flex flex-col bg-red-50 p-2 rounded-lg border border-red-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-700 text-xs font-semibold">ARL:</span>
            {contract.arl_fecha_confirmacion && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </div>
          <span className="text-gray-900 font-medium text-sm">
            {afiliaciones.arl || 'No registrado'}
          </span>
          {contract.arl_fecha_confirmacion && (
            <span className="text-gray-600 text-xs mt-1">
              Confirmado: {formatDate(contract.arl_fecha_confirmacion)}
            </span>
          )}
        </div>

        {/* Caja de Compensación */}
        <div className="flex flex-col bg-green-50 p-2 rounded-lg border border-green-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-700 text-xs font-semibold">Caja de Compensación:</span>
            {contract.caja_fecha_confirmacion && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </div>
          <span className="text-gray-900 font-medium text-sm">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>Consultando...</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.caja_compensacion || 'No registrado'
            )}
          </span>
          {contract.caja_fecha_confirmacion && (
            <span className="text-gray-600 text-xs mt-1">
              Confirmado: {formatDate(contract.caja_fecha_confirmacion)}
            </span>
          )}
        </div>

        {/* Error state */}
        {afiliaciones.error && (
          <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-200">
            {afiliaciones.error}
          </div>
        )}
      </div>
    </div>
  )
}
