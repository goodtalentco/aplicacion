'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  open: boolean
  type?: ToastType
  title?: string
  message: string
  onClose: () => void
  durationMs?: number
}

/**
 * Toast minimalista fijado abajo a la derecha
 */
export default function Toast({ open, type = 'info', title, message, onClose, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, durationMs)
    return () => clearTimeout(t)
  }, [open, durationMs, onClose])

  if (!open) return null

  const styleByType = {
    success: {
      icon: CheckCircle,
      bg: 'bg-white',
      border: 'border-green-200',
      ring: 'shadow-[0_10px_30px_rgba(16,185,129,0.25)]',
      accent: 'text-green-600'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-white',
      border: 'border-red-200',
      ring: 'shadow-[0_10px_30px_rgba(239,68,68,0.25)]',
      accent: 'text-red-600'
    },
    info: {
      icon: Info,
      bg: 'bg-white',
      border: 'border-blue-200',
      ring: 'shadow-[0_10px_30px_rgba(59,130,246,0.2)]',
      accent: 'text-blue-600'
    }
  }[type]

  const Icon = styleByType.icon

  return (
    <div className="fixed bottom-4 right-4 z-[80]">
      <div className={`w-[92vw] max-w-sm ${styleByType.bg} border ${styleByType.border} ${styleByType.ring} rounded-xl p-4 flex items-start space-x-3`}> 
        <div className={`mt-0.5 ${styleByType.accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {title && <div className="text-sm font-semibold text-gray-900 mb-0.5">{title}</div>}
          <div className="text-sm text-gray-700 break-words">{message}</div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 transition-colors">×</button>
      </div>
    </div>
  )
}


