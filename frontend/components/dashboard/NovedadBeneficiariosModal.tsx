'use client'

import { useState, useEffect } from 'react'
import { X, Users, Save, AlertCircle, ArrowLeft, Calendar, Baby, Heart, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/lib/usePermissions'

/**
 * Modal para gestionar novedades de beneficiarios
 * Diseño mejorado con comparación visual actual vs nuevo
 */

interface NovedadBeneficiariosModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  onSuccess: () => void
  contractId: string
  contractName: string
}

interface BeneficiarioField {
  id: string
  tipo_beneficiario: 'hijo' | 'madre' | 'padre' | 'conyuge'
  label: string
  icon: any
  color: string
  bgColor: string
  valorActual: number | null
  valorNuevo: number | boolean
  isBoolean: boolean
  maxValue?: number
  loading: boolean
  description: string
}

const BENEFICIARIOS_CONFIG = [
  {
    id: 'hijo',
    tipo_beneficiario: 'hijo' as const,
    label: 'Número de Hijos',
    icon: Baby,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    isBoolean: false,
    maxValue: 20,
    description: 'Hijos dependientes económicamente'
  },
  {
    id: 'madre',
    tipo_beneficiario: 'madre' as const,
    label: 'Madre a Cargo',
    icon: Heart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    isBoolean: true,
    description: 'Madre como beneficiaria'
  },
  {
    id: 'padre',
    tipo_beneficiario: 'padre' as const,
    label: 'Padre a Cargo',
    icon: UserCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    isBoolean: true,
    description: 'Padre como beneficiario'
  },
  {
    id: 'conyuge',
    tipo_beneficiario: 'conyuge' as const,
    label: 'Cónyuge/Compañero(a)',
    icon: Heart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    isBoolean: true,
    description: 'Cónyuge o compañero(a) permanente'
  }
]

export default function NovedadBeneficiariosModal({
  isOpen,
  onClose,
  onBack,
  onSuccess,
  contractId,
  contractName
}: NovedadBeneficiariosModalProps) {
  const { user } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0])
  const [observacion, setObservacion] = useState<string>('')

  // Estado de beneficiarios
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioField[]>(
    BENEFICIARIOS_CONFIG.map(config => ({
      ...config,
      valorActual: null,
      valorNuevo: config.isBoolean ? false : 0,
      loading: true
    }))
  )

  // Cargar valores actuales cuando se abre el modal
  useEffect(() => {
    const loadCurrentValues = async () => {
      if (!isOpen || !contractId) return

      try {
        // 1. Obtener últimas novedades de beneficiarios para cada tipo
        const { data: novedades } = await supabase
          .from('novedades_beneficiarios')
          .select('tipo_beneficiario, valor_nuevo, created_at')
          .eq('contract_id', contractId)
          .order('created_at', { ascending: false })

        // 2. Obtener valores actuales del contrato original
        const { data: contract } = await supabase
          .from('contracts')
          .select('beneficiario_hijo, beneficiario_madre, beneficiario_padre, beneficiario_conyuge')
          .eq('id', contractId)
          .single()

        // 3. Procesar novedades para obtener el último valor de cada tipo
        const ultimosValoresMap = new Map<string, number>()
        if (novedades) {
          novedades.forEach(novedad => {
            if (!ultimosValoresMap.has(novedad.tipo_beneficiario)) {
              ultimosValoresMap.set(novedad.tipo_beneficiario, novedad.valor_nuevo)
            }
          })
        }

        // 4. Actualizar estado con valores actuales
        setBeneficiarios(prev => prev.map(beneficiario => {
          let valorActual = ultimosValoresMap.get(beneficiario.tipo_beneficiario)
          
          // Si no hay novedad, usar el valor del contrato
          if (valorActual === undefined) {
            if (beneficiario.tipo_beneficiario === 'hijo') {
              valorActual = contract?.beneficiario_hijo || 0
            } else if (beneficiario.tipo_beneficiario === 'madre') {
              valorActual = contract?.beneficiario_madre || 0
            } else if (beneficiario.tipo_beneficiario === 'padre') {
              valorActual = contract?.beneficiario_padre || 0
            } else if (beneficiario.tipo_beneficiario === 'conyuge') {
              valorActual = contract?.beneficiario_conyuge || 0
            } else {
              valorActual = 0
            }
          }

          // Convertir a boolean para campos boolean
          const valorNuevoInicial = beneficiario.isBoolean 
            ? (valorActual ?? 0) > 0 
            : (valorActual ?? 0)

          return {
            ...beneficiario,
            valorActual: valorActual ?? null,
            valorNuevo: valorNuevoInicial ?? (beneficiario.isBoolean ? false : 0),
            loading: false
          }
        }))

      } catch (error) {
        console.error('Error loading current beneficiarios:', error)
        setBeneficiarios(prev => prev.map(beneficiario => ({
          ...beneficiario,
          loading: false
        })))
      }
    }

    loadCurrentValues()
  }, [isOpen, contractId])

  // Reset cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setError('')
      setFecha(new Date().toISOString().split('T')[0])
      setObservacion('')
      setBeneficiarios(prev => prev.map(b => ({ 
        ...b, 
        loading: true, 
        valorActual: null, 
        valorNuevo: b.isBoolean ? false : 0 
      })))
    }
  }, [isOpen])

  const handleBeneficiarioChange = (id: string, nuevoValor: number | boolean) => {
    setBeneficiarios(prev => prev.map(beneficiario => 
      beneficiario.id === id 
        ? { ...beneficiario, valorNuevo: nuevoValor }
        : beneficiario
    ))
  }

  const hasChanges = () => {
    return beneficiarios.some(b => {
      const actual = b.isBoolean ? (b.valorActual || 0) > 0 : (b.valorActual || 0)
      return b.valorNuevo !== actual
    })
  }

  const getChangedBeneficiarios = () => {
    return beneficiarios.filter(b => {
      const actual = b.isBoolean ? (b.valorActual || 0) > 0 : (b.valorActual || 0)
      return b.valorNuevo !== actual
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fecha) {
      setError('La fecha es obligatoria')
      return
    }

    const cambios = getChangedBeneficiarios()
    if (cambios.length === 0) {
      setError('Debes realizar al menos un cambio en los beneficiarios')
      return
    }

    // Validar que los valores estén en rangos válidos para números
    for (const cambio of cambios) {
      if (!cambio.isBoolean) {
        const valorNumerico = cambio.valorNuevo as number
        if (valorNumerico < 0) {
          setError(`El número de ${cambio.label.toLowerCase()} no puede ser negativo`)
          return
        }
        if (cambio.maxValue && valorNumerico > cambio.maxValue) {
          setError(`El número de ${cambio.label.toLowerCase()} no puede ser mayor a ${cambio.maxValue}`)
          return
        }
      }
    }

    setLoading(true)

    try {
      // Insertar una novedad por cada cambio
      const novedadesToInsert = cambios.map(cambio => {
        const valorNuevoNumerico = cambio.isBoolean 
          ? (cambio.valorNuevo ? 1 : 0)
          : (cambio.valorNuevo as number)
        
        return {
          contract_id: contractId,
          tipo_beneficiario: cambio.tipo_beneficiario,
          valor_anterior: cambio.valorActual,
          valor_nuevo: valorNuevoNumerico,
          fecha: fecha,
          observacion: observacion.trim() || null,
          created_by: user?.id
        }
      })

      const { error: insertError } = await supabase
        .from('novedades_beneficiarios')
        .insert(novedadesToInsert)

      if (insertError) {
        throw insertError
      }

      // Éxito
      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error saving beneficiarios novedades:', error)
      setError('Error al guardar los cambios de beneficiarios. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
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
                  <Users className="h-6 w-6 text-blue-600" />
                  <span>Novedad de Beneficiarios</span>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fecha */}
            <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span>Fecha del Cambio</span>
              </h4>
              
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Tabla de Beneficiarios - Desktop */}
            <div className="hidden md:block bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-600" />
                <span>Beneficiarios</span>
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Campo</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Valor Actual</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Nuevo Valor</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {beneficiarios.map((beneficiario) => {
                      const Icon = beneficiario.icon
                      const valorActualDisplay = beneficiario.isBoolean 
                        ? ((beneficiario.valorActual || 0) > 0 ? 'Sí' : 'No')
                        : (beneficiario.valorActual || 0)
                      
                      const valorNuevoDisplay = beneficiario.isBoolean 
                        ? (beneficiario.valorNuevo ? 'Sí' : 'No')
                        : beneficiario.valorNuevo
                      
                      const actualValue = beneficiario.isBoolean 
                        ? (beneficiario.valorActual || 0) > 0 
                        : (beneficiario.valorActual || 0)
                      
                      const hasChanged = beneficiario.valorNuevo !== actualValue
                      
                      return (
                        <tr key={beneficiario.id} className={`border-b border-gray-100 ${hasChanged ? 'bg-blue-50' : ''}`}>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${beneficiario.bgColor} border border-gray-200`}>
                                <Icon className={`h-4 w-4 ${beneficiario.color}`} />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{beneficiario.label}</div>
                                <div className="text-xs text-gray-500">{beneficiario.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {beneficiario.loading ? (
                              <div className="flex justify-center">
                                <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                {valorActualDisplay}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {beneficiario.isBoolean ? (
                              <div className="flex justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleBeneficiarioChange(beneficiario.id, false)}
                                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    !beneficiario.valorNuevo 
                                      ? 'bg-red-100 text-red-800 border border-red-200' 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  No
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBeneficiarioChange(beneficiario.id, true)}
                                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    beneficiario.valorNuevo 
                                      ? 'bg-green-100 text-green-800 border border-green-200' 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  Sí
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <input
                                  type="number"
                                  value={beneficiario.valorNuevo as number}
                                  onChange={(e) => {
                                    const value = Math.max(0, Math.min(beneficiario.maxValue || 20, parseInt(e.target.value) || 0))
                                    handleBeneficiarioChange(beneficiario.id, value)
                                  }}
                                  min={0}
                                  max={beneficiario.maxValue || 20}
                                  className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {hasChanged ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {beneficiario.isBoolean ? (
                                  beneficiario.valorNuevo !== actualValue ? 'Cambiado' : 'Sin cambios'
                                ) : (
                                  (beneficiario.valorNuevo as number) > (beneficiario.valorActual || 0) ? '↗️ Aumentó' : '↘️ Disminuyó'
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Sin cambios
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards para Mobile */}
            <div className="md:hidden space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-600" />
                <span>Beneficiarios</span>
              </h4>
              
              {beneficiarios.map((beneficiario) => {
                const Icon = beneficiario.icon
                const valorActualDisplay = beneficiario.isBoolean 
                  ? ((beneficiario.valorActual || 0) > 0 ? 'Sí' : 'No')
                  : (beneficiario.valorActual || 0)
                
                const actualValue = beneficiario.isBoolean 
                  ? (beneficiario.valorActual || 0) > 0 
                  : (beneficiario.valorActual || 0)
                
                const hasChanged = beneficiario.valorNuevo !== actualValue
                
                return (
                  <div key={beneficiario.id} className={`p-4 rounded-xl border ${hasChanged ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-2 rounded-lg ${beneficiario.bgColor} border border-gray-200`}>
                        <Icon className={`h-4 w-4 ${beneficiario.color}`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{beneficiario.label}</div>
                        <div className="text-xs text-gray-500">{beneficiario.description}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Actual:</span>
                        {beneficiario.loading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                        ) : (
                          <span className="px-2 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800">
                            {valorActualDisplay}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Nuevo:</span>
                        {beneficiario.isBoolean ? (
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleBeneficiarioChange(beneficiario.id, false)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                !beneficiario.valorNuevo 
                                  ? 'bg-red-100 text-red-800 border border-red-200' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              No
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBeneficiarioChange(beneficiario.id, true)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                beneficiario.valorNuevo 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Sí
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <input
                              type="number"
                              value={beneficiario.valorNuevo as number}
                              onChange={(e) => {
                                const value = Math.max(0, Math.min(beneficiario.maxValue || 20, parseInt(e.target.value) || 0))
                                handleBeneficiarioChange(beneficiario.id, value)
                              }}
                              min={0}
                              max={beneficiario.maxValue || 20}
                              className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                      
                      {hasChanged && (
                        <div className="text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {beneficiario.isBoolean ? 'Cambiado' : 
                              (beneficiario.valorNuevo as number) > (beneficiario.valorActual || 0) ? '↗️ Aumentó' : '↘️ Disminuyó'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Observaciones */}
            <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">
                Observaciones (Opcional)
              </h4>
              
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Información adicional sobre los cambios en beneficiarios..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Resumen de cambios */}
            {hasChanges() && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  📋 Resumen de Cambios
                </h4>
                <div className="space-y-1">
                  {getChangedBeneficiarios().map(cambio => {
                    const valorActualDisplay = cambio.isBoolean 
                      ? ((cambio.valorActual || 0) > 0 ? 'Sí' : 'No')
                      : (cambio.valorActual || 0)
                    
                    const valorNuevoDisplay = cambio.isBoolean 
                      ? (cambio.valorNuevo ? 'Sí' : 'No')
                      : cambio.valorNuevo
                    
                    return (
                      <div key={cambio.id} className="text-sm text-blue-800">
                        <strong>{cambio.label}:</strong> {valorActualDisplay} → {valorNuevoDisplay}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
                disabled={loading || !hasChanges()}
                className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white font-semibold rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all duration-200 shadow-lg hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>Guardar Cambios ({getChangedBeneficiarios().length})</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
