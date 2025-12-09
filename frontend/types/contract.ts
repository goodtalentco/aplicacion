/**
 * Tipos compartidos para el sistema de contratos
 * Incluye los nuevos estados de aprobación y vigencia
 */

export type StatusAprobacion = 'borrador' | 'aprobado'
export type StatusVigencia = 'activo' | 'terminado'

export interface Contract {
  id?: string
  primer_nombre: string
  segundo_nombre?: string | null
  primer_apellido: string
  segundo_apellido?: string | null
  tipo_identificacion: string
  numero_identificacion: string
  fecha_expedicion_documento?: string | null
  fecha_nacimiento: string
  celular?: string | null
  email?: string | null
  empresa_interna: string
  empresa_final_id: string
  ciudad_labora?: string | null
  cargo?: string | null
  numero_contrato_helisa?: string | null
  base_sena: boolean
  fecha_ingreso?: string | null
  tipo_contrato?: string | null
  fecha_fin?: string | null
  // Estado de contratos fijos (períodos)
  contract_status?: {
    total_periodos?: number
    periodo_actual?: number
    años_totales?: number
    dias_totales?: number
    debe_ser_indefinido?: boolean
    alerta_legal?: string
  } | null
  tipo_salario?: string | null
  salario?: number | null
  auxilio_salarial?: number | null
  auxilio_salarial_concepto?: string | null
  auxilio_no_salarial?: number | null
  auxilio_no_salarial_concepto?: string | null
  auxilio_transporte?: number | null
  // Nuevos campos de condición médica
  tiene_condicion_medica?: boolean
  condicion_medica_detalle?: string | null
  beneficiario_hijo: number
  beneficiario_madre: number
  beneficiario_padre: number
  beneficiario_conyuge: number
  fecha_solicitud?: string | null
  fecha_radicado?: string | null
  programacion_cita_examenes: boolean
  examenes: boolean
  examenes_fecha?: string | null
  solicitud_inscripcion_arl: boolean
  arl_nombre?: string | null
  arl_fecha_confirmacion?: string | null
  envio_contrato: boolean
  recibido_contrato_firmado: boolean
  contrato_fecha_confirmacion?: string | null
  solicitud_eps: boolean
  eps_fecha_confirmacion?: string | null
  envio_inscripcion_caja: boolean
  caja_fecha_confirmacion?: string | null
  solicitud_cesantias: boolean
  fondo_cesantias?: string | null
  cesantias_fecha_confirmacion?: string | null
  solicitud_fondo_pension: boolean
  fondo_pension?: string | null
  pension_fecha_confirmacion?: string | null
  dropbox?: string | null
  radicado_eps?: string | null
  radicado_ccf?: string | null
  observacion?: string | null
  
  // Nuevos campos de estados
  status_aprobacion?: StatusAprobacion
  approved_at?: string | null
  approved_by?: string | null
  
  // Campos de auditoría
  created_at?: string
  updated_at?: string
  created_by?: string
  updated_by?: string
  
  // Computed columns
  contracts_created_by_handle?: string | null
  contracts_updated_by_handle?: string | null
  contracts_full_name?: string | null
  contracts_onboarding_progress?: number | null
  
  // Relaciones
  company?: {
    name: string
    tax_id: string
  }
}

export interface ContractStatus {
  status_aprobacion: StatusAprobacion
  status_vigencia: StatusVigencia
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  days_until_expiry: number | null
}

export interface Company {
  id: string
  name: string
  tax_id: string
}

// Helpers para el estado del contrato
export const getStatusVigencia = (fecha_fin?: string | null): StatusVigencia => {
  if (!fecha_fin) return 'activo' // Contratos indefinidos
  const finDate = new Date(fecha_fin)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Comparar solo fechas, no horas
  finDate.setHours(0, 0, 0, 0)
  
  return finDate <= today ? 'terminado' : 'activo'
}

export const getDaysUntilExpiry = (fecha_fin?: string | null): number | null => {
  if (!fecha_fin) return null // Contratos indefinidos
  const finDate = new Date(fecha_fin)
  const today = new Date()
  const diffTime = finDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export const getContractStatusConfig = (contract: Contract) => {
  const status_vigencia = getStatusVigencia(contract.fecha_fin)
  const days_until_expiry = getDaysUntilExpiry(contract.fecha_fin)
  
  // Valor por defecto para contratos existentes sin status_aprobacion
  const status_aprobacion = contract.status_aprobacion || 'aprobado'
  
  return {
    status_aprobacion,
    status_vigencia,
    can_edit: status_aprobacion === 'borrador',
    can_delete: status_aprobacion === 'borrador',
    can_approve: status_aprobacion === 'borrador',
    days_until_expiry
  }
}

// Utilidades para UI
export const getStatusAprobacionConfig = (status?: StatusAprobacion) => {
  // Valor por defecto para contratos existentes
  const actualStatus = status || 'aprobado'
  
  switch (actualStatus) {
    case 'borrador':
      return {
        label: 'Borrador',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: '📝'
      }
    case 'aprobado':
      return {
        label: 'Aprobado',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: ''
      }
    default:
      return {
        label: 'Aprobado',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: ''
      }
  }
}

export const getStatusVigenciaConfig = (status: StatusVigencia, daysUntilExpiry?: number | null) => {
  switch (status) {
    case 'activo':
      // Si expira en menos de 30 días, mostrar como advertencia
      if (daysUntilExpiry !== null && daysUntilExpiry !== undefined && daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        return {
          label: `Vence en ${daysUntilExpiry} días`,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: '⏰'
        }
      }
      return {
        label: 'Activo',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: ''
      }
    case 'terminado':
      return {
        label: 'Terminado',
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: ''
      }
  }
}

// Función para calcular total remuneración
export const calculateTotalRemuneration = (contract: Contract): number => {
  const salario = contract.salario || 0
  const auxilioSalarial = contract.auxilio_salarial || 0
  const auxilioNoSalarial = contract.auxilio_no_salarial || 0
  
  return salario + auxilioSalarial + auxilioNoSalarial
}

// Función para formatear moneda colombiana
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace(/,/g, '.')
}
