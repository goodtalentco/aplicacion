'use client'

import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { Contract } from '../../types/contract'

interface ReportNoveltyButtonProps {
  contract: Contract
  onReport?: (contract: Contract) => void
  size?: 'sm' | 'md'
}

/**
 * Botón para reportar novedades de nómina en contratos aprobados
 * Solo aparece en contratos con status_aprobacion === 'aprobado'
 */
export default function ReportNoveltyButton({ 
  contract, 
  onReport,
  size = 'md'
}: ReportNoveltyButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (onReport) {
      onReport(contract)
    } else {
      // Por ahora solo mostrar un mensaje
      alert(`Reportar novedad para: ${contract.primer_nombre} ${contract.primer_apellido}`)
    }
  }

  const sizeClasses = size === 'sm' 
    ? 'px-3 py-1.5 text-xs' 
    : 'px-4 py-2 text-sm'

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        ${sizeClasses}
        bg-gradient-to-r from-orange-500 to-orange-600 
        hover:from-orange-600 hover:to-orange-700 
        text-white font-medium rounded-lg 
        transition-all duration-200 
        transform hover:scale-105 
        shadow-sm hover:shadow-md
        flex items-center space-x-1.5
      `}
      title="Reportar novedad de nómina"
    >
      <FileText className={`${iconSize} transition-transform duration-200 ${isHovered ? 'rotate-6' : ''}`} />
      <span>Novedad</span>
    </button>
  )
}
