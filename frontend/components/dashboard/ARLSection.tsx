'use client'

import { useState, useEffect } from 'react'
import { Building, Calendar, ChevronRight, History, Edit, X, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import GenericAutocompleteSelect from '../ui/GenericAutocompleteSelect'

interface ARL {
  id: string
  nombre: string
}

interface EmpresaARLActual {
  id: string
  arl_id: string
  arl_nombre: string
  fecha_inicio: string
}

interface ARLSectionProps {
  empresaId?: string
  isCreating: boolean
  onARLChange?: (arlId: string | null, fechaInicio?: string) => void
}

interface ARLHistorialItem {
  id: string
  arl_id: string
  arl_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
  estado: string
}

/**
 * Componente para gestionar ARL de una empresa
 * Permite seleccionar, cambiar y ver historial de ARLs
 */
export default function ARLSection({ empresaId, isCreating, onARLChange }: ARLSectionProps) {
  const [arls, setArls] = useState<ARL[]>([])
  const [currentARL, setCurrentARL] = useState<EmpresaARLActual | null>(null)
  const [selectedARL, setSelectedARL] = useState<string>('')
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0])
  // Eliminado motivo - no es necesario
  const [showARLSelector, setShowARLSelector] = useState<boolean>(isCreating)
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const [historial, setHistorial] = useState<ARLHistorialItem[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingARLs, setLoadingARLs] = useState<boolean>(true)

  // Cargar ARLs disponibles
  const loadARLs = async () => {
    try {
      setLoadingARLs(true)
      const { data, error } = await supabase
        .from('arls')
        .select('id, nombre')
        .eq('es_activa', true)
        .order('nombre', { ascending: true })

      if (error) throw error
      setArls(data || [])
    } catch (error) {
      console.error('Error loading ARLs:', error)
    } finally {
      setLoadingARLs(false)
    }
  }

  // Cargar ARL actual de la empresa (solo en modo edición)
  const loadCurrentARL = async () => {
    if (!empresaId || isCreating) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_empresa_arl_actual', { empresa_uuid: empresaId })

      if (error) throw error
      
      if (data && data.length > 0) {
        setCurrentARL(data[0])
        setSelectedARL(data[0].arl_id)
      }
    } catch (error) {
      console.error('Error loading current ARL:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar historial de ARLs
  const loadHistorial = async () => {
    if (!empresaId || isCreating) return
    
    try {
      setLoadingHistorial(true)
      const { data, error } = await supabase
        .rpc('get_empresa_arl_historial', { empresa_uuid: empresaId })

      if (error) throw error
      setHistorial(data || [])
    } catch (error) {
      console.error('Error loading ARL historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }

  useEffect(() => {
    loadARLs()
    if (!isCreating && empresaId) {
      loadCurrentARL()
    }
  }, [empresaId, isCreating])

  const handleShowHistory = async () => {
    setShowHistory(true)
    await loadHistorial()
  }

  const handleARLSelect = (arlId: string) => {
    setSelectedARL(arlId)
    onARLChange?.(arlId, fechaInicio)
  }

  const handleDateChange = (date: string) => {
    setFechaInicio(date)
    onARLChange?.(selectedARL, date)
  }

  // Eliminado manejo de motivo

  const handleShowSelector = () => {
    setShowARLSelector(true)
    setFechaInicio(new Date().toISOString().split('T')[0])
  }

  const handleCancelSelector = () => {
    setShowARLSelector(false)
    setSelectedARL(currentARL?.arl_id || '')
    setFechaInicio(new Date().toISOString().split('T')[0])
    onARLChange?.(null) // Indicar que se canceló
  }

  if (loadingARLs) {
    return (
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Building className="h-5 w-5 text-[#004C4C]" />
          <h3 className="text-lg font-semibold text-gray-900">ARL</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#87E0E0] border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-sm text-gray-500">Cargando ARLs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#004C4C] to-[#065C5C] rounded-xl flex items-center justify-center">
            <Building className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">ARL</h3>
        </div>
        
        {!isCreating && currentARL && !showARLSelector && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleShowHistory}
              className="text-xs text-gray-500 hover:text-[#004C4C] transition-colors flex items-center space-x-1"
            >
              <History className="h-3 w-3" />
              <span>Historial</span>
            </button>
            <button
              type="button"
              onClick={handleShowSelector}
              className="text-xs text-[#004C4C] hover:text-[#065C5C] transition-colors flex items-center space-x-1"
            >
              <Edit className="h-3 w-3" />
              <span>Cambiar</span>
            </button>
          </div>
        )}
      </div>

      {/* ARL Actual (modo edición) */}
      {!isCreating && currentARL && !showARLSelector && (
        <div className="bg-gradient-to-r from-[#E6F5F7] to-[#87E0E0]/20 rounded-xl p-4 border border-[#87E0E0]/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-[#004C4C] text-lg">{currentARL.arl_nombre}</h4>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4 text-[#065C5C]" />
                <span className="text-sm text-[#065C5C]">
                  Desde: {new Date(currentARL.fecha_inicio).toLocaleDateString('es-CO')}
                </span>
              </div>
              {/* Eliminado motivo - no es necesario */}
            </div>
            <ChevronRight className="h-5 w-5 text-[#065C5C]" />
          </div>
        </div>
      )}

      {/* Sin ARL asignada */}
      {!isCreating && !currentARL && !showARLSelector && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-800 font-medium">Sin ARL asignada</p>
              <p className="text-xs text-amber-600 mt-1">Esta empresa no tiene ARL activa</p>
            </div>
            <button
              type="button"
              onClick={handleShowSelector}
              className="px-3 py-1.5 bg-[#004C4C] text-white text-xs rounded-lg hover:bg-[#065C5C] transition-colors"
            >
              Asignar ARL
            </button>
          </div>
        </div>
      )}

      {/* Selector de ARL */}
      {showARLSelector && (
        <div className="space-y-4">
          
          {/* Selector de ARL */}
          <GenericAutocompleteSelect
            label="Seleccionar ARL"
            options={arls}
            value={selectedARL}
            onChange={handleARLSelect}
            placeholder="Busca y selecciona una ARL..."
            required
          />

          {/* Fecha de inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio *
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-base"
              required
            />
          </div>

          {/* Eliminado campo de motivo */}

          {/* Botones de acción */}
          {!isCreating && (
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancelSelector}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Eliminado tip - diseño más limpio */}

      {/* Modal de Historial */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-[#004C4C]" />
                <h3 className="text-lg font-semibold text-gray-900">Historial de ARLs</h3>
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
                  <p className="text-gray-500 font-medium">Sin historial de ARLs</p>
                  <p className="text-sm text-gray-400 mt-1">No se han registrado cambios de ARL para esta empresa</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((item, index) => (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        item.estado === 'activa' 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className={`font-semibold text-lg ${
                              item.estado === 'activa' ? 'text-green-800' : 'text-gray-700'
                            }`}>
                              {item.arl_nombre}
                            </h4>
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
                        
                        {index === 0 && (
                          <div className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                            Más reciente
                          </div>
                        )}
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
