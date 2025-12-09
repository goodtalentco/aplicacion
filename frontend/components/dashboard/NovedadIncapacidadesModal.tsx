'use client'

import { useState, useEffect } from 'react'
import { X, HeartHandshake, Save, AlertCircle, ArrowLeft, Calendar, FileText, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePermissions } from '@/lib/usePermissions'

/**
 * Modal para gestionar novedades de incapacidades
 * Maneja incapacidades comunes, laborales y de maternidad
 */

interface NovedadIncapacidadesModalProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  onSuccess: () => void
  contractId: string
  contractName: string
}

interface IncapacidadFormData {
  tipo_incapacidad: 'comun' | 'laboral' | 'maternidad'
  fecha_inicio: string
  fecha_fin: string
  dias: number | null
  entidad: string
  soporte_url: string
  observacion: string
}

const INCAPACIDAD_TYPES = [
  {
    id: 'comun' as const,
    label: 'Incapacidad Común',
    description: 'Enfermedad general o accidente no laboral',
    icon: HeartHandshake,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    entidadResponsable: 'EPS',
    placeholder: 'Ej: Sura EPS, Sanitas, Nueva EPS'
  },
  {
    id: 'laboral' as const,
    label: 'Incapacidad Laboral',
    description: 'Accidente de trabajo o enfermedad profesional',
    icon: Building2,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    entidadResponsable: 'ARL',
    placeholder: 'Ej: Sura ARL, Positiva, Colmena'
  },
  {
    id: 'maternidad' as const,
    label: 'Licencia de Maternidad/Paternidad',
    description: 'Licencia por nacimiento o adopción',
    icon: HeartHandshake,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    entidadResponsable: 'EPS',
    placeholder: 'Ej: Sura EPS, Sanitas, Nueva EPS'
  }
]

export default function NovedadIncapacidadesModal({
  isOpen,
  onClose,
  onBack,
  onSuccess,
  contractId,
  contractName
}: NovedadIncapacidadesModalProps) {
  const { user } = usePermissions()
  const [selectedType, setSelectedType] = useState<typeof INCAPACIDAD_TYPES[0] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [contractData, setContractData] = useState<{
    eps: string | null
    empresa_arl: string | null
  }>({ eps: null, empresa_arl: null })

  // Estado del formulario
  const [formData, setFormData] = useState<IncapacidadFormData>({
    tipo_incapacidad: 'comun',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    dias: null,
    entidad: '',
    soporte_url: '',
    observacion: ''
  })

  // Cargar datos del contrato y empresa cuando se abre el modal
  useEffect(() => {
    const loadContractData = async () => {
      if (!isOpen || !contractId) return

      try {
        // 1. Obtener datos del contrato
        const { data: contract } = await supabase
          .from('contracts')
          .select('radicado_eps, empresa_final_id')
          .eq('id', contractId)
          .single()

        if (contract) {
          // 2. Obtener EPS más reciente (desde novedades_entidades o contrato original)
          let epsActual = contract.radicado_eps || null

          // Buscar la novedad de EPS más reciente
          const { data: ultimaEps } = await supabase
            .from('novedades_entidades')
            .select('entidad_nueva')
            .eq('contract_id', contractId)
            .eq('tipo', 'eps')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Si hay novedad de EPS, usar esa
          if (ultimaEps) {
            epsActual = ultimaEps.entidad_nueva
          }

          // 3. Obtener ARL activa de la empresa
          const { data: empresaArl, error: arlError } = await supabase
            .from('empresa_arls')
            .select(`
              arls (
                nombre
              )
            `)
            .eq('empresa_id', contract.empresa_final_id)
            .eq('estado', 'activa')
            .single()

          console.log('ARL Query Debug:', {
            empresa_id: contract.empresa_final_id,
            empresaArl,
            arlError,
            arlNombre: (empresaArl?.arls as any)?.nombre
          })

          setContractData({
            eps: epsActual,
            empresa_arl: (empresaArl?.arls as any)?.nombre || null
          })
        }
      } catch (error) {
        console.error('Error loading contract data:', error)
        setContractData({ eps: null, empresa_arl: null })
      }
    }

    if (isOpen) {
      loadContractData()
    }
  }, [isOpen, contractId])

  // Reset cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null)
      setFormData({
        tipo_incapacidad: 'comun',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        dias: null,
        entidad: '',
        soporte_url: '',
        observacion: ''
      })
      setError('')
      setContractData({ eps: null, empresa_arl: null })
    }
  }, [isOpen])

  // Actualizar tipo cuando se selecciona y pre-cargar entidad
  useEffect(() => {
    if (selectedType) {
      let entidadPrecargada = ''
      
      // Pre-cargar entidad según el tipo de incapacidad
      if (selectedType.id === 'comun' || selectedType.id === 'maternidad') {
        // Para incapacidades EPS, usar la EPS del empleado
        entidadPrecargada = contractData.eps || ''
      } else if (selectedType.id === 'laboral') {
        // Para incapacidades laborales, usar la ARL de la empresa
        entidadPrecargada = contractData.empresa_arl || ''
      }

      setFormData(prev => ({
        ...prev,
        tipo_incapacidad: selectedType.id,
        entidad: entidadPrecargada,
        dias: null
      }))
    }
  }, [selectedType, contractData])

  const handleInputChange = (field: keyof IncapacidadFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Calcular días automáticamente
  const calculateDias = () => {
    if (!formData.fecha_inicio || !formData.fecha_fin) return 0
    const inicio = new Date(formData.fecha_inicio)
    const fin = new Date(formData.fecha_fin)
    const diffTime = fin.getTime() - inicio.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 para incluir el día de inicio
    return diffDays > 0 ? diffDays : 0
  }

  // Actualizar días cuando cambien las fechas
  useEffect(() => {
    if (formData.fecha_inicio && formData.fecha_fin) {
      const diasCalculados = calculateDias()
      setFormData(prev => ({ ...prev, dias: diasCalculados }))
    } else {
      setFormData(prev => ({ ...prev, dias: null }))
    }
  }, [formData.fecha_inicio, formData.fecha_fin])

  const validateURL = (url: string) => {
    if (!url) return true // URL es opcional
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedType) {
      setError('Debes seleccionar un tipo de incapacidad')
      return
    }

    // Validaciones
    if (!formData.fecha_inicio) {
      setError('La fecha de inicio es obligatoria')
      return
    }

    if (!formData.fecha_fin) {
      setError('La fecha de finalización es obligatoria')
      return
    }

    if (formData.fecha_fin <= formData.fecha_inicio) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio')
      return
    }

    if (!formData.entidad.trim()) {
      setError(`La ${selectedType.entidadResponsable} es obligatoria`)
      return
    }

    if (formData.soporte_url && !validateURL(formData.soporte_url)) {
      setError('La URL del soporte debe ser válida (http:// o https://)')
      return
    }

    const diasCalculados = calculateDias()
    if (diasCalculados <= 0) {
      setError('La duración debe ser mayor a 0 días')
      return
    }

    setLoading(true)

    try {
      const dataToInsert = {
        contract_id: contractId,
        tipo_incapacidad: formData.tipo_incapacidad,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        dias: diasCalculados,
        entidad: formData.entidad.trim(),
        soporte_url: formData.soporte_url.trim() || null,
        observacion: formData.observacion.trim() || null,
        created_by: user?.id
      }

      const { error: insertError } = await supabase
        .from('novedades_incapacidad')
        .insert(dataToInsert)

      if (insertError) {
        throw insertError
      }

      // Éxito
      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error saving incapacidad novedad:', error)
      setError('Error al guardar la incapacidad. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
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
                  <HeartHandshake className="h-6 w-6 text-red-600" />
                  <span>Novedad de Incapacidad</span>
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
          {!selectedType ? (
            // Selector de tipo
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selecciona el tipo de incapacidad
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {INCAPACIDAD_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type)}
                      className={`
                        p-4 lg:p-6 rounded-xl border-2 transition-all duration-200 text-left group
                        hover:scale-102 hover:shadow-lg
                        ${type.borderColor} ${type.bgColor}
                      `}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${type.bgColor} border ${type.borderColor}`}>
                          <Icon className={`h-6 w-6 ${type.color}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {type.label}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {type.description}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white border">
                              Entidad: {type.entidadResponsable}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            // Formulario específico
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo seleccionado */}
              <div className={`p-4 lg:p-6 rounded-xl ${selectedType.bgColor} ${selectedType.borderColor} border`}>
                <div className="flex items-center space-x-3">
                  <selectedType.icon className={`h-5 w-5 ${selectedType.color}`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedType.label}</h3>
                    <p className="text-sm text-gray-600">{selectedType.description}</p>
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span>Período de Incapacidad</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Finalización *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
                      min={formData.fecha_inicio}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Duración calculada */}
                {formData.fecha_inicio && formData.fecha_fin && (
                  <div className={`mt-4 p-3 rounded-lg border ${selectedType.borderColor} ${selectedType.bgColor}`}>
                    <p className={`text-sm font-medium ${selectedType.color}`}>
                      📅 Duración: <strong>{calculateDias()} días</strong>
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-600">
                      <div>
                        <span>Desde: </span>
                        <span className="font-medium">{formData.fecha_inicio}</span>
                      </div>
                      <div>
                        <span>Hasta: </span>
                        <span className="font-medium">{formData.fecha_fin}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Entidad responsable */}
              <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <span>{selectedType.entidadResponsable} Responsable</span>
                </h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la {selectedType.entidadResponsable} *
                  </label>
                  <input
                    type="text"
                    value={formData.entidad}
                    placeholder={selectedType.placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    readOnly
                    required
                  />
                  <div className="mt-2 text-xs">
                    {formData.entidad ? (
                      <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-blue-600">🔒</span>
                        <span className="text-blue-700">
                          {selectedType.id === 'laboral' 
                            ? `ARL activa de la empresa: ${formData.entidad}`
                            : `EPS actual del empleado: ${formData.entidad}`
                          }
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <span className="text-orange-600">⚠️</span>
                        <span className="text-orange-700">
                          {selectedType.id === 'laboral'
                            ? 'No se encontró ARL activa para esta empresa'
                            : 'No se encontró EPS para este empleado'
                          }
                        </span>
                      </div>
                    )}
                    <p className="text-gray-500 mt-2">
                      {selectedType.id === 'laboral'
                        ? '🔒 Campo bloqueado: Se obtiene automáticamente la ARL activa de la empresa'
                        : '🔒 Campo bloqueado: Se obtiene automáticamente la EPS más reciente del empleado'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Soporte documental */}
              <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span>Documentación</span>
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL del Soporte (Opcional)
                    </label>
                    <input
                      type="url"
                      value={formData.soporte_url}
                      onChange={(e) => handleInputChange('soporte_url', e.target.value)}
                      placeholder="https://drive.google.com/... o https://dropbox.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enlace al documento de incapacidad (certificado médico, resolución ARL, etc.)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones (Opcional)
                    </label>
                    <textarea
                      value={formData.observacion}
                      onChange={(e) => handleInputChange('observacion', e.target.value)}
                      placeholder="Información adicional sobre la incapacidad..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors order-2 sm:order-1"
                >
                  ← Cambiar Tipo
                </button>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
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
                        <span>Guardar Incapacidad</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
