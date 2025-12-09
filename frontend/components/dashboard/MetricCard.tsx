'use client'

import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

/**
 * Card reutilizable para mostrar métricas del dashboard
 * Incluye valor principal, tendencia y iconos
 */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue'
}: MetricCardProps) {
  
  const colorClasses = {
    blue: {
      bg: 'from-[#87E0E0] to-[#5FD3D2]',
      icon: 'text-[#004C4C]',
      text: 'text-[#004C4C]'
    },
    green: {
      bg: 'from-green-400 to-green-500',
      icon: 'text-white',
      text: 'text-green-600'
    },
    purple: {
      bg: 'from-purple-400 to-purple-500',
      icon: 'text-white',
      text: 'text-purple-600'
    },
    orange: {
      bg: 'from-orange-400 to-orange-500',
      icon: 'text-white',
      text: 'text-orange-600'
    },
    red: {
      bg: 'from-red-400 to-red-500',
      icon: 'text-white',
      text: 'text-red-600'
    }
  }

  const colors = colorClasses[color]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      
      {/* Header with Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${colors.bg} rounded-xl flex items-center justify-center shadow-sm`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        
        {trend && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend.isPositive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            <span className={trend.isPositive ? '↗️' : '↘️'}>
              {trend.isPositive ? '↗️' : '↘️'}
            </span>
            <span>{trend.value}% {trend.label}</span>
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-sm font-semibold text-gray-600">
          {title}
        </div>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-gray-500 font-medium">
          {subtitle}
        </div>
      )}
    </div>
  )
}
