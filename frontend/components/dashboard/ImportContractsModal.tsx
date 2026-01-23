'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface ImportContractsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedContract {
  row: number
  primer_nombre: string
  segundo_nombre?: string
  primer_apellido: string
  segundo_apellido?: string
  tipo_identificacion: string
  numero_identificacion: string
  fecha_expedicion_documento?: string
  fecha_nacimiento: string
  celular?: string
  email?: string
  empresa_interna: string
  empresa_final_nit: string
  ciudad_labora?: string
  cargo?: string
  fecha_ingreso: string
  tipo_contrato?: string
  fecha_fin?: string
  tipo_salario?: string
  moneda?: string
  salario?: string
  auxilio_transporte?: string
  eps_nombre?: string
  arl_nombre?: string
  fondo_pension?: string
  fondo_cesantias?: string
  caja_compensacion?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
  empleado: string
}

interface ImportResult {
  success: boolean
  total: number
  imported: number
  failed: number
  errors: Array<{
    row: number
    empleado: string
    numero_identificacion: string
    reason: string
  }>
  importedContracts: Array<{
    nombre: string
    numero_identificacion: string
  }>
}

/**
 * Modal para importar contratos desde archivo CSV
 * Los contratos importados se marcan automáticamente con onboarding 100% completo
 */
export default function ImportContractsModal({
  isOpen,
  onClose,
  onSuccess
}: ImportContractsModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedContract[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cerrar modal y resetear estado
  const handleClose = () => {
    if (importing) return
    
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
  const parseCSV = (text: string): ParsedContract[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos')
    }

    // Obtener encabezados
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validar encabezados requeridos
    const requiredHeaders = [
      'primer_nombre',
      'primer_apellido',
      'tipo_identificacion',
      'numero_identificacion',
      'fecha_nacimiento',
      'empresa_interna',
      'empresa_final_nit',
      'fecha_ingreso'
    ]

    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`)
    }

    // Parsear filas
    const contracts: ParsedContract[] = []
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

      // Crear objeto contrato
      const contract: any = { row: i + 1 }
      headers.forEach((header, index) => {
        contract[header] = values[index] || ''
      })

      contracts.push(contract as ParsedContract)
    }

    return contracts
  }

  // Función para parsear fecha en formato colombiano (DD/MM/YYYY o DD-MM-YYYY) a ISO (YYYY-MM-DD)
  const parseColombianDate = (dateString: string): string | null => {
    if (!dateString || dateString.trim() === '') return null

    const trimmed = dateString.trim()
    
    // Intentar formato ISO primero (YYYY-MM-DD)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      const date = new Date(`${year}-${month}-${day}`)
      if (!isNaN(date.getTime())) {
        return `${year}-${month}-${day}`
      }
    }

    // Intentar formato colombiano con slash (DD/MM/YYYY)
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slashMatch) {
      const [, day, month, year] = slashMatch
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      if (!isNaN(date.getTime())) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    // Intentar formato colombiano con guión (DD-MM-YYYY)
    const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (dashMatch) {
      const [, day, month, year] = dashMatch
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      if (!isNaN(date.getTime())) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    return null
  }

  // Validar datos
  const validateContracts = (contracts: ParsedContract[]): ValidationError[] => {
    const errors: ValidationError[] = []
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validTiposIdentificacion = ['CC', 'CE', 'Pasaporte', 'PEP', 'Otro']
    const validEmpresaInterna = ['Good', 'CPS']
    const validTipoContrato = ['Indefinido', 'Fijo', 'Obra', 'Aprendizaje']
    const validTipoSalario = ['Integral', 'Ordinario']

    contracts.forEach((contract) => {
      const nombreCompleto = `${contract.primer_nombre} ${contract.primer_apellido}`.trim()

      // Validar primer_nombre
      if (!contract.primer_nombre || contract.primer_nombre.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'primer_nombre',
          message: 'El primer nombre es requerido',
          empleado: nombreCompleto
        })
      }

      // Validar primer_apellido
      if (!contract.primer_apellido || contract.primer_apellido.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'primer_apellido',
          message: 'El primer apellido es requerido',
          empleado: nombreCompleto
        })
      }

      // Validar tipo_identificacion
      if (!contract.tipo_identificacion || contract.tipo_identificacion.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'tipo_identificacion',
          message: 'El tipo de identificación es requerido',
          empleado: nombreCompleto
        })
      } else if (!validTiposIdentificacion.includes(contract.tipo_identificacion.trim())) {
        errors.push({
          row: contract.row,
          field: 'tipo_identificacion',
          message: `Tipo de identificación inválido. Debe ser uno de: ${validTiposIdentificacion.join(', ')}`,
          empleado: nombreCompleto
        })
      }

      // Validar numero_identificacion
      if (!contract.numero_identificacion || contract.numero_identificacion.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'numero_identificacion',
          message: 'El número de identificación es requerido',
          empleado: nombreCompleto
        })
      }

      // Validar fecha_nacimiento
      if (!contract.fecha_nacimiento || contract.fecha_nacimiento.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'fecha_nacimiento',
          message: 'La fecha de nacimiento es requerida',
          empleado: nombreCompleto
        })
      } else {
        const fechaNacISO = parseColombianDate(contract.fecha_nacimiento)
        if (!fechaNacISO) {
          errors.push({
            row: contract.row,
            field: 'fecha_nacimiento',
            message: 'La fecha de nacimiento no es válida (formato: DD/MM/YYYY o DD-MM-YYYY)',
            empleado: nombreCompleto
          })
        }
      }

      // Validar empresa_interna
      if (!contract.empresa_interna || contract.empresa_interna.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'empresa_interna',
          message: 'La empresa interna es requerida',
          empleado: nombreCompleto
        })
      } else if (!validEmpresaInterna.includes(contract.empresa_interna.trim())) {
        errors.push({
          row: contract.row,
          field: 'empresa_interna',
          message: `Empresa interna inválida. Debe ser: ${validEmpresaInterna.join(' o ')}`,
          empleado: nombreCompleto
        })
      }

      // Validar empresa_final_nit
      if (!contract.empresa_final_nit || contract.empresa_final_nit.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'empresa_final_nit',
          message: 'El NIT de la empresa final es requerido',
          empleado: nombreCompleto
        })
      }

      // Validar fecha_ingreso
      if (!contract.fecha_ingreso || contract.fecha_ingreso.trim() === '') {
        errors.push({
          row: contract.row,
          field: 'fecha_ingreso',
          message: 'La fecha de ingreso es requerida',
          empleado: nombreCompleto
        })
      } else {
        const fechaIngISO = parseColombianDate(contract.fecha_ingreso)
        if (!fechaIngISO) {
          errors.push({
            row: contract.row,
            field: 'fecha_ingreso',
            message: 'La fecha de ingreso no es válida (formato: DD/MM/YYYY o DD-MM-YYYY)',
            empleado: nombreCompleto
          })
        }
      }

      // Validar email si está presente
      if (contract.email && contract.email.trim() !== '') {
        if (!emailRegex.test(contract.email.trim())) {
          errors.push({
            row: contract.row,
            field: 'email',
            message: 'El email no es válido',
            empleado: nombreCompleto
          })
        }
      }

      // Validar tipo_contrato si está presente
      if (contract.tipo_contrato && contract.tipo_contrato.trim() !== '') {
        if (!validTipoContrato.includes(contract.tipo_contrato.trim())) {
          errors.push({
            row: contract.row,
            field: 'tipo_contrato',
            message: `Tipo de contrato inválido. Debe ser uno de: ${validTipoContrato.join(', ')}`,
            empleado: nombreCompleto
          })
        }
      }

      // Validar tipo_salario si está presente
      if (contract.tipo_salario && contract.tipo_salario.trim() !== '') {
        if (!validTipoSalario.includes(contract.tipo_salario.trim())) {
          errors.push({
            row: contract.row,
            field: 'tipo_salario',
            message: `Tipo de salario inválido. Debe ser: ${validTipoSalario.join(' o ')}`,
            empleado: nombreCompleto
          })
        }
      }

      // Validar fecha_fin si tipo_contrato es Fijo
      if (contract.tipo_contrato === 'Fijo') {
        if (!contract.fecha_fin || contract.fecha_fin.trim() === '') {
          errors.push({
            row: contract.row,
            field: 'fecha_fin',
            message: 'La fecha de fin es requerida para contratos Fijos',
            empleado: nombreCompleto
          })
        } else {
          const fechaFinISO = parseColombianDate(contract.fecha_fin)
          if (!fechaFinISO) {
            errors.push({
              row: contract.row,
              field: 'fecha_fin',
              message: 'La fecha de fin no es válida (formato: DD/MM/YYYY o DD-MM-YYYY)',
              empleado: nombreCompleto
            })
          }
        }
      }
    })

    return errors
  }

  // Manejar selección de archivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV')
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setValidationErrors([])
    setImportResult(null)

    try {
      // Leer archivo como UTF-8 explícitamente
      const text = await selectedFile.text()
      
      // Verificar si hay problemas de codificación comunes (caracteres extraños)
      const hasEncodingIssues = /[]/.test(text) || /[\uFFFD]/.test(text)
      if (hasEncodingIssues) {
        alert('⚠️ Advertencia: El archivo puede tener problemas de codificación. Por favor, guarda el CSV en formato UTF-8. En Excel: "Guardar como" → "CSV UTF-8 (delimitado por comas)"')
      }
      
      const parsed = parseCSV(text)
      setParsedData(parsed)

      const errors = validateContracts(parsed)
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

  // Buscar empresa por NIT
  const findCompanyByNIT = async (nit: string): Promise<string | null> => {
    try {
      const cleanNIT = nit.replace(/\D/g, '')
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('tax_id', cleanNIT)
        .single()

      if (error || !data) {
        return null
      }
      return data.id
    } catch (error) {
      console.error('Error buscando empresa:', error)
      return null
    }
  }

  // Buscar o crear entidades auxiliares (EPS, ARL, etc.)
  const findOrCreateAuxiliary = async (tableName: string, nombre: string): Promise<string | null> => {
    if (!nombre || nombre.trim() === '') return null

    try {
      // Buscar existente
      const { data: existing } = await supabase
        .from(tableName)
        .select('id')
        .ilike('nombre', nombre.trim())
        .limit(1)
        .single()

      if (existing) {
        return existing.id
      }

      // Crear nuevo si no existe
      const { data: newRecord, error } = await supabase
        .from(tableName)
        .insert([{ nombre: nombre.trim() }])
        .select()
        .single()

      if (error) {
        console.error(`Error creando ${tableName}:`, error)
        return null
      }

      return newRecord.id
    } catch (error) {
      console.error(`Error en findOrCreateAuxiliary para ${tableName}:`, error)
      return null
    }
  }

  // Importar contratos
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
      importedContracts: []
    }

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('No se pudo obtener el usuario actual')
      setImporting(false)
      return
    }

    // Procesar contratos en lotes
    const batchSize = 10
    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize)

      for (const contract of batch) {
        try {
          const nombreCompleto = `${contract.primer_nombre} ${contract.primer_apellido}`.trim()

          // Verificar si el número de identificación ya existe
          const { data: existing } = await supabase
            .from('contracts')
            .select('id, primer_nombre, primer_apellido')
            .eq('numero_identificacion', contract.numero_identificacion.trim())
            .eq('tipo_identificacion', contract.tipo_identificacion.trim())
            .single()

          if (existing) {
            result.failed++
            result.errors.push({
              row: contract.row,
              empleado: nombreCompleto,
              numero_identificacion: contract.numero_identificacion,
              reason: `Ya existe un contrato con este número de identificación: ${existing.primer_nombre} ${existing.primer_apellido}`
            })
            continue
          }

          // Buscar empresa por NIT
          const empresaId = await findCompanyByNIT(contract.empresa_final_nit)
          if (!empresaId) {
            result.failed++
            result.errors.push({
              row: contract.row,
              empleado: nombreCompleto,
              numero_identificacion: contract.numero_identificacion,
              reason: `No se encontró empresa con NIT: ${contract.empresa_final_nit}`
            })
            continue
          }

          // Preparar datos del contrato
          const fechaActual = new Date().toISOString().split('T')[0]
          
          // Convertir fechas de formato colombiano a ISO
          const fechaNacimientoISO = parseColombianDate(contract.fecha_nacimiento) || contract.fecha_nacimiento.trim()
          const fechaIngresoISO = parseColombianDate(contract.fecha_ingreso) || contract.fecha_ingreso.trim()
          const fechaExpedicionISO = contract.fecha_expedicion_documento 
            ? (parseColombianDate(contract.fecha_expedicion_documento) || contract.fecha_expedicion_documento.trim())
            : null
          const fechaFinISO = contract.fecha_fin 
            ? (parseColombianDate(contract.fecha_fin) || contract.fecha_fin.trim())
            : null
          
          const contractData: any = {
            primer_nombre: contract.primer_nombre.trim(),
            segundo_nombre: contract.segundo_nombre?.trim() || null,
            primer_apellido: contract.primer_apellido.trim(),
            segundo_apellido: contract.segundo_apellido?.trim() || null,
            tipo_identificacion: contract.tipo_identificacion.trim(),
            numero_identificacion: contract.numero_identificacion.trim(),
            fecha_expedicion_documento: fechaExpedicionISO,
            fecha_nacimiento: fechaNacimientoISO,
            celular: contract.celular?.trim() || null,
            email: contract.email?.trim().toLowerCase() || null,
            empresa_interna: contract.empresa_interna.trim(),
            empresa_final_id: empresaId,
            ciudad_labora: contract.ciudad_labora?.trim() || null,
            cargo: contract.cargo?.trim() || null,
            fecha_ingreso: fechaIngresoISO,
            tipo_contrato: contract.tipo_contrato?.trim() || null,
            fecha_fin: fechaFinISO,
            tipo_salario: contract.tipo_salario?.trim() || null,
            moneda: contract.moneda?.trim() || 'COP',
            salario: contract.salario ? parseFloat(contract.salario.replace(/[^\d.-]/g, '')) : 0,
            auxilio_transporte: contract.auxilio_transporte ? parseFloat(contract.auxilio_transporte.replace(/[^\d.-]/g, '')) : 0,
            base_sena: true,
            status_aprobacion: 'aprobado', // Empleados existentes vienen aprobados
            created_by: user.id,
            updated_by: user.id,
            // Onboarding 100% completo para empleados existentes
            programacion_cita_examenes: true,
            examenes: true,
            examenes_fecha: fechaIngresoISO || fechaActual,
            solicitud_inscripcion_arl: true,
            envio_contrato: true,
            recibido_contrato_firmado: true,
            contrato_fecha_confirmacion: fechaIngresoISO || fechaActual,
            solicitud_eps: true,
            envio_inscripcion_caja: true,
            solicitud_cesantias: true,
            solicitud_fondo_pension: true
          }

          // Buscar y asignar entidades auxiliares si se proporcionaron
          if (contract.eps_nombre) {
            const epsId = await findOrCreateAuxiliary('eps', contract.eps_nombre)
            if (epsId) {
              contractData.eps_fecha_confirmacion = fechaIngresoISO || fechaActual
            }
          }

          if (contract.arl_nombre) {
            const arlId = await findOrCreateAuxiliary('arls', contract.arl_nombre)
            if (arlId) {
              contractData.arl_fecha_confirmacion = fechaIngresoISO || fechaActual
            }
          }

          if (contract.fondo_pension) {
            const pensionId = await findOrCreateAuxiliary('fondos_pension', contract.fondo_pension)
            if (pensionId) {
              contractData.pension_fecha_confirmacion = fechaIngresoISO || fechaActual
            }
          }

          if (contract.fondo_cesantias) {
            const cesantiasId = await findOrCreateAuxiliary('fondos_cesantias', contract.fondo_cesantias)
            if (cesantiasId) {
              contractData.cesantias_fecha_confirmacion = fechaIngresoISO || fechaActual
            }
          }

          if (contract.caja_compensacion) {
            const cajaId = await findOrCreateAuxiliary('cajas_compensacion', contract.caja_compensacion)
            if (cajaId) {
              contractData.caja_fecha_confirmacion = fechaIngresoISO || fechaActual
            }
          }

          // Crear contrato
          const { data: newContract, error } = await supabase
            .from('contracts')
            .insert([contractData])
            .select()
            .single()

          if (error) {
            result.failed++
            result.errors.push({
              row: contract.row,
              empleado: nombreCompleto,
              numero_identificacion: contract.numero_identificacion,
              reason: error.message
            })
          } else {
            result.imported++
            result.importedContracts.push({
              nombre: `${newContract.primer_nombre} ${newContract.primer_apellido}`,
              numero_identificacion: newContract.numero_identificacion
            })
          }
        } catch (error) {
          result.failed++
          result.errors.push({
            row: contract.row,
            empleado: `${contract.primer_nombre} ${contract.primer_apellido}`,
            numero_identificacion: contract.numero_identificacion,
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
            <span>Importar Contratos desde CSV</span>
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
                      <li>Completa los datos de los empleados siguiendo el formato</li>
                      <li>Los contratos importados se marcarán automáticamente con onboarding 100% completo</li>
                      <li>Las columnas requeridas son: primer_nombre, primer_apellido, tipo_identificacion, numero_identificacion, fecha_nacimiento, empresa_interna, empresa_final_nit, fecha_ingreso</li>
                      <li><strong>Formato de fechas:</strong> DD/MM/YYYY o DD-MM-YYYY (ejemplo: 15/01/2024 o 15-01-2024)</li>
                      <li><strong>Caracteres especiales (tildes, ñ):</strong> Guarda el archivo en formato UTF-8. En Excel: "Guardar como" → "CSV UTF-8 (delimitado por comas)"</li>
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
                    <strong>{parsedData.length}</strong> contratos encontrados en el archivo
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
                            <strong>Fila {error.row}</strong> ({error.empleado}): {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Vista previa (primeros 5 contratos):</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2">Fila</th>
                        <th className="text-left p-2">Empleado</th>
                        <th className="text-left p-2">Identificación</th>
                        <th className="text-left p-2">Empresa</th>
                        <th className="text-left p-2">Cargo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((contract) => (
                        <tr key={contract.row} className="border-b border-gray-100">
                          <td className="p-2">{contract.row}</td>
                          <td className="p-2">{contract.primer_nombre} {contract.primer_apellido}</td>
                          <td className="p-2">{contract.numero_identificacion}</td>
                          <td className="p-2">{contract.empresa_final_nit}</td>
                          <td className="p-2">{contract.cargo || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 5 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ... y {parsedData.length - 5} contrato(s) más
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
                  {importing ? 'Importando...' : 'Importar Contratos'}
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
                      <p><strong>Total de contratos procesados:</strong> {importResult.total}</p>
                      <p className="text-green-700"><strong>Contratos importados exitosamente:</strong> {importResult.imported}</p>
                      {importResult.failed > 0 && (
                        <p className="text-red-700"><strong>Contratos no importados:</strong> {importResult.failed}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {importResult.imported > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Contratos Importados Exitosamente ({importResult.imported}):
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResult.importedContracts.map((contract, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm p-2 bg-green-50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{contract.nombre}</span>
                        <span className="text-gray-500">(ID: {contract.numero_identificacion})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-white border border-red-200 rounded-xl p-4">
                  <h3 className="font-semibold text-red-900 mb-3">
                    Contratos No Importados ({importResult.errors.length}):
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm p-2 bg-red-50 rounded">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900">
                            Fila {error.row}: {error.empleado} (ID: {error.numero_identificacion})
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
              <p className="text-gray-600">Importando contratos...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
