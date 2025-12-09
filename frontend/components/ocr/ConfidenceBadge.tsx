'use client'

import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export type ConfidenceLevel = 'alto' | 'medio' | 'bajo'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  className?: string
  showIcon?: boolean
  showText?: boolean
}

/**
 * Badge que muestra el nivel de confianza de un campo extraído por OCR
 */
export default function ConfidenceBadge({ 
  level, 
  className = '', 
  showIcon = true, 
  showText = true 
}: ConfidenceBadgeProps) {
  const config = getConfidenceConfig(level)

  return (
    <span className={`
      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
      ${config.bgColor} ${config.textColor} ${config.borderColor} border
      ${className}
    `}>
      {showIcon && (
        <config.icon className="h-3 w-3 mr-1" />
      )}
      {showText && config.label}
    </span>
  )
}

/**
 * Configuración visual para cada nivel de confianza
 */
export function getConfidenceConfig(level: ConfidenceLevel) {
  switch (level) {
    case 'alto':
      return {
        label: 'Alta confianza',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: CheckCircle
      }
    case 'medio':
      return {
        label: 'Media confianza',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
        icon: AlertTriangle
      }
    case 'bajo':
      return {
        label: 'Baja confianza',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: XCircle
      }
  }
}

/**
 * Componente compacto solo con ícono
 */
export function ConfidenceIcon({ level, className = '' }: { level: ConfidenceLevel, className?: string }) {
  const config = getConfidenceConfig(level)
  
  return (
    <config.icon className={`h-4 w-4 ${config.textColor} ${className}`} />
  )
}

/**
 * Componente inline para mostrar junto a inputs
 */
export function InlineConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  if (level === 'bajo') return null // No mostrar badge si la confianza es baja
  
  return (
    <ConfidenceBadge 
      level={level} 
      className="ml-2" 
      showText={false}
    />
  )
}
