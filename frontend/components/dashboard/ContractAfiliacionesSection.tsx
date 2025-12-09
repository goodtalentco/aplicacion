/**
 * Sección de afiliaciones para la vista expandida de contratos
 * Muestra EPS, Pensión, Cesantías, ARL y Caja de Compensación actuales
 */

import { Loader2, Heart } from 'lucide-react'
import { Contract } from '../../types/contract'
import { useContractAfiliaciones } from '../../hooks/useContractAfiliaciones'

interface ContractAfiliacionesSectionProps {
  contract: Contract
  refreshTrigger?: number
}

export const ContractAfiliacionesSection: React.FC<ContractAfiliacionesSectionProps> = ({
  contract,
  refreshTrigger
}) => {
  const afiliaciones = useContractAfiliaciones(contract, refreshTrigger)

  return (
    <div className="w-64">
      <div className="font-semibold text-gray-800 mb-3 text-base h-6 flex items-center space-x-2">
        <Heart className="h-4 w-4 text-blue-500" />
        <span>Afiliaciones</span>
      </div>
      <div className="space-y-2">
        
        {/* EPS */}
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs font-medium">EPS:</span>
          <span className="text-gray-800">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>{contract.radicado_eps || 'No registrado'}</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.eps || 'No registrado'
            )}
          </span>
        </div>

        {/* Pensión */}
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs font-medium">Pensión:</span>
          <span className="text-gray-800">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>{contract.fondo_pension || 'No registrado'}</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.pension || 'No registrado'
            )}
          </span>
        </div>

        {/* Cesantías */}
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs font-medium">Cesantías:</span>
          <span className="text-gray-800">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>{contract.fondo_cesantias || 'No registrado'}</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.cesantias || 'No registrado'
            )}
          </span>
        </div>

        {/* ARL */}
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs font-medium">ARL:</span>
          <span className="text-gray-800">
            {afiliaciones.arl || 'No registrado'}
          </span>
        </div>

        {/* Caja de Compensación */}
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs font-medium">Caja:</span>
          <span className="text-gray-800">
            {afiliaciones.loading ? (
              <div className="flex items-center space-x-1">
                <span>Consultando...</span>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            ) : (
              afiliaciones.caja_compensacion || 'No registrado'
            )}
          </span>
        </div>

        {/* Error state */}
        {afiliaciones.error && (
          <div className="text-xs text-red-600 mt-2">
            {afiliaciones.error}
          </div>
        )}
      </div>
    </div>
  )
}
