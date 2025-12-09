'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { usePermissions } from '../../../lib/usePermissions'
import ContractModal from '../../../components/dashboard/ContractModal'
import ContractsTable from '../../../components/dashboard/ContractsTable'
import ContractsFilters, { FilterEmpresa, FilterAprobacion, FilterVigencia, FilterOnboarding } from '../../../components/dashboard/ContractsFilters'
import Toast from '../../../components/dashboard/Toast'
import { Contract, Company, getStatusVigencia, getContractStatusConfig } from '../../../types/contract'







/**
 * Página principal del módulo Contratos
 * Gestión completa de contratos laborales con CRUD, filtros avanzados y onboarding tracking
 */
export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRef, setLoadingRef] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState<FilterEmpresa>('all')
  const [filterAprobacion, setFilterAprobacion] = useState<FilterAprobacion>('all')
  const [filterVigencia, setFilterVigencia] = useState<FilterVigencia>('all')
  const [filterCompanyId, setFilterCompanyId] = useState('')
  const [filterOnboarding, setFilterOnboarding] = useState<FilterOnboarding>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState<'success'|'error'|'info'>('success')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { hasPermission, loading: permissionsLoading, permissions } = usePermissions()
  
  // Verificar permisos (reactivos - se recalculan cuando los permisos cambian)
  const canRead = hasPermission('contracts', 'view')
  const canCreate = hasPermission('contracts', 'create')
  const canUpdate = hasPermission('contracts', 'edit')
  const canDelete = hasPermission('contracts', 'delete')

  // Cargar empresas para el dropdown de filtros
  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, tax_id')
        .eq('status', true)
        .is('archived_at', null)
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  // Cargar contratos solo cuando los permisos estén listos
  const loadContracts = async () => {
    if (!canRead) {
      setLoading(false)
      return
    }

    if (loadingRef) {
      return
    }

    // Verificar cache primero
    const cachedData = localStorage.getItem('contracts_cache_v3') // Cambié a v3 para forzar recarga
    if (cachedData && !dataLoaded) {
      try {
        const parsed = JSON.parse(cachedData)
        const cacheAge = Date.now() - parsed.timestamp
        
        if (cacheAge < 300000) { // 5 minutos
          setContracts(parsed.data)
          setDataLoaded(true)
          setLoading(false)
          return
        } else {
          localStorage.removeItem('contracts_cache_v3')
        }
      } catch (e) {
        localStorage.removeItem('contracts_cache_v3')
      }
    }

    try {
      setLoadingRef(true)
      
      // Primero obtener los contratos (sin computed columns para evitar errores de cache)
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })

      if (contractsError) {
        console.error('Error loading contracts:', contractsError)
        // Si la tabla no existe, setear datos vacíos y marcar como cargado
        if (contractsError.code === 'PGRST116' || contractsError.message?.includes('relation "contracts" does not exist')) {
          console.warn('⚠️ La tabla contracts no existe aún. Ejecuta la migración: npx supabase db push')
          setContracts([])
          setDataLoaded(true)
          setLoading(false)
          setLoadingRef(false)
          return
        }
        throw contractsError
      }

      // Luego obtener las empresas relacionadas
      const companyIds = Array.from(new Set((contractsData || []).map(contract => contract.empresa_final_id).filter(Boolean)))
      let companiesMap: Record<string, any> = {}
      
      if (companyIds.length > 0) {
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, tax_id')
          .in('id', companyIds)

        if (!companiesError && companiesData) {
          companiesMap = companiesData.reduce((acc, company) => {
            acc[company.id] = company
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Combinar los datos y calcular campos computed
      const enrichedContractsData = (contractsData || []).map(contract => {
        // Calcular nombre completo
        const fullName = [
          contract.primer_nombre,
          contract.segundo_nombre,
          contract.primer_apellido,
          contract.segundo_apellido
        ].filter(Boolean).join(' ').trim()

        // Calcular progreso de onboarding
        const onboardingFields = [
          contract.programacion_cita_examenes,
          contract.examenes,
          contract.solicitud_inscripcion_arl,
          !!contract.arl_nombre && !!contract.arl_fecha_confirmacion, // confirmación ARL inferida
          contract.envio_contrato,
          contract.recibido_contrato_firmado,
          contract.solicitud_eps,
          !!contract.eps_fecha_confirmacion, // confirmación EPS inferida
          contract.envio_inscripcion_caja,
          !!contract.caja_fecha_confirmacion, // confirmación caja inferida
          contract.radicado_eps,
          contract.radicado_ccf
        ]
        const completedFields = onboardingFields.filter(Boolean).length
        const onboardingProgress = Math.round((completedFields / onboardingFields.length) * 100)

        return {
          ...contract,
          company: companiesMap[contract.empresa_final_id] || null,
          contracts_full_name: fullName,
          contracts_onboarding_progress: onboardingProgress,
          // Handles temporalmente null hasta que las computed columns estén disponibles
          contracts_created_by_handle: null,
          contracts_updated_by_handle: null
        }
      })
      
      // Ordenar alfabéticamente por nombre de empresa cliente
      const sortedContractsData = enrichedContractsData.sort((a, b) => {
        const companyA = a.company?.name || 'Sin empresa'
        const companyB = b.company?.name || 'Sin empresa'
        return companyA.localeCompare(companyB, 'es', { sensitivity: 'base' })
      })
      
      // Guardar en cache
      localStorage.setItem('contracts_cache_v3', JSON.stringify({
        data: sortedContractsData,
        timestamp: Date.now()
      }))
      
      setContracts(sortedContractsData)
      setDataLoaded(true)
    } catch (error) {
      console.error('Error loading contracts:', error)
    } finally {
      setLoading(false)
      setLoadingRef(false)
    }
  }

  useEffect(() => {
    // Limpiar cache viejo en caso de que exista
    localStorage.removeItem('contracts_cache')
    localStorage.removeItem('contracts_cache_v3') // Limpiar cache anterior
    
    const shouldLoad = !permissionsLoading && permissions.length > 0 && canRead && !dataLoaded && !loadingRef
    
    if (shouldLoad) {
      loadContracts()
      loadCompanies()
    } else if (!permissionsLoading && permissions.length === 0) {
      setLoading(false)
    } else if (dataLoaded) {
      setLoading(false)
    }
  }, [permissionsLoading, permissions.length, canRead, dataLoaded])

  // Filtrar contratos
  const filteredContracts = contracts.filter(contract => {
    // Filtro por texto
    const fullName = contract.contracts_full_name || `${contract.primer_nombre} ${contract.primer_apellido}`
    const matchesSearch = searchTerm === '' || 
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.numero_identificacion.includes(searchTerm) ||
      (contract.numero_contrato_helisa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.cargo || '').toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro por empresa interna
    const matchesEmpresa = 
      filterEmpresa === 'all' ||
      (filterEmpresa === 'good' && contract.empresa_interna === 'Good') ||
      (filterEmpresa === 'cps' && contract.empresa_interna === 'CPS')

    // Filtro por estado de aprobación
    const matchesAprobacion = (() => {
      if (filterAprobacion === 'all') return true
      const statusConfig = getContractStatusConfig(contract)
      return filterAprobacion === statusConfig.status_aprobacion
    })()

    // Filtro por vigencia
    const matchesVigencia = (() => {
      if (filterVigencia === 'all') return true
      
      if (filterVigencia === 'por_vencer') {
        // Solo contratos fijos activos que vencen entre 36-45 días sin prórroga
        if (contract.tipo_contrato !== 'fijo' || getStatusVigencia(contract.fecha_fin) !== 'activo') return false
        if (!contract.fecha_fin) return false
        
        const fechaFin = new Date(contract.fecha_fin)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        fechaFin.setHours(0, 0, 0, 0)
        
        const diffTime = fechaFin.getTime() - hoy.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return diffDays <= 45 && diffDays > 35
      }
      
      if (filterVigencia === 'critico') {
        // Solo contratos fijos activos que vencen en 35 días o menos sin prórroga
        if (contract.tipo_contrato !== 'fijo' || getStatusVigencia(contract.fecha_fin) !== 'activo') return false
        if (!contract.fecha_fin) return false
        
        const fechaFin = new Date(contract.fecha_fin)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        fechaFin.setHours(0, 0, 0, 0)
        
        const diffTime = fechaFin.getTime() - hoy.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return diffDays <= 35 && diffDays > 0
      }
      
      const statusVigencia = getStatusVigencia(contract.fecha_fin)
      return filterVigencia === statusVigencia
    })()

    // Filtro por empresa cliente
    const matchesCompany = filterCompanyId === '' || contract.empresa_final_id === filterCompanyId

    // Filtro por onboarding inteligente (todos los campos)
    const matchesOnboarding = (() => {
      switch (filterOnboarding) {
        case 'all':
          return true
        
        // Filtros principales
        case 'sin_arl':
          return !(contract.arl_nombre && contract.arl_fecha_confirmacion)
        case 'sin_eps':
          return !contract.eps_fecha_confirmacion
        
        // Filtros adicionales
        case 'sin_programacion_cita':
          return !contract.programacion_cita_examenes
        case 'sin_solicitud_arl':
          return !contract.solicitud_inscripcion_arl
        case 'sin_envio_contrato':
          return !contract.envio_contrato
        case 'sin_solicitud_eps':
          return !contract.solicitud_eps
        case 'sin_caja':
          return !contract.caja_fecha_confirmacion
        case 'sin_radicados':
          return !contract.radicado_eps && !contract.radicado_ccf
        
        default:
          return true
      }
    })()

    return matchesSearch && matchesEmpresa && matchesAprobacion && matchesVigencia && matchesCompany && matchesOnboarding
  })

  // Estadísticas completas para filtros inteligentes
  const stats = {
    total: contracts.length,
    good: contracts.filter(c => c.empresa_interna === 'Good').length,
    cps: contracts.filter(c => c.empresa_interna === 'CPS').length,
    inProgress: contracts.filter(c => {
      const progress = c.contracts_onboarding_progress || 0
      return progress > 0 && progress < 100
    }).length,
    pending: contracts.filter(c => (c.contracts_onboarding_progress || 0) === 0).length,
    
    // Estados de aprobación
    borrador: contracts.filter(c => {
      const statusConfig = getContractStatusConfig(c)
      return statusConfig.status_aprobacion === 'borrador'
    }).length,
    aprobado: contracts.filter(c => {
      const statusConfig = getContractStatusConfig(c)
      return statusConfig.status_aprobacion === 'aprobado'
    }).length,
    
    // Estados de vigencia
    activo: contracts.filter(c => getStatusVigencia(c.fecha_fin) === 'activo').length,
    porVencer: contracts.filter(c => {
      // Solo contratos fijos activos que vencen en 45 días o menos sin prórroga
      if (c.tipo_contrato !== 'fijo' || getStatusVigencia(c.fecha_fin) !== 'activo') return false
      if (!c.fecha_fin) return false
      
      const fechaFin = new Date(c.fecha_fin)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      fechaFin.setHours(0, 0, 0, 0)
      
      const diffTime = fechaFin.getTime() - hoy.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays <= 45 && diffDays > 35  // Por vencer: entre 36-45 días
    }).length,
    critico: contracts.filter(c => {
      // Solo contratos fijos activos que vencen en 35 días o menos sin prórroga
      if (c.tipo_contrato !== 'fijo' || getStatusVigencia(c.fecha_fin) !== 'activo') return false
      if (!c.fecha_fin) return false
      
      const fechaFin = new Date(c.fecha_fin)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      fechaFin.setHours(0, 0, 0, 0)
      
      const diffTime = fechaFin.getTime() - hoy.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays <= 35 && diffDays > 0  // Crítico: ≤35 días
    }).length,
    terminado: contracts.filter(c => getStatusVigencia(c.fecha_fin) === 'terminado').length,
    
    // Campos principales
    sinArl: contracts.filter(c => !(c.arl_nombre && c.arl_fecha_confirmacion)).length,
    sinEps: contracts.filter(c => !c.eps_fecha_confirmacion).length,
    
    // Campos adicionales
    sinProgramacionCita: contracts.filter(c => !c.programacion_cita_examenes).length,
    sinSolicitudArl: contracts.filter(c => !c.solicitud_inscripcion_arl).length,
    sinEnvioContrato: contracts.filter(c => !c.envio_contrato).length,
    sinSolicitudEps: contracts.filter(c => !c.solicitud_eps).length,
    sinCaja: contracts.filter(c => !c.caja_fecha_confirmacion).length,
    sinRadicados: contracts.filter(c => !c.radicado_eps && !c.radicado_ccf).length,
    
    // Propiedades faltantes requeridas por ContractsFilters
    completed: contracts.filter(c => (c.contracts_onboarding_progress || 0) === 100).length,
    sinExamenes: contracts.filter(c => !c.examenes || !c.examenes_fecha).length,
    sinContrato: contracts.filter(c => !c.recibido_contrato_firmado || !c.contrato_fecha_confirmacion).length,
  }

  const handleCreateNew = () => {
    if (!canCreate) return
    setEditingContract(null)
    setModalMode('create')
    setShowModal(true)
  }

  // Manejar reporte de novedad
  const handleReportNovelty = (contract: Contract) => {
    // Por ahora solo mostrar un toast - aquí se puede integrar con el módulo de novedades futuro
    setToastType('info')
    setToastMsg(`Iniciando reporte de novedad para ${contract.primer_nombre} ${contract.primer_apellido}`)
    setToastOpen(true)
    console.log('Reportar novedad para contrato:', contract)
  }

  const handleEdit = (contract: Contract) => {
    if (!canUpdate) return
    setEditingContract(contract)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingContract(null)
  }

  const handleModalSuccess = () => {
    setShowModal(false)
    setToastType('success')
    setToastMsg(modalMode === 'create' ? 'Contrato creado exitosamente' : 'Contrato actualizado exitosamente')
    setToastOpen(true)
    
    // Forzar refresh completo de todos los componentes
    localStorage.removeItem('contracts_cache_v3')
    setDataLoaded(false)
    setLoading(true)
    setRefreshTrigger(prev => prev + 1) // Trigger para componentes hijos
    
    // Usar timeout para asegurar que el estado se actualice
    setTimeout(() => {
      loadContracts()
    }, 100)
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
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Sin Permisos</h2>
          <p className="text-red-600">
            No tienes permisos para acceder al módulo de contratos.
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
            <FileText className="h-8 w-8 text-[#87E0E0]" />
            <span>Contratos</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Gestión eficiente de contratos con edición en masa y seguimiento de onboarding
          </p>
        </div>
      </div>

      {/* Filtros Inteligentes */}
      <ContractsFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterEmpresa={filterEmpresa}
        setFilterEmpresa={setFilterEmpresa}
        filterAprobacion={filterAprobacion}
        setFilterAprobacion={setFilterAprobacion}
        filterVigencia={filterVigencia}
        setFilterVigencia={setFilterVigencia}
        filterCompanyId={filterCompanyId}
        setFilterCompanyId={setFilterCompanyId}
        filterOnboarding={filterOnboarding}
        setFilterOnboarding={setFilterOnboarding}
        companies={companies}
        stats={stats}
      />

      {/* Tabla de Contratos */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#87E0E0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando contratos...</p>
        </div>
      ) : contracts.length === 0 ? (
        /* Empty state - No contracts o tabla no existe */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#87E0E0] to-[#5FD3D2] rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-12 w-12 text-[#004C4C]" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Módulo de Contratos
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {dataLoaded ? 
              'No hay contratos registrados aún. Crea el primer contrato para comenzar a gestionar empleados y procesos de onboarding.' :
              'Configurando el módulo de contratos. Si ves este mensaje, es posible que necesites ejecutar la migración de base de datos.'
            }
          </p>
          
          {!dataLoaded && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
              <p className="text-yellow-800 text-sm">
                <strong>Instrucción:</strong> Ejecuta <code className="bg-yellow-100 px-2 py-1 rounded">npx supabase db push</code> en la terminal para crear la tabla de contratos.
              </p>
            </div>
          )}
          
          {canCreate && dataLoaded && (
            <button 
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white px-6 py-3 rounded-xl font-semibold hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Crear Primer Contrato</span>
            </button>
          )}
        </div>
      ) : (
        /* Tabla con edición en masa */
        <div className="flex-1 min-h-0">
          <ContractsTable
          contracts={filteredContracts}
          onEdit={handleEdit}
          onUpdate={() => {
            localStorage.removeItem('contracts_cache_v3')
            setDataLoaded(false)
            setRefreshTrigger(prev => prev + 1)
            loadContracts()
          }}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onApprove={(contract) => {
            // El componente maneja la aprobación internamente
            localStorage.removeItem('contracts_cache_v3')
            setDataLoaded(false)
            setRefreshTrigger(prev => prev + 1)
            loadContracts()
          }}
          refreshTrigger={refreshTrigger}
        />
        </div>
      )}

      {/* Contract Modal */}
      <ContractModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        contract={editingContract}
        mode={modalMode}
        companies={companies}
      />

      {/* Floating Action Button móvil */}
      {canCreate && (
        <button
          onClick={handleCreateNew}
          className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-xl text-white bg-gradient-to-br from-[#004C4C] to-[#065C5C] flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Nuevo contrato"
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
          <span>Nuevo contrato</span>
        </button>
      )}

      {/* Toast */}
      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  )
}
