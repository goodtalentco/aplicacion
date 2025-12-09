'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Search, Filter, Archive, X } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { usePermissions } from '../../../lib/usePermissions'
import CompanyModal from '../../../components/dashboard/CompanyModal'
import CompanyCard from '../../../components/dashboard/CompanyCard'
import Toast from '../../../components/dashboard/Toast'

interface Company {
  id: string
  name: string
  tax_id: string
  grupo_empresarial_id?: string
  grupo_empresarial?: {
    id: string
    nombre: string
    descripcion?: string
  }
  accounts_contact_name?: string
  accounts_contact_email?: string
  accounts_contact_phone?: string
  comercial_contact_name?: string
  comercial_contact_email?: string
  comercial_contact_phone?: string
  status: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  archived_at?: string | null
  companies_created_by_handle?: string | null
  companies_updated_by_handle?: string | null
  business_lines?: Array<{
    id: string
    nombre: string
    descripcion?: string
    es_activa?: boolean
    estado?: string
  }>
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'archived'

/**
 * Página principal del módulo Empresas
 * Gestión completa de empresas clientes con CRUD y filtros
 */
export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRef, setLoadingRef] = useState(false) // Prevent multiple simultaneous loads
  const [dataLoaded, setDataLoaded] = useState(false) // Track if data was loaded before
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState<'success'|'error'|'info'>('success')

  const { hasPermission, loading: permissionsLoading, permissions } = usePermissions()
  
  // Verificar permisos (reactivos - se recalculan cuando los permisos cambian)
  const canRead = hasPermission('companies', 'view')
  const canCreate = hasPermission('companies', 'create')
  const canUpdate = hasPermission('companies', 'edit')
  const canDelete = hasPermission('companies', 'delete')

  // Cargar empresas solo cuando los permisos estén listos
  const loadCompanies = async () => {
    if (!canRead) {
      setLoading(false)
      return
    }

    if (loadingRef) {
      return
    }

    // Verificar cache primero
    const cachedData = localStorage.getItem('companies_cache')
    if (cachedData && !dataLoaded) {
      try {
        const parsed = JSON.parse(cachedData)
        const cacheAge = Date.now() - parsed.timestamp
        
        if (cacheAge < 300000) { // 5 minutos
          setCompanies(parsed.data)
          setDataLoaded(true)
          setLoading(false)
          return
        } else {
          localStorage.removeItem('companies_cache')
        }
      } catch (e) {
        localStorage.removeItem('companies_cache')
      }
    }

    try {
      setLoadingRef(true)
      
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *, 
          companies_created_by_handle, 
          companies_updated_by_handle,
          grupo_empresarial:grupos_empresariales(
            id,
            nombre,
            descripcion
          ),
          business_lines:empresa_lineas_negocio(
            lineas_negocio(
              id,
              nombre,
              descripcion,
              es_activa
            )
          )
        `)
        .eq('empresa_lineas_negocio.es_activa', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading companies:', error)
        throw error
      }

      const companiesData = (data || []).map(company => ({
        ...company,
        business_lines: company.business_lines?.map((bl: any) => ({
          ...bl.lineas_negocio,
          // Agregar indicador de estado para mostrar en UI
          estado: bl.lineas_negocio?.es_activa ? 'Activa' : 'Descontinuada'
        })) || []
      }))
      
      // Guardar en cache
      localStorage.setItem('companies_cache', JSON.stringify({
        data: companiesData,
        timestamp: Date.now()
      }))
      
      setCompanies(companiesData)
      setDataLoaded(true)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
      setLoadingRef(false)
    }
  }

  useEffect(() => {
    // SOLO cargar si realmente hay cambios significativos
    const shouldLoad = !permissionsLoading && permissions.length > 0 && canRead && !dataLoaded && !loadingRef
    
    if (shouldLoad) {
      loadCompanies()
    } else if (!permissionsLoading && permissions.length === 0) {
      setLoading(false)
    } else if (dataLoaded) {
      setLoading(false)
    }
  }, [permissionsLoading, permissions.length, canRead, dataLoaded]) // Reactivo a cambios de permisos

  // Filtrar empresas
  const filteredCompanies = companies.filter(company => {
    // Filtro por texto
    const matchesSearch = searchTerm === '' || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.tax_id.includes(searchTerm) ||
      (company.grupo_empresarial?.nombre && company.grupo_empresarial.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.accounts_contact_name && company.accounts_contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.accounts_contact_email && company.accounts_contact_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.comercial_contact_name && company.comercial_contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.comercial_contact_email && company.comercial_contact_email.toLowerCase().includes(searchTerm.toLowerCase()))

    // Filtro por estado
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && company.status && !company.archived_at) ||
      (filterStatus === 'inactive' && !company.status && !company.archived_at) ||
      (filterStatus === 'archived' && company.archived_at)

    return matchesSearch && matchesFilter
  })

  const handleCreateNew = () => {
    if (!canCreate) return
    setEditingCompany(null)
    setModalMode('create')
    setShowModal(true)
  }

  const handleEdit = (company: Company) => {
    if (!canUpdate) return
    setEditingCompany(company)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingCompany(null)
  }

  const handleModalSuccess = () => {
    setShowModal(false)
    setToastType('success')
    setToastMsg(modalMode === 'create' ? 'Empresa creada exitosamente' : 'Empresa actualizada exitosamente')
    setToastOpen(true)
    loadCompanies()
  }

  // Mostrar loading mientras los permisos cargan
  if (permissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#87E0E0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Sin Permisos</h2>
          <p className="text-red-600">
            No tienes permisos para acceder al módulo de empresas.
            Contacta al administrador para solicitar acceso.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-[#87E0E0]" />
            <span>Empresas</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Gestión de empresas clientes y configuraciones corporativas
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>Total: {companies.length}</span>
            <span>Activas: {companies.filter(c => c.status && !c.archived_at).length}</span>
            <span>Archivadas: {companies.filter(c => c.archived_at).length}</span>
          </div>
        </div>
        
        <div className="flex space-x-3" />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, NIT, grupo empresarial, contacto o email..."
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
          <div className="flex space-x-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
                <option value="archived">Archivadas</option>
              </select>
            </div>
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus('all') }}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
        
        {/* Results count */}
        {searchTerm && (
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredCompanies.length} de {companies.length} empresas
          </div>
        )}
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#87E0E0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empresas...</p>
        </div>
      ) : filteredCompanies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={handleEdit}
              onUpdate={loadCompanies}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          ))}
        </div>
      ) : companies.length === 0 ? (
        /* Empty state - No companies */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#87E0E0] to-[#5FD3D2] rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-12 w-12 text-[#004C4C]" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Comienza agregando empresas!
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            No hay empresas registradas aún. Crea la primera empresa para comenzar a gestionar 
            clientes y configuraciones corporativas.
          </p>
          
          {canCreate && (
            <button 
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white px-6 py-3 rounded-xl font-semibold hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Crear Primera Empresa</span>
            </button>
          )}
        </div>
      ) : (
        /* No results for search */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sin resultados</h3>
          <p className="text-gray-600 mb-4">
            No se encontraron empresas que coincidan con tu búsqueda "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-[#004C4C] hover:text-[#065C5C] font-medium"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Company Modal */}
      <CompanyModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        company={editingCompany}
        mode={modalMode}
      />

      {/* Floating Action Button móvil */}
      {canCreate && (
        <button
          onClick={handleCreateNew}
          className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-xl text-white bg-gradient-to-br from-[#004C4C] to-[#065C5C] flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Nueva empresa"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* FAB desktop */}
      {canCreate && (
        <button
          onClick={handleCreateNew}
          className="hidden lg:flex fixed bottom-8 right-8 z-40 px-5 py-3 rounded-full shadow-xl text-white bg-gradient-to-br from-[#004C4C] to-[#065C5C] items-center space-x-2 hover:scale-105 transition-transform"
        >
          <Plus className="h-5 w-5" />
          <span>Nueva empresa</span>
        </button>
      )}

      {/* Toast */}
      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  )
}
