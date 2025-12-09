/**
 * Modal especializado para crear y editar parámetros anuales
 * Maneja diferentes tipos de datos: numérico, texto, booleano, JSON
 */

'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface ParametroAnual {
  id: string
  tipo_parametro: string
  año: number
  valor_numerico: number | null
  valor_texto: string | null
  tipo_dato: 'numerico' | 'texto' | 'booleano' | 'json'
  unidad: string | null
  descripcion: string | null
  fecha_vigencia_inicio: string | null
  fecha_vigencia_fin: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  record?: ParametroAnual | null
  defaultYear?: number
  onSubmit: (data: any) => Promise<void>
}

export default function ParametroAnualModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  record,
  defaultYear,
  onSubmit
}: Props) {
  const [formData, setFormData] = useState({
    tipo_parametro: '',
    año: defaultYear || new Date().getFullYear(),
    tipo_dato: 'numerico' as 'numerico' | 'texto' | 'booleano' | 'json',
    valor_numerico: '',
    valor_texto: '',
    unidad: '',
    descripcion: '',
    fecha_vigencia_inicio: '',
    fecha_vigencia_fin: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Llenar formulario cuando se edita
  useEffect(() => {
    if (record) {
      setFormData({
        tipo_parametro: record.tipo_parametro,
        año: record.año,
        tipo_dato: record.tipo_dato,
        valor_numerico: record.valor_numerico?.toString() || '',
        valor_texto: record.valor_texto || '',
        unidad: record.unidad || '',
        descripcion: record.descripcion || '',
        fecha_vigencia_inicio: record.fecha_vigencia_inicio || '',
        fecha_vigencia_fin: record.fecha_vigencia_fin || ''
      })
    } else {
      setFormData({
        tipo_parametro: '',
        año: defaultYear || new Date().getFullYear(),
        tipo_dato: 'numerico',
        valor_numerico: '',
        valor_texto: '',
        unidad: '',
        descripcion: '',
        fecha_vigencia_inicio: '',
        fecha_vigencia_fin: ''
      })
    }
    setErrors({})
  }, [record, defaultYear, isOpen])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Limpiar valores cuando cambia el tipo de dato
    if (field === 'tipo_dato') {
      setFormData(prev => ({
        ...prev,
        valor_numerico: '',
        valor_texto: '',
        unidad: value === 'numerico' ? prev.unidad : ''
      }))
    }
  }

  // Formatear número para mostrar con separadores de miles
  const formatNumberDisplay = (value: string) => {
    if (!value) return ''
    // Remover todo excepto números y punto decimal
    const cleanValue = value.replace(/[^\d.]/g, '')
    // Dividir en parte entera y decimal
    const parts = cleanValue.split('.')
    // Formatear parte entera con puntos como separadores de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return parts.join(',') // Usar coma para decimales (formato colombiano)
  }

  // Obtener valor numérico limpio para enviar al servidor
  const getCleanNumericValue = (formattedValue: string) => {
    return formattedValue.replace(/\./g, '').replace(/,/g, '.')
  }

  // Manejar cambio en valor numérico con formateo
  const handleNumericChange = (value: string) => {
    const cleanValue = getCleanNumericValue(value)
    setFormData(prev => ({ ...prev, valor_numerico: cleanValue }))
    if (errors.valor_numerico) {
      setErrors(prev => ({ ...prev, valor_numerico: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.tipo_parametro.trim()) {
      newErrors.tipo_parametro = 'El tipo de parámetro es obligatorio'
    }

    if (!formData.año || formData.año < 2020 || formData.año > 2050) {
      newErrors.año = 'El año debe estar entre 2020 y 2050'
    }

    // Validar valor según tipo de dato
    if (formData.tipo_dato === 'numerico') {
      if (!formData.valor_numerico.trim()) {
        newErrors.valor_numerico = 'El valor numérico es obligatorio'
      } else {
        const cleanValue = getCleanNumericValue(formData.valor_numerico)
        if (isNaN(Number(cleanValue))) {
          newErrors.valor_numerico = 'Debe ser un número válido'
        }
      }
    } else {
      if (!formData.valor_texto.trim()) {
        newErrors.valor_texto = 'El valor de texto es obligatorio'
      } else if (formData.tipo_dato === 'json') {
        try {
          JSON.parse(formData.valor_texto)
        } catch {
          newErrors.valor_texto = 'Debe ser un JSON válido'
        }
      } else if (formData.tipo_dato === 'booleano') {
        if (!['true', 'false'].includes(formData.valor_texto.toLowerCase())) {
          newErrors.valor_texto = 'Debe ser "true" o "false"'
        }
      }
    }

    // Validar fechas de vigencia
    if (formData.fecha_vigencia_inicio && formData.fecha_vigencia_fin) {
      if (new Date(formData.fecha_vigencia_inicio) > new Date(formData.fecha_vigencia_fin)) {
        newErrors.fecha_vigencia_fin = 'La fecha de fin debe ser posterior al inicio'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      // Preparar datos para envío con valor numérico limpio
      const submitData = {
        ...formData,
        valor_numerico: formData.tipo_dato === 'numerico' 
          ? getCleanNumericValue(formData.valor_numerico)
          : formData.valor_numerico
      }
      await onSubmit(submitData)
      onSuccess()
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al guardar el parámetro' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  // Tipos de parámetros disponibles
  const tiposParametrosComunes = [
    'salario_minimo',
    'auxilio_transporte',
    'salario_integral',
    'uvt'
  ]

  // Unidades comunes
  const unidadesComunes = ['pesos', 'porcentaje', 'dias', 'años', 'meses']

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-[#004C4C]">{title}</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Parámetro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Parámetro *
            </label>
            <input
              type="text"
              list="tipos-parametros"
              value={formData.tipo_parametro}
              onChange={(e) => handleChange('tipo_parametro', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
                errors.tipo_parametro ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: salario_minimo, auxilio_transporte..."
              disabled={loading}
            />
            <datalist id="tipos-parametros">
              {tiposParametrosComunes.map(tipo => (
                <option key={tipo} value={tipo} />
              ))}
            </datalist>
            {errors.tipo_parametro && (
              <p className="text-red-500 text-sm mt-1">{errors.tipo_parametro}</p>
            )}
          </div>

          {/* Año y Tipo de Dato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año *
              </label>
              <input
                type="number"
                min="2020"
                max="2050"
                value={formData.año}
                onChange={(e) => handleChange('año', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
                  errors.año ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.año && (
                <p className="text-red-500 text-sm mt-1">{errors.año}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Dato *
              </label>
              <select
                value={formData.tipo_dato}
                onChange={(e) => handleChange('tipo_dato', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
                disabled={loading}
              >
                <option value="numerico">Numérico</option>
                <option value="texto">Texto</option>
                <option value="booleano">Booleano</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          {/* Valor según tipo de dato */}
          {formData.tipo_dato === 'numerico' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Numérico *
                </label>
                <input
                  type="text"
                  value={formatNumberDisplay(formData.valor_numerico)}
                  onChange={(e) => handleNumericChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
                    errors.valor_numerico ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 1.300.000, 4,5, 162.000"
                  disabled={loading}
                />
                {errors.valor_numerico && (
                  <p className="text-red-500 text-sm mt-1">{errors.valor_numerico}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Use punto (.) para separar miles y coma (,) para decimales
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad
                </label>
                <input
                  type="text"
                  list="unidades"
                  value={formData.unidad}
                  onChange={(e) => handleChange('unidad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
                  placeholder="Ej: pesos, porcentaje, dias"
                  disabled={loading}
                />
                <datalist id="unidades">
                  {unidadesComunes.map(unidad => (
                    <option key={unidad} value={unidad} />
                  ))}
                </datalist>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor {formData.tipo_dato === 'json' ? 'JSON' : 
                      formData.tipo_dato === 'booleano' ? '(true/false)' : 'de Texto'} *
              </label>
              {formData.tipo_dato === 'json' ? (
                <textarea
                  rows={4}
                  value={formData.valor_texto}
                  onChange={(e) => handleChange('valor_texto', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent font-mono text-sm ${
                    errors.valor_texto ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder='{"0-1160000": 0, "1160001-1500000": 19}'
                  disabled={loading}
                />
              ) : formData.tipo_dato === 'booleano' ? (
                <select
                  value={formData.valor_texto}
                  onChange={(e) => handleChange('valor_texto', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
                    errors.valor_texto ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.valor_texto}
                  onChange={(e) => handleChange('valor_texto', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
                    errors.valor_texto ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ingrese el valor de texto"
                  disabled={loading}
                />
              )}
              {errors.valor_texto && (
                <p className="text-red-500 text-sm mt-1">{errors.valor_texto}</p>
              )}
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              rows={2}
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
              placeholder="Descripción opcional del parámetro"
              disabled={loading}
            />
          </div>

          {/* Fechas de Vigencia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio Vigencia
              </label>
              <input
                type="date"
                value={formData.fecha_vigencia_inicio}
                onChange={(e) => handleChange('fecha_vigencia_inicio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin Vigencia
              </label>
              <input
                type="date"
                value={formData.fecha_vigencia_fin}
                onChange={(e) => handleChange('fecha_vigencia_fin', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent ${
                  errors.fecha_vigencia_fin ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.fecha_vigencia_fin && (
                <p className="text-red-500 text-sm mt-1">{errors.fecha_vigencia_fin}</p>
              )}
            </div>
          </div>

          {/* Error general */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#5FD3D2] hover:bg-[#4FC3C2] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{loading ? 'Guardando...' : (record ? 'Actualizar' : 'Crear')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
