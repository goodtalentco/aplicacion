/**
 * Autocomplete genérico para cualquier tipo de datos
 * Para ciudades, cajas de compensación, etc.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, Check } from 'lucide-react'

interface Option {
  id: string
  nombre: string
  [key: string]: any // Para propiedades adicionales
}

interface GenericAutocompleteSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  label?: string
  required?: boolean
}

export default function GenericAutocompleteSelect({
  options,
  value,
  onChange,
  placeholder = "Escribir o seleccionar...",
  disabled = false,
  error = false,
  label,
  required = false
}: GenericAutocompleteSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [isSelecting, setIsSelecting] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Encontrar el nombre del item seleccionado
  const selectedItem = options.find(item => item.id === value)
  const displayValue = isOpen ? inputValue : (selectedItem?.nombre || '')

  // Filtrar items basado en lo que escribe el usuario
  const filteredItems = options.filter(item =>
    item.nombre.toLowerCase().includes(inputValue.toLowerCase())
  )

  // Calcular posición del dropdown
  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }

  // Actualizar posición cuando se abre
  useEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)
    
    // Si el input está vacío, limpiar selección
    if (!newValue.trim()) {
      onChange('')
    }
  }

  const handleItemSelect = (item: Option) => {
    setIsSelecting(true)
    onChange(item.id) // Cambiar el valor primero
    setInputValue(item.nombre)
    setIsOpen(false)
    setHighlightedIndex(-1)
    
    // Resetear la bandera después de un breve delay
    setTimeout(() => {
      setIsSelecting(false)
    }, 250)
  }

  const handleInputFocus = () => {
    if (!disabled) {
      // Solo limpiar si no hay nada seleccionado, para facilitar búsqueda
      if (!value) {
        setInputValue('')
      }
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    // Delay más largo para permitir onMouseDown
    setTimeout(() => {
      // No procesar blur si se está seleccionando un item
      if (isSelecting) return
      
      setIsOpen(false)
      setHighlightedIndex(-1)
      
      // Solo limpiar si realmente no hay valor seleccionado válido
      if (!value && inputValue) {
        setInputValue('')
        onChange('')
      }
    }, 200)
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
        } else if (filteredItems.length === 1) {
          // Si solo hay una opción filtrada, seleccionarla automáticamente
          handleItemSelect(filteredItems[0])
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
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-4 pr-10 py-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
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

      {/* Lista de opciones usando Portal */}
      {isOpen && !disabled && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] bg-white border border-gray-300 rounded-xl shadow-xl max-h-80 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
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
              <div>
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevenir que se dispare onBlur
                      handleItemSelect(item)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                      highlightedIndex === index 
                        ? 'bg-blue-100 text-blue-900' 
                        : value === item.id 
                          ? 'bg-[#E6F5F7] text-[#004C4C] font-medium'
                          : 'text-gray-900'
                    }`}
                  >
                    <span>{item.nombre}</span>
                    {value === item.id && (
                      <Check className="h-4 w-4 text-[#004C4C]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
