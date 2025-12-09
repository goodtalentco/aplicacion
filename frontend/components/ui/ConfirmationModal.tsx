'use client'

import { X, AlertTriangle } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}

/**
 * Modal personalizado para confirmaciones
 * Reemplaza el confirm() nativo del navegador con un diseño atractivo
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}: ConfirmationModalProps) {

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'bg-gradient-to-r from-red-600 to-red-700',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700'
        }
      case 'warning':
        return {
          headerBg: 'bg-gradient-to-r from-yellow-600 to-yellow-700',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'info':
      default:
        return {
          headerBg: 'bg-gradient-to-r from-[#004C4C] to-[#065C5C]',
          iconBg: 'bg-[#E6F5F7]',
          iconColor: 'text-[#004C4C]',
          confirmBg: 'bg-[#004C4C] hover:bg-[#065C5C]'
        }
    }
  }

  const styles = getTypeStyles()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden">
        
        {/* Header */}
        <div className={`${styles.headerBg} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${styles.iconBg} rounded-lg`}>
                <AlertTriangle className={`h-5 w-5 ${styles.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`px-6 py-2 text-white font-medium rounded-lg transition-all shadow-sm ${styles.confirmBg}`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  )
}
