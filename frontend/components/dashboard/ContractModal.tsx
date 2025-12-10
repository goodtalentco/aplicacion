'use client'

import { useState, useEffect, useRef } from 'react'
import { X, User, FileText, CheckSquare, ChevronRight, Shield, AlertTriangle, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Contract, getContractStatusConfig, calculateTotalRemuneration, formatCurrency, Auxilio } from '../../types/contract'
import OCRButton from '../ocr/OCRButton'
import ContractModalOnboarding from './ContractModalOnboarding'
import CompanySelector from '../ui/CompanySelector'
import CitySelector from '../ui/CitySelector'
import ContractHistorialModal from './ContractHistorialModal'
import { getDateLimits, validateDateInput } from '../../utils/dateValidation'



interface Company {
  id: string
  name: string
  tax_id: string
}

interface ContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  contract?: Contract | null
  mode: 'create' | 'edit'
  companies: Company[]
}

/**
 * Modal moderno de 3 pestañas para crear y editar contratos
 * Diseño responsive con stepper horizontal y validaciones en tiempo real
 */

export default function ContractModal({
  isOpen,
  onClose,
  onSuccess,
  contract,
  mode,
  companies
}: ContractModalProps) {
  const [currentTab, setCurrentTab] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Estados para el nuevo formulario de auxilios
  const [nuevoAuxilioTipo, setNuevoAuxilioTipo] = useState<'salarial' | 'no_salarial'>('salarial')
  const [nuevoAuxilioMonto, setNuevoAuxilioMonto] = useState('')
  
  // Estados para cálculos automáticos - valores por defecto mientras cargan
  const [salarioMinimo, setSalarioMinimo] = useState<number>(1300000)
  const [auxilioTransporteParametro, setAuxilioTransporteParametro] = useState<number>(162000)
  
  // Estados para asignaciones automáticas
  const [cajaCompensacionActiva, setCajaCompensacionActiva] = useState<string>('')
  const [arlActiva, setArlActiva] = useState<string>('')
  
  // Estados para información de empresa (ARL y Cajas)
  const [empresaInfo, setEmpresaInfo] = useState<{
    arl: { id: string; nombre: string } | null
    cajas: { id: string; nombre: string; ciudad: string }[]
    loading: boolean
  }>({
    arl: null,
    cajas: [],
    loading: false
  })
  
  // Lógica de estados del contrato
  const statusConfig = contract ? getContractStatusConfig(contract) : null
  const isReadOnly = Boolean(contract && statusConfig && !statusConfig.can_edit)
  
  const [formData, setFormData] = useState<Contract>({
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    tipo_identificacion: '',
    numero_identificacion: '',
    fecha_expedicion_documento: '',
    fecha_nacimiento: '',
    celular: '',
    email: '',
    empresa_interna: '',
    empresa_final_id: '',
    ciudad_labora: '',
    cargo: '',
    numero_contrato_helisa: null,
          base_sena: true,
    fecha_ingreso: '',
    tipo_contrato: '',
    arl_risk_level: null,
    fecha_fin: '',
    tipo_salario: '',
    moneda: 'COP',
    moneda_custom: '',
    salario: 0,
    auxilios: [] as Auxilio[],
    auxilio_transporte: 0,
    tiene_condicion_medica: false,
    condicion_medica_detalle: '',
    fuero: false,
    fuero_detalle: '',
    pensionado: false,
  beneficiario_hijo: 0,
  beneficiario_madre: 0,
  beneficiario_padre: 0,
  beneficiario_conyuge: 0,
    fecha_solicitud: '',
    fecha_radicado: '',
    programacion_cita_examenes: false,
    examenes: false,
    examenes_fecha: '',
    solicitud_inscripcion_arl: false,
    arl_nombre: '',
    arl_fecha_confirmacion: '',
    envio_contrato: false,
    recibido_contrato_firmado: false,
    contrato_fecha_confirmacion: '',
    solicitud_eps: false,
    eps_fecha_confirmacion: '',
    envio_inscripcion_caja: false,
    caja_fecha_confirmacion: '',
    solicitud_cesantias: false,
    fondo_cesantias: '',
    cesantias_fecha_confirmacion: '',
    solicitud_fondo_pension: false,
    fondo_pension: '',
    pension_fecha_confirmacion: '',
    dropbox: '',
    radicado_eps: '',
    radicado_ccf: '',
    observacion: '',
    status_aprobacion: 'borrador'
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Estados para modal de historial de períodos
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [periodosHistorial, setPeriodosHistorial] = useState<any[]>([])
  const [contractFixedStatus, setContractFixedStatus] = useState<any>(null)

  // Cargar parámetros anuales para cálculos
  const loadParametrosAnuales = async (year: number) => {
    console.log('🔍 Cargando parámetros para año:', year)
    try {
      const { data: salarioData, error: salarioError } = await supabase
        .from('parametros_anuales')
        .select('valor_numerico')
        .eq('tipo_parametro', 'salario_minimo')
        .eq('año', year)
        .eq('es_activo', true)
        .single()

      const { data: auxilioData, error: auxilioError } = await supabase
        .from('parametros_anuales')
        .select('valor_numerico')
        .eq('tipo_parametro', 'auxilio_transporte')
        .eq('año', year)
        .eq('es_activo', true)
        .single()

      console.log('💰 Datos salario:', salarioData, salarioError)
      console.log('🚌 Datos auxilio:', auxilioData, auxilioError)

      const nuevoSalarioMinimo = salarioData?.valor_numerico || 1300000
      const nuevoAuxilioTransporte = auxilioData?.valor_numerico || 162000

      console.log('📊 Parámetros cargados:', { nuevoSalarioMinimo, nuevoAuxilioTransporte })

      setSalarioMinimo(nuevoSalarioMinimo)
      setAuxilioTransporteParametro(nuevoAuxilioTransporte)
    } catch (error) {
      console.error('Error loading parametros anuales:', error)
      console.log('⚠️ Usando valores por defecto (tabla puede no existir aún)')
      // Mantener valores por defecto que ya están inicializados
    }
  }

  // Calcular auxilio de transporte automáticamente
  const calculateAuxilioTransporte = (salario: number) => {
    if (!salario || !salarioMinimo || !auxilioTransporteParametro) return 0
    
    const limite = salarioMinimo * 2
    console.log('🧮 Calculando auxilio:', { salario, salarioMinimo, limite, auxilioTransporteParametro })
    
    if (salario <= limite) {
      console.log('✅ Aplica auxilio:', auxilioTransporteParametro)
      return auxilioTransporteParametro
    }
    console.log('❌ No aplica auxilio')
    return 0
  }

  // Obtener caja de compensación activa para empresa/ciudad en fecha específica
  const loadCajaCompensacionActiva = async (empresaId: string, ciudadId: string, fechaContrato: string) => {
    if (!empresaId || !ciudadId || !fechaContrato) {
      setCajaCompensacionActiva('')
      return
    }

    console.log('🏢 Buscando caja activa:', { empresaId, ciudadId, fechaContrato })

    try {
      const { data, error } = await supabase
        .from('empresa_cajas_compensacion')
        .select(`
          cajas_compensacion!inner(
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('ciudad_id', ciudadId)
        .eq('estado', 'activa')
        .lte('fecha_inicio', fechaContrato)
        .or(`fecha_fin.is.null,fecha_fin.gte.${fechaContrato}`)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró ninguna caja activa (normal)
          console.log('ℹ️ No hay caja de compensación activa para esta empresa/ciudad/fecha')
          setCajaCompensacionActiva('')
        } else {
          console.error('Error loading caja activa:', error)
          setCajaCompensacionActiva('')
        }
        return
      }

      const nombreCaja = (data?.cajas_compensacion as any)?.nombre || ''
      console.log('✅ Caja encontrada:', nombreCaja)
      setCajaCompensacionActiva(nombreCaja)

    } catch (error: any) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No hay caja de compensación activa para esta empresa/ciudad/fecha')
        setCajaCompensacionActiva('')
      } else {
        console.error('Error loading caja activa:', error)
        setCajaCompensacionActiva('')
      }
    }
  }

  // Obtener ARL activa para empresa en fecha específica
  const loadArlActiva = async (empresaId: string, fechaContrato: string) => {
    if (!empresaId || !fechaContrato) {
      setArlActiva('')
      return
    }

    console.log('🛡️ Buscando ARL activa:', { empresaId, fechaContrato })

    try {
      const { data, error } = await supabase
        .from('empresa_arls')
        .select(`
          arls!inner(
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('estado', 'activa')
        .lte('fecha_inicio', fechaContrato)
        .or(`fecha_fin.is.null,fecha_fin.gte.${fechaContrato}`)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró ninguna ARL activa (normal)
          console.log('ℹ️ No hay ARL activa para esta empresa/fecha')
          setArlActiva('')
        } else {
          console.error('Error loading ARL activa:', error)
          setArlActiva('')
        }
        return
      }

      const nombreArl = (data?.arls as any)?.nombre || ''
      console.log('✅ ARL encontrada:', nombreArl)
      setArlActiva(nombreArl)

    } catch (error: any) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No hay ARL activa para esta empresa/fecha')
        setArlActiva('')
      } else {
        console.error('Error loading ARL activa:', error)
        setArlActiva('')
      }
    }
  }

  const [fieldConfidence, setFieldConfidence] = useState<Record<string, 'alto' | 'medio' | 'bajo'>>({})

  // Manejar datos extraídos por OCR
  const handleOCRDataExtracted = (extractedFields: any, confidence: any) => {
    console.log('📄 Datos extraídos por OCR:', extractedFields)
    console.log('📊 Confianza de campos:', confidence)
    
    // Actualizar formData con los campos extraídos
    setFormData(prev => ({
      ...prev,
      ...extractedFields
    }))

    // Actualizar confianza de los campos
    setFieldConfidence(confidence)

    // Limpiar errores de campos que fueron llenados automáticamente
    setErrors(prev => {
      const newErrors = { ...prev }
      Object.keys(extractedFields).forEach(field => {
        if (extractedFields[field]) {
          delete newErrors[field]
        }
      })
      return newErrors
    })

    // Mostrar mensaje de éxito con tipo de documento detectado
    const documentType = extractedFields.tipo_identificacion === 'CC' ? 'Cédula de Ciudadanía' : 
                        extractedFields.tipo_identificacion === 'CE' ? 'Cédula de Extranjería' :
                        extractedFields.tipo_identificacion === 'PPT' ? 'PPT' : 'documento'
    console.log(`✅ ${documentType} procesada exitosamente con Gemini`)
  }

  // Buscar datos de contratos anteriores por cédula
  const handleSearchCedula = async () => {
    if (!formData.numero_identificacion.trim()) {
      console.log('❌ No hay cédula para buscar')
      return
    }

    setLoading(true)
    console.log(`🔍 Buscando contratos con cédula: ${formData.numero_identificacion}`)

    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          tipo_identificacion,
          numero_identificacion,
          fecha_expedicion_documento,
          primer_nombre,
          segundo_nombre,
          primer_apellido,
          segundo_apellido,
          fecha_nacimiento,
          celular,
          email
        `)
        .eq('numero_identificacion', formData.numero_identificacion.trim())
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Error al buscar contratos:', error)
        setErrors(prev => ({ ...prev, general: 'Error al buscar contratos anteriores' }))
        return
      }

      if (!contracts || contracts.length === 0) {
        console.log('📭 No se encontraron contratos con esta cédula')
        setErrors(prev => ({ ...prev, general: 'No se encontraron contratos anteriores con esta cédula' }))
        return
      }

      const contractData = contracts[0]
      console.log('📋 Datos encontrados:', contractData)

      // Precargar solo los campos de información personal
      const personalData = {
        tipo_identificacion: contractData.tipo_identificacion || formData.tipo_identificacion,
        fecha_expedicion_documento: contractData.fecha_expedicion_documento || formData.fecha_expedicion_documento,
        primer_nombre: contractData.primer_nombre || formData.primer_nombre,
        segundo_nombre: contractData.segundo_nombre || formData.segundo_nombre,
        primer_apellido: contractData.primer_apellido || formData.primer_apellido,
        segundo_apellido: contractData.segundo_apellido || formData.segundo_apellido,
        fecha_nacimiento: contractData.fecha_nacimiento || formData.fecha_nacimiento,
        celular: contractData.celular || formData.celular,
        email: contractData.email || formData.email
      }

      setFormData(prev => ({
        ...prev,
        ...personalData
      }))

      // Limpiar errores de campos precargados
      setErrors(prev => {
        const newErrors = { ...prev }
        Object.keys(personalData).forEach(field => {
          if (personalData[field as keyof typeof personalData]) {
            delete newErrors[field]
          }
        })
        delete newErrors.general
        return newErrors
      })

      console.log('✅ Datos de información personal cargados exitosamente')
      
    } catch (error) {
      console.error('❌ Error inesperado al buscar contratos:', error)
      setErrors(prev => ({ ...prev, general: 'Error inesperado al buscar contratos' }))
    } finally {
      setLoading(false)
    }
  }

  // Helper para props de inputs con lógica de solo lectura
  const getInputProps = (fieldName: string, hasError: boolean = false) => ({
    readOnly: !!isReadOnly,
    disabled: !!isReadOnly,
    tabIndex: isReadOnly ? -1 : 0,
    className: `w-full px-4 py-3 border rounded-xl transition-all ${
      isReadOnly 
        ? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300 select-none pointer-events-none' 
        : `focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent ${
            hasError ? 'border-red-300' : 'border-gray-300'
          }`
    }`
  })

  // Helper para checkboxes
  const getCheckboxProps = () => ({
    disabled: !!isReadOnly,
    className: `${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} w-5 h-5 text-[#004C4C] rounded focus:ring-[#87E0E0] border-gray-300`
  })

  // Formatear número con puntos como separadores de miles
  const formatNumberWithDots = (value: number | string) => {
    if (!value) return ''
    const numStr = value.toString().replace(/\./g, '') // Remover puntos existentes
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // Convertir string con puntos a número
  const parseNumberFromDots = (value: string) => {
    return parseFloat(value.replace(/\./g, '')) || 0
  }

  // Función para sumar días a una fecha sin problemas de zona horaria
  const sumarDiasAFecha = (fechaString: string, dias: number): string => {
    // Usar UTC para evitar problemas de zona horaria
    const [año, mes, dia] = fechaString.split('-').map(Number)
    const fecha = new Date(año, mes - 1, dia) // mes es 0-indexado
    fecha.setDate(fecha.getDate() + dias)
    
    // Formatear como YYYY-MM-DD
    const añoResult = fecha.getFullYear()
    const mesResult = String(fecha.getMonth() + 1).padStart(2, '0')
    const diaResult = String(fecha.getDate()).padStart(2, '0')
    
    return `${añoResult}-${mesResult}-${diaResult}`
  }

  // Tabs configuration
  const tabs = [
    { id: 0, name: 'Información Personal', icon: User, color: 'text-blue-600' },
    { id: 1, name: 'Detalles del Contrato', icon: FileText, color: 'text-green-600' },
    { id: 2, name: 'Onboarding', icon: CheckSquare, color: 'text-purple-600' }
  ]

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Cargar parámetros del año actual al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const currentYear = new Date().getFullYear()
      console.log('🚀 Modal abierto, cargando parámetros del año:', currentYear)
      loadParametrosAnuales(currentYear)
      
      // Forzar recálculo inicial después de un pequeño delay
      setTimeout(() => {
        if (formData.salario && formData.salario > 0) {
          const nuevoAuxilio = calculateAuxilioTransporte(formData.salario)
          console.log('🔄 Recálculo inicial al abrir modal:', nuevoAuxilio)
          setFormData(prev => ({ ...prev, auxilio_transporte: nuevoAuxilio }))
        }
      }, 100)
    }
  }, [isOpen])

  // Resetear formulario cuando se abre/cierra el modal
  // Función para cargar historial de períodos existente
  const loadContractHistorial = async (contractId: string) => {
    try {
      // Primero verificar si es contrato fijo
      if (contract?.tipo_contrato !== 'fijo') {
        return
      }

      // Cargar períodos históricos (no actuales)
      const { data: periodosData, error } = await supabase
        .from('historial_contratos_fijos')
        .select('*')
        .eq('contract_id', contractId)
        .eq('es_periodo_actual', false)
        .order('numero_periodo', { ascending: true })

      if (error) {
        console.error('Error cargando historial de períodos:', error)
        return
      }

      if (periodosData && periodosData.length > 0) {
        // Convertir a formato del modal de historial
        const periodosFormateados = periodosData.map(p => ({
          id: p.id,
          numero_periodo: p.numero_periodo,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin,
          tipo_periodo: p.tipo_periodo,
          observaciones: p.observaciones || ''
        }))

        setPeriodosHistorial(periodosFormateados)

        // Calcular el estado del contrato
        const { data: statusData } = await supabase.rpc('get_contract_fixed_status', {
          contract_uuid: contractId
        })

        if (statusData) {
          setContractFixedStatus({
            totalPeriodos: statusData.total_periodos,
            diasTotales: statusData.dias_totales,
            añosTotales: statusData.años_totales,
            proximoPeriodo: statusData.proximo_periodo,
            debeSerIndefinido: statusData.debe_ser_indefinido
          })
        }
      }
    } catch (error) {
      console.error('Error loading contract historial:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && contract) {
        setFormData({
          // Solo campos que pertenecen a la tabla contracts
          primer_nombre: contract.primer_nombre || '',
          segundo_nombre: contract.segundo_nombre || '',
          primer_apellido: contract.primer_apellido || '',
          segundo_apellido: contract.segundo_apellido || '',
          tipo_identificacion: contract.tipo_identificacion || '',
          numero_identificacion: contract.numero_identificacion || '',
          fecha_expedicion_documento: contract.fecha_expedicion_documento || '',
          fecha_nacimiento: contract.fecha_nacimiento || '',
          celular: contract.celular || '',
          email: contract.email || '',
          empresa_interna: contract.empresa_interna || '',
          empresa_final_id: contract.empresa_final_id || '',
          ciudad_labora: contract.ciudad_labora || '',
          cargo: contract.cargo || '',
          numero_contrato_helisa: contract.numero_contrato_helisa || null,
          base_sena: contract.base_sena || false,
          fecha_ingreso: contract.fecha_ingreso || '',
          tipo_contrato: contract.tipo_contrato || '',
          arl_risk_level: contract.arl_risk_level || null,
          fecha_fin: contract.fecha_fin || '',
          tipo_salario: contract.tipo_salario || '',
          moneda: contract.moneda && contract.moneda !== 'COP' && contract.moneda !== 'EUR'
            ? 'otro'
            : (contract.moneda || 'COP'),
          moneda_custom: contract.moneda && contract.moneda !== 'COP' && contract.moneda !== 'EUR' 
            ? contract.moneda 
            : '',
          salario: contract.salario || 0,
          auxilios: contract.auxilios && Array.isArray(contract.auxilios) 
            ? contract.auxilios 
            : (() => {
                // Migrar auxilios antiguos al nuevo formato
                const auxilios: Auxilio[] = []
                if (contract.auxilio_salarial && contract.auxilio_salarial > 0) {
                  auxilios.push({
                    tipo: 'salarial',
                    monto: contract.auxilio_salarial,
                    moneda: contract.moneda || 'COP'
                  })
                }
                if (contract.auxilio_no_salarial && contract.auxilio_no_salarial > 0) {
                  auxilios.push({
                    tipo: 'no_salarial',
                    monto: contract.auxilio_no_salarial,
                    moneda: contract.moneda || 'COP'
                  })
                }
                return auxilios
              })(),
          auxilio_transporte: contract.auxilio_transporte || 0,
          tiene_condicion_medica: contract.tiene_condicion_medica || false,
          condicion_medica_detalle: contract.condicion_medica_detalle || '',
          fuero: contract.fuero || false,
          fuero_detalle: contract.fuero_detalle || '',
          pensionado: contract.pensionado || false,
          beneficiario_hijo: contract.beneficiario_hijo || 0,
          beneficiario_madre: contract.beneficiario_madre || 0,
          beneficiario_padre: contract.beneficiario_padre || 0,
          beneficiario_conyuge: contract.beneficiario_conyuge || 0,
          fecha_solicitud: contract.fecha_solicitud || '',
          fecha_radicado: contract.fecha_radicado || '',
          programacion_cita_examenes: contract.programacion_cita_examenes || false,
          examenes: contract.examenes || false,
          examenes_fecha: contract.examenes_fecha || '',
          solicitud_inscripcion_arl: contract.solicitud_inscripcion_arl || false,
          arl_nombre: contract.arl_nombre || '',
          arl_fecha_confirmacion: contract.arl_fecha_confirmacion || '',
          envio_contrato: contract.envio_contrato || false,
          recibido_contrato_firmado: contract.recibido_contrato_firmado || false,
          contrato_fecha_confirmacion: contract.contrato_fecha_confirmacion || '',
          solicitud_eps: contract.solicitud_eps || false,
          eps_fecha_confirmacion: contract.eps_fecha_confirmacion || '',
          envio_inscripcion_caja: contract.envio_inscripcion_caja || false,
          caja_fecha_confirmacion: contract.caja_fecha_confirmacion || '',
          solicitud_cesantias: contract.solicitud_cesantias || false,
          fondo_cesantias: contract.fondo_cesantias || '',
          cesantias_fecha_confirmacion: contract.cesantias_fecha_confirmacion || '',
          solicitud_fondo_pension: contract.solicitud_fondo_pension || false,
          fondo_pension: contract.fondo_pension || '',
          pension_fecha_confirmacion: contract.pension_fecha_confirmacion || '',
          dropbox: contract.dropbox || '',
          radicado_eps: contract.radicado_eps || '',
          radicado_ccf: contract.radicado_ccf || '',
          observacion: contract.observacion || ''
        })

        // Cargar historial de períodos si es contrato fijo
        if (contract.tipo_contrato === 'fijo' && contract.id) {
          loadContractHistorial(contract.id)
        }
      } else {
        // Reset para crear nuevo
        setFormData({
          primer_nombre: '',
          segundo_nombre: '',
          primer_apellido: '',
          segundo_apellido: '',
          tipo_identificacion: '',
          numero_identificacion: '',
          fecha_expedicion_documento: '',
          fecha_nacimiento: '',
          celular: '',
          email: '',
          empresa_interna: '',
          empresa_final_id: '',
          ciudad_labora: '',
          cargo: '',
          numero_contrato_helisa: null,
          base_sena: true,
          fecha_ingreso: '',
          tipo_contrato: '',
          arl_risk_level: null,
          fecha_fin: '',
          tipo_salario: '',
          moneda: 'COP',
          moneda_custom: '',
          salario: 0,
          auxilios: [] as Auxilio[],
          beneficiario_hijo: 0,
          beneficiario_madre: 0,
          beneficiario_padre: 0,
          beneficiario_conyuge: 0,
          fecha_solicitud: '',
          fecha_radicado: '',
          programacion_cita_examenes: false,
          examenes: false,
          solicitud_inscripcion_arl: false,
          envio_contrato: false,
          recibido_contrato_firmado: false,
          solicitud_eps: false,
          envio_inscripcion_caja: false,
          solicitud_cesantias: false,
          solicitud_fondo_pension: false,
          dropbox: '',
          radicado_eps: '',
          radicado_ccf: '',
          observacion: '',
          status_aprobacion: 'borrador'
        })
      }
      setCurrentTab(0)
      setErrors({})
      
      // Limpiar historial de períodos
      setPeriodosHistorial([])
      setContractFixedStatus(null)
      
      // Limpiar estados del formulario de auxilios
      setNuevoAuxilioTipo('salarial')
      setNuevoAuxilioMonto('')
    }
  }, [isOpen, contract, mode, companies])

  // Validar todos los campos y obtener errores por pestaña
  const validateAllFields = (): { errors: Record<string, string>, errorsByTab: Record<number, string[]> } => {
    const newErrors: Record<string, string> = {}
    const errorsByTab: Record<number, string[]> = { 0: [], 1: [], 2: [] }

    // Información Personal (Tab 0)
    if (!formData.primer_nombre.trim()) {
      newErrors.primer_nombre = 'El primer nombre es obligatorio'
      errorsByTab[0].push('primer_nombre')
    }
    if (!formData.primer_apellido.trim()) {
      newErrors.primer_apellido = 'El primer apellido es obligatorio'
      errorsByTab[0].push('primer_apellido')
    }
    if (!formData.numero_identificacion.trim()) {
      newErrors.numero_identificacion = 'El número de identificación es obligatorio'
      errorsByTab[0].push('numero_identificacion')
    }
    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es obligatoria'
      errorsByTab[0].push('fecha_nacimiento')
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido'
      errorsByTab[0].push('email')
    }

    // Detalles del Contrato (Tab 1)
    // El número de contrato no es obligatorio en edición - solo al aprobar
    if (!formData.empresa_final_id) {
      newErrors.empresa_final_id = 'Debe seleccionar una empresa cliente'
      errorsByTab[1].push('empresa_final_id')
    }
    if (formData.tipo_contrato !== 'indefinido' && !formData.fecha_fin) {
      newErrors.fecha_fin = 'La fecha fin es obligatoria para contratos con duración definida'
      errorsByTab[1].push('fecha_fin')
    }
    if (formData.salario && formData.salario < 0) {
      newErrors.salario = 'El salario debe ser mayor o igual a 0'
      errorsByTab[1].push('salario')
    }
    // Validar moneda personalizada si se selecciona "Otro"
    if (formData.moneda === 'otro' && (!formData.moneda_custom || !formData.moneda_custom.trim())) {
      newErrors.moneda_custom = 'Debe especificar la moneda cuando selecciona "Otro"'
      errorsByTab[1].push('moneda_custom')
    }

    // Validación de condición médica
    if (formData.tiene_condicion_medica && !(typeof formData.condicion_medica_detalle === 'string' && formData.condicion_medica_detalle.trim())) {
      newErrors.condicion_medica_detalle = 'Debe describir la condición médica cuando está marcada'
      errorsByTab[1].push('condicion_medica_detalle')
    }

    // Validación de fuero
    if (formData.fuero && !(typeof formData.fuero_detalle === 'string' && formData.fuero_detalle.trim())) {
      newErrors.fuero_detalle = 'Debe describir el fuero cuando está marcado'
      errorsByTab[1].push('fuero_detalle')
    }

    // Tab 2 (Onboarding) - Validaciones estrictas
    // Si marcas un checkbox, los campos asociados son obligatorios
    
    // Exámenes realizados → fecha obligatoria
    if (formData.examenes && !formData.examenes_fecha) {
      newErrors.examenes_fecha = 'La fecha de exámenes es obligatoria cuando se marca como realizados'
      errorsByTab[2].push('examenes_fecha')
    }
    
    // Contrato firmado recibido → fecha obligatoria
    if (formData.recibido_contrato_firmado && !formData.contrato_fecha_confirmacion) {
      newErrors.contrato_fecha_confirmacion = 'La fecha de confirmación es obligatoria cuando se marca contrato recibido'
      errorsByTab[2].push('contrato_fecha_confirmacion')
    }
    
    // ARL solicitada con datos → si hay nombre debe haber fecha y viceversa
    if (formData.solicitud_inscripcion_arl) {
      const hasArlNombre = typeof formData.arl_nombre === 'string' && formData.arl_nombre.trim()
      const hasArlFecha = !!formData.arl_fecha_confirmacion
      
      // 🚨 DEBUG ARL VALIDATION
      console.log('🛡️ VALIDANDO ARL:', JSON.stringify({
        solicitud_inscripcion_arl: formData.solicitud_inscripcion_arl,
        arl_nombre: formData.arl_nombre,
        arl_fecha_confirmacion: formData.arl_fecha_confirmacion,
        arl_nombre_type: typeof formData.arl_nombre,
        arl_nombre_trim: formData.arl_nombre?.trim?.(),
        hasArlNombre: hasArlNombre,
        hasArlFecha: hasArlFecha,
        will_error_fecha: hasArlNombre && !hasArlFecha,
        will_error_nombre: hasArlFecha && !hasArlNombre
      }, null, 2))
      
      // Si tiene nombre pero no fecha
      if (hasArlNombre && !hasArlFecha) {
        newErrors.arl_fecha_confirmacion = 'La fecha de confirmación ARL es obligatoria cuando se especifica el nombre'
        errorsByTab[2].push('arl_fecha_confirmacion')
        console.log('❌ ERROR ARL: Falta fecha cuando hay nombre')
      }
      
      // Si tiene fecha pero no nombre
      if (hasArlFecha && !hasArlNombre) {
        newErrors.arl_nombre = 'El nombre de la ARL es obligatorio cuando se especifica la fecha'
        errorsByTab[2].push('arl_nombre')
        console.log('❌ ERROR ARL: Falta nombre cuando hay fecha')
      }
    }
    
    // EPS solicitada con datos → si hay radicado debe haber fecha y viceversa
    if (formData.solicitud_eps) {
      const hasEpsRadicado = typeof formData.radicado_eps === 'string' && formData.radicado_eps.trim()
      const hasEpsFecha = !!formData.eps_fecha_confirmacion
      
      // Si tiene radicado pero no fecha
      if (hasEpsRadicado && !hasEpsFecha) {
        newErrors.eps_fecha_confirmacion = 'La fecha de confirmación EPS es obligatoria cuando se especifica el radicado'
        errorsByTab[2].push('eps_fecha_confirmacion')
      }
      
      // Si tiene fecha pero no radicado
      if (hasEpsFecha && !hasEpsRadicado) {
        newErrors.radicado_eps = 'El radicado EPS es obligatorio cuando se especifica la fecha'
        errorsByTab[2].push('radicado_eps')
      }
    }
    
    // Caja enviada con datos → si hay radicado debe haber fecha y viceversa
    if (formData.envio_inscripcion_caja) {
      const hasCajaRadicado = typeof formData.radicado_ccf === 'string' && formData.radicado_ccf.trim()
      const hasCajaFecha = !!formData.caja_fecha_confirmacion
      
      // 🚨 DEBUG CAJA VALIDATION
      console.log('🏢 VALIDANDO CAJA:', JSON.stringify({
        envio_inscripcion_caja: formData.envio_inscripcion_caja,
        radicado_ccf: formData.radicado_ccf,
        caja_fecha_confirmacion: formData.caja_fecha_confirmacion,
        radicado_ccf_type: typeof formData.radicado_ccf,
        radicado_ccf_trim: formData.radicado_ccf?.trim?.(),
        hasCajaRadicado: hasCajaRadicado,
        hasCajaFecha: hasCajaFecha,
        will_error_fecha: hasCajaRadicado && !hasCajaFecha,
        will_error_radicado: hasCajaFecha && !hasCajaRadicado
      }, null, 2))
      
      // Si tiene radicado pero no fecha
      if (hasCajaRadicado && !hasCajaFecha) {
        newErrors.caja_fecha_confirmacion = 'La fecha de confirmación caja es obligatoria cuando se especifica el radicado'
        errorsByTab[2].push('caja_fecha_confirmacion')
        console.log('❌ ERROR CAJA: Falta fecha cuando hay radicado')
      }
      
      // Si tiene fecha pero no radicado
      if (hasCajaFecha && !hasCajaRadicado) {
        newErrors.radicado_ccf = 'El radicado CCF es obligatorio cuando se especifica la fecha'
        errorsByTab[2].push('radicado_ccf')
        console.log('❌ ERROR CAJA: Falta radicado cuando hay fecha')
      }
    }
    
    // Solicitud cesantías → fondo y fecha obligatorios SOLO SI HAY DATOS DE CONFIRMACIÓN
    if (formData.solicitud_cesantias && (
      (typeof formData.fondo_cesantias === 'string' && formData.fondo_cesantias.trim()) || 
      formData.cesantias_fecha_confirmacion
    )) {
      if (!(typeof formData.fondo_cesantias === 'string' && formData.fondo_cesantias.trim())) {
        newErrors.fondo_cesantias = 'El fondo de cesantías es obligatorio cuando se proporciona información de confirmación'
        errorsByTab[2].push('fondo_cesantias')
      }
      if (!formData.cesantias_fecha_confirmacion) {
        newErrors.cesantias_fecha_confirmacion = 'La fecha de confirmación de cesantías es obligatoria cuando se proporciona información de confirmación'
        errorsByTab[2].push('cesantias_fecha_confirmacion')
      }
    }
    
    // Solicitud fondo pensión → fondo y fecha obligatorios SOLO SI HAY DATOS DE CONFIRMACIÓN  
    if (formData.solicitud_fondo_pension && (
      (typeof formData.fondo_pension === 'string' && formData.fondo_pension.trim()) || 
      formData.pension_fecha_confirmacion
    )) {
      if (!(typeof formData.fondo_pension === 'string' && formData.fondo_pension.trim())) {
        newErrors.fondo_pension = 'El fondo de pensión es obligatorio cuando se proporciona información de confirmación'
        errorsByTab[2].push('fondo_pension')
      }
      if (!formData.pension_fecha_confirmacion) {
        newErrors.pension_fecha_confirmacion = 'La fecha de confirmación de pensión es obligatoria cuando se proporciona información de confirmación'
        errorsByTab[2].push('pension_fecha_confirmacion')
      }
    }

    return { errors: newErrors, errorsByTab }
  }

  // Validar pestaña actual (para retrocompatibilidad)
  const validateCurrentTab = (): boolean => {
    const { errors } = validateAllFields()
    const currentTabErrors = Object.keys(errors).filter(field => {
      if (currentTab === 0) {
        return ['primer_nombre', 'primer_apellido', 'numero_identificacion', 'fecha_nacimiento', 'email'].includes(field)
      } else if (currentTab === 1) {
        return ['empresa_final_id', 'fecha_fin', 'salario', 'moneda_custom'].includes(field)
      } else if (currentTab === 2) {
        return [
          'examenes_fecha', 'contrato_fecha_confirmacion', 'arl_nombre', 'arl_fecha_confirmacion',
          'radicado_eps', 'eps_fecha_confirmacion', 'radicado_ccf', 'caja_fecha_confirmacion',
          'fondo_cesantias', 'cesantias_fecha_confirmacion', 'fondo_pension', 'pension_fecha_confirmacion'
        ].includes(field)
      }
      return false
    })

    const currentTabErrorsObj = currentTabErrors.reduce((acc, field) => {
      acc[field] = errors[field]
      return acc
    }, {} as Record<string, string>)

    setErrors(currentTabErrorsObj)
    return currentTabErrors.length === 0
  }

  // Cargar parámetros cuando cambie la fecha de ingreso
  useEffect(() => {
    if (formData.fecha_ingreso) {
      const year = new Date(formData.fecha_ingreso).getFullYear()
      console.log('📅 Fecha de ingreso cambió:', formData.fecha_ingreso, 'Año:', year)
      loadParametrosAnuales(year)
    }
  }, [formData.fecha_ingreso])

  // Recalcular auxilio de transporte cuando cambie el salario o parámetros
  useEffect(() => {
    console.log('🔄 Efecto de recálculo:', { 
      salario: formData.salario, 
      salarioMinimo, 
      auxilioTransporteParametro,
      auxilioActual: formData.auxilio_transporte 
    })
    
    if (formData.salario && formData.salario > 0 && salarioMinimo > 0 && auxilioTransporteParametro > 0) {
      const nuevoAuxilio = calculateAuxilioTransporte(formData.salario)
      console.log('🆕 Nuevo auxilio calculado:', nuevoAuxilio, 'vs actual:', formData.auxilio_transporte)
      
      if (nuevoAuxilio !== formData.auxilio_transporte) {
        console.log('📝 Actualizando auxilio de transporte')
        setFormData(prev => ({ ...prev, auxilio_transporte: nuevoAuxilio }))
      }
    }
  }, [formData.salario, salarioMinimo, auxilioTransporteParametro])

  // Cargar caja de compensación cuando cambien empresa, ciudad o fecha de ingreso
  useEffect(() => {
    if (formData.empresa_final_id && formData.ciudad_labora && formData.fecha_ingreso) {
      console.log('🔄 Cargando caja para:', {
        empresa: formData.empresa_final_id,
        ciudad: formData.ciudad_labora,
        fecha: formData.fecha_ingreso
      })
      loadCajaCompensacionActiva(formData.empresa_final_id, formData.ciudad_labora, formData.fecha_ingreso)
    } else {
      setCajaCompensacionActiva('')
    }
  }, [formData.empresa_final_id, formData.ciudad_labora, formData.fecha_ingreso])

  // Cargar ARL cuando cambien empresa o fecha de ingreso
  useEffect(() => {
    if (formData.empresa_final_id && formData.fecha_ingreso) {
      console.log('🔄 Cargando ARL para:', {
        empresa: formData.empresa_final_id,
        fecha: formData.fecha_ingreso
      })
      loadArlActiva(formData.empresa_final_id, formData.fecha_ingreso)
    } else {
      setArlActiva('')
    }
  }, [formData.empresa_final_id, formData.fecha_ingreso])

  // Cargar información de ARL y Cajas de la empresa seleccionada (para mostrar en cuadro informativo)
  const loadEmpresaInfo = async (empresaId: string) => {
    if (!empresaId) {
      setEmpresaInfo({ arl: null, cajas: [], loading: false })
      return
    }

    setEmpresaInfo(prev => ({ ...prev, loading: true }))

    try {
      // Cargar ARL activa usando la función RPC
      const { data: arlData, error: arlError } = await supabase
        .rpc('get_empresa_arl_actual', { empresa_uuid: empresaId })

      // Cargar todas las cajas activas usando la función RPC
      const { data: cajasData, error: cajasError } = await supabase
        .rpc('get_empresa_cajas_actuales', { empresa_uuid: empresaId })

      const arl = arlData && arlData.length > 0 
        ? { id: arlData[0].arl_id, nombre: arlData[0].arl_nombre }
        : null

      const cajas = cajasData && cajasData.length > 0
        ? cajasData.map((caja: any) => ({
            id: caja.caja_id,
            nombre: caja.caja_nombre,
            ciudad: caja.ciudad_nombre
          }))
        : []

      setEmpresaInfo({
        arl,
        cajas,
        loading: false
      })

    } catch (error) {
      console.error('Error cargando información de empresa:', error)
      setEmpresaInfo({ arl: null, cajas: [], loading: false })
    }
  }

  // Cargar información de empresa cuando se selecciona
  useEffect(() => {
    if (formData.empresa_final_id) {
      loadEmpresaInfo(formData.empresa_final_id)
    } else {
      setEmpresaInfo({ arl: null, cajas: [], loading: false })
    }
  }, [formData.empresa_final_id])

  // Manejar cambios en el formulario
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpiar error del campo cuando el usuario escribe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Lógica especial para fecha_fin
    if (field === 'tipo_contrato') {
      if (value === 'indefinido') {
        setFormData(prev => ({ ...prev, fecha_fin: '' }))
      }
    }

    // Lógica especial para empresa_interna
    if (field === 'empresa_interna') {
      if (value === 'temporal') {
        // Si es Temporal y el tipo de contrato no es obra_o_labor, resetearlo
        setFormData(prev => ({
          ...prev,
          empresa_interna: value,
          tipo_contrato: prev.tipo_contrato !== 'obra_o_labor' ? '' : prev.tipo_contrato
        }))
        return // Salir temprano para evitar el setFormData de arriba
      }
    }
  }

  // Navegación libre entre pestañas
  const goToTab = (tabIndex: number) => {
    setCurrentTab(tabIndex)
    // Scroll al inicio del modal al cambiar de pestaña
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }

  // Función para guardar el historial de períodos Y el período actual
  const guardarHistorialPeriodos = async (contractId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      console.log('🔄 Guardando historial de períodos:', periodosHistorial.length, 'períodos')

      // 🔧 CORRECCIÓN: En modo edición, usar función para limpiar períodos
      if (mode === 'edit') {
        console.log('🧹 Limpiando períodos existentes para evitar duplicados...')
        
        // Usar función RPC que tiene los permisos adecuados
        const { error: cleanError } = await supabase.rpc('clean_contract_periods', {
          contract_uuid: contractId
        })

        if (cleanError) {
          console.error('❌ Error limpiando períodos existentes:', cleanError)
          // Si la función no existe, intentamos con update (marcar como inactivos)
          console.log('🔄 Intentando método alternativo...')
          
          const { error: updateError } = await supabase
            .from('historial_contratos_fijos')
            .update({ es_periodo_actual: false })
            .eq('contract_id', contractId)

          if (updateError) {
            console.error('❌ Error con método alternativo:', updateError)
            throw new Error('No se pudieron actualizar los períodos anteriores')
          }
        }
        
        console.log('✅ Períodos anteriores procesados correctamente')
      }

      // 1. Crear períodos de historial (PASADOS/TERMINADOS)
      for (let i = 0; i < periodosHistorial.length; i++) {
        const periodo = periodosHistorial[i]
        console.log(`📝 Guardando período histórico #${i + 1}:`, periodo)
        
        const { data, error } = await supabase.rpc('create_contract_period', {
          contract_uuid: contractId,
          p_fecha_inicio: periodo.fecha_inicio,
          p_fecha_fin: periodo.fecha_fin,
          p_tipo_periodo: periodo.tipo_periodo,
          p_es_actual: false, // Los históricos SIEMPRE son false
          user_id: user.id
        })

        if (error) {
          console.error(`❌ Error guardando período #${i + 1}:`, error)
          // Convertir errores técnicos a mensajes humanos
          const errorHumano = convertirErrorTecnicoAHumano(error)
          throw new Error(errorHumano)
        }
        
        console.log(`✅ Período #${i + 1} guardado correctamente:`, data)
      }

      // 2. Crear el período ACTUAL (el contrato que se está creando)
      if (formData.fecha_ingreso && formData.fecha_fin) {
        console.log('📝 Guardando período ACTUAL del contrato')
        
        const { data, error } = await supabase.rpc('create_contract_period', {
          contract_uuid: contractId,
          p_fecha_inicio: formData.fecha_ingreso,
          p_fecha_fin: formData.fecha_fin,
          p_tipo_periodo: periodosHistorial.length === 0 ? 'inicial' : 'prorroga_automatica',
          p_es_actual: true, // Este SÍ es el período actual
          user_id: user.id
        })

        if (error) {
          console.error('❌ Error guardando período actual:', error)
          const errorHumano = convertirErrorTecnicoAHumano(error)
          throw new Error(errorHumano)
        }
        
        console.log('✅ Período actual guardado correctamente:', data)
      }

      console.log('🎉 Historial completo guardado exitosamente')
    } catch (error) {
      console.error('💥 Error guardando historial de períodos:', error)
      throw error
    }
  }

  // Función para convertir errores técnicos de base de datos a mensajes humanos
  const convertirErrorTecnicoAHumano = (error: any): string => {
    const errorMessage = error.message || error.toString()

    // Errores comunes de constraints
    if (errorMessage.includes('check_fechas_validas')) {
      return 'Las fechas del período no son válidas. La fecha de inicio debe ser anterior a la fecha de fin.'
    }
    
    if (errorMessage.includes('unique_numero_periodo_por_contrato')) {
      return 'Ya existe un período con ese número para este contrato.'
    }
    
    if (errorMessage.includes('unique_periodo_actual_por_contrato')) {
      return 'Ya existe un período actual para este contrato.'
    }
    
    if (errorMessage.includes('check_numero_periodo_positivo')) {
      return 'El número de período debe ser mayor a cero.'
    }
    
    if (errorMessage.includes('check_tipo_periodo_valido')) {
      return 'El tipo de período no es válido. Debe ser: inicial, prórroga automática o prórroga acordada.'
    }

    // Errores de foreign key
    if (errorMessage.includes('foreign key')) {
      return 'Error de referencia en los datos. Verifique que el contrato exista.'
    }

    // Error genérico más humano
    return 'No se pudo guardar el historial de períodos. Verifique que las fechas sean correctas y no se superpongan.'
  }

  const nextTab = () => {
    if (currentTab < tabs.length - 1) {
      setCurrentTab(currentTab + 1)
      // Scroll al inicio del modal al cambiar de pestaña
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
    }
  }

  const prevTab = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1)
      // Scroll al inicio del modal al cambiar de pestaña
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
    }
  }

  // Enviar formulario con validación inteligente
  const handleSubmit = async (saveAs: 'borrador' | 'aprobado' = 'aprobado') => {
    // Si es borrador, no validar - permitir guardar incompleto
    // Si es aprobado, validar todo
    if (saveAs === 'aprobado') {
      const { errors, errorsByTab } = validateAllFields()
      
      if (Object.keys(errors).length > 0) {
      // Encontrar la primera pestaña con errores
      const firstTabWithErrors = Object.keys(errorsByTab).find(tabIndex => 
        errorsByTab[parseInt(tabIndex)].length > 0
      )
      
      if (firstTabWithErrors) {
        setCurrentTab(parseInt(firstTabWithErrors))
        setErrors(errors)
        
        // Mostrar mensaje indicando que hay errores y dónde
        const tabNames = ['Información Personal', 'Detalles del Contrato', 'Onboarding']
        const errorTabs = Object.keys(errorsByTab)
          .filter(tabIndex => errorsByTab[parseInt(tabIndex)].length > 0)
          .map(tabIndex => tabNames[parseInt(tabIndex)])
        
        // Crear mensaje detallado de errores para debugging
        const detailedErrors = Object.keys(errors)
          .filter(key => key !== 'general')
          .map(key => `${key}: ${errors[key]}`)
        
        console.log('🔍 ERRORES DETALLADOS:', detailedErrors)
        console.log('📋 ERRORES POR TAB:', errorsByTab)
        
        // 🚨 DEBUGGING PROFUNDO - JSON COMPLETO
        console.log('🚨 DEBUG COMPLETO - ERRORES:', JSON.stringify({
          errors: errors,
          errorsByTab: errorsByTab,
          detailedErrors: detailedErrors,
          formDataARL: {
            solicitud_inscripcion_arl: formData.solicitud_inscripcion_arl,
            arl_nombre: formData.arl_nombre,
            arl_fecha_confirmacion: formData.arl_fecha_confirmacion,
            arl_nombre_type: typeof formData.arl_nombre,
            arl_nombre_trim: formData.arl_nombre?.trim?.(),
            arl_nombre_length: formData.arl_nombre?.length
          },
          formDataCaja: {
            envio_inscripcion_caja: formData.envio_inscripcion_caja,
            radicado_ccf: formData.radicado_ccf,
            caja_fecha_confirmacion: formData.caja_fecha_confirmacion,
            radicado_ccf_type: typeof formData.radicado_ccf,
            radicado_ccf_trim: formData.radicado_ccf?.trim?.(),
            radicado_ccf_length: formData.radicado_ccf?.length
          },
          formDataEPS: {
            solicitud_eps: formData.solicitud_eps,
            radicado_eps: formData.radicado_eps,
            eps_fecha_confirmacion: formData.eps_fecha_confirmacion,
            radicado_eps_type: typeof formData.radicado_eps,
            radicado_eps_trim: formData.radicado_eps?.trim?.(),
            radicado_eps_length: formData.radicado_eps?.length
          },
          timestamp: new Date().toISOString()
        }, null, 2))
        
        setErrors({
          ...errors,
          general: `Hay campos obligatorios pendientes en: ${errorTabs.join(', ')}. Ver consola para detalles.`
        })
      }
      return
    }
    }

    setLoading(true)
    try {
      // Crear objeto limpio solo con campos que existen en la tabla contracts
      const dataToSave = {
        // Solo actualizar status_aprobacion en modo creación
        // En modo edición, el status solo se cambia mediante el botón de aprobación
        ...(mode === 'create' ? { status_aprobacion: saveAs } : {}),
        primer_nombre: formData.primer_nombre,
        segundo_nombre: formData.segundo_nombre || null,
        primer_apellido: formData.primer_apellido,
        segundo_apellido: formData.segundo_apellido || null,
        tipo_identificacion: formData.tipo_identificacion,
        numero_identificacion: formData.numero_identificacion,
        fecha_expedicion_documento: formData.fecha_expedicion_documento || null,
        fecha_nacimiento: formData.fecha_nacimiento,
        celular: formData.celular || null,
        email: formData.email || null,
        empresa_interna: formData.empresa_interna,
        empresa_final_id: formData.empresa_final_id,
        ciudad_labora: formData.ciudad_labora || null,
        cargo: formData.cargo || null,
        numero_contrato_helisa: null,
        base_sena: formData.base_sena,
        fecha_ingreso: formData.fecha_ingreso || null,
        tipo_contrato: formData.tipo_contrato || null,
        arl_risk_level: formData.arl_risk_level || null,
        fecha_fin: formData.fecha_fin || null,
        tipo_salario: formData.tipo_salario || null,
        moneda: formData.moneda === 'otro' && formData.moneda_custom 
          ? formData.moneda_custom.toUpperCase() 
          : (formData.moneda || 'COP'),
        salario: formData.salario || null,
        auxilios: formData.auxilios && formData.auxilios.length > 0 
          ? formData.auxilios.map(aux => ({
              tipo: aux.tipo,
              monto: aux.monto,
              moneda: aux.moneda || formData.moneda || 'COP'
            }))
          : [],
        auxilio_transporte: formData.auxilio_transporte || null,
        tiene_condicion_medica: formData.tiene_condicion_medica || false,
        condicion_medica_detalle: (typeof formData.condicion_medica_detalle === 'string' && formData.condicion_medica_detalle.trim()) || null,
        fuero: formData.fuero || false,
        fuero_detalle: (typeof formData.fuero_detalle === 'string' && formData.fuero_detalle.trim()) || null,
        pensionado: formData.pensionado || false,
        beneficiario_hijo: formData.beneficiario_hijo,
        beneficiario_madre: formData.beneficiario_madre,
        beneficiario_padre: formData.beneficiario_padre,
        beneficiario_conyuge: formData.beneficiario_conyuge,
        fecha_solicitud: formData.fecha_solicitud || null,
        fecha_radicado: formData.fecha_radicado || null,
        programacion_cita_examenes: formData.programacion_cita_examenes,
        examenes: formData.examenes,
        examenes_fecha: formData.examenes_fecha || null,
        solicitud_inscripcion_arl: formData.solicitud_inscripcion_arl,
        arl_nombre: (typeof formData.arl_nombre === 'string' && formData.arl_nombre.trim()) || null,
        arl_fecha_confirmacion: formData.arl_fecha_confirmacion || null,
        envio_contrato: formData.envio_contrato,
        recibido_contrato_firmado: formData.recibido_contrato_firmado,
        contrato_fecha_confirmacion: formData.contrato_fecha_confirmacion || null,
        solicitud_eps: formData.solicitud_eps,
        eps_fecha_confirmacion: formData.eps_fecha_confirmacion || null,
        envio_inscripcion_caja: formData.envio_inscripcion_caja,
        caja_fecha_confirmacion: formData.caja_fecha_confirmacion || null,
        solicitud_cesantias: formData.solicitud_cesantias,
        fondo_cesantias: (typeof formData.fondo_cesantias === 'string' && formData.fondo_cesantias.trim()) || null,
        cesantias_fecha_confirmacion: formData.cesantias_fecha_confirmacion || null,
        solicitud_fondo_pension: formData.solicitud_fondo_pension,
        fondo_pension: (typeof formData.fondo_pension === 'string' && formData.fondo_pension.trim()) || null,
        pension_fecha_confirmacion: formData.pension_fecha_confirmacion || null,
        dropbox: formData.dropbox || null,
        radicado_eps: (typeof formData.radicado_eps === 'string' && formData.radicado_eps.trim()) || null,
        radicado_ccf: (typeof formData.radicado_ccf === 'string' && formData.radicado_ccf.trim()) || null,
        observacion: formData.observacion || null,
        // Agregar campos de auditoría
        ...(mode === 'create' && { created_by: (await supabase.auth.getUser()).data.user?.id }),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      }

      let error
      let contractId = contract?.id
      
      if (mode === 'create') {
        const result = await supabase
          .from('contracts')
          .insert([dataToSave])
          .select()
          .single()
        error = result.error
        contractId = result.data?.id
      } else {
        const result = await supabase
          .from('contracts')
          .update(dataToSave)
          .eq('id', contract?.id)
        error = result.error
      }

      if (error) throw error

      // Si es contrato fijo y hay períodos de historial, guardarlos
      if (formData.tipo_contrato === 'fijo' && periodosHistorial.length > 0 && contractId) {
        await guardarHistorialPeriodos(contractId)
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving contract:', error)
      
      // Convertir errores técnicos a mensajes humanos
      const errorMessage = error.message || error.toString()
      
      if (error.code === '23505') {
        if (errorMessage.includes('numero_contrato_helisa')) {
          setErrors({ numero_contrato_helisa: 'Este número de contrato ya existe en el sistema' })
        } else if (errorMessage.includes('numero_identificacion')) {
          setErrors({ numero_identificacion: 'Ya existe un contrato con esta identificación' })
        } else {
          setErrors({ general: 'Ya existe un registro con esta información' })
        }
      } else if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
        setErrors({ general: 'Ya existe un registro con esta información' })
      } else if (errorMessage.includes('foreign key')) {
        setErrors({ general: 'Error en los datos relacionados. Verifique que la empresa seleccionada sea válida.' })
      } else if (errorMessage.includes('check constraint')) {
        setErrors({ general: 'Algunos datos no cumplen con las validaciones requeridas' })
      } else if (errorMessage.includes('not null')) {
        setErrors({ general: 'Faltan campos obligatorios por completar' })
      } else {
        // Mantener el mensaje original si no podemos convertirlo
        setErrors({ general: errorMessage || 'Error al guardar el contrato' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Modal container
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-auto my-0 flex flex-col h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[calc(100vh-4rem)]">
        
        {/* Header con stepper */}
        <div className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h2 className="text-lg font-bold">
                {mode === 'create' ? 'Nuevo Contrato' : isReadOnly ? 'Ver Contrato' : 'Editar Contrato'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 hover:bg-[#0A6A6A] rounded-full flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper horizontal clickeable */}
          <div className="flex items-center justify-between">
            {tabs.map((tab, index) => (
              <div key={tab.id} className="flex items-center">
                <div className="flex items-center">
                  <button
                    onClick={() => goToTab(index)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                      currentTab === index
                        ? 'bg-[#87E0E0] text-[#004C4C] shadow-lg'
                        : currentTab > index
                        ? 'bg-[#5FD3D2] text-[#004C4C] hover:bg-[#87E0E0]'
                        : 'bg-[#0A6A6A] text-[#87E0E0] hover:bg-[#065C5C]'
                    }`}
                    title={`Ir a ${tab.name}`}
                  >
                    <tab.icon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => goToTab(index)}
                    className="ml-2 hidden sm:block"
                  >
                    <p className={`text-xs font-medium transition-colors hover:text-[#87E0E0] ${
                      currentTab >= index ? 'text-[#87E0E0]' : 'text-[#58BFC2]'
                    }`}>
                      {tab.name}
                    </p>
                  </button>
                </div>
                {index < tabs.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-[#58BFC2] mx-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4">
            
            {/* Error general */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Tab 1: Información Personal */}
            {currentTab === 0 && (
              <div className="space-y-3 lg:space-y-4">
                {/* Botones OCR y Buscar Cédula - Solo mostrar en modo creación */}
                {mode === 'create' && (
                  <div className="mb-4 flex justify-end gap-3">
                    <button
                      onClick={handleSearchCedula}
                      disabled={isReadOnly || loading || !formData.numero_identificacion.trim()}
                      className="inline-flex items-center px-4 py-2 bg-[#0A6A6A] text-[#E6F5F7] text-sm font-medium rounded-lg hover:bg-[#065C5C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      title={!formData.numero_identificacion.trim() ? "Ingrese una cédula primero" : "Buscar datos de contratos anteriores"}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Buscar Cédula
                    </button>
                    <OCRButton
                      onDataExtracted={handleOCRDataExtracted}
                      disabled={isReadOnly}
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Primero: Tipo de documento y número */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tipo de Identificación *
                    </label>
                    <select
                      value={formData.tipo_identificacion}
                      onChange={(e) => !isReadOnly && handleInputChange('tipo_identificacion', e.target.value)}
                      {...getInputProps('tipo_identificacion')}
                    >
                      <option value="">Seleccionar tipo de documento...</option>
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="PPT">PPT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Número de Identificación *
                    </label>
                    <input
                      type="text"
                      value={formData.numero_identificacion}
                      onChange={(e) => !isReadOnly && handleInputChange('numero_identificacion', e.target.value)}
                      {...getInputProps('numero_identificacion', !!errors.numero_identificacion)}
                      placeholder="Ej: 1234567890"
                    />
                    {errors.numero_identificacion && (
                      <p className="text-red-600 text-xs mt-1">{errors.numero_identificacion}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fecha de Expedición del Documento
                    </label>
                    <input
                      type="date"
                      {...getDateLimits('document')}
                      value={formData.fecha_expedicion_documento || ''}
                      onChange={(e) => {
                        if (!isReadOnly) {
                          // Permitir escribir sin validar hasta que el campo esté completo
                          handleInputChange('fecha_expedicion_documento', e.target.value)
                        }
                      }}
                      onBlur={(e) => {
                        // Validar solo cuando el usuario termine de escribir (onBlur)
                        if (!isReadOnly && e.target.value) {
                          validateDateInput(e.target.value, 'document', true, true)
                        }
                      }}
                      {...getInputProps('fecha_expedicion_documento')}
                    />
                  </div>

                  {/* Separador visual */}
                  <div className="col-span-1 lg:col-span-2">
                    <hr className="border-gray-200 my-4" />
                    <h4 className="text-md font-medium text-gray-800 mb-4">Información Personal</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Primer Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.primer_nombre}
                      onChange={(e) => !isReadOnly && handleInputChange('primer_nombre', e.target.value)}
                      {...getInputProps('primer_nombre', !!errors.primer_nombre)}
                      placeholder="Ej: Juan"
                    />
                    {errors.primer_nombre && (
                      <p className="text-red-600 text-xs mt-1">{errors.primer_nombre}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Segundo Nombre
                    </label>
                    <input
                      type="text"
                      value={formData.segundo_nombre || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('segundo_nombre', e.target.value)}
                      {...getInputProps('segundo_nombre')}
                      placeholder="Ej: Carlos"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Primer Apellido *
                    </label>
                    <input
                      type="text"
                      value={formData.primer_apellido}
                      onChange={(e) => !isReadOnly && handleInputChange('primer_apellido', e.target.value)}
                      {...getInputProps('primer_apellido', !!errors.primer_apellido)}
                      placeholder="Ej: Pérez"
                    />
                    {errors.primer_apellido && (
                      <p className="text-red-600 text-xs mt-1">{errors.primer_apellido}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Segundo Apellido
                    </label>
                    <input
                      type="text"
                      value={formData.segundo_apellido || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('segundo_apellido', e.target.value)}
                      {...getInputProps('segundo_apellido')}
                      placeholder="Ej: González"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fecha de Nacimiento *
                    </label>
                    <input
                      type="date"
                      {...getDateLimits('birth')}
                      value={formData.fecha_nacimiento}
                      onChange={(e) => {
                        if (!isReadOnly) {
                          // Permitir escribir sin validar hasta que el campo esté completo
                          handleInputChange('fecha_nacimiento', e.target.value)
                        }
                      }}
                      onBlur={(e) => {
                        // Validar solo cuando el usuario termine de escribir (onBlur)
                        if (!isReadOnly && e.target.value) {
                          validateDateInput(e.target.value, 'birth', true, true)
                        }
                      }}
                      {...getInputProps('fecha_nacimiento', !!errors.fecha_nacimiento)}
                    />
                    {errors.fecha_nacimiento && (
                      <p className="text-red-600 text-xs mt-1">{errors.fecha_nacimiento}</p>
                    )}
                  </div>


                  {/* Separador visual */}
                  <div className="col-span-1 lg:col-span-2">
                    <hr className="border-gray-200 my-3" />
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Información de Contacto</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Celular
                    </label>
                    <input
                      type="tel"
                      value={formData.celular || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('celular', e.target.value)}
                      {...getInputProps('celular')}
                      placeholder="Ej: +57 300 123 4567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('email', e.target.value)}
                      {...getInputProps('email', !!errors.email)}
                      placeholder="Ej: juan.perez@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Detalles del Contrato */}
            {currentTab === 1 && (
              <div className="space-y-3 lg:space-y-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Detalles del Contrato</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Empresa Interna *
                    </label>
                    <select
                      value={formData.empresa_interna}
                      onChange={(e) => !isReadOnly && handleInputChange('empresa_interna', e.target.value)}
                      {...getInputProps('empresa_interna')}
                    >
                      <option value="">Seleccionar empresa interna...</option>
                      <option value="temporal">Temporal</option>
                      <option value="outsourcing">Outsourcing</option>
                    </select>
                    {errors.empresa_interna && (
                      <p className="text-red-600 text-xs mt-1">{errors.empresa_interna}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Empresa Cliente *
                    </label>
                    <CompanySelector
                      companies={companies}
                      selectedCompanyId={formData.empresa_final_id}
                      onCompanySelect={(companyId) => !isReadOnly && handleInputChange('empresa_final_id', companyId)}
                      placeholder="Buscar y seleccionar empresa cliente..."
                      disabled={isReadOnly}
                      error={!!errors.empresa_final_id}
                    />
                    {errors.empresa_final_id && (
                      <p className="text-red-600 text-xs mt-1">{errors.empresa_final_id}</p>
                    )}
                    
                    {/* Cuadro informativo de ARL y Cajas */}
                    {formData.empresa_final_id && (
                      <div className="mt-3 p-3 bg-[#E6F5F7] border border-[#87E0E0] rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="h-4 w-4 text-[#004C4C]" />
                          <h4 className="text-xs font-semibold text-[#004C4C]">Información de la Empresa</h4>
                        </div>
                        
                        {empresaInfo.loading ? (
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <div className="w-3 h-3 border-2 border-[#87E0E0] border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando información...</span>
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            {/* ARL */}
                            <div className="flex items-start space-x-2">
                              <span className="text-[#065C5C] font-medium min-w-[60px]">🛡️ ARL:</span>
                              {empresaInfo.arl ? (
                                <span className="text-gray-700">{empresaInfo.arl.nombre}</span>
                              ) : (
                                <span className="text-gray-500 italic">No configurada</span>
                              )}
                            </div>
                            
                            {/* Cajas de Compensación */}
                            <div className="flex items-start space-x-2">
                              <span className="text-[#065C5C] font-medium min-w-[60px]">📦 Caja:</span>
                              {empresaInfo.cajas.length > 0 ? (
                                <div className="flex-1 space-y-1">
                                  {empresaInfo.cajas.map((caja, index) => (
                                    <div key={caja.id} className="text-gray-700">
                                      {caja.nombre}
                                      {caja.ciudad && (
                                        <span className="text-gray-500 ml-1">({caja.ciudad})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500 italic">No configurada</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ciudad donde Labora
                    </label>
                    <CitySelector
                      empresaId={formData.empresa_final_id}
                      selectedCityId={formData.ciudad_labora || ''}
                      onCitySelect={(cityId, cityName) => !isReadOnly && handleInputChange('ciudad_labora', cityId)}
                      placeholder="Seleccionar ciudad donde labora..."
                      disabled={isReadOnly || !formData.empresa_final_id}
                      error={!!errors.ciudad_labora}
                    />
                    {errors.ciudad_labora && (
                      <p className="text-red-600 text-xs mt-1">{errors.ciudad_labora}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cargo
                    </label>
                    <input
                      type="text"
                      value={formData.cargo || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('cargo', e.target.value)}
                      {...getInputProps('cargo')}
                      placeholder="Ej: Desarrollador"
                    />
                  </div>



                  {/* Tipo de Contrato - Fila completa */}
                  <div className="col-span-1 lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tipo de Contrato
                    </label>
                    <select
                      value={formData.tipo_contrato || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('tipo_contrato', e.target.value)}
                      {...getInputProps('tipo_contrato')}
                    >
                      <option value="">Seleccionar tipo de contrato...</option>
                      {formData.empresa_interna === 'temporal' ? (
                        // Solo Obra o Labor para empresa Temporal
                        <option value="obra_o_labor">Obra o Labor</option>
                      ) : (
                        // Todas las opciones para otras empresas
                        <>
                          <option value="indefinido">Indefinido</option>
                          <option value="fijo">Fijo</option>
                          <option value="obra_o_labor">Obra o Labor</option>
                          <option value="sena_universitario">SENA/Universitario</option>
                          <option value="convenio_institucional">Convenio Institucional</option>
                        </>
                      )}
                    </select>
                    {errors.tipo_contrato && (
                      <p className="text-red-600 text-xs mt-1">{errors.tipo_contrato}</p>
                    )}
                    
                    {/* Botón de Historial - Solo para contratos fijos */}
                    {formData.tipo_contrato === 'fijo' && !isReadOnly && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setShowHistorialModal(true)}
                          className={`w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                            periodosHistorial.length > 0
                              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                              : 'bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white hover:from-[#065C5C] hover:to-[#0A6A6A]'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m6-8a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-sm">
                            {periodosHistorial.length > 0 
                              ? `📝 Historial: ${periodosHistorial.length} períodos` 
                              : '✨ Ingresar Historial de Períodos'
                            }
                          </span>
                        </button>
                        
                        {periodosHistorial.length === 0 ? (
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            ¿Este empleado ya tuvo prórrogas anteriores?
                          </p>
                        ) : (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="text-xs text-green-800 text-center">
                              <div className="font-medium">
                                {contractFixedStatus && (
                                  <>
                                    🎯 Próximo será período #{contractFixedStatus.proximoPeriodo} • 
                                    ⏱️ {contractFixedStatus.añosTotales} años trabajados
                                    {contractFixedStatus.debeSerIndefinido && (
                                      <div className="text-red-600 font-bold mt-1">
                                        ⚠️ DEBE SER INDEFINIDO POR LEY
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nivel de Riesgo ARL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nivel de Riesgo ARL
                    </label>
                    <select
                      value={formData.arl_risk_level || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('arl_risk_level', e.target.value ? parseInt(e.target.value) : null)}
                      {...getInputProps('arl_risk_level')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                    >
                      <option value="">Seleccionar nivel de riesgo...</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                    {errors.arl_risk_level && (
                      <p className="text-red-600 text-xs mt-1">{errors.arl_risk_level}</p>
                    )}
                  </div>

                  {/* Campo SENA mejorado con tooltip */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="base_sena"
                          checked={formData.base_sena}
                          onChange={(e) => !isReadOnly && handleInputChange('base_sena', e.target.checked)}
                          {...getCheckboxProps()}
                          className="w-5 h-5"
                        />
                        <div className="text-base font-bold text-blue-800 flex items-center space-x-2">
                          <span>🏛️ Aporta al SENA</span>
                          <div className="relative group">
                            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold cursor-help">
                              ?
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
                              <div className="font-medium mb-1">ℹ️ Cargos que NO aplican al SENA:</div>
                              <ul className="list-disc list-inside space-y-0.5">
                                <li>Conductores</li>
                                <li>Aprendices</li>
                                <li>Extranjeros</li>
                                <li>Dirección/Confianza</li>
                                <li>Manejo</li>
                              </ul>
                              {/* Flecha del tooltip */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fechas - Una fila para las dos fechas */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fecha de Ingreso
                      {periodosHistorial.length > 0 && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          🔒 Auto-calculada
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      {...getDateLimits('work')}
                      value={formData.fecha_ingreso || ''}
                      onChange={(e) => {
                        if (!isReadOnly && !periodosHistorial.length) {
                          // Permitir escribir sin validar hasta que el campo esté completo
                          handleInputChange('fecha_ingreso', e.target.value)
                        }
                      }}
                      onBlur={(e) => {
                        // Validar solo cuando el usuario termine de escribir (onBlur)
                        if (!isReadOnly && !periodosHistorial.length && e.target.value) {
                          validateDateInput(e.target.value, 'work', true, true)
                        }
                      }}
                      disabled={isReadOnly || periodosHistorial.length > 0} // Bloquear si hay historial
                      className={`w-full px-4 py-3 border rounded-xl transition-all ${
                        isReadOnly || periodosHistorial.length > 0
                          ? 'bg-blue-50 text-blue-800 cursor-not-allowed border-blue-300 select-none pointer-events-none' 
                          : `focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent border-gray-300`
                      }`}
                    />
                    {periodosHistorial.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        🔒 Calculada automáticamente del historial: día siguiente al último período terminado
                      </p>
                    )}
                  </div>

                  {/* Fecha fin SIEMPRE visible - se deshabilita si es indefinido */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fecha de Terminación
                      {formData.tipo_contrato === 'indefinido' && (
                        <span className="text-xs text-gray-500 ml-1">(No aplica)</span>
                      )}
                    </label>
                    <input
                      type="date"
                      {...getDateLimits('work')}
                      value={formData.tipo_contrato === 'indefinido' ? '' : formData.fecha_fin || ''}
                      onChange={(e) => {
                        if (!isReadOnly) {
                          // Permitir escribir sin validar hasta que el campo esté completo
                          handleInputChange('fecha_fin', e.target.value)
                        }
                      }}
                      onBlur={(e) => {
                        // Validar solo cuando el usuario termine de escribir (onBlur)
                        if (!isReadOnly && e.target.value) {
                          validateDateInput(e.target.value, 'work', true, true)
                        }
                      }}
                      {...getInputProps('fecha_fin', !!errors.fecha_fin)}
                      disabled={formData.tipo_contrato === 'indefinido' || isReadOnly}
                      className={`${getInputProps('fecha_fin', !!errors.fecha_fin).className} ${
                        formData.tipo_contrato === 'indefinido' 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : ''
                      }`}
                    />
                    {errors.fecha_fin && formData.tipo_contrato !== 'indefinido' && (
                      <p className="text-red-600 text-xs mt-1">{errors.fecha_fin}</p>
                    )}
                  </div>

                  {/* Tipo de Salario - Fila completa */}
                  <div className="col-span-1 lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tipo de Salario
                    </label>
                    <select
                      value={formData.tipo_salario || ''}
                      onChange={(e) => !isReadOnly && handleInputChange('tipo_salario', e.target.value)}
                      {...getInputProps('tipo_salario')}
                    >
                      <option value="">Seleccionar tipo de salario...</option>
                      <option value="ordinario">Ordinario</option>
                      <option value="integral">Integral</option>
                      <option value="tiempo_parcial">Tiempo parcial</option>
                    </select>
                    {errors.tipo_salario && (
                      <p className="text-red-600 text-xs mt-1">{errors.tipo_salario}</p>
                    )}
                  </div>

                  {/* Moneda */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Moneda *
                    </label>
                    <select
                      value={formData.moneda || 'COP'}
                      onChange={(e) => {
                        if (!isReadOnly) {
                          const nuevaMoneda = e.target.value
                          handleInputChange('moneda', nuevaMoneda)
                          // Si cambia de "otro" a otra opción, limpiar moneda_custom
                          if (nuevaMoneda !== 'otro') {
                            handleInputChange('moneda_custom', '')
                          }
                        }
                      }}
                      {...getInputProps('moneda')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                    >
                      <option value="COP">COP - Peso Colombiano</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  
                  {/* Campo de moneda personalizada (solo si se selecciona "Otro") */}
                  {formData.moneda === 'otro' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Especificar Moneda *
                      </label>
                      <input
                        type="text"
                        value={formData.moneda_custom || ''}
                        onChange={(e) => {
                          if (!isReadOnly) {
                            // Convertir a mayúsculas automáticamente
                            handleInputChange('moneda_custom', e.target.value.toUpperCase())
                          }
                        }}
                        {...getInputProps('moneda_custom', !!errors.moneda_custom)}
                        placeholder="Ej: USD, GBP, etc."
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                      />
                      {errors.moneda_custom && (
                        <p className="text-red-600 text-xs mt-1">{errors.moneda_custom}</p>
                      )}
                    </div>
                  )}

                  {/* Layout fijo - Salario y Auxilio Transporte siempre juntos */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Salario
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.salario ? formatNumberWithDots(formData.salario) : ''}
                        onChange={(e) => {
                          if (!isReadOnly) {
                            const numericValue = parseNumberFromDots(e.target.value)
                            handleInputChange('salario', numericValue)
                          }
                        }}
                        {...getInputProps('salario', !!errors.salario)}
                        placeholder="Ej: 3.500.000"
                        className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <span className="text-sm font-medium text-gray-600">
                          {formData.moneda === 'otro' && formData.moneda_custom 
                            ? formData.moneda_custom 
                            : (formData.moneda || 'COP')}
                        </span>
                      </div>
                    </div>
                    {errors.salario && (
                      <p className="text-red-600 text-xs mt-1">{errors.salario}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Auxilio de Transporte
                      <span className="text-xs text-blue-600 ml-1">(Calculado automáticamente)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.auxilio_transporte ? formatNumberWithDots(formData.auxilio_transporte) : '0'}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                        placeholder="Se calcula según salario"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="group relative">
                          <div className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs cursor-help">
                            ?
                          </div>
                          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-48">
                            Se asigna si el salario es ≤ 2 salarios mínimos
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nuevo formulario de auxilios */}
                  <div className="col-span-1 lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Auxilios
                    </label>
                    
                    {/* Fila para agregar auxilio */}
                    <div className="flex items-end space-x-2 mb-3">
                      {/* Selector de tipo */}
                      <div className="flex-1">
                        <select
                          value={nuevoAuxilioTipo}
                          onChange={(e) => !isReadOnly && setNuevoAuxilioTipo(e.target.value as 'salarial' | 'no_salarial')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent text-sm"
                          disabled={isReadOnly}
                        >
                          <option value="salarial">Auxilio Salarial</option>
                          <option value="no_salarial">Auxilio No Salarial</option>
                        </select>
                      </div>
                      
                      {/* Campo de monto */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={nuevoAuxilioMonto}
                          onChange={(e) => {
                            if (!isReadOnly) {
                              const numericValue = parseNumberFromDots(e.target.value)
                              setNuevoAuxilioMonto(formatNumberWithDots(numericValue))
                            }
                          }}
                          placeholder="Ej: 150.000"
                          className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent text-sm"
                          disabled={isReadOnly}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <span className="text-sm font-medium text-gray-600">
                            {formData.moneda === 'otro' && formData.moneda_custom 
                              ? formData.moneda_custom 
                              : (formData.moneda || 'COP')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Botón agregar */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isReadOnly && nuevoAuxilioMonto.trim()) {
                            const monto = parseNumberFromDots(nuevoAuxilioMonto)
                            if (monto > 0) {
                              const nuevoAuxilio: Auxilio = {
                                tipo: nuevoAuxilioTipo,
                                monto: monto,
                                moneda: formData.moneda === 'otro' && formData.moneda_custom 
                                  ? formData.moneda_custom 
                                  : (formData.moneda || 'COP')
                              }
                              handleInputChange('auxilios', [...(formData.auxilios || []), nuevoAuxilio])
                              setNuevoAuxilioMonto('')
                            }
                          }
                        }}
                        disabled={isReadOnly || !nuevoAuxilioMonto.trim() || parseNumberFromDots(nuevoAuxilioMonto) <= 0}
                        className="px-4 py-2 bg-[#004C4C] text-white rounded-lg hover:bg-[#065C5C] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Agregar
                      </button>
                    </div>
                    
                    {/* Lista de auxilios agregados */}
                    {formData.auxilios && formData.auxilios.length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="space-y-2">
                          {formData.auxilios.map((auxilio, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                              <div className="flex items-center space-x-3 flex-1">
                                <span className="text-xs font-medium text-gray-700 min-w-[120px]">
                                  {auxilio.tipo === 'salarial' ? 'Auxilio Salarial' : 'Auxilio No Salarial'}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatNumberWithDots(auxilio.monto)} {auxilio.moneda || formData.moneda || 'COP'}
                                </span>
                              </div>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nuevosAuxilios = formData.auxilios?.filter((_, i) => i !== index) || []
                                    handleInputChange('auxilios', nuevosAuxilios)
                                  }}
                                  className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Eliminar auxilio"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!formData.auxilios || formData.auxilios.length === 0) && (
                      <div className="text-xs text-gray-500 italic text-center py-2 border border-gray-200 rounded-lg bg-gray-50">
                        No hay auxilios agregados
                      </div>
                    )}
                  </div>

                  {/* Total Remuneración - Campo calculado */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <label className="block text-xs font-semibold text-green-800 mb-1">
                        💰 Total Remuneración
                      </label>
                      <div className="text-base font-bold text-green-900">
                        {formatCurrency(calculateTotalRemuneration(formData))}
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        Salario + Auxilios (excluye aux. transporte)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Condición Médica */}
                <div className="bg-orange-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">🏥 Información Médica</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="tiene_condicion_medica"
                        checked={formData.tiene_condicion_medica}
                        onChange={(e) => !isReadOnly && handleInputChange('tiene_condicion_medica', e.target.checked)}
                        {...getCheckboxProps()}
                      />
                      <label htmlFor="tiene_condicion_medica" className="text-sm font-medium text-gray-700">
                        El empleado tiene alguna condición médica especial
                      </label>
                    </div>

                    {/* Campo de detalle solo si tiene condición médica */}
                    {formData.tiene_condicion_medica && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Descripción de la Condición Médica *
                        </label>
                        <textarea
                          rows={3}
                          value={formData.condicion_medica_detalle || ''}
                          onChange={(e) => !isReadOnly && handleInputChange('condicion_medica_detalle', e.target.value)}
                          {...getInputProps('condicion_medica_detalle')}
                          placeholder="Describe detalladamente la condición médica..."
                          style={{ resize: 'none' }}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Esta información es confidencial y se usará únicamente para adaptar el puesto de trabajo.
                        </div>
                      </div>
                    )}

                    {/* Fuero */}
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="fuero"
                        checked={formData.fuero}
                        onChange={(e) => !isReadOnly && handleInputChange('fuero', e.target.checked)}
                        {...getCheckboxProps()}
                      />
                      <label htmlFor="fuero" className="text-sm font-medium text-gray-700">
                        ¿El empleado cuenta con fuero?
                      </label>
                    </div>

                    {/* Campo de detalle solo si tiene fuero */}
                    {formData.fuero && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Descripción del Fuero *
                        </label>
                        <textarea
                          rows={3}
                          value={formData.fuero_detalle || ''}
                          onChange={(e) => !isReadOnly && handleInputChange('fuero_detalle', e.target.value)}
                          {...getInputProps('fuero_detalle')}
                          placeholder="Describe el fuero del empleado"
                          style={{ resize: 'none' }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Pensionado */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="pensionado"
                    checked={formData.pensionado}
                    onChange={(e) => !isReadOnly && handleInputChange('pensionado', e.target.checked)}
                    {...getCheckboxProps()}
                  />
                  <label htmlFor="pensionado" className="text-sm font-medium text-gray-700">
                    ¿Es pensionado?
                  </label>
                </div>

                {/* Beneficiarios */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Beneficiarios</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Hijos
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.beneficiario_hijo === 0 ? '' : formData.beneficiario_hijo}
                        onChange={(e) => !isReadOnly && handleInputChange('beneficiario_hijo', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ MozAppearance: 'textfield' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Madre
                      </label>
                      <select
                        value={formData.beneficiario_madre}
                        onChange={(e) => !isReadOnly && handleInputChange('beneficiario_madre', parseInt(e.target.value))}
                        {...getInputProps('beneficiario_madre')}
                      >
                        <option value={0}>No</option>
                        <option value={1}>Sí</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Padre
                      </label>
                      <select
                        value={formData.beneficiario_padre}
                        onChange={(e) => !isReadOnly && handleInputChange('beneficiario_padre', parseInt(e.target.value))}
                        {...getInputProps('beneficiario_padre')}
                      >
                        <option value={0}>No</option>
                        <option value={1}>Sí</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cónyuge
                      </label>
                      <select
                        value={formData.beneficiario_conyuge}
                        onChange={(e) => !isReadOnly && handleInputChange('beneficiario_conyuge', parseInt(e.target.value))}
                        {...getInputProps('beneficiario_conyuge')}
                      >
                        <option value={0}>No</option>
                        <option value={1}>Sí</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fechas de Inscripción Beneficiarios */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Fechas de Inscripción Beneficiarios</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fecha de Solicitud
                      </label>
                      <input
                        type="date"
                        {...getDateLimits('past')}
                        value={formData.fecha_solicitud || ''}
                        onChange={(e) => {
                          if (!isReadOnly) {
                            // Permitir escribir sin validar hasta que el campo esté completo
                            handleInputChange('fecha_solicitud', e.target.value)
                          }
                        }}
                        onBlur={(e) => {
                          // Validar solo cuando el usuario termine de escribir (onBlur)
                          if (!isReadOnly && e.target.value) {
                            validateDateInput(e.target.value, 'past', true, true)
                          }
                        }}
                        {...getInputProps('fecha_solicitud')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fecha de Radicado
                      </label>
                      <input
                        type="date"
                        {...getDateLimits('past')}
                        value={formData.fecha_radicado || ''}
                        onChange={(e) => {
                          if (!isReadOnly) {
                            // Permitir escribir sin validar hasta que el campo esté completo
                            handleInputChange('fecha_radicado', e.target.value)
                          }
                        }}
                        onBlur={(e) => {
                          // Validar solo cuando el usuario termine de escribir (onBlur)
                          if (!isReadOnly && e.target.value) {
                            validateDateInput(e.target.value, 'past', true, true)
                          }
                        }}
                        {...getInputProps('fecha_radicado')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Onboarding */}
            {currentTab === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Proceso de Onboarding</h3>
                  <div className="text-sm text-gray-600">
                    Progreso: {Math.round(
                      (                      [
                        formData.programacion_cita_examenes,
                        formData.examenes && formData.examenes_fecha,
                        formData.envio_contrato,
                        formData.recibido_contrato_firmado && formData.contrato_fecha_confirmacion,
                        formData.solicitud_inscripcion_arl,
                        formData.arl_nombre && formData.arl_fecha_confirmacion,
                        formData.solicitud_eps,
                        formData.radicado_eps && formData.eps_fecha_confirmacion,
                        formData.envio_inscripcion_caja,
                        formData.radicado_ccf && formData.caja_fecha_confirmacion,
                        formData.solicitud_cesantias && formData.fondo_cesantias && formData.cesantias_fecha_confirmacion,
                        formData.solicitud_fondo_pension && formData.fondo_pension && formData.pension_fecha_confirmacion
                      ].filter(Boolean).length / 12) * 100
                    )}%
                  </div>
                </div>



                {/* Onboarding reorganizado por procesos */}
                <ContractModalOnboarding
                  formData={formData}
                  isReadOnly={isReadOnly}
                  handleInputChange={handleInputChange}
                  getInputProps={getInputProps}
                  getCheckboxProps={getCheckboxProps}
                  errors={errors}
                  cajaCompensacionActiva={cajaCompensacionActiva}
                  arlActiva={arlActiva}
                />

                {/* URL de Dropbox */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Documentos (Dropbox)
                  </label>
                  <input
                    type="url"
                    value={formData.dropbox || ''}
                    onChange={(e) => !isReadOnly && handleInputChange('dropbox', e.target.value)}
                    {...getInputProps('dropbox')}
                    placeholder="https://dropbox.com/folder/contract-001"
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows={4}
                    value={formData.observacion || ''}
                    onChange={(e) => !isReadOnly && handleInputChange('observacion', e.target.value)}
                    {...getInputProps('observacion')}
                    placeholder="Notas adicionales sobre el contrato o proceso de onboarding..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con navegación */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={prevTab}
            disabled={currentTab === 0}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm ${
              currentTab === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Anterior
          </button>

          <div className="text-sm text-gray-600">
            Paso {currentTab + 1} de {tabs.length}
          </div>

          {currentTab < tabs.length - 1 ? (
            <button
              type="button"
              onClick={nextTab}
              className="px-4 py-1.5 bg-[#004C4C] text-white rounded-lg hover:bg-[#065C5C] transition-all text-sm"
            >
              Siguiente
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              {mode === 'create' && !isReadOnly ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmit('borrador')}
                    disabled={loading}
                    className={`px-4 py-1.5 rounded-lg transition-all text-sm ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600'
                    } text-white flex items-center space-x-2`}
                  >
                    {loading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <span>Guardar como Borrador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit('aprobado')}
                    disabled={loading}
                    className={`px-4 py-1.5 rounded-lg transition-all text-sm ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-[#004C4C] hover:bg-[#065C5C]'
                    } text-white flex items-center space-x-2`}
                  >
                    {loading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <span>Crear Contrato</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit(contract?.status_aprobacion === 'borrador' ? 'borrador' : 'aprobado')}
                  disabled={loading || isReadOnly}
                  className={`px-4 py-1.5 rounded-lg transition-all text-sm ${
                    loading || isReadOnly
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#004C4C] hover:bg-[#065C5C]'
                  } text-white flex items-center space-x-2`}
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>
                    {isReadOnly 
                      ? 'Solo Lectura' 
                      : 'Guardar Cambios'
                    }
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Historial de Períodos */}
      <ContractHistorialModal
        isOpen={showHistorialModal}
        onClose={() => setShowHistorialModal(false)}
        onSave={(periodos) => {
          setPeriodosHistorial(periodos)
          setShowHistorialModal(false)
          
          // Auto-completar fecha de inicio del contrato basándose en el historial
          if (periodos.length > 0) {
            // Encontrar el último período (mayor fecha_fin)
            const ultimoPeriodo = periodos.reduce((ultimo, actual) => {
              if (!ultimo.fecha_fin) return actual
              if (!actual.fecha_fin) return ultimo
              return new Date(actual.fecha_fin) > new Date(ultimo.fecha_fin) ? actual : ultimo
            })
            
            if (ultimoPeriodo.fecha_fin) {
              // Usar función que evita problemas de zona horaria
              const fechaInicioSugerida = sumarDiasAFecha(ultimoPeriodo.fecha_fin, 1)
              
              console.log('🗓️ Auto-completando fecha de inicio:', fechaInicioSugerida)
              
              // SIEMPRE actualizar la fecha basándose en el historial
              setFormData(prev => ({ ...prev, fecha_ingreso: fechaInicioSugerida }))
            }
          }
          
          // Calcular y mostrar resumen
          const diasTotales = periodos.reduce((total, periodo) => {
            if (periodo.fecha_inicio && periodo.fecha_fin) {
              const inicio = new Date(periodo.fecha_inicio)
              const fin = new Date(periodo.fecha_fin)
              const dias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
              return total + dias
            }
            return total
          }, 0)
          
          const añosTotales = (diasTotales / 365).toFixed(2)
          
          setContractFixedStatus({
            totalPeriodos: periodos.length,
            diasTotales,
            añosTotales: parseFloat(añosTotales),
            proximoPeriodo: periodos.length + 1,
            debeSerIndefinido: parseFloat(añosTotales) >= 4 || periodos.length >= 3
          })
        }}
        periodosActuales={periodosHistorial}
      />
    </div>
  )
}
