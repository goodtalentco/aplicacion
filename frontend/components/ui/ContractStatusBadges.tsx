'use client'

import { 
  Contract, 
  getContractStatusConfig, 
  getStatusAprobacionConfig, 
  getStatusVigenciaConfig 
} from '../../types/contract'

interface ContractStatusBadgesProps {
  contract: Contract
  showDetailed?: boolean
}

/**
 * Componente moderno para mostrar badges de estado de contratos
 * Muestra estado de aprobación y vigencia con colores y iconos intuitivos
 */
export default function ContractStatusBadges({ contract, showDetailed = false }: ContractStatusBadgesProps) {
  const statusConfig = getContractStatusConfig(contract)
  const aprobacionConfig = getStatusAprobacionConfig(contract.status_aprobacion)
  const vigenciaConfig = getStatusVigenciaConfig(statusConfig.status_vigencia, statusConfig.days_until_expiry)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badge de Estado de Aprobación */}
      <div className={`
        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
        ${aprobacionConfig.color}
        transition-all duration-200 hover:shadow-sm
      `}>
        {aprobacionConfig.icon && <span className="mr-1.5 text-sm">{aprobacionConfig.icon}</span>}
        {aprobacionConfig.label}
      </div>

      {/* Badge de Estado de Vigencia */}
      <div className={`
        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
        ${vigenciaConfig.color}
        transition-all duration-200 hover:shadow-sm
      `}>
        {vigenciaConfig.icon && <span className="mr-1.5 text-sm">{vigenciaConfig.icon}</span>}
        {vigenciaConfig.label}
      </div>

      {/* Información adicional cuando se muestra detalle */}
      {showDetailed && (
        <>
          {/* Fecha de aprobación */}
          {contract.approved_at && (
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border">
              Aprobado: {new Date(contract.approved_at).toLocaleDateString('es-CO')}
            </div>
          )}
          
          {/* Días hasta vencimiento si aplica */}
          {statusConfig.days_until_expiry !== null && statusConfig.days_until_expiry > 0 && (
            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
              Vence en {statusConfig.days_until_expiry} días
            </div>
          )}
          
          {/* Contrato indefinido */}
          {!contract.fecha_fin && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
              📅 Indefinido
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Componente compacto para usar en tarjetas
export function ContractStatusCompact({ 
  contract, 
  isTerminated = false, 
  fechaTerminacion = null 
}: { 
  contract: Contract
  isTerminated?: boolean
  fechaTerminacion?: string | null
}) {
  const statusConfig = getContractStatusConfig(contract)
  const aprobacionConfig = getStatusAprobacionConfig(statusConfig.status_aprobacion)
  
  // Si está terminado por novedad, usar estado de terminado
  const vigenciaConfig = isTerminated 
    ? { 
        label: 'Terminado', 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: '🔴' 
      }
    : getStatusVigenciaConfig(statusConfig.status_vigencia, statusConfig.days_until_expiry)

  // Determinar el estado más crítico para mostrar
  const isCritical = isTerminated || statusConfig.status_vigencia === 'terminado' || 
    (statusConfig.days_until_expiry !== null && statusConfig.days_until_expiry <= 7)
  
  const isDraft = statusConfig.status_aprobacion === 'borrador'

  return (
    <div className="flex items-center gap-1.5">
      {/* Indicador principal */}
      <div className={`
        flex items-center px-2 py-0.5 rounded-md text-xs font-medium
        ${isDraft ? aprobacionConfig.color : vigenciaConfig.color}
      `}>
        {(isDraft ? aprobacionConfig.icon : vigenciaConfig.icon) && (
          <span className="mr-1">
            {isDraft ? aprobacionConfig.icon : vigenciaConfig.icon}
          </span>
        )}
        {isDraft ? aprobacionConfig.label : vigenciaConfig.label}
      </div>

      {/* Indicador secundario si no es borrador */}
      {!isDraft && aprobacionConfig.icon && (
        <div className="text-xs text-gray-400">
          {aprobacionConfig.icon}
        </div>
      )}

      {/* Alerta crítica */}
      {isCritical && statusConfig.status_vigencia === 'activo' && (
        <div className="text-xs text-red-500 font-bold">
          ⚠️
        </div>
      )}
    </div>
  )
}
