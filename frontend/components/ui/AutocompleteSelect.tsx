/**
 * Autocomplete con input de texto que filtra opciones en tiempo real
 * Combina escribir + seleccionar de lista filtrada
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface AuxiliaryItem {
  id: string
  nombre: string
}

interface AutocompleteSelectProps {
  tableName: 'eps' | 'fondos_cesantias' | 'fondos_pension'
  selectedValue: string
  onSelect: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  label?: string
}

export default function AutocompleteSelect({
  tableName,
  selectedValue,
  onSelect,
  placeholder = "Escribir o seleccionar...",
  disabled = false,
  error = false,
  label
}: AutocompleteSelectProps) {
  const [items, setItems] = useState<AuxiliaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Cargar items de la tabla auxiliar
  useEffect(() => {
    loadItems()
  }, [tableName])

  // Sincronizar input con valor seleccionado
  useEffect(() => {
    if (selectedValue && !isOpen) {
      setInputValue(selectedValue)
    }
  }, [selectedValue, isOpen])

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

  // Filtrar items basado en lo que escribe el usuario
  const filteredItems = items.filter(item =>
    item.nombre.toLowerCase().includes(inputValue.toLowerCase())
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsOpen(true)
    setHighlightedIndex(-1)
    
    // Si el input está vacío, limpiar selección
    if (!value.trim()) {
      onSelect('')
    }
  }

  const handleItemSelect = (item: AuxiliaryItem) => {
    setInputValue(item.nombre)
    onSelect(item.nombre)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    // Delay para permitir clicks en las opciones
    setTimeout(() => {
      setIsOpen(false)
      setHighlightedIndex(-1)
      
      // Si no hay coincidencia exacta, limpiar
      const exactMatch = items.find(item => 
        item.nombre.toLowerCase() === inputValue.toLowerCase()
      )
      if (!exactMatch && inputValue) {
        setInputValue('')
        onSelect('')
      }
    }, 150)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          handleItemSelect(filteredItems[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Input con icono */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg">
          {getIcon()}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Cargando...' : placeholder}
          disabled={disabled || loading}
          className={`w-full pl-12 pr-10 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
            error 
              ? 'border-red-500' 
              : disabled 
                ? 'border-gray-200 bg-gray-50 text-gray-400' 
                : 'border-gray-300 hover:border-gray-400'
          }`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </div>
      </div>

      {/* Lista de opciones */}
      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              {inputValue ? 'No se encontraron resultados' : 'Escribe para buscar...'}
            </div>
          ) : (
            <>
              {/* Header con contador */}
              <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b text-xs text-gray-600 flex items-center justify-between">
                <span>{filteredItems.length} opciones encontradas</span>
                <span className="text-gray-400">↑↓ navegar • Enter seleccionar</span>
              </div>
              
              {/* Opciones */}
              <div ref={listRef}>
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemSelect(item)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                      highlightedIndex === index 
                        ? 'bg-blue-100 text-blue-900' 
                        : selectedValue === item.nombre 
                          ? 'bg-[#E6F5F7] text-[#004C4C] font-medium'
                          : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{getIcon()}</span>
                      <span>{item.nombre}</span>
                    </div>
                    {selectedValue === item.nombre && (
                      <Check className="h-4 w-4 text-[#004C4C]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Contador de opciones totales */}
      {items.length > 0 && !isOpen && (
        <div className="text-xs text-gray-500 mt-1">
          {items.length} opciones disponibles • Click para buscar
        </div>
      )}
    </div>
  )
}