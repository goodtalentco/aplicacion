'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Save, AlertCircle, ArrowLeft, Calendar, FileText, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/lib/usePermissions'
import { getDateLimits, validateDateInput } from '@/utils/dateValidation'

/**
 * Modal para gestionar terminaciones de contratos
 * Maneja diferentes tipos de terminación y valida que solo haya una por contrato
 */

interface NovedadTerminacionModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  onSuccess: () => void
  contractId: string
  contractName: string
}

interface TerminacionOption {
  value: string
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  requiresIndemnization?: boolean
}

const TERMINACION_OPTIONS: TerminacionOption[] = [
  {
    value: 'justa_causa',
    label: 'Justa Causa',
    description: 'Despido por incumplimiento grave del empleado',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    requiresIndemnization: false
  },
  {
    value: 'sin_justa_causa',
    label: 'Sin Justa Causa',
    description: 'Despido sin motivo justificado - requiere indemnización',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    requiresIndemnization: true
  },
  {
    value: 'mutuo_acuerdo',
    label: 'Mutuo Acuerdo',
    description: 'Terminación acordada entre empleador y empleado',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    requiresIndemnization: false
  },
  {
    value: 'vencimiento',
    label: 'Vencimiento',
    description: 'Fin natural del contrato a término fijo',
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    requiresIndemnization: false
  }
]

export default function NovedadTerminacionModal({
  isOpen,
  onClose,
  onBack,
  onSuccess,
  contractId,
  contractName
}: NovedadTerminacionModalProps) {
  const { user } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [error, setError] = useState<string>('')
  const [existingTerminacion, setExistingTerminacion] = useState<any>(null)

  // Estados del formulario
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0])
  const [tipoTerminacion, setTipoTerminacion] = useState<string>('')
  const [observacion, setObservacion] = useState<string>('')

  // Verificar si ya existe una terminación para este contrato
  useEffect(() => {
    const checkExistingTerminacion = async () => {
      if (!isOpen || !contractId) return

      try {
        setCheckingExisting(true)
        setError('')

        const { data: existing, error: checkError } = await supabase
          .from('novedades_terminacion')
          .select('*')
          .eq('contract_id', contractId)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = No rows found, que está bien
          throw checkError
        }

        if (existing) {
          setExistingTerminacion(existing)
        } else {
          setExistingTerminacion(null)
        }

      } catch (error) {
        console.error('Error checking existing terminacion:', error)
        setError('Error al verificar terminaciones existentes')
      } finally {
        setCheckingExisting(false)
      }
    }

    checkExistingTerminacion()
  }, [isOpen, contractId])

  // Reset cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setError('')
      setFecha(new Date().toISOString().split('T')[0])
      setTipoTerminacion('')
      setObservacion('')
      setExistingTerminacion(null)
    }
  }, [isOpen])

  const selectedOption = TERMINACION_OPTIONS.find(option => option.value === tipoTerminacion)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fecha) {
      setError('La fecha de terminación es obligatoria')
      return
    }

    if (!tipoTerminacion) {
      setError('Debe seleccionar un tipo de terminación')
      return
    }

    // Permitir fechas futuras para terminaciones programadas

    setLoading(true)

    try {
      const terminacionData = {
        contract_id: contractId,
        fecha: fecha,
        tipo_terminacion: tipoTerminacion,
        observacion: observacion.trim() || null,
        created_by: user?.id
      }

      const { error: insertError } = await supabase
        .from('novedades_terminacion')
        .insert([terminacionData])

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation
          setError('Este contrato ya tiene una terminación registrada')
        } else {
          throw insertError
        }
        return
      }

      // Éxito
      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error saving terminacion:', error)
      setError('Error al registrar la terminación. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Si ya existe una terminación, mostrar información
  if (existingTerminacion && !checkingExisting) {
    const existingOption = TERMINACION_OPTIONS.find(opt => opt.value === existingTerminacion.tipo_terminacion)
    const Icon = existingOption?.icon || AlertCircle

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-500" />
                  </button>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                    <span>Contrato Terminado</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{contractName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className={`mx-auto w-16 h-16 rounded-full ${existingOption?.bgColor} ${existingOption?.borderColor} border-2 flex items-center justify-center mb-4`}>
                <Icon className={`h-8 w-8 ${existingOption?.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contrato ya terminado
              </h3>
              <p className="text-gray-600">
                Este contrato ya tiene una terminación registrada y no se puede modificar.
              </p>
            </div>

            {/* Información de la terminación existente */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Tipo de Terminación:</span>
                <div className="mt-1 flex items-center space-x-2">
                  <Icon className={`h-4 w-4 ${existingOption?.color}`} />
                  <span className="font-medium text-gray-900">{existingOption?.label}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{existingOption?.description}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Fecha de Terminación:</span>
                <p className="text-gray-900 font-medium">
                  {new Date(existingTerminacion.fecha).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              {existingTerminacion.observacion && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Observaciones:</span>
                  <p className="text-gray-900">{existingTerminacion.observacion}</p>
                </div>
              )}

              {existingOption?.requiresIndemnization && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      Requiere Indemnización
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botón cerrar */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-500" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span>Terminación de Contrato</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">{contractName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {checkingExisting ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className="ml-3 text-gray-600">Verificando estado del contrato...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Advertencia */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800 mb-1">⚠️ Acción Irreversible</h4>
                    <p className="text-sm text-red-700">
                      Una vez registrada la terminación, <strong>no se podrá modificar ni eliminar</strong>. 
                      El contrato quedará marcado como terminado permanentemente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fecha de Terminación */}
              <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span>Fecha de Terminación</span>
                </h4>
                
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    {...getDateLimits('work')}
                    value={fecha}
                    onChange={(e) => {
                      if (validateDateInput(e.target.value, 'work')) {
                        setFecha(e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Puede ser una fecha futura para programar la terminación
                  </p>
                </div>
              </div>

              {/* Tipo de Terminación */}
              <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span>Tipo de Terminación</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TERMINACION_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isSelected = tipoTerminacion === option.value
                    
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTipoTerminacion(option.value)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? `${option.borderColor} ${option.bgColor}` 
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${option.bgColor} border ${option.borderColor}`}>
                            <Icon className={`h-5 w-5 ${option.color}`} />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-1">{option.label}</h5>
                            <p className="text-sm text-gray-600">{option.description}</p>
                            {option.requiresIndemnization && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Requiere Indemnización
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>


              {/* Observaciones */}
              <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Observaciones (Opcional)
                </h4>
                
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Detalles adicionales sobre la terminación, documentos requeridos, etc..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !fecha || !tipoTerminacion}
                  className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Terminando Contrato...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Terminar Contrato</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
