/**
 * Modal moderno para CRUD de tablas auxiliares
 * Diseño coherente con CompanyModal usando glassmorphism y validaciones
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, AlertCircle, Database } from 'lucide-react'

interface AuxiliaryTableModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  record?: any
  fields: {
    key: string
    label: string
    type: 'text' | 'select'
    required?: boolean
    options?: { value: string; label: string }[]
    placeholder?: string
  }[]
  onSubmit: (data: any) => Promise<void>
}

export default function AuxiliaryTableModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  record,
  fields,
  onSubmit
}: AuxiliaryTableModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!record

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Inicializar datos del formulario
  useEffect(() => {
    if (isOpen) {
      if (isEditing && record) {
        // Cargar datos del registro existente
        const initialData: Record<string, any> = {}
        fields.forEach(field => {
          initialData[field.key] = record[field.key] || ''
        })
        setFormData(initialData)
      } else {
        // Resetear para nuevo registro
        const initialData: Record<string, any> = {}
        fields.forEach(field => {
          initialData[field.key] = ''
        })
        setFormData(initialData)
      }
      setErrors({})
    }
  }, [isOpen, record, isEditing, fields])

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Limpiar error si el campo tenía uno
    if (errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    fields.forEach(field => {
      if (field.required && !formData[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} es requerido`
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
    
    try {
      setLoading(true)
      await onSubmit(formData)
      onSuccess()
    } catch (error: any) {
      console.error('Error submitting form:', error)
      // Manejar errores específicos
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        setErrors({ general: 'Ya existe un registro con ese nombre' })
      } else {
        setErrors({ general: error.message || 'Error al guardar el registro' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto my-0 flex flex-col h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#87E0E0] rounded-full flex items-center justify-center">
              <Database className="h-4 w-4 text-[#004C4C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-6 h-6 hover:bg-[#0A6A6A] rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
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
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'text' ? (
                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors ${
                      errors[field.key] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={loading}
                    required={field.required}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors ${
                      errors[field.key] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={loading}
                    required={field.required}
                  >
                    <option value="">{field.placeholder || `Seleccionar ${field.label.toLowerCase()}...`}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                
                {errors[field.key] && (
                  <p className="mt-1 text-sm text-red-600">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm disabled:opacity-50"
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
              isEditing ? 'Actualizar' : 'Crear'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
