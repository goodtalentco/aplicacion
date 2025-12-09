'use client'

import { useState, useCallback } from 'react'
import { Upload, X, FileText, Image } from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string // base64
  preview?: string
}

interface FileUploaderProps {
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  maxSizePerFile?: number // en bytes
  disabled?: boolean
}

/**
 * Componente drag & drop para subir imágenes de cédula
 * Soporta JPG, PNG y preview de imágenes
 */
export default function FileUploader({
  onFilesChange,
  maxFiles = 2,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
  maxSizePerFile = 15 * 1024 * 1024, // 15MB
  disabled = false
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Convertir archivo a base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remover el prefijo "data:image/jpeg;base64," para obtener solo el base64
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Procesar archivos seleccionados
  const processFiles = useCallback(async (fileList: FileList) => {
    if (disabled || uploading) return

    setUploading(true)
    const newFiles: UploadedFile[] = []

    try {
      for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
        const file = fileList[i]

        // Validar tipo
        if (!acceptedTypes.includes(file.type)) {
          alert(`Tipo de archivo no permitido: ${file.name}. Permitidos: JPG, PNG, PDF`)
          continue
        }

        // Validar tamaño
        if (file.size > maxSizePerFile) {
          alert(`Archivo muy grande: ${file.name}. Máximo ${Math.round(maxSizePerFile / (1024 * 1024))}MB`)
          continue
        }

        // Convertir a base64
        const base64Data = await fileToBase64(file)
        
        // Crear preview para imágenes
        let preview: string | undefined
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file)
        }

        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data,
          preview
        }

        newFiles.push(uploadedFile)
      }

      const updatedFiles = [...files, ...newFiles]
      setFiles(updatedFiles)
      onFilesChange(updatedFiles)

    } catch (error) {
      console.error('Error procesando archivos:', error)
      alert('Error al procesar los archivos')
    } finally {
      setUploading(false)
    }
  }, [files, maxFiles, acceptedTypes, maxSizePerFile, disabled, uploading, onFilesChange])

  // Manejar drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  // Manejar drag
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Manejar selección de archivos
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
  }, [processFiles])

  // Remover archivo
  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = files.filter(f => {
      if (f.id === fileId) {
        // Limpiar preview URL si existe
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
        return false
      }
      return true
    })
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }, [files, onFilesChange])

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const canAddMore = files.length < maxFiles && !disabled

  return (
    <div className="space-y-4">
      {/* Área de upload */}
      {canAddMore && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
            ${dragActive 
              ? 'border-[#87E0E0] bg-[#E6F5F7]' 
              : 'border-gray-300 hover:border-[#58BFC2] hover:bg-gray-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center space-y-3">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${dragActive ? 'bg-[#87E0E0]' : 'bg-gray-100'}
            `}>
              <Upload className={`h-8 w-8 ${dragActive ? 'text-[#004C4C]' : 'text-gray-500'}`} />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {uploading ? 'Procesando archivos...' : 'Subir imágenes de cédula'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Arrastra y suelta o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Máximo {maxFiles} archivos • JPG, PNG, PDF • Hasta 15MB cada uno
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de archivos subidos */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Archivos seleccionados ({files.length}/{maxFiles})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <div key={file.id} className="bg-white border border-gray-200 rounded-xl p-4 relative">
                {/* Botón remover */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>

                {/* Preview o ícono */}
                <div className="mb-3">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      {file.type === 'application/pdf' ? (
                        <FileText className="h-12 w-12 text-red-500" />
                      ) : (
                        <Image className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info del archivo */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  )
}
