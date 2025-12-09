'use client'

import { useState } from 'react'
import { Camera, Sparkles, Zap } from 'lucide-react'
import OCRModal from './OCRModal'

interface OCRButtonProps {
  onDataExtracted: (fields: any, confidence: any) => void
  disabled?: boolean
  className?: string
}

/**
 * Botón elegante para abrir el modal de extracción OCR
 * Diseño moderno con animaciones y efectos visuales
 */
export default function OCRButton({ onDataExtracted, disabled = false, className = '' }: OCRButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleDataAccepted = (data: any, confidence: any) => {
    onDataExtracted(data, confidence)
    setIsModalOpen(false)
  }

  return (
    <>
      {/* Botón principal */}
      <div className={`relative ${className}`}>
        <button
          onClick={handleOpenModal}
          disabled={disabled}
          className={`
            inline-flex items-center space-x-1.5 px-3 py-1.5
            bg-[#004C4C] hover:bg-[#065C5C] 
            text-white text-sm font-medium rounded-md
            transition-colors duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Extraer Datos</span>
        </button>


      </div>

      {/* Modal */}
      <OCRModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDataAccepted={handleDataAccepted}
        disabled={disabled}
      />
    </>
  )
}

/**
 * Versión compacta del botón para espacios reducidos
 */
export function OCRButtonCompact({ onDataExtracted, disabled = false, className = '' }: OCRButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleDataAccepted = (data: any, confidence: any) => {
    onDataExtracted(data, confidence)
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={disabled}
        className={`
          relative group
          bg-gradient-to-r from-[#004C4C] to-[#065C5C] 
          hover:from-[#065C5C] hover:to-[#0A6A6A]
          text-white font-medium py-3 px-4 rounded-xl
          transform transition-all duration-200
          hover:scale-105 hover:shadow-lg
          active:scale-95
          ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'cursor-pointer'}
          flex items-center space-x-2
          ${className}
        `}
      >
        <Camera className="h-4 w-4" />
        <span>Extraer con OCR</span>
        <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <OCRModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDataAccepted={handleDataAccepted}
        disabled={disabled}
      />
    </>
  )
}
