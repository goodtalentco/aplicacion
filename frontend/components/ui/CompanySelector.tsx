'use client'

import { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown, CheckCircle, X } from 'lucide-react'

interface Company {
  id: string
  name: string
  tax_id: string
}

interface CompanySelectorProps {
  companies: Company[]
  selectedCompanyId: string
  onCompanySelect: (companyId: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

/**
 * Selector predictivo de empresas cliente con búsqueda en tiempo real
 * Diseñado para uso en formularios y filtros
 */
export default function CompanySelector({
  companies,
  selectedCompanyId,
  onCompanySelect,
  placeholder = "Buscar empresa...",
  disabled = false,
  error = false
}: CompanySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar empresas según búsqueda
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.tax_id.includes(searchTerm)
  )

  // Empresa seleccionada
  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  const handleInputChange = (value: string) => {
    setSearchTerm(value)
    setShowDropdown(true)
    if (selectedCompany) {
      onCompanySelect('')
    }
  }

  const handleCompanySelect = (company: Company) => {
    onCompanySelect(company.id)
    setSearchTerm('')
    setShowDropdown(false)
  }

  const clearSelection = () => {
    onCompanySelect('')
    setSearchTerm('')
    setShowDropdown(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={selectedCompany ? selectedCompany.name : searchTerm}
          onChange={(e) => !disabled && handleInputChange(e.target.value)}
          onFocus={() => !disabled && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-3 border rounded-xl transition-all ${
            disabled 
              ? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300 select-none pointer-events-none' 
              : `focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`
          }`}
        />
        
        {/* Botón para limpiar o expandir */}
        {selectedCompany ? (
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
            aria-label="Limpiar selección"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
      </div>
      
      {/* Dropdown de empresas */}
      {showDropdown && !disabled && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          {/* Opción para limpiar */}
          <button
            type="button"
            onClick={clearSelection}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-600 italic">Sin empresa seleccionada</span>
              {selectedCompanyId === '' && (
                <CheckCircle className="h-4 w-4 text-[#004C4C]" />
              )}
            </div>
          </button>
          
          {/* Lista de empresas filtradas */}
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleCompanySelect(company)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-sm text-gray-500">{company.tax_id}</div>
                  </div>
                  {selectedCompanyId === company.id && (
                    <CheckCircle className="h-4 w-4 text-[#004C4C]" />
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 text-center">
              No se encontraron empresas
            </div>
          )}
        </div>
      )}
    </div>
  )
}
