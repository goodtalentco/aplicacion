'use client'

import { useState } from 'react'
import { Scan, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import FileUploader from './FileUploader'

import { useOCRExtraction } from '../../hooks/useOCRExtraction'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string
}

interface OCRSectionProps {
  onDataExtracted: (fields: any, confidence: any) => void
  disabled?: boolean
}

/**
 * Sección completa de OCR para extraer datos de cédulas
 * Se integra en el modal de contratos
 */
export default function OCRSection({ onDataExtracted, disabled = false }: OCRSectionProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const { loading, result, error, extractData, reset } = useOCRExtraction()

  const handleExtractData = async () => {
    if (files.length === 0) {
      alert('Selecciona al menos una imagen de cédula')
      return
    }

    try {
      await extractData(files)
      // El resultado se maneja en el useEffect más abajo
    } catch (error) {
      console.error('Error extrayendo datos:', error)
    }
  }

  // Cuando se extraen datos exitosamente, notificar al componente padre
  React.useEffect(() => {
    if (result?.success) {
      const formFields = {
        tipo_identificacion: result.fields.numero_cedula ? (
          result.fields.numero_cedula.length <= 10 ? 'CC' : 'CE'
        ) : '',
        numero_identificacion: result.fields.numero_cedula || '',
        fecha_expedicion_documento: result.fields.fecha_expedicion_documento || '',
        primer_nombre: result.fields.primer_nombre || '',
        segundo_nombre: result.fields.segundo_nombre || '',
        primer_apellido: result.fields.primer_apellido || '',
        segundo_apellido: result.fields.segundo_apellido || '',
        fecha_nacimiento: result.fields.fecha_nacimiento || ''
      }

      const confidence = {
        tipo_identificacion: result.confidence.numero_cedula,
        numero_identificacion: result.confidence.numero_cedula,
        fecha_expedicion_documento: result.confidence.fecha_expedicion_documento,
        primer_nombre: result.confidence.primer_nombre,
        segundo_nombre: result.confidence.segundo_nombre,
        primer_apellido: result.confidence.primer_apellido,
        segundo_apellido: result.confidence.segundo_apellido,
        fecha_nacimiento: result.confidence.fecha_nacimiento
      }

      onDataExtracted(formFields, confidence)
    }
  }, [result, onDataExtracted])

  const handleReset = () => {
    setFiles([])
    reset()
  }

  return (
    <div className="bg-gradient-to-r from-[#E6F5F7] to-[#F0F9FA] border border-[#87E0E0] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#004C4C] rounded-lg flex items-center justify-center">
            <Scan className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#004C4C]">
              Extraer datos automáticamente
            </h3>
            <p className="text-sm text-[#065C5C]">
              Sube las imágenes de tu cédula para llenar el formulario automáticamente
            </p>
          </div>
        </div>

        {result?.success && (
          <button
            onClick={handleReset}
            className="text-sm text-[#004C4C] hover:text-[#065C5C] underline"
            disabled={disabled}
          >
            Procesar nuevas imágenes
          </button>
        )}
      </div>

      {/* Estado inicial o error */}
      {!result?.success && (
        <>
          <FileUploader
            onFilesChange={setFiles}
            maxFiles={2}
            disabled={disabled || loading}
          />

          {files.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleExtractData}
                disabled={disabled || loading || files.length === 0}
                className="bg-[#004C4C] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#065C5C] transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Extrayendo datos...</span>
                  </>
                ) : (
                  <>
                    <Scan className="h-5 w-5" />
                    <span>Extraer datos</span>
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700 font-medium">Error al procesar las imágenes</p>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Resultado exitoso */}
      {result?.success && (
        <div className="bg-white border border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-700 font-medium">Datos extraídos exitosamente</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(result.fields).map(([key, value]) => {
              if (!value) return null
              
              const confidence = result.confidence[key as keyof typeof result.confidence]
              const fieldNames: Record<string, string> = {
                numero_cedula: 'Número de cédula',
                primer_nombre: 'Primer nombre',
                segundo_nombre: 'Segundo nombre',
                primer_apellido: 'Primer apellido',
                segundo_apellido: 'Segundo apellido',
                fecha_nacimiento: 'Fecha de nacimiento',
                fecha_expedicion_documento: 'Fecha de expedición'
              }

              return (
                <div key={key} className="py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-600">{fieldNames[key]}:</span>
                  <span className="ml-2 font-medium text-gray-900">{value}</span>
                </div>
              )
            })}
          </div>

          {result.debug && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Tipo detectado: {result.debug.documentType}</span>
                <span>Tiempo: {result.debug.processingTime}ms</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Importar React para useEffect
import React from 'react'
