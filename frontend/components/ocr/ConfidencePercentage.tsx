'use client'

import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface ConfidencePercentageProps {
  percentage: number
  className?: string
  showIcon?: boolean
  showText?: boolean
  compact?: boolean
}

/**
 * Componente que muestra el porcentaje de confianza de Gemini (0-100) de manera visual
 */
export default function ConfidencePercentage({ 
  percentage, 
  className = '', 
  showIcon = true, 
  showText = true,
  compact = false
}: ConfidencePercentageProps) {
  const config = getPercentageConfig(percentage)

  if (compact) {
    return (
      <span className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor} border
        ${className}
      `}>
        {showIcon && (
          <config.icon className="h-3 w-3 mr-1" />
        )}
        {percentage}%
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {showIcon && (
        <config.icon className={`h-4 w-4 ${config.textColor}`} />
      )}
      <div className="flex items-center space-x-1">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${config.barColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {showText && (
          <span className={`text-xs font-medium ${config.textColor}`}>
            {percentage}%
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Configuración visual basada en el porcentaje
 */
function getPercentageConfig(percentage: number) {
  if (percentage >= 80) {
    return {
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      barColor: 'bg-green-500',
      icon: CheckCircle
    }
  } else if (percentage >= 60) {
    return {
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      barColor: 'bg-yellow-500',
      icon: AlertTriangle
    }
  } else {
    return {
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      barColor: 'bg-red-500',
      icon: XCircle
    }
  }
}

/**
 * Componente compacto para mostrar junto a inputs
 */
export function InlineConfidencePercentage({ 
  percentage, 
  className = '' 
}: { 
  percentage: number
  className?: string 
}) {
  if (percentage < 50) return null // No mostrar si la confianza es muy baja
  
  return (
    <ConfidencePercentage 
      percentage={percentage} 
      className={`ml-2 ${className}`} 
      compact={true}
      showIcon={false}
    />
  )
}
