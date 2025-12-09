/**
 * Dropdown predictivo para tablas auxiliares (EPS, Cesantías, Pensión)
 * Con búsqueda en tiempo real y autocompletado
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface AuxiliaryItem {
  id: string
  nombre: string
}

interface AuxiliaryDropdownProps {
  tableName: 'eps' | 'fondos_cesantias' | 'fondos_pension'
  selectedValue: string
  onSelect: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  label?: string
  maxHeight?: 'normal' | 'large' // Para controlar altura en modales
}

export default function AuxiliaryDropdown({
  tableName,
  selectedValue,
  onSelect,
  placeholder = "Seleccionar...",
  disabled = false,
  error = false,
  label,
  maxHeight = 'normal'
}: AuxiliaryDropdownProps) {
  const [items, setItems] = useState<AuxiliaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItemName, setSelectedItemName] = useState('')

  // Cargar items de la tabla auxiliar
  useEffect(() => {
    loadItems()
  }, [tableName])

  // Actualizar nombre del item seleccionado
  useEffect(() => {
    if (selectedValue && items.length > 0) {
      const item = items.find(i => i.nombre === selectedValue)
      setSelectedItemName(item?.nombre || selectedValue)
    } else {
      setSelectedItemName('')
    }
  }, [selectedValue, items])

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

  const handleSelect = (item: AuxiliaryItem) => {
    onSelect(item.nombre)
    setIsOpen(false)
    setSearchTerm('')
  }

  const filteredItems = items.filter(item =>
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      
      {/* Selector principal */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent flex items-center justify-between transition-colors ${
          error 
            ? 'border-red-500' 
            : disabled 
              ? 'border-gray-200 bg-gray-50 text-gray-400' 
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getIcon()}</span>
          <span className={selectedItemName ? 'text-gray-900' : 'text-gray-500'}>
            {loading 
              ? 'Cargando...' 
              : selectedItemName || placeholder
            }
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-w-full">
          {/* Buscador */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
                autoFocus
              />
            </div>
            {/* Contador de resultados */}
            {items.length > 0 && (
              <div className="text-xs text-gray-500 mt-1 text-center">
                {searchTerm 
                  ? `${filteredItems.length} de ${items.length} resultados`
                  : `${items.length} opciones disponibles`
                }
              </div>
            )}
          </div>

          {/* Lista de items */}
          <div className={`overflow-y-auto ${maxHeight === 'large' ? 'max-h-[300px]' : 'max-h-48'}`}>
            {filteredItems.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {items.length === 0 
                  ? 'No hay opciones disponibles'
                  : 'No se encontraron resultados'
                }
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                    selectedValue === item.nombre ? 'bg-[#E6F5F7] text-[#004C4C] font-medium' : 'text-gray-900'
                  }`}
                >
                  <span className="text-base">{getIcon()}</span>
                  <span className="truncate">{item.nombre}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay para cerrar dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
