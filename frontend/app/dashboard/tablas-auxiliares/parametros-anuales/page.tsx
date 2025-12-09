/**
 * Página CRUD para gestión de Parámetros Anuales
 * Permite crear, editar, eliminar y listar parámetros que cambian año a año
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import { supabase } from '@/lib/supabaseClient'
import { Calculator, ArrowLeft } from 'lucide-react'
import AuxiliaryDataTable from '@/components/ui/AuxiliaryDataTable'
import ParametroAnualModal from '@/components/ui/ParametroAnualModal'
import ActivateDeactivateModal from '@/components/ui/ActivateDeactivateModal'
import Toast from '@/components/dashboard/Toast'

interface ParametroAnual {
  id: string
  tipo_parametro: string
  año: number
  valor_numerico: number | null
  valor_texto: string | null
  tipo_dato: 'numerico' | 'texto' | 'booleano' | 'json'
  unidad: string | null
  descripcion: string | null
  es_activo: boolean
  fecha_vigencia_inicio: string | null
  fecha_vigencia_fin: string | null
  created_at: string
  updated_at: string
}

export default function ParametrosAnualesPage() {
  const [parametros, setParametros] = useState<ParametroAnual[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRef, setLoadingRef] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Filtros
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showActivateDeactivateModal, setShowActivateDeactivateModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ParametroAnual | null>(null)
  
  // Estados de carga específicos
  const [updating, setUpdating] = useState(false)
  
  // Toast
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  }>({ show: false, message: '', type: 'success' })

  const router = useRouter()
  const { canManageAuxTables, hasPermission, loading: permissionsLoading, permissions } = usePermissions()

  // Verificar permisos
  const canView = canManageAuxTables()
  const canCreate = hasPermission('tablas_auxiliares', 'create')
  const canEdit = hasPermission('tablas_auxiliares', 'edit')
  const canDelete = hasPermission('tablas_auxiliares', 'delete')

  // Redirigir si no tiene permisos
  useEffect(() => {
    if (!permissionsLoading && !canView) {
      router.push('/dashboard')
    }
  }, [canView, permissionsLoading, router])

  // Cargar datos
  const loadData = async () => {
    if (loadingRef) return
    
    // Check cache first
    const cacheKey = `parametros_anuales_cache_${selectedYear}`
    const cached = localStorage.getItem(cacheKey)
    if (cached && !dataLoaded) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.timestamp < 300000) { // 5min cache
        setParametros(parsed.data)
        setDataLoaded(true)
        setLoading(false)
        return
      }
      localStorage.removeItem(cacheKey)
    }
    
    setLoadingRef(true)
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('parametros_anuales')
        .select('*')
        .eq('año', selectedYear)
        .order('es_activo', { ascending: false })
        .order('tipo_parametro', { ascending: true })

      if (error) {
        console.error('Error loading parametros:', error)
        showToast('Error al cargar los parámetros', 'error')
        return
      }

      const parametrosData = data || []
      
      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify({
        data: parametrosData,
        timestamp: Date.now()
      }))
      
      setParametros(parametrosData)
      setDataLoaded(true)
    } catch (error) {
      console.error('Error loading parametros:', error)
      showToast('Error al cargar los parámetros', 'error')
    } finally {
      setLoading(false)
      setLoadingRef(false)
    }
  }

  useEffect(() => {
    const shouldLoad = !permissionsLoading && permissions.length > 0 && canView && !loadingRef
    if (shouldLoad) {
      setDataLoaded(false)
      loadData()
    }
  }, [permissionsLoading, permissions.length, canView, selectedYear])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
  }

  // Crear Parámetro
  const handleCreate = async (formData: any) => {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user?.id

    if (!userId) {
      throw new Error('Usuario no autenticado')
    }

    const insertData: any = {
      tipo_parametro: formData.tipo_parametro.trim(),
      año: parseInt(formData.año),
      tipo_dato: formData.tipo_dato,
      unidad: formData.unidad?.trim() || null,
      descripcion: formData.descripcion?.trim() || null,
      fecha_vigencia_inicio: formData.fecha_vigencia_inicio || null,
      fecha_vigencia_fin: formData.fecha_vigencia_fin || null,
      created_by: userId,
      updated_by: userId
    }

    // Asignar valor según tipo de dato
    if (formData.tipo_dato === 'numerico') {
      insertData.valor_numerico = parseFloat(formData.valor_numerico)
      insertData.valor_texto = null
    } else {
      insertData.valor_numerico = null
      insertData.valor_texto = formData.valor_texto
    }

    const { error } = await supabase
      .from('parametros_anuales')
      .insert([insertData])

    if (error) {
      console.error('Error creating parametro:', error)
      throw new Error(error.message)
    }

    // Clear cache and reload
    const cacheKey = `parametros_anuales_cache_${selectedYear}`
    localStorage.removeItem(cacheKey)
    setDataLoaded(false)
    await loadData()
    showToast('Parámetro creado exitosamente', 'success')
  }

  // Editar Parámetro
  const handleEdit = async (formData: any) => {
    if (!selectedRecord) return

    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user?.id

    if (!userId) {
      throw new Error('Usuario no autenticado')
    }

    const updateData: any = {
      tipo_parametro: formData.tipo_parametro.trim(),
      año: parseInt(formData.año),
      tipo_dato: formData.tipo_dato,
      unidad: formData.unidad?.trim() || null,
      descripcion: formData.descripcion?.trim() || null,
      fecha_vigencia_inicio: formData.fecha_vigencia_inicio || null,
      fecha_vigencia_fin: formData.fecha_vigencia_fin || null,
      updated_by: userId
    }

    // Asignar valor según tipo de dato
    if (formData.tipo_dato === 'numerico') {
      updateData.valor_numerico = parseFloat(formData.valor_numerico)
      updateData.valor_texto = null
    } else {
      updateData.valor_numerico = null
      updateData.valor_texto = formData.valor_texto
    }

    const { error } = await supabase
      .from('parametros_anuales')
      .update(updateData)
      .eq('id', selectedRecord.id)

    if (error) {
      console.error('Error updating parametro:', error)
      throw new Error(error.message)
    }

    // Clear cache and reload
    const cacheKey = `parametros_anuales_cache_${selectedYear}`
    localStorage.removeItem(cacheKey)
    setDataLoaded(false)
    await loadData()
    showToast('Parámetro actualizado exitosamente', 'success')
  }

  // Activar/Desactivar Parámetro
  const handleActivateDeactivate = async () => {
    if (!selectedRecord) return

    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user?.id

    if (!userId) {
      showToast('Usuario no autenticado', 'error')
      return
    }

    setUpdating(true)
    try {
      const newStatus = !selectedRecord.es_activo
      const { error } = await supabase
        .from('parametros_anuales')
        .update({
          es_activo: newStatus,
          updated_by: userId
        })
        .eq('id', selectedRecord.id)

      if (error) {
        console.error('Error updating parametro:', error)
        throw new Error(error.message)
      }

      // Clear cache and reload
      const cacheKey = `parametros_anuales_cache_${selectedYear}`
      localStorage.removeItem(cacheKey)
      setDataLoaded(false)
      await loadData()
      showToast(`Parámetro ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success')
      setShowActivateDeactivateModal(false)
      setSelectedRecord(null)
    } catch (error: any) {
      console.error('Error updating parametro:', error)
      showToast(error.message || 'Error al actualizar el parámetro', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Formatear valor para mostrar
  const formatValue = (parametro: ParametroAnual) => {
    if (parametro.tipo_dato === 'numerico' && parametro.valor_numerico !== null) {
      if (parametro.unidad === 'pesos') {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(parametro.valor_numerico)
      } else if (parametro.unidad === 'porcentaje') {
        return `${parametro.valor_numerico}%`
      } else {
        return `${parametro.valor_numerico}${parametro.unidad ? ` ${parametro.unidad}` : ''}`
      }
    } else if (parametro.valor_texto) {
      if (parametro.tipo_dato === 'json') {
        return 'Ver JSON'
      }
      return parametro.valor_texto
    }
    return 'N/A'
  }

  // Configuración de la tabla
  const columns = [
    {
      key: 'tipo_parametro',
      label: 'Tipo de Parámetro',
      sortable: true
    },
    {
      key: 'valor',
      label: 'Valor',
      render: (value: any, record: ParametroAnual) => (
        <span className="font-mono text-sm">
          {formatValue(record)}
        </span>
      )
    },
    {
      key: 'tipo_dato',
      label: 'Tipo',
      render: (value: string) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value === 'numerico' ? 'bg-blue-100 text-blue-800' :
          value === 'texto' ? 'bg-green-100 text-green-800' :
          value === 'booleano' ? 'bg-yellow-100 text-yellow-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {value === 'numerico' ? 'Numérico' :
           value === 'texto' ? 'Texto' :
           value === 'booleano' ? 'Booleano' : 'JSON'}
        </span>
      )
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value: string) => (
        <span className="text-sm text-gray-600 truncate max-w-xs" title={value}>
          {value || 'Sin descripción'}
        </span>
      )
    },
    {
      key: 'es_activo',
      label: 'Estado',
      sortable: true,
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      )
    }
  ]

  // Generar años disponibles
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  if (permissionsLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5FD3D2]"></div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.push('/dashboard/tablas-auxiliares')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#004C4C]">Parámetros Anuales</h1>
              <p className="text-[#065C5C] text-sm">
                Gestiona parámetros que cambian año a año
              </p>
            </div>
          </div>
        </div>

        {/* Filtro por año */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-[#004C4C]">
            Filtrar por año:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <AuxiliaryDataTable
        data={parametros}
        columns={columns}
        loading={loading}
        searchPlaceholder="Buscar parámetros..."
        onAdd={canCreate ? () => setShowCreateModal(true) : undefined}
        onEdit={canEdit ? (record) => {
          setSelectedRecord(record)
          setShowEditModal(true)
        } : undefined}
        onDelete={canDelete ? (record) => {
          setSelectedRecord(record)
          setShowActivateDeactivateModal(true)
        } : undefined}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        emptyMessage={`No hay parámetros registrados para ${selectedYear}`}
        addButtonText="Agregar Parámetro"
      />

      {/* Modal Crear */}
      <ParametroAnualModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => setShowCreateModal(false)}
        title="Agregar Nuevo Parámetro"
        defaultYear={selectedYear}
        onSubmit={handleCreate}
      />

      {/* Modal Editar */}
      <ParametroAnualModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedRecord(null)
        }}
        onSuccess={() => {
          setShowEditModal(false)
          setSelectedRecord(null)
        }}
        title="Editar Parámetro"
        record={selectedRecord}
        onSubmit={handleEdit}
      />

      {/* Modal Activar/Desactivar */}
      <ActivateDeactivateModal
        isOpen={showActivateDeactivateModal}
        onClose={() => {
          setShowActivateDeactivateModal(false)
          setSelectedRecord(null)
        }}
        onConfirm={handleActivateDeactivate}
        recordName={selectedRecord?.tipo_parametro}
        isActive={selectedRecord?.es_activo || false}
        loading={updating}
        entityType="parámetro"
      />

      {/* Toast */}
      <Toast
        open={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  )
}
