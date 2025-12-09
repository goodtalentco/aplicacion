/**
 * Modal para registrar cambios de entidades (EPS, Pensión, Cesantías)
 */

import { useState, useEffect } from 'react'
import { X, Loader2, Heart, Save, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { usePermissions } from '../../lib/usePermissions'
import { EntidadAutocomplete } from '../ui/EntidadAutocomplete'
import { NotificationModal, NotificationType } from '../ui/NotificationModal'

interface NovedadEntidadesModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  contractId: string
  contractName: string
  onSuccess: () => void
}

interface EntidadData {
  id: string
  label: string
  tipo: 'eps' | 'fondo_pension' | 'fondo_cesantias'
  tablaAuxiliar: 'eps' | 'fondos_pension' | 'fondos_cesantias'
  actual: string
  nueva: string
  fecha: string
  loading: boolean
}

export const NovedadEntidadesModal: React.FC<NovedadEntidadesModalProps> = ({
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
  
  // Estado para notificaciones
  const [notification, setNotification] = useState<{
    isOpen: boolean
    type: NotificationType
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  // Funciones helper para notificaciones
  const showNotification = (type: NotificationType, title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  const [entidades, setEntidades] = useState<EntidadData[]>([
    {
      id: 'eps',
      label: 'EPS',
      tipo: 'eps',
      tablaAuxiliar: 'eps',
      actual: '',
      nueva: '',
      fecha: new Date().toISOString().split('T')[0],
      loading: false
    },
    {
      id: 'pension',
      label: 'Fondo de Pensión',
      tipo: 'fondo_pension',
      tablaAuxiliar: 'fondos_pension',
      actual: '',
      nueva: '',
      fecha: new Date().toISOString().split('T')[0],
      loading: false
    },
    {
      id: 'cesantias',
      label: 'Fondo de Cesantías',
      tipo: 'fondo_cesantias',
      tablaAuxiliar: 'fondos_cesantias',
      actual: '',
      nueva: '',
      fecha: new Date().toISOString().split('T')[0],
      loading: false
    }
  ])

  // Cargar entidades actuales
  useEffect(() => {
    const loadCurrentEntidades = async () => {
      if (!isOpen || !contractId) return

      try {
        setLoadingCurrentData(true)

        // 1. Obtener últimos cambios de entidades si existen
        const { data: ultimosCambios } = await supabase
          .from('novedades_entidades')
          .select('tipo, entidad_nueva')
          .eq('contract_id', contractId)
          .order('created_at', { ascending: false })

        // 2. Obtener entidades originales del contrato
        const { data: contrato } = await supabase
          .from('contracts')
          .select('radicado_eps, fondo_pension, fondo_cesantias')
          .eq('id', contractId)
          .single()

        // 3. Crear mapa de últimos cambios
        const ultimosCambiosMap = new Map<string, string>()
        if (ultimosCambios) {
          ultimosCambios.forEach(cambio => {
            if (!ultimosCambiosMap.has(cambio.tipo)) {
              ultimosCambiosMap.set(cambio.tipo, cambio.entidad_nueva)
            }
          })
        }

        // 4. Actualizar estado con valores actuales
        setEntidades(prev => prev.map(entidad => {
          let valorActual = ultimosCambiosMap.get(entidad.tipo)
          
          if (!valorActual) {
            // Mapear campos de contracts
            if (entidad.tipo === 'eps') {
              valorActual = contrato?.radicado_eps || ''
            } else {
              valorActual = contrato?.[entidad.tipo] || ''
            }
          }
          
          return {
            ...entidad,
            actual: valorActual || ''
          }
        }))

      } catch (error) {
        console.error('Error cargando entidades actuales:', error)
        setEntidades(prev => prev.map(entidad => ({
          ...entidad,
          actual: 'Error al cargar'
        })))
      } finally {
        setLoadingCurrentData(false)
      }
    }

    loadCurrentEntidades()
  }, [isOpen, contractId])

  // Limpiar formulario al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setEntidades(prev => prev.map(entidad => ({
        ...entidad,
        nueva: '',
        fecha: new Date().toISOString().split('T')[0]
      })))
    }
  }, [isOpen])

  const handleNuevaEntidadChange = (entidadId: string, value: string) => {
    setEntidades(prev => prev.map(entidad =>
      entidad.id === entidadId
        ? { ...entidad, nueva: value }
        : entidad
    ))
  }

  const handleFechaChange = (entidadId: string, fecha: string) => {
    setEntidades(prev => prev.map(entidad =>
      entidad.id === entidadId
        ? { ...entidad, fecha }
        : entidad
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar que haya al menos un cambio
    const cambiosValidos = entidades.filter(entidad => 
      entidad.nueva.trim() && entidad.nueva.trim() !== entidad.actual.trim()
    )

    if (cambiosValidos.length === 0) {
      showNotification(
        'warning', 
        'Sin cambios detectados', 
        'No has realizado ningún cambio en las entidades. Modifica al menos una entidad para poder guardar.'
      )
      return
    }

    // Validar fechas - no permitir fechas futuras
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999) // Permitir hasta el final del día de hoy

    for (const entidad of cambiosValidos) {
      const fechaCambio = new Date(entidad.fecha)
      if (fechaCambio > hoy) {
        showNotification(
          'error',
          'Fecha inválida',
          `La fecha para ${entidad.label} no puede ser futura. Selecciona la fecha de hoy o anterior.`
        )
        return
      }
    }

    try {
      setLoading(true)

      // Crear novedades para cada cambio
      const novedades = cambiosValidos.map(entidad => ({
        contract_id: contractId,
        tipo: entidad.tipo,
        entidad_anterior: entidad.actual || null,
        entidad_nueva: entidad.nueva.trim(),
        fecha: entidad.fecha,
        created_by: user?.id
      }))

      const { error } = await supabase
        .from('novedades_entidades')
        .insert(novedades)

      if (error) {
        console.error('Error al guardar cambios de entidades:', error)
        
        // Mostrar error más específico con modal bonito
        let errorTitle = 'Error al guardar'
        let errorMessage = 'No se pudieron guardar los cambios de entidades.'
        
        if (error.message) {
          if (error.message.includes('fecha')) {
            errorTitle = 'Error de fecha'
            errorMessage = 'Hay un problema con el formato de fecha. Verifica que todas las fechas sean válidas y no sean futuras.'
          } else if (error.message.includes('foreign key')) {
            errorTitle = 'Error de referencia'
            errorMessage = 'No se pudo encontrar el contrato. Por favor, recarga la página e intenta nuevamente.'
          } else if (error.message.includes('permission')) {
            errorTitle = 'Sin permisos'
            errorMessage = 'No tienes los permisos necesarios para realizar cambios en las entidades.'
          } else if (error.message.includes('duplicate')) {
            errorTitle = 'Registro duplicado'
            errorMessage = 'Ya existe un registro similar. Verifica los datos e intenta nuevamente.'
          } else {
            errorMessage = `Error técnico: ${error.message}`
          }
        }
        
        showNotification('error', errorTitle, errorMessage)
        return
      }

      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error:', error)
      showNotification(
        'error',
        'Error inesperado',
        'Ocurrió un error inesperado al guardar. Por favor, intenta nuevamente o contacta al soporte técnico.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
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
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cambio de Entidades</h3>
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

          {/* Entidades */}
          <div className="space-y-6">
            <h4 className="text-base font-medium text-gray-900">Selecciona las entidades a cambiar:</h4>
            
            {entidades.map((entidad) => (
              <div key={entidad.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                
                {/* Header de la entidad */}
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h5 className="font-medium text-gray-900">{entidad.label}</h5>
                </div>

                {/* Grid de campos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Entidad Actual */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {entidad.label} Actual
                    </label>
                    <div className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-bold">
                      {loadingCurrentData ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          <span>Cargando...</span>
                        </div>
                      ) : (
                        entidad.actual || 'Sin entidad definida'
                      )}
                    </div>
                  </div>

                  {/* Nueva Entidad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva {entidad.label}
                    </label>
                    <EntidadAutocomplete
                      value={entidad.nueva}
                      onChange={(value) => handleNuevaEntidadChange(entidad.id, value)}
                      placeholder={`Ej: ${entidad.id === 'eps' ? 'SURA EPS' : entidad.id === 'pension' ? 'Protección' : 'Porvenir'}`}
                      tipo={entidad.tablaAuxiliar}
                      disabled={loading || loadingCurrentData}
                    />
                  </div>

                  {/* Fecha del Cambio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha del Cambio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={entidad.fecha}
                      onChange={(e) => handleFechaChange(entidad.id, e.target.value)}
                      max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
                      className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading || loadingCurrentData}
                      required={!!entidad.nueva.trim()}
                    />
                  </div>
                </div>
              </div>
            ))}
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
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de notificaciones */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.type === 'success'}
      />
    </div>
  )
}
