/**
 * Modal elegante para mostrar errores de permisos
 * Mejora la experiencia de usuario cuando no tiene acceso
 */

import React from 'react'
import { X, Shield, AlertTriangle } from 'lucide-react'

interface PermissionDeniedModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
  permissionType?: string
}

export const PermissionDeniedModal: React.FC<PermissionDeniedModalProps> = ({
  isOpen,
  onClose,
  title = 'Acceso Denegado',
  message,
  permissionType
}) => {
  if (!isOpen) return null

  const defaultMessage = permissionType 
    ? `No tienes permisos para acceder a "${permissionType}". Contacta al administrador del sistema para solicitar acceso.`
    : 'No tienes los permisos necesarios para realizar esta acción. Contacta al administrador del sistema.'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">{title}</h3>
              <p className="text-sm text-red-700">Permisos insuficientes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-700 text-sm leading-relaxed">
                {message || defaultMessage}
              </p>
            </div>
          </div>

          {/* Contact info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>¿Necesitas acceso?</strong> Contacta al administrador del sistema 
              o al área de recursos humanos para solicitar los permisos necesarios.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
