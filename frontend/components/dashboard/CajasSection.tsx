'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Plus, Calendar, ChevronRight, History, Edit, Trash2, X, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import GenericAutocompleteSelect from '../ui/GenericAutocompleteSelect'

interface Ciudad {
  id: string
  nombre: string
}

interface CajaCompensacion {
  id: string
  nombre: string
  ciudad_id: string
}

interface EmpresaCajaActual {
  id: string
  ciudad_id: string
  ciudad_nombre: string
  caja_id: string
  caja_nombre: string
  fecha_inicio: string
}

interface CajasSectionProps {
  empresaId?: string
  isCreating: boolean
  onCajasChange?: (cajas: { ciudad_id: string, caja_id: string, fecha_inicio: string }[]) => void
  onCajasDelete?: (ciudadIds: string[]) => void
}

interface CajaHistorialItem {
  id: string
  ciudad_id: string
  ciudad_nombre: string
  caja_id: string
  caja_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
  estado: string
}

/**
 * Componente para gestionar Cajas de Compensación por ciudad
 * Permite agregar, cambiar y eliminar cajas por ciudad
 */
export default function CajasSection({ empresaId, isCreating, onCajasChange, onCajasDelete }: CajasSectionProps) {
  const [ciudades, setCiudades] = useState<Ciudad[]>([])
  const [cajas, setCajas] = useState<CajaCompensacion[]>([])
  const [currentCajas, setCurrentCajas] = useState<EmpresaCajaActual[]>([])
  const [newCajas, setNewCajas] = useState<{ ciudad_id: string, caja_id: string, fecha_inicio: string }[]>([])
  const [deletedCajas, setDeletedCajas] = useState<string[]>([])
  
  // Estados del modal de agregar/editar
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingCaja, setEditingCaja] = useState<EmpresaCajaActual | null>(null)
  const [selectedCiudad, setSelectedCiudad] = useState<string>('')
  const [selectedCaja, setSelectedCaja] = useState<string>('')
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0])
  // Eliminado motivo - no es necesario
  
  // Estados para historial
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const [historial, setHistorial] = useState<CajaHistorialItem[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState<boolean>(false)
  
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingData, setLoadingData] = useState<boolean>(true)

  // Cargar ciudades y cajas disponibles
  const loadData = async () => {
    try {
      setLoadingData(true)
      
      const [ciudadesResponse, cajasResponse] = await Promise.all([
        supabase
          .from('ciudades')
          .select('id, nombre')
          .eq('es_activa', true)
          .order('nombre', { ascending: true }),
        supabase
          .from('cajas_compensacion')
          .select('id, nombre, ciudad_id')
          .eq('es_activa', true)
          .order('nombre', { ascending: true })
      ])

      if (ciudadesResponse.error) throw ciudadesResponse.error
      if (cajasResponse.error) throw cajasResponse.error

      setCiudades(ciudadesResponse.data || [])
      setCajas(cajasResponse.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // Cargar cajas actuales de la empresa (solo en modo edición)
  const loadCurrentCajas = async () => {
    if (!empresaId || isCreating) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_empresa_cajas_actuales', { empresa_uuid: empresaId })

      if (error) throw error
      setCurrentCajas(data || [])
    } catch (error) {
      console.error('Error loading current cajas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar historial de cajas
  const loadHistorial = async () => {
    if (!empresaId || isCreating) return
    
    try {
      setLoadingHistorial(true)
      const { data, error } = await supabase
        .rpc('get_empresa_cajas_historial', { empresa_uuid: empresaId })

      if (error) throw error
      setHistorial(data || [])
    } catch (error) {
      console.error('Error loading Cajas historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }

  useEffect(() => {
    loadData()
    if (!isCreating && empresaId) {
      loadCurrentCajas()
    }
  }, [empresaId, isCreating])

  const handleShowHistory = async () => {
    setShowHistory(true)
    await loadHistorial()
  }

  // Notificar cambios al componente padre
  useEffect(() => {
    if (isCreating) {
      onCajasChange?.(newCajas)
    } else {
      // En modo edición, solo notificar si hay cambios reales
      if (newCajas.length > 0) {
        onCajasChange?.(newCajas)
      }
    }
  }, [newCajas, isCreating])

  const handleOpenModal = (caja?: EmpresaCajaActual) => {
    if (caja) {
      // Modo edición
      setEditingCaja(caja)
      setSelectedCiudad(caja.ciudad_id)
      setSelectedCaja(caja.caja_id)
      setFechaInicio(new Date().toISOString().split('T')[0])
    } else {
      // Modo creación
      setEditingCaja(null)
      setSelectedCiudad('')
      setSelectedCaja('')
      setFechaInicio(new Date().toISOString().split('T')[0])
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCaja(null)
    setSelectedCiudad('')
    setSelectedCaja('')
    setFechaInicio(new Date().toISOString().split('T')[0])
  }

  const handleSave = () => {
    if (!selectedCiudad || !selectedCaja) return

    const nuevaCaja = {
      ciudad_id: selectedCiudad,
      caja_id: selectedCaja,
      fecha_inicio: fechaInicio
    }

    if (isCreating) {
      // En modo creación, agregar a la lista local
      setNewCajas(prev => {
        const filtered = prev.filter(c => c.ciudad_id !== selectedCiudad)
        return [...filtered, nuevaCaja]
      })
    } else {
      // En modo edición, agregar/actualizar en ambas listas
      setCurrentCajas(prev => {
        const filtered = prev.filter(c => c.ciudad_id !== selectedCiudad)
        return [...filtered, {
          id: 'temp-' + Date.now(),
          ciudad_id: nuevaCaja.ciudad_id,
          ciudad_nombre: getCiudadNombre(nuevaCaja.ciudad_id),
          caja_id: nuevaCaja.caja_id,
          caja_nombre: getCajaNombre(nuevaCaja.caja_id),
          fecha_inicio: nuevaCaja.fecha_inicio
        }]
      })
      
      setNewCajas(prev => {
        const filtered = prev.filter(c => c.ciudad_id !== selectedCiudad)
        return [...filtered, nuevaCaja]
      })
    }

    handleCloseModal()
  }

  const handleRemoveCaja = (ciudadId: string) => {
    if (isCreating) {
      setNewCajas(prev => prev.filter(c => c.ciudad_id !== ciudadId))
    } else {
      // En modo edición, agregar a la lista de eliminadas
      setDeletedCajas(prev => {
        if (!prev.includes(ciudadId)) {
          const newDeleted = [...prev, ciudadId]
          onCajasDelete?.(newDeleted)
          return newDeleted
        }
        return prev
      })
      
      // Remover de la lista visual
      setCurrentCajas(prev => prev.filter(c => c.ciudad_id !== ciudadId))
      
      // Remover de cambios pendientes si existía
      setNewCajas(prev => prev.filter(c => c.ciudad_id !== ciudadId))
    }
  }

  const getCiudadNombre = (ciudadId: string): string => {
    const ciudad = ciudades.find(c => c.id === ciudadId)
    return ciudad ? ciudad.nombre : 'Ciudad desconocida'
  }

  const getCajaNombre = (cajaId: string): string => {
    const caja = cajas.find(c => c.id === cajaId)
    return caja ? caja.nombre : 'Caja desconocida'
  }

  if (loadingData) {
    return (
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Building2 className="h-5 w-5 text-[#004C4C]" />
          <h3 className="text-lg font-semibold text-gray-900">Cajas de Compensación</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#87E0E0] border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-sm text-gray-500">Cargando datos...</span>
        </div>
      </div>
    )
  }

  const cajasToShow = isCreating ? newCajas : currentCajas

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#004C4C] to-[#065C5C] rounded-xl flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Cajas de Compensación</h3>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          {!isCreating && empresaId && (
            <button
              type="button"
              onClick={handleShowHistory}
              className="text-xs text-gray-500 hover:text-[#004C4C] transition-colors flex items-center space-x-1"
            >
              <History className="h-3 w-3" />
              <span className="hidden sm:inline">Historial</span>
            </button>
          )}
          
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#004C4C] text-white text-xs rounded-lg hover:bg-[#065C5C] transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span className="whitespace-nowrap">Agregar Ciudad</span>
          </button>
        </div>
      </div>

      {/* Lista de cajas actuales */}
      {cajasToShow.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">Sin cajas asignadas</p>
          <p className="text-xs text-gray-500 mt-1">
            Agrega cajas de compensación por ciudad donde opera la empresa
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cajasToShow.map((caja, index) => (
            <div
              key={isCreating ? `new-${index}` : (caja as EmpresaCajaActual).id}
              className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:border-[#87E0E0] hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-5 w-5 text-[#065C5C]" />
                    <h4 className="font-semibold text-[#004C4C] text-base">
                      {isCreating ? getCiudadNombre(caja.ciudad_id) : (caja as EmpresaCajaActual).ciudad_nombre}
                    </h4>
                  </div>
                  <p className="text-base text-gray-700 mb-3 font-medium">
                    {isCreating ? getCajaNombre(caja.caja_id) : (caja as EmpresaCajaActual).caja_nombre}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Desde: {new Date(caja.fecha_inicio).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  {/* Eliminado motivo - no es necesario */}
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isCreating && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal(caja as EmpresaCajaActual)}
                      className="p-1.5 text-gray-400 hover:text-[#004C4C] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveCaja(isCreating ? caja.ciudad_id : caja.ciudad_id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Eliminado tip - diseño más limpio */}

      {/* Modal de agregar/editar caja */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCaja ? 'Cambiar Caja de Compensación' : 'Agregar Caja de Compensación'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Selector de ciudad */}
              <GenericAutocompleteSelect
                label="Ciudad"
                options={ciudades}
                value={selectedCiudad}
                onChange={setSelectedCiudad}
                placeholder="Busca y selecciona una ciudad..."
                disabled={!!editingCaja} // No permitir cambiar ciudad en modo edición
                required
              />

              {/* Selector de caja */}
              <div>
                <GenericAutocompleteSelect
                  label="Caja de Compensación"
                  options={cajas.filter(caja => caja.ciudad_id === selectedCiudad)}
                  value={selectedCaja}
                  onChange={setSelectedCaja}
                  placeholder={selectedCiudad ? "Busca y selecciona una caja..." : "Primero selecciona una ciudad"}
                  disabled={!selectedCiudad}
                  required
                />
                {!selectedCiudad && (
                  <p className="text-xs text-gray-500 mt-1">
                    Primero selecciona una ciudad
                  </p>
                )}
                {selectedCiudad && cajas.filter(c => c.ciudad_id === selectedCiudad).length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    No hay cajas disponibles para esta ciudad
                  </p>
                )}
              </div>

              {/* Fecha de inicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-base"
                />
              </div>

              {/* Eliminado campo de motivo */}
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedCiudad || !selectedCaja}
                className="px-4 py-2 text-sm bg-[#004C4C] text-white rounded-lg hover:bg-[#065C5C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCaja ? 'Cambiar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-[#004C4C]" />
                <h3 className="text-lg font-semibold text-gray-900">Historial de Cajas de Compensación</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {loadingHistorial ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#87E0E0] border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Cargando historial...</span>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Sin historial de cajas</p>
                  <p className="text-sm text-gray-400 mt-1">No se han registrado cambios de cajas de compensación para esta empresa</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Agrupar por ciudad */}
                  {Object.entries(
                    historial.reduce((acc, item) => {
                      if (!acc[item.ciudad_nombre]) {
                        acc[item.ciudad_nombre] = []
                      }
                      acc[item.ciudad_nombre].push(item)
                      return acc
                    }, {} as Record<string, CajaHistorialItem[]>)
                  ).map(([ciudadNombre, cajas]) => (
                    <div key={ciudadNombre} className="border-2 border-gray-200 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <MapPin className="h-5 w-5 text-[#004C4C]" />
                        <h4 className="text-lg font-semibold text-gray-900">{ciudadNombre}</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {cajas.map((item, index) => (
                          <div 
                            key={item.id}
                            className={`p-3 rounded-lg border transition-all ${
                              item.estado === 'activa' 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h5 className={`font-semibold ${
                                    item.estado === 'activa' ? 'text-green-800' : 'text-gray-700'
                                  }`}>
                                    {item.caja_nombre}
                                  </h5>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    item.estado === 'activa' 
                                      ? 'bg-green-200 text-green-800' 
                                      : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {item.estado === 'activa' ? 'ACTIVA' : 'FINALIZADA'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>Inicio: {new Date(item.fecha_inicio).toLocaleDateString('es-CO')}</span>
                                  </div>
                                  {item.fecha_fin && (
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>Fin: {new Date(item.fecha_fin).toLocaleDateString('es-CO')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {index === 0 && item.estado === 'activa' && (
                                <div className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                                  Actual
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
