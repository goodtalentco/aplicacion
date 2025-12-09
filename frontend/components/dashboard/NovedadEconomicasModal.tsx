'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Save, AlertCircle, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/lib/usePermissions'

/**
 * Modal simple para novedades económicas
 * Una fila por tipo económico con valor actual y nuevo valor
 */

interface NovedadEconomicasModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  onSuccess: () => void
  contractId: string
  contractName: string
}

interface EconomicFieldData {
  id: string
  label: string
  baseField?: string
  tipo: 'salario' | 'auxilio_salarial' | 'auxilio_no_salarial' | 'auxilio_transporte'
  placeholder: string
  valorActual: string
  nuevoValor: string
  concepto: string
  motivo: string
  loading: boolean
  requiresConcept: boolean
}

export default function NovedadEconomicasModal({
  isOpen,
  onClose,
  onBack,
  onSuccess,
  contractId,
  contractName
}: NovedadEconomicasModalProps) {
  const { user } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  const [campos, setCampos] = useState<EconomicFieldData[]>([
    {
      id: 'salario',
      label: 'Salario Base',
      baseField: 'salario',
      tipo: 'salario',
      placeholder: '1,300,000',
      valorActual: '',
      nuevoValor: '',
      concepto: '',
      motivo: '',
      loading: false,
      requiresConcept: false
    },
    {
      id: 'auxilio_salarial',
      label: 'Auxilio Salarial',
      baseField: 'auxilio_salarial',
      tipo: 'auxilio_salarial',
      placeholder: '200,000',
      valorActual: '',
      nuevoValor: '',
      concepto: '',
      motivo: '',
      loading: false,
      requiresConcept: true
    },
    {
      id: 'auxilio_no_salarial',
      label: 'Auxilio No Salarial',
      baseField: 'auxilio_no_salarial',
      tipo: 'auxilio_no_salarial',
      placeholder: '150,000',
      valorActual: '',
      nuevoValor: '',
      concepto: '',
      motivo: '',
      loading: false,
      requiresConcept: true
    },
    {
      id: 'auxilio_transporte',
      label: 'Auxilio de Transporte',
      baseField: 'auxilio_transporte',
      tipo: 'auxilio_transporte',
      placeholder: '140,606',
      valorActual: '',
      nuevoValor: '',
      concepto: '',
      motivo: '',
      loading: false,
      requiresConcept: false
    }
  ])

  // Cargar valores actuales cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadCurrentValues()
    }
  }, [isOpen])

  const loadCurrentValues = async () => {
    // Marcar todos como loading
    setCampos(prev => prev.map(c => ({ ...c, loading: true })))

    try {
      // Obtener contrato base - usar los nombres correctos de las columnas
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('salario, auxilio_salarial, auxilio_no_salarial, auxilio_transporte')
        .eq('id', contractId)
        .single()

      if (contractError) {
        console.error('Error fetching contract:', contractError)
        throw contractError
      }

      // Obtener últimas novedades para cada tipo
      const { data: novedades, error: novedadesError } = await supabase
        .from('novedades_economicas')
        .select('tipo, valor_nuevo, created_at')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })

      if (novedadesError) {
        console.error('Error fetching novedades:', novedadesError)
      }

      // Actualizar campos con valores actuales
      setCampos(prev => prev.map(campo => {
        let valorActual = '0'

        // Buscar última novedad de este tipo
        const ultimaNovedad = novedades?.find(n => n.tipo === campo.tipo)
        if (ultimaNovedad) {
          valorActual = ultimaNovedad.valor_nuevo.toString()
        } else if (campo.baseField && contract && (contract as any)[campo.baseField] !== null) {
          // Si no hay novedad, usar valor del contrato base
          valorActual = (contract as any)[campo.baseField].toString()
        }

        return {
          ...campo,
          valorActual,
          loading: false
        }
      }))

    } catch (error) {
      console.error('Error loading current values:', error)
      setError('Error al cargar los valores actuales')
      setCampos(prev => prev.map(c => ({ ...c, loading: false })))
    }
  }

  // Formatear número con separadores de miles
  const formatNumberWithThousands = (value: string) => {
    const number = value.replace(/\D/g, '') // Solo números
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handleNuevoValorChange = (campoId: string, value: string) => {
    const formattedValue = formatNumberWithThousands(value)
    setCampos(prev => prev.map(c => 
      c.id === campoId ? { ...c, nuevoValor: formattedValue } : c
    ))
  }

  const handleConceptoChange = (campoId: string, value: string) => {
    setCampos(prev => prev.map(c => 
      c.id === campoId ? { ...c, concepto: value } : c
    ))
  }

  const handleMotivoChange = (campoId: string, value: string) => {
    setCampos(prev => prev.map(c => 
      c.id === campoId ? { ...c, motivo: value } : c
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Filtrar solo campos que tienen nuevo valor
    const cambios = campos.filter(c => c.nuevoValor.trim() !== '')

    if (cambios.length === 0) {
      setError('Debes ingresar al menos un valor nuevo')
      return
    }

    // Validar que auxilios que requieren concepto lo tengan
    for (const cambio of cambios) {
      if (cambio.requiresConcept && !cambio.concepto.trim()) {
        setError(`El concepto es obligatorio para ${cambio.label}`)
        return
      }
      
      const valor = parseFloat(cambio.nuevoValor.replace(/\./g, ''))
      if (isNaN(valor) || valor < 0) {
        setError(`El valor de ${cambio.label} debe ser un número válido mayor o igual a 0`)
        return
      }
    }

    setLoading(true)

    try {
      // Preparar datos para insertar
      const novedadesData = cambios.map(cambio => ({
        contract_id: contractId,
        tipo: cambio.tipo,
        concepto: cambio.requiresConcept ? cambio.concepto.trim() : null,
        valor_anterior: parseFloat(cambio.valorActual) || null,
        valor_nuevo: parseFloat(cambio.nuevoValor.replace(/\./g, '')),
        motivo: cambio.motivo.trim() || null,
        fecha: new Date().toISOString().split('T')[0],
        created_by: user?.id
      }))

      // Insertar todas las novedades
      const { error: insertError } = await supabase
        .from('novedades_economicas')
        .insert(novedadesData)

      if (insertError) {
        throw insertError
      }

      // Éxito
      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error saving economic changes:', error)
      setError('Error al guardar los cambios. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Formatear moneda
  const formatCurrency = (amount: string | number) => {
    if (!amount) return '$0'
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/\./g, '')) : amount
    if (isNaN(num)) return '$0'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  // Calcular resumen de remuneración
  const calculateSummary = () => {
    const salarioActual = parseFloat(campos[0].valorActual) || 0
    const auxilioSalarialActual = parseFloat(campos[1].valorActual) || 0
    const auxilioNoSalarialActual = parseFloat(campos[2].valorActual) || 0
    // No incluir auxilio de transporte en el total

    const salarioNuevo = campos[0].nuevoValor ? parseFloat(campos[0].nuevoValor.replace(/\./g, '')) : salarioActual
    const auxilioSalarialNuevo = campos[1].nuevoValor ? parseFloat(campos[1].nuevoValor.replace(/\./g, '')) : auxilioSalarialActual
    const auxilioNoSalarialNuevo = campos[2].nuevoValor ? parseFloat(campos[2].nuevoValor.replace(/\./g, '')) : auxilioNoSalarialActual

    const totalActual = salarioActual + auxilioSalarialActual + auxilioNoSalarialActual
    const totalNuevo = salarioNuevo + auxilioSalarialNuevo + auxilioNoSalarialNuevo

    const diferencia = totalNuevo - totalActual
    const porcentaje = totalActual > 0 ? (diferencia / totalActual) * 100 : 0

    return {
      totalActual,
      totalNuevo,
      diferencia,
      porcentaje,
      hasChanges: campos.some(c => c.nuevoValor.trim() !== '')
    }
  }

  const summary = calculateSummary()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
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
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <span>Novedad Económica</span>
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
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cambios Económicos
            </h3>
            <p className="text-gray-600">
              Modifica los valores económicos que necesites cambiar. Solo se guardarán los campos que tengan un nuevo valor.
            </p>
          </div>

          {/* Resumen de Remuneración */}
          {summary.hasChanges && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Resumen de Remuneración (sin auxilio transporte)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Remuneración Actual</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(summary.totalActual)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Nueva Remuneración</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(summary.totalNuevo)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Diferencia</p>
                  <div className="flex items-center space-x-2">
                    {summary.diferencia > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : summary.diferencia < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                    <div>
                      <p className={`text-lg font-semibold ${
                        summary.diferencia > 0 ? 'text-green-600' : 
                        summary.diferencia < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {summary.diferencia > 0 ? '+' : ''}{formatCurrency(summary.diferencia)}
                      </p>
                      <p className={`text-xs ${
                        summary.diferencia > 0 ? 'text-green-600' : 
                        summary.diferencia < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {summary.diferencia > 0 ? '+' : ''}{summary.porcentaje.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Vista Desktop: Tabla */}
            <div className="hidden lg:block overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nuevo Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campos.map((campo) => (
                    <tr key={campo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {campo.label}
                            </div>
                            {campo.requiresConcept && (
                              <div className="text-xs text-orange-600">
                                Requiere concepto
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {campo.loading ? (
                            <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                          ) : (
                            formatCurrency(campo.valorActual)
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={campo.nuevoValor}
                          onChange={(e) => handleNuevoValorChange(campo.id, e.target.value)}
                          placeholder={campo.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={campo.loading}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {campo.requiresConcept ? (
                          <input
                            type="text"
                            value={campo.concepto}
                            onChange={(e) => handleConceptoChange(campo.id, e.target.value)}
                            placeholder="Ej: Alimentación"
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              campo.nuevoValor && !campo.concepto ? 'border-red-300' : 'border-gray-300'
                            }`}
                            disabled={campo.loading}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No aplica</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={campo.motivo}
                          onChange={(e) => handleMotivoChange(campo.id, e.target.value)}
                          placeholder="Razón del cambio..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={campo.loading}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile/Tablet: Cards */}
            <div className="lg:hidden space-y-4">
              {campos.map((campo) => (
                <div key={campo.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                  {/* Header del campo */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{campo.label}</h4>
                      {campo.requiresConcept && (
                        <p className="text-xs text-orange-600 mt-1">Requiere concepto</p>
                      )}
                    </div>
                  </div>

                  {/* Valor actual */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Valor Actual
                    </label>
                    <div className="text-sm font-medium text-gray-900">
                      {campo.loading ? (
                        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                      ) : (
                        formatCurrency(campo.valorActual)
                      )}
                    </div>
                  </div>

                  {/* Nuevo valor */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Nuevo Valor
                    </label>
                    <input
                      type="text"
                      value={campo.nuevoValor}
                      onChange={(e) => handleNuevoValorChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={campo.loading}
                    />
                  </div>

                  {/* Concepto */}
                  {campo.requiresConcept && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Concepto
                      </label>
                      <input
                        type="text"
                        value={campo.concepto}
                        onChange={(e) => handleConceptoChange(campo.id, e.target.value)}
                        placeholder="Ej: Alimentación"
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          campo.nuevoValor && !campo.concepto ? 'border-red-300' : 'border-gray-300'
                        }`}
                        disabled={campo.loading}
                      />
                    </div>
                  )}

                  {/* Motivo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Motivo
                    </label>
                    <input
                      type="text"
                      value={campo.motivo}
                      onChange={(e) => handleMotivoChange(campo.id, e.target.value)}
                      placeholder="Razón del cambio..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={campo.loading}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white font-semibold rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all duration-200 shadow-lg hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
      </div>
    </div>
  )
}