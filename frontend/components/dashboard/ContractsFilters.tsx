'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Filter, X, Users, Calendar, Building2, CheckCircle, Clock, AlertCircle, ChevronDown } from 'lucide-react'

export type FilterStatus = 'all' | 'completed' | 'in_progress' | 'pending'
export type FilterEmpresa = 'all' | 'good' | 'cps'
export type FilterAprobacion = 'all' | 'borrador' | 'aprobado'
export type FilterVigencia = 'all' | 'activo' | 'por_vencer' | 'critico' | 'terminado'
export type FilterOnboarding = 
  | 'all' 
  | 'sin_arl' 
  | 'sin_eps' 
  | 'sin_programacion_cita'
  | 'sin_solicitud_arl'
  | 'sin_envio_contrato'
  | 'sin_solicitud_eps'
  | 'sin_caja'
  | 'sin_radicados'

interface CompanyFilter {
  id: string
  name: string
  tax_id: string
}

interface ContractsFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterEmpresa: FilterEmpresa
  setFilterEmpresa: (filter: FilterEmpresa) => void
  filterAprobacion: FilterAprobacion
  setFilterAprobacion: (filter: FilterAprobacion) => void
  filterVigencia: FilterVigencia
  setFilterVigencia: (filter: FilterVigencia) => void
  filterCompanyId: string
  setFilterCompanyId: (id: string) => void
  filterOnboarding: FilterOnboarding
  setFilterOnboarding: (filter: FilterOnboarding) => void
  companies: CompanyFilter[]
  stats: {
    total: number
    good: number
    cps: number
    completed: number
    inProgress: number
    pending: number
    borrador: number
    aprobado: number
    activo: number
    porVencer: number
    critico: number
    terminado: number
    sinExamenes: number
    sinArl: number
    sinEps: number
    sinContrato: number
    sinProgramacionCita: number
    sinSolicitudArl: number
    sinEnvioContrato: number
    sinSolicitudEps: number
    sinCaja: number
    sinRadicados: number
  }
}

/**
 * Filtros avanzados e inteligentes para contratos
 * Con quick filters y estadísticas visuales
 */
export default function ContractsFilters({
  searchTerm,
  setSearchTerm,
  filterEmpresa,
  setFilterEmpresa,
  filterAprobacion,
  setFilterAprobacion,
  filterVigencia,
  setFilterVigencia,
  filterCompanyId,
  setFilterCompanyId,
  filterOnboarding,
  setFilterOnboarding,
  companies,
  stats
}: ContractsFiltersProps) {
  const [companySearchTerm, setCompanySearchTerm] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const companyDropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar empresas según búsqueda
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
    company.tax_id.includes(companySearchTerm)
  )

  // Empresa seleccionada
  const selectedCompany = companies.find(c => c.id === filterCompanyId)

  const clearAllFilters = () => {
    setSearchTerm('')
    setFilterEmpresa('all')
    setFilterAprobacion('all')
    setFilterVigencia('all')
    setFilterCompanyId('')
    setFilterOnboarding('all')
    setCompanySearchTerm('')
  }

  const hasActiveFilters = searchTerm || filterEmpresa !== 'all' || filterAprobacion !== 'all' || 
                          filterVigencia !== 'all' || filterCompanyId !== '' || filterOnboarding !== 'all'

  return (
    <div className="space-y-4">
      
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-8 gap-3">
        
        {/* Total */}
        <div 
          className={`p-3 rounded-xl cursor-pointer transition-all ${
            filterOnboarding === 'all' && filterAprobacion === 'all' && filterVigencia === 'all'
              ? 'bg-gradient-to-br from-[#004C4C] to-[#065C5C] text-white' 
              : 'bg-white border border-gray-200 hover:border-[#87E0E0]'
          }`}
          onClick={() => {
            setFilterOnboarding('all')
            setFilterAprobacion('all')
            setFilterVigencia('all')
          }}
        >
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>

        {/* Borrador */}
        <div 
          className={`p-3 rounded-xl cursor-pointer transition-all ${
            filterAprobacion === 'borrador' 
              ? 'bg-amber-500 text-white' 
              : 'bg-amber-50 border border-amber-200 hover:border-amber-300'
          }`}
          onClick={() => setFilterAprobacion('borrador')}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className={`h-4 w-4 ${filterAprobacion === 'borrador' ? 'text-white' : 'text-amber-600'}`} />
            <span className={`text-sm font-medium ${filterAprobacion === 'borrador' ? 'text-white' : 'text-amber-800'}`}>
              Borrador
            </span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${filterAprobacion === 'borrador' ? 'text-white' : 'text-amber-800'}`}>
            {stats.borrador}
          </p>
        </div>

        {/* Aprobado */}
        <div 
          className={`p-3 rounded-xl cursor-pointer transition-all ${
            filterAprobacion === 'aprobado' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-emerald-50 border border-emerald-200 hover:border-emerald-300'
          }`}
          onClick={() => setFilterAprobacion('aprobado')}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${filterAprobacion === 'aprobado' ? 'text-white' : 'text-emerald-600'}`} />
            <span className={`text-sm font-medium ${filterAprobacion === 'aprobado' ? 'text-white' : 'text-emerald-800'}`}>
              Aprobado
            </span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${filterAprobacion === 'aprobado' ? 'text-white' : 'text-emerald-800'}`}>
            {stats.aprobado}
          </p>
        </div>

        {/* Activo */}
        <div 
          className={`p-3 rounded-xl cursor-pointer transition-all ${
            filterVigencia === 'activo' 
              ? 'bg-blue-500 text-white' 
              : 'bg-blue-50 border border-blue-200 hover:border-blue-300'
          }`}
          onClick={() => setFilterVigencia(filterVigencia === 'activo' ? 'all' : 'activo')}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${filterVigencia === 'activo' ? 'bg-white' : 'bg-blue-500'}`} />
            <span className={`text-sm font-medium ${filterVigencia === 'activo' ? 'text-white' : 'text-blue-800'}`}>
              Activo
            </span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${filterVigencia === 'activo' ? 'text-white' : 'text-blue-800'}`}>
            {stats.activo}
          </p>
        </div>

        {/* Por Vencer */}
        <div 
          className={`p-3 rounded-xl cursor-pointer transition-all ${
            filterVigencia === 'por_vencer' 
              ? 'bg-amber-500 text-white' 
              : 'bg-amber-50 border border-amber-200 hover:border-amber-300'
          }`}
          onClick={() => setFilterVigencia(filterVigencia === 'por_vencer' ? 'all' : 'por_vencer')}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className={`h-4 w-4 ${filterVigencia === 'por_vencer' ? 'text-white' : 'text-amber-600'}`} />
            <span className={`text-sm font-medium ${filterVigencia === 'por_vencer' ? 'text-white' : 'text-amber-800'}`}>
              Por Vencer
            </span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${filterVigencia === 'por_vencer' ? 'text-white' : 'text-amber-800'}`}>
            {stats.porVencer}
          </p>
        </div>

        {/* Terminado */}
        <div 
          className={`p-3 rounded-xl cursor-pointer transition-all ${
            filterVigencia === 'terminado' 
              ? 'bg-gray-500 text-white' 
              : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFilterVigencia(filterVigencia === 'terminado' ? 'all' : 'terminado')}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${filterVigencia === 'terminado' ? 'bg-white' : 'bg-gray-500'}`} />
            <span className={`text-sm font-medium ${filterVigencia === 'terminado' ? 'text-white' : 'text-gray-800'}`}>
              Terminado
            </span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${filterVigencia === 'terminado' ? 'text-white' : 'text-gray-800'}`}>
            {stats.terminado}
          </p>
        </div>

        {/* Crítico */}
        <div 
          className={`p-3 rounded-xl cursor-pointer transition-all ${
            filterVigencia === 'critico' 
              ? 'bg-red-700 text-white' 
              : 'bg-red-50 border border-red-300 hover:border-red-400'
          }`}
          onClick={() => setFilterVigencia(filterVigencia === 'critico' ? 'all' : 'critico')}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className={`h-4 w-4 ${filterVigencia === 'critico' ? 'text-white' : 'text-red-700'}`} />
            <span className={`text-sm font-medium ${filterVigencia === 'critico' ? 'text-white' : 'text-red-900'}`}>
              🔥 Crítico
            </span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${filterVigencia === 'critico' ? 'text-white' : 'text-red-900'}`}>
            {stats.critico}
          </p>
        </div>
      </div>

      {/* Filtros tradicionales */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col gap-4">
          
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, identificación, contrato, empresa o cargo..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            
            {/* Filtro por empresa interna */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                value={filterEmpresa}
                onChange={(e) => setFilterEmpresa(e.target.value as FilterEmpresa)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent appearance-none bg-white min-w-[140px]"
              >
                <option value="all">Empresa interna</option>
                <option value="good">Good ({stats.good})</option>
                <option value="cps">CPS ({stats.cps})</option>
              </select>
            </div>

            {/* Filtro predictivo de empresa cliente */}
            <div className="relative min-w-[280px]" ref={companyDropdownRef}>
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={selectedCompany ? selectedCompany.name : companySearchTerm}
                onChange={(e) => {
                  setCompanySearchTerm(e.target.value)
                  setShowCompanyDropdown(true)
                  if (selectedCompany) {
                    setFilterCompanyId('')
                  }
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                placeholder="Buscar empresa cliente..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              
              {/* Dropdown de empresas */}
              {showCompanyDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {/* Opción para limpiar */}
                  <button
                    onClick={() => {
                      setFilterCompanyId('')
                      setCompanySearchTerm('')
                      setShowCompanyDropdown(false)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 italic">Todas las empresas</span>
                      {filterCompanyId === '' && (
                        <CheckCircle className="h-4 w-4 text-[#004C4C]" />
                      )}
                    </div>
                  </button>
                  
                  {/* Lista de empresas filtradas */}
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => {
                          setFilterCompanyId(company.id)
                          setCompanySearchTerm('')
                          setShowCompanyDropdown(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{company.name}</div>
                            <div className="text-sm text-gray-500">{company.tax_id}</div>
                          </div>
                          {filterCompanyId === company.id && (
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

            {/* Filtro avanzado de onboarding */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                value={filterOnboarding}
                onChange={(e) => setFilterOnboarding(e.target.value as FilterOnboarding)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent appearance-none bg-white min-w-[180px]"
              >
                <option value="all">Todo onboarding</option>
                <option value="completos">Completos ({stats.completed})</option>
                <option value="sin_examenes">Sin exámenes ({stats.sinExamenes})</option>
                <option value="sin_arl">Sin ARL ({stats.sinArl})</option>
                <option value="sin_eps">Sin EPS ({stats.sinEps})</option>
                <option value="sin_contrato">Sin contrato ({stats.sinContrato})</option>
              </select>
            </div>

            {/* Botón limpiar */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Contador de resultados */}
        {hasActiveFilters && (
          <div className="mt-3 text-sm text-gray-600 flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>
              Filtros activos: {[
                searchTerm && 'búsqueda',
                filterEmpresa !== 'all' && `empresa interna (${filterEmpresa})`,
                filterAprobacion !== 'all' && `estado (${filterAprobacion})`,
                filterVigencia !== 'all' && `vigencia (${filterVigencia})`,
                filterCompanyId && `empresa cliente`,
                filterOnboarding !== 'all' && `onboarding`
              ].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
