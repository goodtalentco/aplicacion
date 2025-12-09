/**
 * Select simple y funcional para tablas auxiliares
 * Usa select nativo con mejor estilo - siempre funciona
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface AuxiliaryItem {
  id: string
  nombre: string
}

interface SimpleAuxiliarySelectProps {
  tableName: 'eps' | 'fondos_cesantias' | 'fondos_pension'
  selectedValue: string
  onSelect: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  label?: string
}

export default function SimpleAuxiliarySelect({
  tableName,
  selectedValue,
  onSelect,
  placeholder = "Seleccionar...",
  disabled = false,
  error = false,
  label
}: SimpleAuxiliarySelectProps) {
  const [items, setItems] = useState<AuxiliaryItem[]>([])
  const [loading, setLoading] = useState(false)

  // Cargar items de la tabla auxiliar
  useEffect(() => {
    loadItems()
  }, [tableName])

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('id, nombre')
        .eq('es_activa', true)
        .order('nombre', { ascending: true })

      if (error) {
        console.error(`Error loading ${tableName}:`, error)
        return
      }

      setItems(data || [])
    } catch (error) {
      console.error(`Error loading ${tableName}:`, error)
    } finally {
      setLoading(false)
    }
  }

  // Obtener icono según el tipo
  const getIcon = () => {
    switch (tableName) {
      case 'eps': return '🏥'
      case 'fondos_cesantias': return '💰'
      case 'fondos_pension': return '🏦'
      default: return '📋'
    }
  }

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
          disabled={disabled || loading}
          className={`w-full px-4 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent appearance-none bg-white pr-10 ${
            error 
              ? 'border-red-500' 
              : disabled 
                ? 'border-gray-200 bg-gray-50 text-gray-400' 
                : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <option value="" disabled>
            {loading ? 'Cargando...' : `${getIcon()} ${placeholder}`}
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.nombre}>
              {getIcon()} {item.nombre}
            </option>
          ))}
        </select>
        
        {/* Icono de dropdown */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Contador de opciones */}
      {items.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          {items.length} opciones disponibles
        </div>
      )}
    </div>
  )
}
