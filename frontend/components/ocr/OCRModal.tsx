'use client'

import { useState, useEffect } from 'react'
import { X, Camera, Upload, Loader2, CheckCircle, AlertCircle, Edit3, Save, RotateCcw } from 'lucide-react'
import FileUploader from './FileUploader'

import { useOCRExtraction } from '../../hooks/useOCRExtraction'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string
}

interface ExtractedData {
  tipo_identificacion: string
  numero_identificacion: string
  fecha_expedicion_documento: string
  primer_nombre: string
  segundo_nombre: string
  primer_apellido: string
  segundo_apellido: string
  fecha_nacimiento: string
}

interface OCRModalProps {
  isOpen: boolean
  onClose: () => void
  onDataAccepted: (data: ExtractedData, confidence: any) => void
  disabled?: boolean
}

/**
 * Modal independiente para el proceso completo de OCR de cédulas
 * Incluye subida, extracción, visualización y edición de datos
 */
export default function OCRModal({ isOpen, onClose, onDataAccepted, disabled = false }: OCRModalProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>('upload')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [editableData, setEditableData] = useState<ExtractedData>({
    tipo_identificacion: '',
    numero_identificacion: '',
    fecha_expedicion_documento: '',
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    fecha_nacimiento: ''
  })
  const [confidence, setConfidence] = useState<any>({})
  const [numericConfidence, setNumericConfidence] = useState<Record<string, number>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { loading, result, error, extractData, reset, getNumericConfidence } = useOCRExtraction()

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('upload')
      setFiles([])
      setEditableData({
        tipo_identificacion: '',
        numero_identificacion: '',
        fecha_expedicion_documento: '',
        primer_nombre: '',
        segundo_nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        fecha_nacimiento: ''
      })
      setConfidence({})
      setNumericConfidence({})
      setValidationErrors([])

      reset()
    }
  }, [isOpen, reset])

  // Manejar resultados de OCR
  useEffect(() => {
    if (result?.success) {
      const formFields = {
        tipo_identificacion: result.fields.tipo_identificacion || '',
        numero_identificacion: result.fields.numero_cedula || '',
        fecha_expedicion_documento: result.fields.fecha_expedicion_documento || '',
        primer_nombre: result.fields.primer_nombre || '',
        segundo_nombre: result.fields.segundo_nombre || '',
        primer_apellido: result.fields.primer_apellido || '',
        segundo_apellido: result.fields.segundo_apellido || '',
        fecha_nacimiento: result.fields.fecha_nacimiento || ''
      }

      const confidenceData = {
        tipo_identificacion: result.confidence.tipo_identificacion || 'alto',
        numero_identificacion: result.confidence.numero_cedula,
        fecha_expedicion_documento: result.confidence.fecha_expedicion_documento,
        primer_nombre: result.confidence.primer_nombre,
        segundo_nombre: result.confidence.segundo_nombre,
        primer_apellido: result.confidence.primer_apellido,
        segundo_apellido: result.confidence.segundo_apellido,
        fecha_nacimiento: result.confidence.fecha_nacimiento
      }

      // Obtener porcentajes numéricos si están disponibles
      const numericConfidenceData = getNumericConfidence()
      if (numericConfidenceData) {
        setNumericConfidence(numericConfidenceData)
      }

      setEditableData(formFields)
      setConfidence(confidenceData)
      setCurrentStep('review')
    }
  }, [result])

  // Bloquear scroll del body
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  const handleExtractData = async () => {
    if (files.length === 0) {
      alert('Selecciona al menos una imagen de cédula')
      return
    }

    setCurrentStep('processing')
    try {
      await extractData(files)
    } catch (error) {
      console.error('Error extrayendo datos:', error)
      setCurrentStep('upload')
    }
  }

  const handleStartOver = () => {
    setCurrentStep('upload')
    setFiles([])
    setEditableData({
      tipo_identificacion: '',
      numero_identificacion: '',
      fecha_expedicion_documento: '',
      primer_nombre: '',
      segundo_nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      fecha_nacimiento: ''
    })
    setConfidence({})
    reset()
  }



  // Validar que todos los campos obligatorios estén llenos
  const validateRequiredFields = () => {
    const requiredFields = [
      'tipo_identificacion',
      'numero_identificacion', 
      'primer_nombre',
      'primer_apellido',
      'fecha_nacimiento',
      'fecha_expedicion_documento'
    ]
    
    const missingFields = requiredFields.filter(field => 
      !editableData[field as keyof ExtractedData] || 
      editableData[field as keyof ExtractedData].trim() === ''
    )
    
    return missingFields
  }

  const handleAcceptData = () => {
    const missingFields = validateRequiredFields()
    
    if (missingFields.length > 0) {
      const fieldNames = {
        tipo_identificacion: 'Tipo de Identificación',
        numero_identificacion: 'Número de Identificación',
        primer_nombre: 'Primer Nombre',
        primer_apellido: 'Primer Apellido', 
        fecha_nacimiento: 'Fecha de Nacimiento',
        fecha_expedicion_documento: 'Fecha de Expedición'
      }
      
      const missingFieldNames = missingFields.map(field => 
        fieldNames[field as keyof typeof fieldNames]
      )
      
      setValidationErrors(missingFieldNames)
      return
    }
    
    // Limpiar errores si todo está bien
    setValidationErrors([])
    onDataAccepted(editableData, confidence)
    onClose()
  }

  const handleInputChange = (field: keyof ExtractedData, value: string) => {
    setEditableData(prev => ({ ...prev, [field]: value }))
    
    // Limpiar errores cuando el usuario empiece a llenar campos
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  // Helper para determinar si un campo tiene error
  const hasFieldError = (fieldName: string) => {
    const fieldNames = {
      'Tipo de Identificación': 'tipo_identificacion',
      'Número de Identificación': 'numero_identificacion',
      'Primer Nombre': 'primer_nombre',
      'Primer Apellido': 'primer_apellido',
      'Fecha de Nacimiento': 'fecha_nacimiento',
      'Fecha de Expedición': 'fecha_expedicion_documento'
    }
    
    return validationErrors.some(error => 
      fieldNames[error as keyof typeof fieldNames] === fieldName
    )
  }

  if (!isOpen) return null

  const steps = [
    { id: 'upload', name: 'Cargar Fotos', icon: Upload },
    { id: 'processing', name: 'Procesando', icon: Loader2 },
    { id: 'review', name: 'Revisar y Editar', icon: Edit3 }
  ]

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#87E0E0] rounded-xl flex items-center justify-center">
                <Camera className="h-6 w-6 text-[#004C4C]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Extraer Datos de Cédula</h2>
                <p className="text-[#87E0E0] text-sm">
                  Sube las fotos de tu cédula para llenar el formulario automáticamente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 hover:bg-[#0A6A6A] rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex
              const StepIcon = step.icon

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all
                    ${isActive ? 'bg-[#87E0E0] text-[#004C4C] scale-110' : 
                      isCompleted ? 'bg-[#5FD3D2] text-[#004C4C]' : 
                      'bg-[#0A6A6A] text-[#87E0E0]'}
                  `}>
                    <StepIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive && step.id === 'processing' ? 'animate-spin' : ''}`} />
                  </div>
                  <span className={`ml-2 text-xs sm:text-sm font-medium hidden sm:block ${
                    isActive || isCompleted ? 'text-[#87E0E0]' : 'text-[#58BFC2]'
                  }`}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-6 sm:w-8 h-0.5 mx-2 sm:mx-4 ${
                      isCompleted ? 'bg-[#5FD3D2]' : 'bg-[#0A6A6A]'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sube las fotos de tu cédula
                </h3>
                <p className="text-gray-600">
                  Puedes subir hasta 2 imágenes (frente y dorso) para mejores resultados
                </p>
              </div>

              <FileUploader
                onFilesChange={setFiles}
                maxFiles={2}
                disabled={disabled || loading}
              />

              {files.length > 0 && (
                <div className="bg-[#E6F5F7] border border-[#87E0E0] rounded-xl p-4">
                  <h4 className="font-medium text-[#004C4C] mb-3">Archivos seleccionados:</h4>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={file.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#004C4C] rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-red-700 font-medium">Error al procesar las imágenes</p>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Processing */}
          {currentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 bg-[#E6F5F7] rounded-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-[#004C4C] animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Procesando imágenes...
                </h3>
                <p className="text-gray-600">
                  Estamos extrayendo los datos de tu cédula usando inteligencia artificial
                </p>
              </div>
              <div className="w-full max-w-md bg-gray-200 rounded-full h-2">
                <div className="bg-[#004C4C] h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Edit */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Revisar y editar datos</h3>
                  <p className="text-gray-600">Modifica cualquier información que necesites corregir</p>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium text-sm">Datos extraídos</span>
                </div>
              </div>

              {/* Mensaje de validación moderno */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Campos obligatorios faltantes
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>Por favor completa los siguientes campos para continuar:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {validationErrors.map((fieldName, index) => (
                            <li key={index} className="font-medium">{fieldName}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo de Identificación <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <select
                    value={editableData.tipo_identificacion}
                    onChange={(e) => handleInputChange('tipo_identificacion', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm transition-colors ${
                      hasFieldError('tipo_identificacion') 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-[#87E0E0] focus:border-transparent'
                    }`}
                  >
                    <option value="">Seleccionar tipo...</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PPT">PPT</option>
                  </select>
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Número de Identificación <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editableData.numero_identificacion}
                    onChange={(e) => handleInputChange('numero_identificacion', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm transition-colors ${
                      hasFieldError('numero_identificacion') 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-[#87E0E0] focus:border-transparent'
                    }`}
                    placeholder="Ej: 1234567890"
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Fecha de Expedición <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    value={editableData.fecha_expedicion_documento}
                    onChange={(e) => handleInputChange('fecha_expedicion_documento', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm transition-colors ${
                      hasFieldError('fecha_expedicion_documento') 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-[#87E0E0] focus:border-transparent'
                    }`}
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Primer Nombre <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editableData.primer_nombre}
                    onChange={(e) => handleInputChange('primer_nombre', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm transition-colors ${
                      hasFieldError('primer_nombre') 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-[#87E0E0] focus:border-transparent'
                    }`}
                    placeholder="Ej: Juan"
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Segundo Nombre
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editableData.segundo_nombre}
                    onChange={(e) => handleInputChange('segundo_nombre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent text-sm"
                    placeholder="Ej: Carlos"
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Primer Apellido <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editableData.primer_apellido}
                    onChange={(e) => handleInputChange('primer_apellido', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm transition-colors ${
                      hasFieldError('primer_apellido') 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-[#87E0E0] focus:border-transparent'
                    }`}
                    placeholder="Ej: Pérez"
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Segundo Apellido
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editableData.segundo_apellido}
                    onChange={(e) => handleInputChange('segundo_apellido', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent text-sm"
                    placeholder="Ej: González"
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Fecha de Nacimiento <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    value={editableData.fecha_nacimiento}
                    onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm transition-colors ${
                      hasFieldError('fecha_nacimiento') 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-[#87E0E0] focus:border-transparent'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            
            {currentStep === 'upload' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExtractData}
                  disabled={files.length === 0}
                  className={`px-6 py-2 rounded-xl transition-all flex items-center space-x-2 ${
                    files.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#004C4C] text-white hover:bg-[#065C5C] shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>Extraer Datos</span>
                </button>
              </>
            )}

            {currentStep === 'processing' && (
              <div className="w-full flex justify-center">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando...</span>
                </div>
              </div>
            )}

            {currentStep === 'review' && (
              <>
                <button
                  onClick={handleStartOver}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Empezar de Nuevo</span>
                </button>
                <button
                  onClick={handleAcceptData}
                  className="px-6 py-2 bg-[#004C4C] text-white rounded-xl hover:bg-[#065C5C] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Aceptar y Continuar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
