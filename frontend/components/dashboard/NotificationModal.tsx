/**
 * Modal de notificación moderno para mostrar mensajes
 * Reemplaza los alerts nativos del navegador
 */

'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type: 'success' | 'error' | 'info'
  autoClose?: boolean
  autoCloseDelay?: number
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type,
  autoClose = true,
  autoCloseDelay = 3000
}: NotificationModalProps) {
  
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose])

  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          borderColor: 'border-green-200',
          titleColor: 'text-green-900',
          bgColor: 'bg-green-50'
        }
      case 'error':
        return {
          icon: AlertCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200',
          titleColor: 'text-red-900',
          bgColor: 'bg-red-50'
        }
      default: // info
        return {
          icon: Info,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-200',
          titleColor: 'text-blue-900',
          bgColor: 'bg-blue-50'
        }
    }
  }

  const styles = getTypeStyles()
  const Icon = styles.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className={`bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border-2 ${styles.borderColor} overflow-hidden`}>
        
        <div className={`p-6 ${styles.bgColor}`}>
          <div className="flex items-start space-x-4">
            <div className={`w-10 h-10 ${styles.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold ${styles.titleColor} mb-1`}>
                {title}
              </h3>
              
              <p className="text-gray-700 text-sm leading-relaxed">
                {message}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar si tiene auto close */}
        {autoClose && (
          <div className="h-1 bg-gray-200">
            <div 
              className={`h-full ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} transition-all ease-linear`}
              style={{
                animation: `shrink ${autoCloseDelay}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}
