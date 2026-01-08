'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, Filter, Eye, ChevronDown, ChevronUp, X, Download } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/lib/usePermissions'
import { formatDateColombia } from '@/utils/dateUtils'

/**
 * Página del módulo Novedades
 * Vista unificada de todas las novedades de todos los contratos
 */

interface UnifiedNovelty {
  id: string
  contract_id: string
  employee_name: string
  employee_id: string
  empresa_id: string | null
  empresa_name: string | null
  is_active: boolean // Indica si el empleado está activo (archived_at IS NULL)
  type: 'datos_personales' | 'cambio_cargo' | 'entidades' | 'economicas' | 'tiempo_laboral' | 'incapacidad' | 'beneficiarios' | 'terminacion'
  type_label: string
  title: string
  description: string
  fecha: string
  fecha_aplicacion: string
  created_at: string
  created_by: string
  created_by_email: string
  details: any
  table_source: string
}

const NOVELTY_TYPES = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'datos_personales', label: 'Datos Personales' },
  { value: 'cambio_cargo', label: 'Cambio de Cargo' },
  { value: 'entidades', label: 'Entidades' },
  { value: 'economicas', label: 'Económicas' },
  { value: 'tiempo_laboral', label: 'Tiempo Laboral' },
  { value: 'incapacidad', label: 'Incapacidades' },
  { value: 'beneficiarios', label: 'Beneficiarios' },
  { value: 'terminacion', label: 'Terminación' }
]

export default function NovedadesPage() {
  const { hasPermission, permissions, loading: permissionsLoading } = usePermissions()
  const [novelties, setNovelties] = useState<UnifiedNovelty[]>([])
  const [filteredNovelties, setFilteredNovelties] = useState<UnifiedNovelty[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRef, setLoadingRef] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('all')
  const [filterEmployeeStatus, setFilterEmployeeStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterCompanyId, setFilterCompanyId] = useState('')
  const [employees, setEmployees] = useState<Array<{id: string, name: string, is_active: boolean}>>([])
  const [companies, setCompanies] = useState<Array<{id: string, name: string, tax_id: string}>>([])
  const [selectedNovelty, setSelectedNovelty] = useState<UnifiedNovelty | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar permisos: las políticas RLS de novedades requieren 'contracts' con acción 'view'
  const canRead = hasPermission('contracts', 'view')
  
  // Logging para debug
  useEffect(() => {
    console.log('🔐 Permisos del usuario:', permissions)
    console.log('🔐 canRead:', canRead)
    console.log('🔐 hasPermission("contracts", "view"):', hasPermission('contracts', 'view'))
    console.log('🔐 Permisos de contracts:', permissions.filter(p => p.table_name === 'contracts'))
  }, [permissions, canRead, hasPermission])

  // Cargar todas las novedades
  const loadNovelties = async () => {
    console.log('📥 loadNovelties llamado')
    
    if (loadingRef) {
      console.log('⏸️ Ya hay una carga en progreso')
      return
    }
    
    // Check cache first
    const cached = localStorage.getItem('novelties_cache')
    if (cached && !dataLoaded) {
      console.log('💾 Cache encontrado, verificando validez...')
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.timestamp < 300000) { // 5min cache
        console.log('✅ Usando cache')
        setNovelties(parsed.data)
        setFilteredNovelties(parsed.data)
        setDataLoaded(true)
        setLoading(false)
        return
      }
      console.log('⏰ Cache expirado, limpiando...')
      localStorage.removeItem('novelties_cache')
    }
    
    console.log('🔄 Iniciando carga desde Supabase...')
    setLoadingRef(true)
    setLoading(true)
    setError(null)
    
    try {
      const allNovelties: UnifiedNovelty[] = []

      // 1. Cargar contratos para obtener nombres de empleados y empresas
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_identificacion, empresa_final_id, archived_at')
        .order('primer_nombre', { ascending: true })

      if (contractsError) {
        console.error('Error loading contracts:', contractsError)
      }

      // 2. Cargar empresas para obtener nombres
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, tax_id')
        .eq('status', true)
        .is('archived_at', null)
        .order('name')

      if (companiesError) {
        console.error('Error loading companies:', companiesError)
      }

      // Crear mapa de empresas
      const companiesMap = new Map(
        companiesData?.map(c => [c.id, c.name]) || []
      )

      // Guardar lista de empresas para el dropdown
      setCompanies(companiesData || [])

      const contractsMap = new Map(
        contracts?.map(c => [
          c.id,
          {
            name: `${c.primer_nombre} ${c.segundo_nombre || ''} ${c.primer_apellido} ${c.segundo_apellido || ''}`.trim(),
            id: c.numero_identificacion,
            empresa_id: c.empresa_final_id,
            empresa_name: c.empresa_final_id ? companiesMap.get(c.empresa_final_id) || null : null,
            is_active: !c.archived_at
          }
        ]) || []
      )

      // Guardar lista de empleados para el dropdown
      const employeesList = Array.from(contractsMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        is_active: data.is_active
      }))
      setEmployees(employeesList)

      // 2. Cargar novedades_datos_personales
      const { data: datosPersonales, error: datosPersonalesError } = await supabase
        .from('novedades_datos_personales')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (datosPersonalesError) {
        console.error('Error loading novedades_datos_personales:', datosPersonalesError)
      }

      datosPersonales?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        allNovelties.push({
          id: `datos_personales_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'datos_personales',
          type_label: 'Datos Personales',
          title: `Cambio de ${n.campo}`,
          description: `${n.campo}: ${n.valor_anterior || 'N/A'} → ${n.valor_nuevo}`,
          fecha: n.fecha,
          fecha_aplicacion: n.fecha,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_datos_personales'
        })
      })

      // 3. Cargar novedades_cambio_cargo
      const { data: cambioCargo, error: cambioCargoError } = await supabase
        .from('novedades_cambio_cargo')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (cambioCargoError) {
        console.error('Error loading novedades_cambio_cargo:', cambioCargoError)
      }

      cambioCargo?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        allNovelties.push({
          id: `cambio_cargo_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'cambio_cargo',
          type_label: 'Cambio de Cargo',
          title: 'Cambio de Cargo',
          description: `${n.cargo_anterior || 'N/A'} → ${n.cargo_nuevo}`,
          fecha: n.fecha,
          fecha_aplicacion: n.fecha,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_cambio_cargo'
        })
      })

      // 4. Cargar novedades_entidades
      const { data: entidades, error: entidadesError } = await supabase
        .from('novedades_entidades')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (entidadesError) {
        console.error('Error loading novedades_entidades:', entidadesError)
      }

      entidades?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        allNovelties.push({
          id: `entidades_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'entidades',
          type_label: 'Entidades',
          title: `Cambio de ${n.tipo}`,
          description: `${n.entidad_anterior || 'N/A'} → ${n.entidad_nueva}`,
          fecha: n.fecha,
          fecha_aplicacion: n.fecha,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_entidades'
        })
      })

      // 5. Cargar novedades_economicas
      const { data: economicas, error: economicasError } = await supabase
        .from('novedades_economicas')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (economicasError) {
        console.error('Error loading novedades_economicas:', economicasError)
      }

      economicas?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        const valorAnterior = n.valor_anterior ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n.valor_anterior) : 'N/A'
        const valorNuevo = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n.valor_nuevo)
        allNovelties.push({
          id: `economicas_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'economicas',
          type_label: 'Económicas',
          title: `Cambio ${n.tipo}${n.concepto ? ` - ${n.concepto}` : ''}`,
          description: `${valorAnterior} → ${valorNuevo}`,
          fecha: n.fecha,
          fecha_aplicacion: n.fecha,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_economicas'
        })
      })

      // 6. Cargar novedades_tiempo_laboral
      const { data: tiempoLaboral, error: tiempoLaboralError } = await supabase
        .from('novedades_tiempo_laboral')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (tiempoLaboralError) {
        console.error('Error loading novedades_tiempo_laboral:', tiempoLaboralError)
      }

      tiempoLaboral?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        let title = ''
        let description = ''
        
        if (n.tipo_tiempo === 'prorroga') {
          title = 'Prórroga de Contrato'
          description = `Prórroga hasta ${n.nueva_fecha_fin || 'N/A'}`
        } else if (n.tipo_tiempo === 'vacaciones') {
          title = 'Vacaciones'
          description = `Del ${n.fecha_inicio} al ${n.fecha_fin || 'N/A'} (${n.dias || 0} días)`
        } else if (n.tipo_tiempo === 'suspension') {
          title = 'Suspensión'
          description = `Del ${n.fecha_inicio} al ${n.fecha_fin || 'N/A'} (${n.dias || 0} días)`
        } else if (n.tipo_tiempo === 'dia_familia') {
          title = 'Día de la Familia'
          description = `${n.fecha_inicio} (${n.dias || 1} día)`
        } else {
          title = 'Tiempo Laboral'
          description = `${n.tipo_tiempo} del ${n.fecha_inicio} al ${n.fecha_fin || 'N/A'}`
        }
        
        allNovelties.push({
          id: `tiempo_laboral_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'tiempo_laboral',
          type_label: 'Tiempo Laboral',
          title,
          description,
          fecha: n.fecha_inicio,
          fecha_aplicacion: n.fecha_inicio,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_tiempo_laboral'
        })
      })

      // 7. Cargar novedades_incapacidad
      const { data: incapacidad, error: incapacidadError } = await supabase
        .from('novedades_incapacidad')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (incapacidadError) {
        console.error('Error loading novedades_incapacidad:', incapacidadError)
      }

      incapacidad?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        allNovelties.push({
          id: `incapacidad_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'incapacidad',
          type_label: 'Incapacidades',
          title: `Incapacidad ${n.tipo_incapacidad}`,
          description: `Del ${n.fecha_inicio} al ${n.fecha_fin || 'N/A'} (${n.dias || 0} días)`,
          fecha: n.fecha_inicio,
          fecha_aplicacion: n.fecha_inicio,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_incapacidad'
        })
      })

      // 8. Cargar novedades_beneficiarios
      const { data: beneficiarios, error: beneficiariosError } = await supabase
        .from('novedades_beneficiarios')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (beneficiariosError) {
        console.error('Error loading novedades_beneficiarios:', beneficiariosError)
      }

      beneficiarios?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        const tipoLabel = n.tipo_beneficiario === 'hijo' ? 'Hijos' : 
                         n.tipo_beneficiario === 'madre' ? 'Madre' :
                         n.tipo_beneficiario === 'padre' ? 'Padre' : 'Cónyuge'
        allNovelties.push({
          id: `beneficiarios_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'beneficiarios',
          type_label: 'Beneficiarios',
          title: `Cambio de ${tipoLabel}`,
          description: `${n.valor_anterior || 0} → ${n.valor_nuevo}`,
          fecha: n.fecha,
          fecha_aplicacion: n.fecha,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_beneficiarios'
        })
      })

      // 9. Cargar novedades_terminacion
      const { data: terminacion, error: terminacionError } = await supabase
        .from('novedades_terminacion')
        .select(`
          *,
          usuario:usuarios_basicos!created_by (email)
        `)
        .order('created_at', { ascending: false })

      if (terminacionError) {
        console.error('Error loading novedades_terminacion:', terminacionError)
      }

      terminacion?.forEach((n: any) => {
        const contract = contractsMap.get(n.contract_id)
        const tipoLabel = n.tipo_terminacion === 'justa_causa' ? 'Justa Causa' :
                         n.tipo_terminacion === 'sin_justa_causa' ? 'Sin Justa Causa' :
                         n.tipo_terminacion === 'mutuo_acuerdo' ? 'Mutuo Acuerdo' :
                         n.tipo_terminacion === 'vencimiento' ? 'Vencimiento' :
                         n.tipo_terminacion === 'renuncia_voluntaria' ? 'Renuncia Voluntaria' : n.tipo_terminacion
        allNovelties.push({
          id: `terminacion_${n.id}`,
          contract_id: n.contract_id,
          employee_name: contract?.name || 'Empleado no encontrado',
          employee_id: contract?.id || '',
          empresa_id: contract?.empresa_id || null,
          empresa_name: contract?.empresa_name || null,
          is_active: contract?.is_active ?? true,
          type: 'terminacion',
          type_label: 'Terminación',
          title: 'Terminación de Contrato',
          description: `Terminación por ${tipoLabel}`,
          fecha: n.fecha,
          fecha_aplicacion: n.fecha,
          created_at: n.created_at,
          created_by: n.created_by,
          created_by_email: n.usuario?.email || 'Usuario desconocido',
          details: n,
          table_source: 'novedades_terminacion'
        })
      })

      // Ordenar por fecha de creación (más recientes primero)
      allNovelties.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log(`✅ Carga completada: ${allNovelties.length} novedades encontradas`)

      // Guardar en cache
      localStorage.setItem('novelties_cache', JSON.stringify({
        data: allNovelties,
        timestamp: Date.now()
      }))

      setNovelties(allNovelties)
      setFilteredNovelties(allNovelties)
      setDataLoaded(true)
      
      if (allNovelties.length === 0) {
        console.warn('⚠️ No se encontraron novedades')
      }
    } catch (error: any) {
      console.error('Error loading novelties:', error)
      setError(error?.message || 'Error al cargar las novedades. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
      setLoadingRef(false)
    }
  }

  useEffect(() => {
    console.log('🔍 Novedades useEffect:', {
      permissionsLoading,
      permissionsLength: permissions.length,
      canRead,
      dataLoaded,
      loadingRef,
      loading
    })
    
    const shouldLoad = !permissionsLoading && permissions.length > 0 && canRead && !dataLoaded && !loadingRef
    
    console.log('🔍 shouldLoad:', shouldLoad)
    
    if (shouldLoad) {
      console.log('✅ Iniciando carga de novedades...')
      loadNovelties()
    } else if (!permissionsLoading && permissions.length === 0) {
      console.log('⚠️ No hay permisos, deteniendo carga')
      setLoading(false)
    } else if (dataLoaded) {
      console.log('✅ Datos ya cargados')
      setLoading(false)
    } else if (!canRead && !permissionsLoading) {
      console.log('⚠️ No tiene permisos de lectura')
      setLoading(false)
    }
  }, [permissionsLoading, permissions.length, canRead, dataLoaded])

  // Filtrar novedades
  useEffect(() => {
    let filtered = [...novelties]

    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(n => 
        n.employee_name.toLowerCase().includes(searchLower) ||
        n.employee_id.toLowerCase().includes(searchLower) ||
        (n.empresa_name && n.empresa_name.toLowerCase().includes(searchLower)) ||
        n.title.toLowerCase().includes(searchLower) ||
        n.description.toLowerCase().includes(searchLower) ||
        n.type_label.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType)
    }

    // Filtro por fecha
    if (filterDateFrom) {
      filtered = filtered.filter(n => n.fecha >= filterDateFrom)
    }
    if (filterDateTo) {
      filtered = filtered.filter(n => n.fecha <= filterDateTo)
    }

    // Filtro por empleado
    if (filterEmployee !== 'all') {
      filtered = filtered.filter(n => n.contract_id === filterEmployee)
    }

    // Filtro por estado del empleado (activo/inactivo)
    if (filterEmployeeStatus === 'active') {
      filtered = filtered.filter(n => n.is_active === true)
    } else if (filterEmployeeStatus === 'inactive') {
      filtered = filtered.filter(n => n.is_active === false)
    }
    // Si es 'all', no se filtra

    // Filtro por empresa
    if (filterCompanyId) {
      filtered = filtered.filter(n => n.empresa_id === filterCompanyId)
    }

    setFilteredNovelties(filtered)
  }, [novelties, searchTerm, filterType, filterDateFrom, filterDateTo, filterEmployee, filterEmployeeStatus, filterCompanyId])

  const handleViewDetail = (novelty: UnifiedNovelty) => {
    setSelectedNovelty(novelty)
    setShowDetailModal(true)
  }

  // Función helper para formatear fecha en formato CSV (DD/MM/YYYY)
  const formatDateForCSV = (dateString?: string | null): string => {
    if (!dateString) return ''
    
    try {
      let date: Date
      
      // Si ya tiene timestamp (viene de la DB), usar directamente
      if (dateString.includes('T') || dateString.includes(' ')) {
        date = new Date(dateString)
      } else {
        // Si es solo fecha (YYYY-MM-DD), agregar offset de Colombia
        date = new Date(dateString + 'T00:00:00-05:00')
      }
      
      // Verificar que la fecha es válida
      if (isNaN(date.getTime())) {
        return ''
      }
      
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      
      return `${day}/${month}/${year}`
    } catch (error) {
      console.error('Error formateando fecha para CSV:', error)
      return ''
    }
  }

  // Función helper para escapar valores CSV
  const escapeCSVValue = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return ''
    
    const str = String(value)
    
    // Si contiene comillas, saltos de línea o comas, envolver en comillas y escapar comillas dobles
    if (str.includes('"') || str.includes('\n') || str.includes(',') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    
    return str
  }

  // Función para descargar CSV
  const handleDownloadCSV = () => {
    if (filteredNovelties.length === 0) return

    // Definir columnas del CSV
    const headers = [
      'Fecha de Aplicación',
      'Fecha de Registro',
      'Empleado',
      'ID Empleado',
      'Empresa',
      'Tipo de Novedad',
      'Título',
      'Descripción',
      'Observaciones',
      'Motivo',
      'Creado por',
      'Estado Empleado'
    ]

    // Crear filas de datos
    const rows = filteredNovelties.map(novelty => [
      formatDateForCSV(novelty.fecha_aplicacion),
      formatDateForCSV(novelty.created_at),
      escapeCSVValue(novelty.employee_name),
      escapeCSVValue(novelty.employee_id),
      escapeCSVValue(novelty.empresa_name || ''),
      escapeCSVValue(novelty.type_label),
      escapeCSVValue(novelty.title),
      escapeCSVValue(novelty.description),
      escapeCSVValue(novelty.details.observacion || ''),
      escapeCSVValue(novelty.details.motivo || ''),
      escapeCSVValue(novelty.created_by_email),
      escapeCSVValue(novelty.is_active ? 'Activo' : 'Inactivo')
    ])

    // Combinar headers y rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Añadir BOM para UTF-8 (permite que Excel abra correctamente caracteres especiales)
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    // Crear blob y descargar
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    // Generar nombre de archivo con fecha actual
    const today = new Date()
    const day = today.getDate().toString().padStart(2, '0')
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const year = today.getFullYear()
    const fileName = `novedades_${day}-${month}-${year}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Limpiar URL object
    URL.revokeObjectURL(url)
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      datos_personales: 'bg-blue-50 text-blue-700 border-blue-200',
      cambio_cargo: 'bg-purple-50 text-purple-700 border-purple-200',
      entidades: 'bg-red-50 text-red-700 border-red-200',
      economicas: 'bg-green-50 text-green-700 border-green-200',
      tiempo_laboral: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      incapacidad: 'bg-orange-50 text-orange-700 border-orange-200',
      beneficiarios: 'bg-teal-50 text-teal-700 border-teal-200',
      terminacion: 'bg-gray-50 text-gray-700 border-gray-200'
    }
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  if (loading && !dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#87E0E0] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando novedades...</p>
        </div>
      </div>
    )
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No tienes permisos para ver las novedades</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Bell className="h-8 w-8 text-[#87E0E0]" />
            <span>Novedades</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Histórico completo de todas las novedades laborales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empleado, empresa, tipo o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
            >
              {NOVELTY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa
                </label>
                <select
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                >
                  <option value="">Todas las empresas</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empleado
                </label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                >
                  <option value="all">Todos los empleados</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.is_active ? '' : '(Inactivo)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado del empleado
                </label>
                <select
                  value={filterEmployeeStatus}
                  onChange={(e) => setFilterEmployeeStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="active">Solo activos</option>
                  <option value="inactive">Solo inactivos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                />
              </div>
            </div>
            {(filterDateFrom || filterDateTo || filterEmployee !== 'all' || filterEmployeeStatus !== 'all' || filterCompanyId) && (
              <button
                onClick={() => {
                  setFilterDateFrom('')
                  setFilterDateTo('')
                  setFilterEmployee('all')
                  setFilterEmployeeStatus('all')
                  setFilterCompanyId('')
                }}
                className="mt-3 text-sm text-[#065C5C] hover:text-[#004C4C] flex items-center space-x-1"
              >
                <X className="h-3 w-3" />
                <span>Limpiar todos los filtros</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count and Download Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          Mostrando {filteredNovelties.length} de {novelties.length} novedades
        </div>
        <button
          onClick={handleDownloadCSV}
          disabled={filteredNovelties.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-[#065C5C] text-white rounded-xl hover:bg-[#004C4C] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
        >
          <Download className="h-4 w-4" />
          <span>Descargar CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNovelties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {novelties.length === 0 ? 'No hay novedades registradas' : 'No se encontraron novedades con los filtros aplicados'}
                  </td>
                </tr>
              ) : (
                filteredNovelties.map((novelty) => (
                  <tr key={novelty.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateColombia(novelty.fecha_aplicacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{novelty.employee_name}</div>
                      <div className="text-xs text-gray-500">ID: {novelty.employee_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {novelty.empresa_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(novelty.type)}`}>
                        {novelty.type_label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{novelty.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{novelty.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {novelty.created_by_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetail(novelty)}
                        className="text-[#065C5C] hover:text-[#004C4C] flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedNovelty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Detalle de Novedad</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedNovelty(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Empleado</label>
                  <p className="text-sm font-medium text-gray-900">{selectedNovelty.employee_name}</p>
                  <p className="text-xs text-gray-500">ID: {selectedNovelty.employee_id}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
                  <p className="text-sm text-gray-900">{selectedNovelty.empresa_name || 'Sin empresa asignada'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(selectedNovelty.type)}`}>
                    {selectedNovelty.type_label}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Aplicación</label>
                  <p className="text-sm text-gray-900">{formatDateColombia(selectedNovelty.fecha_aplicacion)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Registro</label>
                  <p className="text-sm text-gray-900">{formatDateColombia(selectedNovelty.created_at)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Creado por</label>
                  <p className="text-sm text-gray-900">{selectedNovelty.created_by_email}</p>
                </div>
              </div>

              {/* Detalles específicos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Detalles</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Título: </span>
                    <span className="text-gray-900">{selectedNovelty.title}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Descripción: </span>
                    <span className="text-gray-900">{selectedNovelty.description}</span>
                  </div>
                  {selectedNovelty.details.observacion && (
                    <div>
                      <span className="font-medium text-gray-700">Observaciones: </span>
                      <span className="text-gray-900">{selectedNovelty.details.observacion}</span>
                    </div>
                  )}
                  {selectedNovelty.details.motivo && (
                    <div>
                      <span className="font-medium text-gray-700">Motivo: </span>
                      <span className="text-gray-900">{selectedNovelty.details.motivo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Datos completos en JSON (para debugging) */}
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">Ver datos completos (JSON)</summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(selectedNovelty.details, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
