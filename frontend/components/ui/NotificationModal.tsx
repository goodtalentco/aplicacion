/**
 * Modal de notificaciones moderno para mostrar errores, éxito y advertencias
 * Reemplaza los alert() feos de JavaScript
 */

import { useEffect } from 'react'
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export type NotificationType = 'error' | 'success' | 'warning' | 'info'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type: NotificationType
  title: string
  message: string
  autoClose?: boolean
  autoCloseDelay?: number
}

const getNotificationConfig = (type: NotificationType) => {
  switch (type) {
    case 'error':
      return {
        icon: <AlertCircle className="w-6 h-6" />,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        buttonColor: 'bg-red-600 hover:bg-red-700',
        titleColor: 'text-red-800'
      }
    case 'success':
      return {
        icon: <CheckCircle className="w-6 h-6" />,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        buttonColor: 'bg-green-600 hover:bg-green-700',
        titleColor: 'text-green-800'
      }
    case 'warning':
      return {
        icon: <AlertTriangle className="w-6 h-6" />,
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        buttonColor: 'bg-amber-600 hover:bg-amber-700',
        titleColor: 'text-amber-800'
      }
    case 'info':
      return {
        icon: <Info className="w-6 h-6" />,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        buttonColor: 'bg-blue-600 hover:bg-blue-700',
        titleColor: 'text-blue-800'
      }
  }
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  const config = getNotificationConfig(type)

  // Auto close para notificaciones de éxito
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)

      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose])

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${config.borderColor}`}>
          <div className="flex items-center space-x-3">
            <div className={`${config.iconColor}`}>
              {config.icon}
            </div>
            <h3 className={`text-lg font-semibold ${config.titleColor}`}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 ${config.bgColor} ${config.borderColor} border-l-4`}>
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 space-x-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 ${config.buttonColor} text-white rounded-lg transition-colors font-medium`}
          >
            {type === 'error' ? 'Entendido' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
