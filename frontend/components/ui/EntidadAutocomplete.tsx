/**
 * Componente de autocompletado para entidades (EPS, Pensión, Cesantías)
 * Consulta las tablas auxiliares correspondientes
 */

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface EntidadAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  tipo: 'eps' | 'fondos_pension' | 'fondos_cesantias'
  disabled?: boolean
  className?: string
}

interface EntidadOption {
  id: string
  nombre: string
}

export const EntidadAutocomplete: React.FC<EntidadAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  tipo,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<EntidadOption[]>([])
  const [filteredOptions, setFilteredOptions] = useState<EntidadOption[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cargar opciones desde la tabla auxiliar correspondiente
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from(tipo)
          .select('id, nombre')
          .eq('es_activa', true)
          .order('nombre')

        if (error) {
          console.error(`Error cargando ${tipo}:`, error)
          return
        }

        setOptions(data || [])
        setFilteredOptions(data || [])
      } catch (error) {
        console.error(`Error cargando ${tipo}:`, error)
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [tipo])

  // Sincronizar valor externo con input
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Filtrar opciones cuando cambia el input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredOptions(options)
    } else {
      const filtered = options.filter(option =>
        option.nombre.toLowerCase().includes(inputValue.toLowerCase())
      )
      setFilteredOptions(filtered)
    }
  }, [inputValue, options])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
    setIsOpen(true)
  }

  const handleOptionSelect = (option: EntidadOption) => {
    setInputValue(option.nombre)
    onChange(option.nombre)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-3 pr-10 text-sm border border-gray-300 rounded-lg 
            focus:ring-2 focus:ring-blue-500 focus:border-transparent 
            text-gray-900 font-bold disabled:bg-gray-50 disabled:opacity-50
            ${className}
          `}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Cargando...
            </div>
          ) : filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionSelect(option)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                >
                  <span>{option.nombre}</span>
                  {inputValue === option.nombre && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
              
              {/* Opción para valor personalizado si no hay coincidencia exacta */}
              {inputValue && !options.some(opt => opt.nombre.toLowerCase() === inputValue.toLowerCase()) && (
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(inputValue)
                      setIsOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-blue-600"
                  >
                    Usar "{inputValue}" (personalizado)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {inputValue ? `No se encontraron resultados para "${inputValue}"` : 'No hay opciones disponibles'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
