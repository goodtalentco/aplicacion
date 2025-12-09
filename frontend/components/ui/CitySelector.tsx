/**
 * Selector de ciudades filtradas por empresa
 * Muestra solo las ciudades donde la empresa tiene cajas de compensación activas
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface City {
  id: string
  nombre: string
}

interface CitySelectorProps {
  empresaId: string
  selectedCityId: string
  onCitySelect: (cityId: string, cityName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

export default function CitySelector({
  empresaId,
  selectedCityId,
  onCitySelect,
  placeholder = "Seleccionar ciudad...",
  disabled = false,
  error = false
}: CitySelectorProps) {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCityName, setSelectedCityName] = useState('')

  // Cargar ciudades cuando cambia la empresa
  useEffect(() => {
    if (empresaId) {
      loadCities()
    } else {
      setCities([])
      setSelectedCityName('')
    }
  }, [empresaId])

  // Actualizar nombre de ciudad seleccionada
  useEffect(() => {
    if (selectedCityId && cities.length > 0) {
      const city = cities.find(c => c.id === selectedCityId)
      setSelectedCityName(city?.nombre || '')
    } else {
      setSelectedCityName('')
    }
  }, [selectedCityId, cities])

  const loadCities = async () => {
    setLoading(true)
    try {
      // Obtener ciudades donde la empresa tiene cajas activas
      const { data, error } = await supabase
        .from('empresa_cajas_compensacion')
        .select(`
          ciudad_id,
          ciudades!inner(
            id,
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('estado', 'activa')

      if (error) {
        console.error('Error loading cities:', error)
        return
      }

      // Extraer ciudades únicas
      const uniqueCities = data?.reduce((acc: City[], item) => {
        const city = item.ciudades
        if (city && !acc.find(c => c.id === (city as any).id)) {
          acc.push({
            id: (city as any).id,
            nombre: (city as any).nombre
          })
        }
        return acc
      }, []) || []

      // Ordenar alfabéticamente
      uniqueCities.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setCities(uniqueCities)

    } catch (error) {
      console.error('Error loading cities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCitySelect = (city: City) => {
    onCitySelect(city.id, city.nombre)
    setIsOpen(false)
    setSearchTerm('')
  }

  const filteredCities = cities.filter(city =>
    city.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
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
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className={selectedCityName ? 'text-gray-900' : 'text-gray-500'}>
            {loading 
              ? 'Cargando ciudades...' 
              : selectedCityName || placeholder
            }
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Buscador */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar ciudad..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de ciudades */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCities.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {cities.length === 0 
                  ? 'No hay ciudades disponibles para esta empresa'
                  : 'No se encontraron ciudades'
                }
              </div>
            ) : (
              filteredCities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleCitySelect(city)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                    selectedCityId === city.id ? 'bg-[#E6F5F7] text-[#004C4C] font-medium' : 'text-gray-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{city.nombre}</span>
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
