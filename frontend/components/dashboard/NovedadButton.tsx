'use client'

import { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import NovedadTypeSelector, { NovedadType } from './NovedadTypeSelector'
import NovedadDatosPersonalesModal from './NovedadDatosPersonalesModal'
import { NovedadCambioCargoModal } from './NovedadCambioCargoModal'
import { NovedadEntidadesModal } from './NovedadEntidadesModal'
import NovedadEconomicasModal from './NovedadEconomicasModal'
import NovedadTiempoLaboralModal from './NovedadTiempoLaboralModal'
import NovedadIncapacidadesModal from './NovedadIncapacidadesModal'
import NovedadBeneficiariosModal from './NovedadBeneficiariosModal'
import NovedadTerminacionModal from './NovedadTerminacionModal'

/**
 * Botón principal para crear novedades
 * Maneja el flujo completo: selector de tipo → modal específico
 */

interface NovedadButtonProps {
  contractId: string
  contractName: string
  onSuccess?: () => void
  className?: string
}

export default function NovedadButton({
  contractId,
  contractName,
  onSuccess,
  className = ''
}: NovedadButtonProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [selectedType, setSelectedType] = useState<NovedadType | null>(null)
  const [showSpecificModal, setShowSpecificModal] = useState(false)

  const handleSelectType = (type: NovedadType) => {
    setSelectedType(type)
    setShowTypeSelector(false)
    setShowSpecificModal(true)
  }

  const handleCloseSpecificModal = () => {
    setShowSpecificModal(false)
    setSelectedType(null)
  }

  const handleBackToSelector = () => {
    setShowSpecificModal(false)
    setSelectedType(null)
    setShowTypeSelector(true)
  }

  const handleSuccess = () => {
    setShowSpecificModal(false)
    setSelectedType(null)
    onSuccess?.()
  }

  const renderSpecificModal = () => {
    if (!selectedType || !showSpecificModal) return null

    switch (selectedType.id) {
      case 'datos_personales':
        return (
          <NovedadDatosPersonalesModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      case 'cambio_cargo':
        return (
          <NovedadCambioCargoModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      case 'entidades':
        return (
          <NovedadEntidadesModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      case 'economicas':
        return (
          <NovedadEconomicasModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      case 'tiempo_laboral':
        return (
          <NovedadTiempoLaboralModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      case 'incapacidad':
        return (
          <NovedadIncapacidadesModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      case 'beneficiarios':
        return (
          <NovedadBeneficiariosModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      case 'terminacion':
        return (
          <NovedadTerminacionModal
            isOpen={showSpecificModal}
            onClose={handleCloseSpecificModal}
            onBack={handleBackToSelector}
            onSuccess={handleSuccess}
            contractId={contractId}
            contractName={contractName}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={() => setShowTypeSelector(true)}
        className={`
          inline-flex items-center space-x-2 px-4 py-2 
          bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] 
          text-white font-semibold rounded-lg 
          hover:from-[#58BFC2] hover:to-[#5FD3D2] 
          transition-all duration-200 shadow-lg
          hover:scale-105 transform
          ${className}
        `}
      >
        <Plus className="w-4 h-4" />
        <span>Novedad</span>
      </button>

      {/* Selector de tipo */}
      <NovedadTypeSelector
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        onSelectType={handleSelectType}
        contractId={contractId}
        contractName={contractName}
      />

      {/* Modal específico */}
      {renderSpecificModal()}
    </>
  )
}
