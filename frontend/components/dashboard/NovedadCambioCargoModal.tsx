/**
 * Modal para registrar cambios de cargo de un empleado
 */

import { useState, useEffect } from 'react'
import { X, Loader2, Briefcase, Save, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { usePermissions } from '../../lib/usePermissions'

interface NovedadCambioCargoModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  contractId: string
  contractName: string
  onSuccess: () => void
}

export const NovedadCambioCargoModal: React.FC<NovedadCambioCargoModalProps> = ({
  isOpen,
  onClose,
  onBack,
  contractId,
  contractName,
  onSuccess
}) => {
  const { user } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [loadingCurrentData, setLoadingCurrentData] = useState(true)
  const [cargoActual, setCargoActual] = useState('')
  const [cargoNuevo, setCargoNuevo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [aportaSenaActual, setAportaSenaActual] = useState<boolean>(true)
  const [aportaSenaNuevo, setAportaSenaNuevo] = useState<boolean>(true)

  // Cargar cargo actual
  useEffect(() => {
    const loadCurrentCargo = async () => {
      if (!isOpen || !contractId) return

      try {
        setLoadingCurrentData(true)

        // 1. Obtener último cambio de cargo si existe
        const { data: ultimoCambio } = await supabase
          .from('novedades_cambio_cargo')
          .select('cargo_nuevo, aporta_sena')
          .eq('contract_id', contractId)
          .order('created_at', { ascending: false })
          .limit(1)

        // 2. Obtener datos del contrato base
        const { data: contrato } = await supabase
          .from('contracts')
          .select('cargo, base_sena')
          .eq('id', contractId)
          .single()

        // 3. Establecer cargo actual
        if (ultimoCambio && ultimoCambio.length > 0) {
          setCargoActual(ultimoCambio[0].cargo_nuevo)
          const senaActual = ultimoCambio[0].aporta_sena !== null 
            ? ultimoCambio[0].aporta_sena 
            : contrato?.base_sena ?? true
          setAportaSenaActual(senaActual)
          setAportaSenaNuevo(senaActual) // Inicializar con valor actual
        } else {
          setCargoActual(contrato?.cargo || '')
          const senaActual = contrato?.base_sena ?? true
          setAportaSenaActual(senaActual)
          setAportaSenaNuevo(senaActual) // Inicializar con valor actual
        }

      } catch (error) {
        console.error('Error cargando cargo actual:', error)
        setCargoActual('Error al cargar')
      } finally {
        setLoadingCurrentData(false)
      }
    }

    loadCurrentCargo()
  }, [isOpen, contractId])

  // Limpiar formulario al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setCargoNuevo('')
      setMotivo('')
      // aportaSenaNuevo se resetea en loadCurrentCargo
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar que al menos haya un cambio
    const cargoChanged = cargoNuevo.trim() && cargoNuevo.trim() !== cargoActual.trim()
    const senaChanged = aportaSenaNuevo !== aportaSenaActual
    
    if (!cargoChanged && !senaChanged) {
      alert('Debes cambiar al menos el cargo o la contribución al SENA')
      return
    }

    try {
      setLoading(true)

      const novedad = {
        contract_id: contractId,
        cargo_anterior: cargoActual || null,
        cargo_nuevo: cargoNuevo.trim() || cargoActual, // Si no se especifica nuevo cargo, usar actual
        fecha: new Date().toISOString().split('T')[0], // Fecha actual
        motivo: motivo.trim() || null,
        aporta_sena: aportaSenaNuevo !== aportaSenaActual ? aportaSenaNuevo : null, // Solo guardar si cambió
        created_by: user?.id
      }
      

      const { error } = await supabase
        .from('novedades_cambio_cargo')
        .insert([novedad])

      if (error) {
        console.error('Error al guardar cambio de cargo:', error)
        alert('Error al guardar el cambio de cargo')
        return
      }

      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error:', error)
      alert('Error inesperado al guardar')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Volver al selector de novedades"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
            )}
            <div className="flex-shrink-0 w-10 h-10 bg-[#004C4C] rounded-lg flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cambio de Cargo</h3>
              <p className="text-sm text-gray-600">{contractName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Cargo Actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cargo Actual
            </label>
            <div className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-bold">
              {loadingCurrentData ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span>Cargando...</span>
                </div>
              ) : (
                cargoActual || 'Sin cargo definido'
              )}
            </div>
          </div>

          {/* Nuevo Cargo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo Cargo <span className="text-gray-400">(Opcional - dejar vacío para mantener actual)</span>
            </label>
            <input
              type="text"
              value={cargoNuevo}
              onChange={(e) => setCargoNuevo(e.target.value)}
              placeholder="Ej: Desarrollador Senior, Analista de Marketing, etc."
              className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-bold"
              disabled={loading || loadingCurrentData}
            />
          </div>

          {/* Aporta SENA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ¿El nuevo cargo aporta SENA?
            </label>
            
            {loadingCurrentData ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Cargando información actual...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {aportaSenaNuevo ? 'Sí aporta al SENA' : 'No aporta al SENA'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Actual: {aportaSenaActual ? 'Sí aporta' : 'No aporta'}
                    {aportaSenaNuevo !== aportaSenaActual && (
                      <span className="text-blue-600 font-medium"> → Cambiará</span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAportaSenaNuevo(!aportaSenaNuevo)}
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    aportaSenaNuevo ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aportaSenaNuevo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo del Cambio
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Promoción por desempeño, reestructuración organizacional, cambio de área..."
              className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={loading || loadingCurrentData}
            />
          </div>


          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || loadingCurrentData}
              className="flex-1 px-4 py-3 bg-[#004C4C] text-white rounded-lg hover:bg-[#065C5C] transition-colors disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar Cambio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
