'use client'

import { useState, useEffect } from 'react'
import { X, Target, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface BusinessLine {
  id?: string
  nombre: string
  descripcion: string
  es_activa: boolean
}

interface BusinessLineModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  businessLine?: BusinessLine | null
  mode: 'create' | 'edit'
}

/**
 * Modal para crear y editar líneas de negocio
 * Incluye selector de color personalizado
 */
export default function BusinessLineModal({
  isOpen,
  onClose,
  onSuccess,
  businessLine,
  mode
}: BusinessLineModalProps) {
  const [formData, setFormData] = useState<BusinessLine>({
    nombre: '',
    descripcion: '',
    es_activa: true
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && businessLine) {
        setFormData(businessLine)
      } else {
        setFormData({
          nombre: '',
          descripcion: '',
          es_activa: true
        })
      }
      setErrors({})
    }
  }, [isOpen, businessLine, mode])

  // Validaciones en tiempo real
  const validateField = (name: string, value: string | boolean) => {
    switch (name) {
      case 'nombre':
        return typeof value === 'string' && value.trim().length >= 2 
          ? '' : 'El nombre debe tener al menos 2 caracteres'
      
      case 'descripcion':
        return typeof value === 'string' && (value.trim().length === 0 || value.trim().length >= 3)
          ? '' : 'La descripción debe tener al menos 3 caracteres'
      
      
      default:
        return ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    const newValue = type === 'checkbox' ? checked : value
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))

    // Validar en tiempo real
    const error = validateField(name, newValue)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }


  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'es_activa') {
        const error = validateField(key, value)
        if (error) newErrors[key] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      if (mode === 'create') {
        // Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error('Usuario no autenticado')
        }

        const { error } = await supabase
          .from('lineas_negocio')
          .insert([{
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim() || null,
            es_activa: formData.es_activa,
            created_by: user.id,
            updated_by: user.id
          }])

        if (error) throw error
      } else {
        // Obtener el usuario actual para updated_by
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error('Usuario no autenticado')
        }

        const { error } = await supabase
          .from('lineas_negocio')
          .update({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim() || null,
            es_activa: formData.es_activa,
            updated_by: user.id
          })
          .eq('id', businessLine?.id)

        if (error) throw error
      }

      onSuccess()
      onClose()

    } catch (error: any) {
      console.error('Error saving business line:', error)
      
      if (error.code === '23505') {
        setErrors({ nombre: 'Ya existe una línea de negocio con este nombre' })
      } else {
        setErrors({ general: error.message || 'Error al guardar la línea de negocio' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto my-0 flex flex-col h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#87E0E0] rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-[#004C4C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {mode === 'create' ? 'Nueva Línea de Negocio' : 'Editar Línea de Negocio'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 hover:bg-[#0A6A6A] rounded-full flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          
          {/* Error general */}
          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Información básica */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-[#004C4C]" />
                <h3 className="text-base font-semibold text-gray-900">Información de la Línea</h3>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre de la Línea de Negocio *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors ${
                    errors.nombre ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Legal Laboral"
                  required
                />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors resize-none ${
                    errors.descripcion ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Describe los servicios incluidos en esta línea de negocio... (opcional)"
                />
                {errors.descripcion && (
                  <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
                )}
              </div>


              {/* Estado */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="es_activa"
                  id="es_activa"
                  checked={formData.es_activa}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-[#87E0E0] border-gray-300 rounded focus:ring-[#87E0E0]"
                />
                <label htmlFor="es_activa" className="text-sm font-medium text-gray-700">
                  Línea de negocio activa
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-1.5 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white rounded-lg hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </div>
            ) : (
              mode === 'create' ? 'Crear Línea' : 'Actualizar Línea'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
