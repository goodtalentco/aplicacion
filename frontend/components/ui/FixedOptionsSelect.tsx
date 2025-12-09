/**
 * Select con opciones fijas predefinidas
 * Para campos como tipo de contrato, empresa interna, tipo de salario
 */

'use client'

import { ChevronDown } from 'lucide-react'

interface FixedOption {
  value: string
  label: string
}

interface FixedOptionsSelectProps {
  options: FixedOption[]
  selectedValue: string
  onSelect: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  label?: string
  icon?: string
}

export default function FixedOptionsSelect({
  options,
  selectedValue,
  onSelect,
  placeholder = "Seleccionar...",
  disabled = false,
  error = false,
  label,
  icon
}: FixedOptionsSelectProps) {

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Select con estilo custom */}
      <div className="relative">
        <select
          value={selectedValue}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent appearance-none bg-white pr-10 ${
            icon ? 'pl-12' : 'pl-4'
          } ${
            error 
              ? 'border-red-500' 
              : disabled 
                ? 'border-gray-200 bg-gray-50 text-gray-400' 
                : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <option value="" disabled>
            {icon ? `${icon} ${placeholder}` : placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {icon ? `${icon} ${option.label}` : option.label}
            </option>
          ))}
        </select>
        
        {/* Icono a la izquierda */}
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg pointer-events-none">
            {icon}
          </div>
        )}
        
        {/* Icono de dropdown */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Contador de opciones */}
      {options.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          {options.length} opciones disponibles
        </div>
      )}
    </div>
  )
}
