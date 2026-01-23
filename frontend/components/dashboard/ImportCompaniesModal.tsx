'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface ImportCompaniesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedCompany {
  row: number
  nombre_empresa: string
  nit: string
  grupo_empresarial?: string
  contacto_cuentas_nombre: string
  contacto_cuentas_email: string
  contacto_cuentas_telefono: string
  contacto_comercial_nombre?: string
  contacto_comercial_email?: string
  contacto_comercial_telefono?: string
  estado?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
  empresa: string
}

interface ImportResult {
  success: boolean
  total: number
  imported: number
  failed: number
  errors: Array<{
    row: number
    empresa: string
    nit: string
    reason: string
  }>
  importedCompanies: Array<{
    nombre: string
    nit: string
  }>
}

/**
 * Modal para importar empresas desde archivo CSV
 */
export default function ImportCompaniesModal({
  isOpen,
  onClose,
  onSuccess
}: ImportCompaniesModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedCompany[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cerrar modal y resetear estado
  const handleClose = () => {
    if (importing) return // No cerrar mientras se importa
    
    setFile(null)
    setParsedData([])
    setValidationErrors([])
    setImportResult(null)
    setStep('upload')
    setLoading(false)
    setImporting(false)
    onClose()
  }

  // Parsear CSV
  const parseCSV = (text: string): ParsedCompany[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos')
    }

    // Obtener encabezados
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validar encabezados requeridos
    const requiredHeaders = [
      'nombre_empresa',
      'nit',
      'contacto_cuentas_nombre',
      'contacto_cuentas_email',
      'contacto_cuentas_telefono'
    ]

    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`)
    }

    // Parsear filas
    const companies: ParsedCompany[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Parsear CSV considerando comillas
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      // Crear objeto empresa
      const company: any = { row: i + 1 }
      headers.forEach((header, index) => {
        company[header] = values[index] || ''
      })

      companies.push(company as ParsedCompany)
    }

    return companies
  }

  // Validar datos
  const validateCompanies = (companies: ParsedCompany[]): ValidationError[] => {
    const errors: ValidationError[] = []
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    companies.forEach((company) => {
      // Validar nombre_empresa
      if (!company.nombre_empresa || company.nombre_empresa.trim() === '') {
        errors.push({
          row: company.row,
          field: 'nombre_empresa',
          message: 'El nombre de la empresa es requerido',
          empresa: company.nombre_empresa || 'Sin nombre'
        })
      }

      // Validar NIT
      if (!company.nit || company.nit.trim() === '') {
        errors.push({
          row: company.row,
          field: 'nit',
          message: 'El NIT es requerido',
          empresa: company.nombre_empresa || 'Sin nombre'
        })
      }

      // Validar contacto_cuentas_nombre
      if (!company.contacto_cuentas_nombre || company.contacto_cuentas_nombre.trim() === '') {
        errors.push({
          row: company.row,
          field: 'contacto_cuentas_nombre',
          message: 'El nombre del contacto de cuentas es requerido',
          empresa: company.nombre_empresa || 'Sin nombre'
        })
      }

      // Validar contacto_cuentas_email
      if (!company.contacto_cuentas_email || company.contacto_cuentas_email.trim() === '') {
        errors.push({
          row: company.row,
          field: 'contacto_cuentas_email',
          message: 'El email del contacto de cuentas es requerido',
          empresa: company.nombre_empresa || 'Sin nombre'
        })
      } else if (!emailRegex.test(company.contacto_cuentas_email.trim())) {
        errors.push({
          row: company.row,
          field: 'contacto_cuentas_email',
          message: 'El email del contacto de cuentas no es válido',
          empresa: company.nombre_empresa || 'Sin nombre'
        })
      }

      // Validar contacto_cuentas_telefono
      if (!company.contacto_cuentas_telefono || company.contacto_cuentas_telefono.trim() === '') {
        errors.push({
          row: company.row,
          field: 'contacto_cuentas_telefono',
          message: 'El teléfono del contacto de cuentas es requerido',
          empresa: company.nombre_empresa || 'Sin nombre'
        })
      }

      // Validar contacto_comercial_email si está presente
      if (company.contacto_comercial_email && company.contacto_comercial_email.trim() !== '') {
        if (!emailRegex.test(company.contacto_comercial_email.trim())) {
          errors.push({
            row: company.row,
            field: 'contacto_comercial_email',
            message: 'El email del contacto comercial no es válido',
            empresa: company.nombre_empresa || 'Sin nombre'
          })
        }
      }
    })

    return errors
  }

  // Manejar selección de archivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validar tipo de archivo
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV')
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setValidationErrors([])
    setImportResult(null)

    try {
      // Leer archivo
      const text = await selectedFile.text()
      
      // Parsear CSV
      const parsed = parseCSV(text)
      setParsedData(parsed)

      // Validar datos
      const errors = validateCompanies(parsed)
      setValidationErrors(errors)

      if (errors.length === 0) {
        setStep('preview')
      }

    } catch (error) {
      console.error('Error procesando archivo:', error)
      alert(error instanceof Error ? error.message : 'Error al procesar el archivo CSV')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  // Obtener o crear grupo empresarial
  const getOrCreateGrupoEmpresarial = async (nombre: string): Promise<string | null> => {
    if (!nombre || nombre.trim() === '') return null

    try {
      // Buscar grupo existente
      const { data: existing, error: searchError } = await supabase
        .from('grupos_empresariales')
        .select('id')
        .eq('nombre', nombre.trim())
        .single()

      if (existing) {
        return existing.id
      }

      // Crear nuevo grupo
      const { data: newGrupo, error: createError } = await supabase
        .from('grupos_empresariales')
        .insert([{ nombre: nombre.trim() }])
        .select()
        .single()

      if (createError) throw createError
      return newGrupo.id
    } catch (error) {
      console.error('Error obteniendo/creando grupo empresarial:', error)
      return null
    }
  }

  // Importar empresas
  const handleImport = async () => {
    if (validationErrors.length > 0) {
      alert('Por favor corrige los errores de validación antes de importar')
      return
    }

    setImporting(true)
    setStep('result')

    const result: ImportResult = {
      success: true,
      total: parsedData.length,
      imported: 0,
      failed: 0,
      errors: [],
      importedCompanies: []
    }

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('No se pudo obtener el usuario actual')
      setImporting(false)
      return
    }

    // Procesar empresas en lotes
    const batchSize = 10
    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize)

      for (const company of batch) {
        try {
          // Verificar si el NIT ya existe
          const { data: existing } = await supabase
            .from('companies')
            .select('id, name')
            .eq('tax_id', company.nit.replace(/\D/g, ''))
            .single()

          if (existing) {
            result.failed++
            result.errors.push({
              row: company.row,
              empresa: company.nombre_empresa,
              nit: company.nit,
              reason: `NIT ya existe: ${existing.name}`
            })
            continue
          }

          // Obtener o crear grupo empresarial
          const grupoId = company.grupo_empresarial
            ? await getOrCreateGrupoEmpresarial(company.grupo_empresarial)
            : null

          // Determinar estado
          const status = company.estado?.toLowerCase() === 'inactiva' ? false : true

          // Crear empresa
          const { data: newCompany, error } = await supabase
            .from('companies')
            .insert([{
              name: company.nombre_empresa.trim(),
              tax_id: company.nit.replace(/\D/g, ''),
              grupo_empresarial_id: grupoId,
              accounts_contact_name: company.contacto_cuentas_nombre.trim(),
              accounts_contact_email: company.contacto_cuentas_email.trim().toLowerCase(),
              accounts_contact_phone: company.contacto_cuentas_telefono.trim(),
              comercial_contact_name: company.contacto_comercial_nombre?.trim() || null,
              comercial_contact_email: company.contacto_comercial_email?.trim().toLowerCase() || null,
              comercial_contact_phone: company.contacto_comercial_telefono?.trim() || null,
              status: status,
              created_by: user.id,
              updated_by: user.id
            }])
            .select()
            .single()

          if (error) {
            result.failed++
            result.errors.push({
              row: company.row,
              empresa: company.nombre_empresa,
              nit: company.nit,
              reason: error.message
            })
          } else {
            result.imported++
            result.importedCompanies.push({
              nombre: newCompany.name,
              nit: newCompany.tax_id
            })
          }
        } catch (error) {
          result.failed++
          result.errors.push({
            row: company.row,
            empresa: company.nombre_empresa,
            nit: company.nit,
            reason: error instanceof Error ? error.message : 'Error desconocido'
          })
        }
      }
    }

    setImportResult(result)
    setImporting(false)

    if (result.imported > 0) {
      onSuccess()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Upload className="h-6 w-6 text-[#004C4C]" />
            <span>Importar Empresas desde CSV</span>
          </h2>
          <button
            onClick={handleClose}
            disabled={importing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Instrucciones:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Descarga la plantilla CSV desde el botón "Descargar Plantilla"</li>
                      <li>Completa los datos de las empresas siguiendo el formato</li>
                      <li>Las columnas requeridas son: nombre_empresa, nit, contacto_cuentas_nombre, contacto_cuentas_email, contacto_cuentas_telefono</li>
                      <li>El sistema validará los datos antes de importar</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#87E0E0] transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={loading}
                />
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  {file ? file.name : 'Selecciona un archivo CSV'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="px-4 py-2 bg-[#004C4C] text-white rounded-lg hover:bg-[#065C5C] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Seleccionar Archivo'}
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Procesando archivo...</span>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-800">
                    <strong>{parsedData.length}</strong> empresas encontradas en el archivo
                  </p>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-2">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-800 mb-2">
                        {validationErrors.length} error(es) de validación encontrado(s):
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {validationErrors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700">
                            <strong>Fila {error.row}</strong> ({error.empresa}): {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Vista previa (primeras 5 empresas):</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2">Fila</th>
                        <th className="text-left p-2">Empresa</th>
                        <th className="text-left p-2">NIT</th>
                        <th className="text-left p-2">Contacto Cuentas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((company) => (
                        <tr key={company.row} className="border-b border-gray-100">
                          <td className="p-2">{company.row}</td>
                          <td className="p-2">{company.nombre_empresa}</td>
                          <td className="p-2">{company.nit}</td>
                          <td className="p-2">{company.contacto_cuentas_nombre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 5 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ... y {parsedData.length - 5} empresa(s) más
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setFile(null)
                    setParsedData([])
                    setValidationErrors([])
                    setStep('upload')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cambiar Archivo
                </button>
                <button
                  onClick={handleImport}
                  disabled={validationErrors.length > 0 || importing}
                  className="flex-1 px-4 py-2 bg-[#004C4C] text-white rounded-lg hover:bg-[#065C5C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importando...' : 'Importar Empresas'}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="space-y-6">
              <div className={`border-2 rounded-xl p-6 ${
                importResult.imported > 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  {importResult.imported > 0 ? (
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      {importResult.imported > 0 ? 'Importación Completada' : 'Importación Fallida'}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Total de empresas procesadas:</strong> {importResult.total}</p>
                      <p className="text-green-700"><strong>Empresas importadas exitosamente:</strong> {importResult.imported}</p>
                      {importResult.failed > 0 && (
                        <p className="text-red-700"><strong>Empresas no importadas:</strong> {importResult.failed}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {importResult.imported > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Empresas Importadas Exitosamente ({importResult.imported}):
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResult.importedCompanies.map((company, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm p-2 bg-green-50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{company.nombre}</span>
                        <span className="text-gray-500">(NIT: {company.nit})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-white border border-red-200 rounded-xl p-4">
                  <h3 className="font-semibold text-red-900 mb-3">
                    Empresas No Importadas ({importResult.errors.length}):
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm p-2 bg-red-50 rounded">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900">
                            Fila {error.row}: {error.empresa} (NIT: {error.nit})
                          </div>
                          <div className="text-red-700 text-xs mt-1">{error.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-[#004C4C] text-white rounded-lg hover:bg-[#065C5C] transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {importing && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-[#004C4C]" />
              <p className="text-gray-600">Importando empresas...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
