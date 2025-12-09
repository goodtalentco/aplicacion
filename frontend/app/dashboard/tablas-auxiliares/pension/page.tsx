/**
 * Página CRUD para gestión de Fondos de Pensión
 * Permite crear, editar, eliminar y listar fondos de pensión
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import { supabase } from '@/lib/supabaseClient'
import { Landmark, ArrowLeft, Power, PowerOff } from 'lucide-react'
import AuxiliaryDataTable from '@/components/ui/AuxiliaryDataTable'
import AuxiliaryTableModal from '@/components/ui/AuxiliaryTableModal'
import ActivateDeactivateModal from '@/components/ui/ActivateDeactivateModal'
import Toast from '@/components/dashboard/Toast'

interface FondoPension {
  id: string
  nombre: string
  es_activa: boolean
  created_at: string
  updated_at: string
}

export default function PensionPage() {
  const [fondos, setFondos] = useState<FondoPension[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRef, setLoadingRef] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showActivateDeactivateModal, setShowActivateDeactivateModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<FondoPension | null>(null)
  
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
    const cached = localStorage.getItem('fondos_pension_cache')
    if (cached && !dataLoaded) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.timestamp < 300000) { // 5min cache
        setFondos(parsed.data)
        setDataLoaded(true)
        setLoading(false)
        return
      }
      localStorage.removeItem('fondos_pension_cache')
    }
    
    setLoadingRef(true)
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('fondos_pension')
        .select('*')
        .order('es_activa', { ascending: false })
        .order('nombre', { ascending: true })

      if (error) {
        console.error('Error loading fondos pension:', error)
        showToast('Error al cargar los fondos de pensión', 'error')
        return
      }

      const fondosData = data || []
      
      // Save to cache
      localStorage.setItem('fondos_pension_cache', JSON.stringify({
        data: fondosData,
        timestamp: Date.now()
      }))
      
      setFondos(fondosData)
      setDataLoaded(true)
    } catch (error) {
      console.error('Error loading fondos pension:', error)
      showToast('Error al cargar los fondos de pensión', 'error')
    } finally {
      setLoading(false)
      setLoadingRef(false)
    }
  }

  useEffect(() => {
    const shouldLoad = !permissionsLoading && permissions.length > 0 && canView && !dataLoaded && !loadingRef
    if (shouldLoad) {
      loadData()
    } else if (dataLoaded) {
      setLoading(false)
    }
  }, [permissionsLoading, permissions.length, canView, dataLoaded])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
  }

  // Crear fondo
  const handleCreate = async (formData: any) => {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user?.id

    if (!userId) {
      throw new Error('Usuario no autenticado')
    }

    const { error } = await supabase
      .from('fondos_pension')
      .insert([{
        nombre: formData.nombre.trim(),
        created_by: userId,
        updated_by: userId
      }])

    if (error) {
      console.error('Error creating fondo pension:', error)
      throw new Error(error.message)
    }

    // Clear cache and reload
    localStorage.removeItem('fondos_pension_cache')
    await loadData()
    showToast('Fondo de pensión creado exitosamente', 'success')
  }

  // Editar fondo
  const handleEdit = async (formData: any) => {
    if (!selectedRecord) return

    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user?.id

    if (!userId) {
      throw new Error('Usuario no autenticado')
    }

    const { error } = await supabase
      .from('fondos_pension')
      .update({
        nombre: formData.nombre.trim(),
        updated_by: userId
      })
      .eq('id', selectedRecord.id)

    if (error) {
      console.error('Error updating fondo pension:', error)
      throw new Error(error.message)
    }

    // Clear cache and reload
    localStorage.removeItem('fondos_pension_cache')
    await loadData()
    showToast('Fondo de pensión actualizado exitosamente', 'success')
  }

  // Activar/Desactivar fondo
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
      const newStatus = !selectedRecord.es_activa
      const { error } = await supabase
        .from('fondos_pension')
        .update({
          es_activa: newStatus,
          updated_by: userId
        })
        .eq('id', selectedRecord.id)

      if (error) {
        console.error('Error updating fondo pension:', error)
        throw new Error(error.message)
      }

      // Clear cache and reload
      localStorage.removeItem('fondos_pension_cache')
      await loadData()
      showToast(`Fondo de pensión ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success')
      setShowActivateDeactivateModal(false)
      setSelectedRecord(null)
    } catch (error: any) {
      console.error('Error updating fondo pension:', error)
      showToast(error.message || 'Error al actualizar el fondo de pensión', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Configuración de la tabla
  const columns = [
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true
    },
    {
      key: 'es_activa',
      label: 'Estado',
      sortable: true,
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Activa' : 'Inactiva'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Fecha Creación',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('es-ES')
    }
  ]

  // Configuración del formulario
  const formFields = [
    {
      key: 'nombre',
      label: 'Nombre del Fondo',
      type: 'text' as const,
      required: true,
      placeholder: 'Ej: Porvenir, Protección, Colpensiones...'
    }
  ]

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
            <div className="p-2 bg-purple-100 rounded-lg">
              <Landmark className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#004C4C]">Fondos de Pensión</h1>
              <p className="text-[#065C5C] text-sm">
                Gestiona los fondos de pensión disponibles
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <AuxiliaryDataTable
        data={fondos}
        columns={columns}
        loading={loading}
        searchPlaceholder="Buscar fondos de pensión..."
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
        emptyMessage="No hay fondos de pensión registrados"
        addButtonText="Agregar Fondo"
      />

      {/* Modal Crear */}
      <AuxiliaryTableModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => setShowCreateModal(false)}
        title="Agregar Nuevo Fondo de Pensión"
        fields={formFields}
        onSubmit={handleCreate}
      />

      {/* Modal Editar */}
      <AuxiliaryTableModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedRecord(null)
        }}
        onSuccess={() => {
          setShowEditModal(false)
          setSelectedRecord(null)
        }}
        title="Editar Fondo de Pensión"
        record={selectedRecord}
        fields={formFields}
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
        recordName={selectedRecord?.nombre}
        isActive={selectedRecord?.es_activa || false}
        loading={updating}
        entityType="fondo de pensión"
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
