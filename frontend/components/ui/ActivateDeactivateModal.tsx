/**
 * Modal de confirmación para activar/desactivar registros
 * Preserva historial usando soft delete (es_activa)
 */

'use client'

import { Power, PowerOff, AlertTriangle, X } from 'lucide-react'

interface ActivateDeactivateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  recordName?: string
  isActive: boolean
  loading?: boolean
  entityType: string // "ciudad", "ARL", "caja de compensación", etc.
}

export default function ActivateDeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  recordName,
  isActive,
  loading = false,
  entityType
}: ActivateDeactivateModalProps) {
  if (!isOpen) return null

  const action = isActive ? 'desactivar' : 'activar'
  const actionCapitalized = isActive ? 'Desactivar' : 'Activar'
  const icon = isActive ? PowerOff : Power
  const IconComponent = icon
  const colorClass = isActive ? 'from-orange-600 to-orange-700' : 'from-green-600 to-green-700'
  const bgColorClass = isActive ? 'bg-orange-100' : 'bg-green-100'
  const iconColorClass = isActive ? 'text-orange-600' : 'text-green-600'
  const buttonColorClass = isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
  const alertColorClass = isActive ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-green-50 border-green-200 text-green-800'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
        
        {/* Header */}
        <div className={`bg-gradient-to-r ${colorClass} text-white p-3 flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 ${bgColorClass} rounded-full flex items-center justify-center`}>
              <IconComponent className={`h-4 w-4 ${iconColorClass}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {actionCapitalized} {entityType}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-6 h-6 hover:bg-black hover:bg-opacity-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            ¿Estás seguro de que deseas {action} {isActive ? 'esta' : 'esta'} {entityType}?
          </p>
          
          {recordName && (
            <div className={`${alertColorClass} border rounded-lg p-3 mb-4`}>
              <p className="text-sm">
                <span className="font-medium">{entityType}:</span> {recordName}
              </p>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <span className="font-medium">Información:</span> {' '}
                {isActive 
                  ? `Al desactivar, ya no estará disponible para nuevas asignaciones, pero se preservará el historial existente.`
                  : `Al activar, volverá a estar disponible para nuevas asignaciones.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto px-4 py-1.5 ${buttonColorClass} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{actionCapitalized.slice(0, -1)}ando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <IconComponent className="w-4 h-4" />
                <span>{actionCapitalized}</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
