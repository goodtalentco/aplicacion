/**
 * Página de gestión de Líneas de Negocio
 * Permite gestionar el catálogo de líneas de negocio y asignar responsables
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import { supabase } from '@/lib/supabaseClient'
import { 
  Target,
  Plus,
  Search,
  Users,
  Building2,
  Edit3,
  Power,
  PowerOff,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import BusinessLineModal from '@/components/dashboard/BusinessLineModal'
import BusinessLineResponsiblesModal from '@/components/dashboard/BusinessLineResponsiblesModal'
import ActivateDeactivateModal from '@/components/ui/ActivateDeactivateModal'
import Toast from '@/components/dashboard/Toast'

interface BusinessLine {
  id: string
  nombre: string
  descripcion: string
  es_activa: boolean
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  responsables_count?: number
  empresas_count?: number
}

interface BusinessLineResponsible {
  user_id: string
  email: string
  es_principal: boolean
  fecha_asignacion: string
}

export default function BusinessLinesPage() {
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showResponsiblesModal, setShowResponsiblesModal] = useState(false)
  const [showActivateDeactivateModal, setShowActivateDeactivateModal] = useState(false)
  const [selectedBusinessLine, setSelectedBusinessLine] = useState<BusinessLine | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [updating, setUpdating] = useState(false)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  }>({ show: false, message: '', type: 'success' })
  
  const router = useRouter()
  const { canManageAuxTables, hasPermission, loading: permissionsLoading, permissions } = usePermissions()

  // Verificar permisos
  const canViewBusinessLines = hasPermission('lineas_negocio', 'view') || canManageAuxTables()
  const canCreateBusinessLines = hasPermission('lineas_negocio', 'create') || canManageAuxTables()
  const canEditBusinessLines = hasPermission('lineas_negocio', 'edit') || canManageAuxTables()
  const canDeleteBusinessLines = hasPermission('lineas_negocio', 'delete') || canManageAuxTables()
  const canManageResponsibles = hasPermission('linea_negocio_responsables', 'view') || canManageAuxTables()

  // Redirigir si no tiene permisos
  useEffect(() => {
    if (!permissionsLoading && !canViewBusinessLines) {
      router.push('/dashboard')
    }
  }, [canViewBusinessLines, permissionsLoading, router])

  // Cargar líneas de negocio
  const loadBusinessLines = async () => {
    if (!canViewBusinessLines) return

    try {
      setLoading(true)
      
      // Obtener líneas de negocio básicas
      const { data: linesData, error } = await supabase
        .from('lineas_negocio')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) throw error

      // Obtener conteos por separado para cada línea
      const processedData = await Promise.all(
        (linesData || []).map(async (line) => {
          // Contar responsables activos
          const { count: responsablesCount } = await supabase
            .from('linea_negocio_responsables')
            .select('*', { count: 'exact', head: true })
            .eq('linea_negocio_id', line.id)
            .eq('es_activo', true)

          // Contar empresas activas
          const { count: empresasCount } = await supabase
            .from('empresa_lineas_negocio')
            .select('*', { count: 'exact', head: true })
            .eq('linea_negocio_id', line.id)
            .eq('es_activa', true)

          return {
            ...line,
            responsables_count: responsablesCount || 0,
            empresas_count: empresasCount || 0
          }
        })
      )

      setBusinessLines(processedData)
    } catch (error) {
      console.error('Error loading business lines:', error)
      showToast('Error al cargar líneas de negocio', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!permissionsLoading && permissions.length > 0 && canViewBusinessLines) {
      loadBusinessLines()
    }
  }, [permissionsLoading, permissions.length, canViewBusinessLines])

  // Filtrar líneas de negocio
  const filteredBusinessLines = businessLines.filter(line =>
    line.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    line.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Funciones de modal
  const handleCreateBusinessLine = () => {
    setSelectedBusinessLine(null)
    setModalMode('create')
    setShowModal(true)
  }

  const handleEditBusinessLine = (businessLine: BusinessLine) => {
    setSelectedBusinessLine(businessLine)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleManageResponsibles = (businessLine: BusinessLine) => {
    setSelectedBusinessLine(businessLine)
    setShowResponsiblesModal(true)
  }

  const handleDeleteBusinessLine = (businessLine: BusinessLine) => {
    if (!canDeleteBusinessLines) {
      showToast('No tienes permisos para gestionar líneas de negocio', 'error')
      return
    }

    setSelectedBusinessLine(businessLine)
    setShowActivateDeactivateModal(true)
  }

  const handleConfirmActivateDeactivate = async () => {
    if (!selectedBusinessLine) return

    const newStatus = !selectedBusinessLine.es_activa
    setUpdating(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const userId = session.session?.user?.id

      if (!userId) {
        showToast('Usuario no autenticado', 'error')
        return
      }

      const { error } = await supabase
        .from('lineas_negocio')
        .update({
          es_activa: newStatus,
          updated_by: userId
        })
        .eq('id', selectedBusinessLine.id)

      if (error) throw error

      showToast(`Línea de negocio ${newStatus ? 'activada' : 'desactivada'} correctamente`, 'success')
      setShowActivateDeactivateModal(false)
      setSelectedBusinessLine(null)
      loadBusinessLines()
    } catch (error) {
      console.error('Error updating business line:', error)
      showToast('Error al actualizar línea de negocio', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5FD3D2]"></div>
      </div>
    )
  }

  if (!canViewBusinessLines) {
    return null
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/dashboard/tablas-auxiliares')}
              className="p-2 text-[#065C5C] hover:bg-[#E6F5F7] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#004C4C] flex items-center">
                <Target className="w-8 h-8 mr-3 text-[#5FD3D2]" />
                Líneas de Negocio
              </h1>
              <p className="text-[#065C5C] mt-1 text-sm sm:text-base">
                Gestiona el catálogo de líneas de negocio y responsables
              </p>
            </div>
          </div>
          
          {canCreateBusinessLines && (
            <button
              onClick={handleCreateBusinessLine}
              className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white px-4 py-2 rounded-lg hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all flex items-center space-x-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Línea</span>
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar líneas de negocio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors"
          />
        </div>
      </div>

      {/* Lista de líneas de negocio */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="animate-pulse">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="w-48 h-5 bg-gray-300 rounded"></div>
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-gray-300 rounded"></div>
                    <div className="w-32 h-4 bg-gray-300 rounded"></div>
                    <div className="w-64 h-4 bg-gray-300 rounded"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredBusinessLines.length === 0 ? (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No se encontraron líneas de negocio' : 'No hay líneas de negocio'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza creando tu primera línea de negocio'
            }
          </p>
          {canCreateBusinessLines && !searchTerm && (
            <button
              onClick={handleCreateBusinessLine}
              className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white px-6 py-3 rounded-lg hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Primera Línea</span>
            </button>
          )}
        </div>
      ) : (
        /* Vista de tabla en desktop, tarjetas en móvil */
        <>
          {/* Vista de tabla (desktop) */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Línea de Negocio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsables
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBusinessLines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#004C4C]">
                            <Target className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {line.nombre}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {line.descripcion || 'Sin descripción'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {line.es_activa ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-700 font-medium">Activa</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-700 font-medium">Inactiva</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {line.responsables_count || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {line.empresas_count || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {canManageResponsibles && (
                            <button
                              onClick={() => handleManageResponsibles(line)}
                              className="p-1 text-[#004C4C] hover:bg-[#E6F5F7] rounded transition-colors"
                              title="Gestionar responsables"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          {canEditBusinessLines && (
                            <button
                              onClick={() => handleEditBusinessLine(line)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar línea"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteBusinessLines && (
                            <button
                              onClick={() => handleDeleteBusinessLine(line)}
                              className={`p-1 rounded transition-colors ${
                                line.es_activa 
                                  ? 'text-orange-600 hover:bg-orange-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={line.es_activa ? 'Desactivar línea' : 'Activar línea'}
                            >
                              {line.es_activa ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista de tarjetas (móvil) */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredBusinessLines.map((line) => (
              <div
                key={line.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 text-white relative overflow-hidden bg-[#004C4C]">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="w-6 h-6" />
                      <div className="flex items-center space-x-1">
                        {line.es_activa ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="text-xs">
                          {line.es_activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold">{line.nombre}</h3>
                  </div>
                  
                  {/* Patrón decorativo */}
                  <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white bg-opacity-10"></div>
                </div>

                {/* Contenido */}
                <div className="p-4">
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {line.descripcion || 'Sin descripción'}
                  </p>
                  
                  {/* Estadísticas */}
                  <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{line.responsables_count || 0} responsables</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Building2 className="w-4 h-4" />
                      <span>{line.empresas_count || 0} empresas</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {canManageResponsibles && (
                        <button
                          onClick={() => handleManageResponsibles(line)}
                          className="p-2 text-[#004C4C] hover:bg-[#E6F5F7] rounded-lg transition-colors"
                          title="Gestionar responsables"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      {canEditBusinessLines && (
                        <button
                          onClick={() => handleEditBusinessLine(line)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar línea"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canDeleteBusinessLines && (
                        <button
                          onClick={() => handleDeleteBusinessLine(line)}
                          className={`p-2 rounded-lg transition-colors ${
                            line.es_activa 
                              ? 'text-orange-600 hover:bg-orange-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={line.es_activa ? 'Desactivar línea' : 'Activar línea'}
                        >
                          {line.es_activa ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modales */}
      <BusinessLineModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          loadBusinessLines()
          showToast(
            modalMode === 'create' 
              ? 'Línea de negocio creada correctamente' 
              : 'Línea de negocio actualizada correctamente',
            'success'
          )
        }}
        businessLine={selectedBusinessLine}
        mode={modalMode}
      />

      <BusinessLineResponsiblesModal
        isOpen={showResponsiblesModal}
        onClose={() => setShowResponsiblesModal(false)}
        businessLine={selectedBusinessLine}
        onSuccess={() => {
          loadBusinessLines()
          showToast('Responsables actualizados correctamente', 'success')
        }}
      />

      {/* Modal Activar/Desactivar */}
      <ActivateDeactivateModal
        isOpen={showActivateDeactivateModal}
        onClose={() => {
          setShowActivateDeactivateModal(false)
          setSelectedBusinessLine(null)
        }}
        onConfirm={handleConfirmActivateDeactivate}
        recordName={selectedBusinessLine?.nombre}
        isActive={selectedBusinessLine?.es_activa || false}
        loading={updating}
        entityType="línea de negocio"
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
