'use client'

import { useState, useEffect } from 'react'
import { X, User, Save, AlertCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/lib/usePermissions'

/**
 * Modal simple para novedades de datos personales
 * Una fila por campo con valor actual y nuevo valor
 */

interface NovedadDatosPersonalesModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  onSuccess: () => void
  contractId: string
  contractName: string
}

interface CampoData {
  id: string
  label: string
  baseField?: string
  type: 'text' | 'email' | 'tel'
  placeholder: string
  valorActual: string
  nuevoValor: string
  observacion: string
  loading: boolean
}

export default function NovedadDatosPersonalesModal({
  isOpen,
  onClose,
  onBack,
  onSuccess,
  contractId,
  contractName
}: NovedadDatosPersonalesModalProps) {
  const { user } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  const [campos, setCampos] = useState<CampoData[]>([
    {
      id: 'primer_nombre',
      label: 'Primer Nombre',
      baseField: 'primer_nombre',
      type: 'text',
      placeholder: 'Ej: Juan',
      valorActual: '',
      nuevoValor: '',
      observacion: '',
      loading: false
    },
    {
      id: 'segundo_nombre',
      label: 'Segundo Nombre',
      baseField: 'segundo_nombre',
      type: 'text',
      placeholder: 'Ej: Carlos',
      valorActual: '',
      nuevoValor: '',
      observacion: '',
      loading: false
    },
    {
      id: 'primer_apellido',
      label: 'Primer Apellido',
      baseField: 'primer_apellido',
      type: 'text',
      placeholder: 'Ej: Pérez',
      valorActual: '',
      nuevoValor: '',
      observacion: '',
      loading: false
    },
    {
      id: 'segundo_apellido',
      label: 'Segundo Apellido',
      baseField: 'segundo_apellido',
      type: 'text',
      placeholder: 'Ej: González',
      valorActual: '',
      nuevoValor: '',
      observacion: '',
      loading: false
    },
    {
      id: 'celular',
      label: 'Celular',
      baseField: 'celular',
      type: 'tel',
      placeholder: 'Ej: +57 300 123 4567',
      valorActual: '',
      nuevoValor: '',
      observacion: '',
      loading: false
    },
    {
      id: 'email',
      label: 'Email',
      baseField: 'email',
      type: 'email',
      placeholder: 'Ej: juan.perez@email.com',
      valorActual: '',
      nuevoValor: '',
      observacion: '',
      loading: false
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
      // Obtener contrato base
      const { data: contract } = await supabase
        .from('contracts')
        .select('primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, celular, email')
        .eq('id', contractId)
        .single()

      // Obtener últimas novedades para cada campo
      const { data: novedades } = await supabase
        .from('novedades_datos_personales')
        .select('campo, valor_nuevo, created_at')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })

      // Actualizar campos con valores actuales
      setCampos(prev => prev.map(campo => {
        let valorActual = ''

        // Buscar última novedad de este campo
        const ultimaNovedad = novedades?.find(n => n.campo === campo.id)
        if (ultimaNovedad) {
          valorActual = ultimaNovedad.valor_nuevo
        } else if (campo.baseField && contract && (contract as any)[campo.baseField]) {
          // Si no hay novedad, usar valor del contrato base
          valorActual = (contract as any)[campo.baseField]
        }

        return {
          ...campo,
          valorActual,
          loading: false
        }
      }))

    } catch (error) {
      console.error('Error loading current values:', error)
      setCampos(prev => prev.map(c => ({ ...c, loading: false })))
    }
  }

  const handleNuevoValorChange = (campoId: string, value: string) => {
    setCampos(prev => prev.map(c => 
      c.id === campoId ? { ...c, nuevoValor: value } : c
    ))
  }

  const handleObservacionChange = (campoId: string, value: string) => {
    setCampos(prev => prev.map(c => 
      c.id === campoId ? { ...c, observacion: value } : c
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Filtrar solo campos con cambios válidos
    const cambiosValidos = campos.filter(campo => 
      campo.nuevoValor.trim() && 
      campo.nuevoValor.trim() !== campo.valorActual.trim()
    )

    if (cambiosValidos.length === 0) {
      setError('Debes realizar al menos un cambio válido')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Crear todas las novedades
      const novedades = cambiosValidos.map(campo => ({
        contract_id: contractId,
        campo: campo.id,
        valor_anterior: campo.valorActual || null,
        valor_nuevo: campo.nuevoValor.trim(),
        fecha: new Date().toISOString().split('T')[0], // Fecha de hoy (cuando se registra)
        observacion: campo.observacion.trim() || null,
        created_by: user?.id
      }))

      const { error: insertError } = await supabase
        .from('novedades_datos_personales')
        .insert(novedades)

      if (insertError) throw insertError

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating novedades:', error)
      setError(error.message || 'Error al crear las novedades')
    } finally {
      setLoading(false)
    }
  }

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      setCampos(prev => prev.map(c => ({ ...c, nuevoValor: '', valorActual: '', observacion: '' })))
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  onClick={onBack}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Volver al selector de novedades"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
              )}
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Datos Personales</h2>
                <p className="text-sm text-gray-600">
                  {contractName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            
            {/* Tabla de campos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Modifica los campos que necesites
              </h3>
              
              <div className="space-y-4">
                {campos.map((campo) => (
                  <div key={campo.id} className="border border-gray-200 rounded-lg p-4">
                    
                    {/* Header del campo */}
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        {campo.label}
                      </label>
                    </div>
                    
                    {/* Inputs en fila */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Valor Actual */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Valor Actual</label>
                        <input
                          type="text"
                          value={campo.loading ? 'Cargando...' : campo.valorActual || 'Sin valor'}
                          disabled
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-bold"
                        />
                      </div>
                      
                      {/* Nuevo Valor */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nuevo Valor</label>
                        <input
                          type={campo.type}
                          value={campo.nuevoValor}
                          onChange={(e) => handleNuevoValorChange(campo.id, e.target.value)}
                          placeholder={campo.placeholder}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-bold"
                        />
                      </div>
                      
                      {/* Observación */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Observación</label>
                        <input
                          type="text"
                          value={campo.observacion}
                          onChange={(e) => handleObservacionChange(campo.id, e.target.value)}
                          placeholder="Motivo del cambio..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* Error */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Botones */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}