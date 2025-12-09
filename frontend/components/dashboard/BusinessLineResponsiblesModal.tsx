'use client'

import { useState, useEffect } from 'react'
import { X, Users, UserPlus, UserMinus, Star, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface BusinessLine {
  id: string
  nombre: string
  descripcion: string
  es_activa: boolean
}

interface User {
  id: string
  email: string
}

interface BusinessLineResponsible {
  id: string
  user_id: string
  email: string
  es_principal: boolean
  fecha_asignacion: string
  es_activo: boolean
}

interface BusinessLineResponsiblesModalProps {
  isOpen: boolean
  onClose: () => void
  businessLine: BusinessLine | null
  onSuccess: () => void
}

/**
 * Modal para gestionar responsables de una línea de negocio
 * Permite asignar/remover responsables y definir el principal
 */
export default function BusinessLineResponsiblesModal({
  isOpen,
  onClose,
  businessLine,
  onSuccess
}: BusinessLineResponsiblesModalProps) {
  const [currentResponsibles, setCurrentResponsibles] = useState<BusinessLineResponsible[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && businessLine) {
      loadData()
    } else {
      resetModal()
    }
  }, [isOpen, businessLine])

  const resetModal = () => {
    setCurrentResponsibles([])
    setAvailableUsers([])
    setErrors({})
    setSearchTerm('')
  }

  const loadData = async () => {
    if (!businessLine) return

    try {
      setLoading(true)

      // Cargar responsables actuales usando función segura
      const { data: responsiblesData, error: responsiblesError } = await supabase
        .rpc('get_linea_negocio_responsables_safe', { linea_id: businessLine.id })

      if (responsiblesError) throw responsiblesError

      // Cargar usuarios disponibles usando función segura
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_for_business_line_assignment')

      if (usersError) throw usersError

      setCurrentResponsibles(responsiblesData || [])
      setAvailableUsers(usersData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      setErrors({ general: 'Error al cargar los datos' })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar usuarios disponibles (excluir ya asignados)
  const filteredAvailableUsers = availableUsers.filter(user => {
    const isAlreadyAssigned = currentResponsibles.some(resp => resp.user_id === user.id)
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    return !isAlreadyAssigned && matchesSearch
  })

  const handleAddResponsible = async (userId: string) => {
    if (!businessLine) return

    try {
      setSaving(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        throw new Error('Usuario no autenticado')
      }

      const { error } = await supabase
        .from('linea_negocio_responsables')
        .insert([{
          linea_negocio_id: businessLine.id,
          user_id: userId,
          es_asignado_principal: currentResponsibles.length === 0, // Primer responsable es principal
          asignado_por: currentUser.id,
          es_activo: true
        }])

      if (error) throw error

      // Recargar datos
      await loadData()
      setSearchTerm('')
      
    } catch (error) {
      console.error('Error adding responsible:', error)
      setErrors({ general: 'Error al asignar responsable' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveResponsible = async (responsibleId: string) => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('linea_negocio_responsables')
        .update({ es_activo: false })
        .eq('id', responsibleId)

      if (error) throw error

      // Recargar datos
      await loadData()
      
    } catch (error) {
      console.error('Error removing responsible:', error)
      setErrors({ general: 'Error al remover responsable' })
    } finally {
      setSaving(false)
    }
  }

  const handleSetPrincipal = async (responsibleId: string) => {
    try {
      setSaving(true)

      // Primero quitar principal a todos
      const { error: updateAllError } = await supabase
        .from('linea_negocio_responsables')
        .update({ es_asignado_principal: false })
        .eq('linea_negocio_id', businessLine?.id)

      if (updateAllError) throw updateAllError

      // Luego asignar principal al seleccionado
      const { error: setPrincipalError } = await supabase
        .from('linea_negocio_responsables')
        .update({ es_asignado_principal: true })
        .eq('id', responsibleId)

      if (setPrincipalError) throw setPrincipalError

      // Recargar datos
      await loadData()
      
    } catch (error) {
      console.error('Error setting principal:', error)
      setErrors({ general: 'Error al asignar responsable principal' })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    onSuccess()
    onClose()
  }

  if (!isOpen || !businessLine) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto my-0 flex flex-col h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="text-white p-4 flex items-center justify-between bg-[#004C4C]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Responsables</h2>
              <p className="text-sm opacity-90">{businessLine.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 hover:bg-white hover:bg-opacity-20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          
          {/* Error general */}
          {errors.general && (
            <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">{errors.general}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5FD3D2]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
              
              {/* Responsables actuales */}
              <div className="p-4 border-r border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Responsables Asignados ({currentResponsibles.length})
                  </h3>
                </div>

                {currentResponsibles.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay responsables asignados</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Asigna usuarios desde la lista de la derecha
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto">
                    {currentResponsibles.map((responsible) => (
                      <div
                        key={responsible.id}
                        className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#004C4C] rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {responsible.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {responsible.email}
                            </p>
                            <div className="flex items-center space-x-2">
                              {responsible.es_principal && (
                                <div className="flex items-center space-x-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                  <span className="text-xs text-yellow-700 font-medium">Principal</span>
                                </div>
                              )}
                              <span className="text-xs text-gray-500">
                                Desde {new Date(responsible.fecha_asignacion).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {!responsible.es_principal && (
                            <button
                              onClick={() => handleSetPrincipal(responsible.id)}
                              disabled={saving}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Hacer principal"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveResponsible(responsible.id)}
                            disabled={saving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remover responsable"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Usuarios disponibles */}
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Agregar Responsables
                  </h3>
                  
                  {/* Búsqueda */}
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm"
                  />
                </div>

                {filteredAvailableUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      {searchTerm 
                        ? 'No se encontraron usuarios'
                        : 'Todos los usuarios están asignados'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[calc(100vh-24rem)] overflow-y-auto">
                    {filteredAvailableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:border-[#5FD3D2] transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-700 text-sm font-medium">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddResponsible(user.id)}
                          disabled={saving}
                          className="p-1 text-[#004C4C] hover:bg-[#E6F5F7] rounded transition-colors disabled:opacity-50"
                          title="Asignar como responsable"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {currentResponsibles.length > 0 && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  {currentResponsibles.length} responsable{currentResponsibles.length !== 1 ? 's' : ''} asignado{currentResponsibles.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white rounded-lg hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
