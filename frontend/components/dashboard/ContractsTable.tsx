'use client'

import { useState, useEffect } from 'react'
import { 
  Check, 
  X, 
  Edit, 
  Loader2, 
  ChevronDown,
  ChevronRight,
  Calendar,
  Building2,
  User,
  FileText,
  CheckCircle,
  Trash2,
  Eye,
  History,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { 
  Contract, 
  getContractStatusConfig, 
  getStatusAprobacionConfig, 
  getStatusVigenciaConfig,
  calculateTotalRemuneration,
  formatCurrency 
} from '../../types/contract'
import { formatDateColombia } from '../../utils/dateUtils'
import { ContractStatusCompact } from '../ui/ContractStatusBadges'
import ContractApprovalButton from '../ui/ContractApprovalButton'
import DeleteContractModal from '../ui/DeleteContractModal'
import OnboardingDetailModal from '../ui/OnboardingDetailModal'
import ConfirmationModal from '../ui/ConfirmationModal'
import NovedadButton from './NovedadButton'
import { ContractRowWithCurrentData } from './ContractRowWithCurrentData'
import { ContractAfiliacionesSection } from './ContractAfiliacionesSection'
import ContractHistoryModal from './ContractHistoryModal'

// Componente especializado para mostrar información de contratos fijos
interface ContractFixedTermViewProps {
  contract: Contract
  currentData: {
    fecha_fin_actual: string | null
    loading: boolean
  }
  formatDate: (date: string) => string
}

const ContractFixedTermView: React.FC<ContractFixedTermViewProps> = ({ 
  contract, 
  currentData, 
  formatDate 
}) => {
  const [periodInfo, setPeriodInfo] = useState<{
    currentPeriod: any | null
    nextExtension: any | null
    loading: boolean
  }>({
    currentPeriod: null,
    nextExtension: null,
    loading: true
  })

  useEffect(() => {
    const loadPeriodInfo = async () => {
      if (!contract.id) return

      try {
        // Obtener período actual (vigente)
        const { data: currentPeriod } = await supabase
          .from('historial_contratos_fijos')
          .select('*')
          .eq('contract_id', contract.id)
          .eq('es_periodo_actual', true)
          .single()

        // Buscar la SIGUIENTE prórroga futura (período que empieza después del actual)
        let nextExtension = null
        if (currentPeriod?.fecha_fin) {
          const { data: futurePeriod } = await supabase
            .from('historial_contratos_fijos')
            .select('*')
            .eq('contract_id', contract.id)
            .eq('es_periodo_actual', false)
            .gt('fecha_inicio', currentPeriod.fecha_fin) // Empieza después del período actual
            .order('fecha_inicio', { ascending: true })
            .limit(1)
            .single()
          
          nextExtension = futurePeriod
        }

        setPeriodInfo({
          currentPeriod: currentPeriod || null,
          nextExtension: nextExtension || null,
          loading: false
        })
      } catch (error) {
        setPeriodInfo({
          currentPeriod: null,
          nextExtension: null,
          loading: false
        })
      }
    }

    loadPeriodInfo()
  }, [contract.id])

  // Usar la fecha del período actual, no la de currentData
  const fechaFinPeriodoActual = periodInfo.currentPeriod?.fecha_fin || currentData.fecha_fin_actual
  
  if (!fechaFinPeriodoActual) {
    return <span className="text-gray-400">Sin fecha de fin</span>
  }

  const fechaFin = new Date(fechaFinPeriodoActual)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  fechaFin.setHours(0, 0, 0, 0)
  
  const diffTime = fechaFin.getTime() - hoy.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  // Determinar niveles de alerta
  const isCritical = diffDays <= 35 && diffDays > 0 && !periodInfo.nextExtension  // CRÍTICO: ≤35 días
  const needsAlert = diffDays <= 45 && diffDays > 0 && !periodInfo.nextExtension  // ATENCIÓN: ≤45 días
  const isUrgent = diffDays <= 30 && diffDays > 0 && !periodInfo.nextExtension    // URGENTE: ≤30 días (mantenemos para compatibilidad)

  return (
    <div>
      {/* Fecha del período vigente actual */}
      <div className="flex items-center space-x-1">
        <span className={`font-medium ${
          isCritical ? 'text-red-700' :      // CRÍTICO: Rojo más intenso
          isUrgent ? 'text-red-600' :        // URGENTE: Rojo normal
          needsAlert ? 'text-amber-600' :    // ATENCIÓN: Ámbar
          'text-gray-900'                    // NORMAL: Negro
        }`}>
          {formatDate(fechaFinPeriodoActual)}
        </span>
        {needsAlert && (
          <AlertTriangle className={`h-3 w-3 ${
            isCritical ? 'text-red-700' : 
            isUrgent ? 'text-red-500' : 
            'text-amber-500'
          }`} />
        )}
      </div>

      {/* Información del período y alerta */}
      <div className="text-xs mt-1 space-y-0.5">
        {periodInfo.loading ? (
          <div className="text-gray-500">Cargando períodos...</div>
        ) : (
          <>
            {/* Solo la SIGUIENTE prórroga programada */}
            {periodInfo.nextExtension ? (
              <div className="text-green-600 font-medium">
                ✅ Prórroga → {formatDate(periodInfo.nextExtension.fecha_fin)}
              </div>
            ) : needsAlert ? (
              <div className={`font-medium ${
                isCritical ? 'text-red-700' : 
                isUrgent ? 'text-red-600' : 
                'text-amber-600'
              }`}>
                {isCritical ? '🔥 CRÍTICO:' : 
                 isUrgent ? '🚨 URGENTE:' : 
                 '⚠️ ATENCIÓN:'} {diffDays} días restantes
              </div>
            ) : (
              <div className="text-gray-500">
                {diffDays > 0 ? `Faltan ${diffDays} días` : 
                 diffDays === 0 ? 'Vence hoy' : 
                 `Venció hace ${Math.abs(diffDays)} días`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface ContractsTableProps {
  contracts: Contract[]
  onEdit: (contract: Contract) => void
  onUpdate: () => void
  canUpdate: boolean
  canDelete: boolean
  onApprove?: (contract: Contract) => void
  refreshTrigger?: number
}

type OnboardingField = 
  | 'programacion_cita_examenes' 
  | 'examenes' 
  | 'solicitud_inscripcion_arl' 
  | 'confirmacion_arl' // Campo visual (inferido)
  | 'envio_contrato' 
  | 'recibido_contrato_firmado' 
  | 'solicitud_eps' 
  | 'confirmacion_eps' // Campo visual (inferido)
  | 'envio_inscripcion_caja' 
  | 'confirmacion_caja' // Campo visual (inferido)
  | 'solicitud_cesantias'
  | 'confirmacion_cesantias' // Campo visual (inferido)
  | 'solicitud_fondo_pension'
  | 'confirmacion_pension' // Campo visual (inferido)

/**
 * Tabla moderna de contratos con scroll unificado y edición inline
 * Optimizada para productividad con acciones al inicio y todos los campos editables
 */
export default function ContractsTable({
  contracts,
  onEdit,
  onUpdate,
  canUpdate,
  canDelete,
  onApprove,
  refreshTrigger = 0
}: ContractsTableProps) {
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0)
  
  const handleNovedadSuccess = () => {
    setLocalRefreshTrigger(prev => prev + 1)
    onUpdate()
  }
  const [loadingInline, setLoadingInline] = useState<Set<string>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailModalData, setDetailModalData] = useState<{
    contract: Contract | null
    field: string
    title: string
    type: 'arl' | 'eps' | 'caja' | 'cesantias' | 'pension'
  }>({
    contract: null,
    field: '',
    title: '',
    type: 'arl'
  })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string
    message: string
    onConfirm: () => void
    type: 'warning' | 'danger' | 'info'
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  })
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyContract, setHistoryContract] = useState<Contract | null>(null)

  // Usar formateo de fecha correcto para Colombia (evita problema de zona horaria)
  const formatDate = formatDateColombia

  // Formatear moneda con puntos como separadores
  const formatCurrencyLocal = (amount?: number | null) => {
    if (!amount) return '-'
    return formatCurrency(amount)
  }

  // Generar grid columns dinámicamente
  const generateGridColumns = () => {
    const baseColumns = [
      '100px', // Acciones
      '200px', // Empleado  
      '140px', // Empresa
      '130px', // Contrato
      '110px', // F. Ingreso
      '110px', // F. Terminación
      '130px'  // Total Remuneración
    ]
    
    // Agregar columnas dinámicas para onboarding (85px cada una)
    const onboardingColumns = onboardingFields.map(() => '85px')
    
    const finalColumns = [
      ...baseColumns,
      ...onboardingColumns,
      '90px' // Progreso
    ]
    
    return finalColumns.join(' ')
  }

  // Calcular ancho mínimo dinámicamente
  const calculateMinWidth = () => {
    const baseWidth = 100 + 200 + 140 + 130 + 110 + 110 + 130 + 90 // Columnas fijas: 1010px
    const onboardingWidth = onboardingFields.length * 85 // Columnas dinámicas
    const gaps = (7 + onboardingFields.length) * 8 // 8px gap entre columnas
    return baseWidth + onboardingWidth + gaps + 50 // +50px margen de seguridad
  }



  // Función para obtener información de dependencia
  const getDependencyInfo = (field: OnboardingField) => {
    const fieldConfig = onboardingFields.find(f => f.key === field)
    return fieldConfig?.dependency || null
  }

  // Función para verificar si se puede marcar un campo
  const canMarkField = (contract: Contract, field: OnboardingField): { canMark: boolean, message?: string } => {
    const dependency = getDependencyInfo(field)
    
    if (!dependency) {
      return { canMark: true }
    }

    const dependencyValue = contract[dependency as keyof Contract] as boolean
    if (!dependencyValue) {
      const dependencyLabel = onboardingFields.find(f => f.key === dependency)?.label || dependency
      return {
        canMark: false,
        message: `Primero debe completar: ${dependencyLabel}`
      }
    }

    return { canMark: true }
  }

  // Función para obtener el estado de confirmación (campos reales y virtuales)
  const getFieldConfirmationState = (contract: Contract, field: OnboardingField): 'empty' | 'pending' | 'confirmed' => {
    
    // Campos virtuales de confirmación (no existen en BD)
    switch (field) {
      case 'confirmacion_arl':
        if (!contract.solicitud_inscripcion_arl) return 'empty'
        return (contract.arl_nombre && contract.arl_fecha_confirmacion) ? 'confirmed' : 'pending'
      
      case 'confirmacion_eps':
        if (!contract.solicitud_eps) return 'empty'
        return (contract.radicado_eps && contract.eps_fecha_confirmacion) ? 'confirmed' : 'pending'
      
      case 'confirmacion_caja':
        if (!contract.envio_inscripcion_caja) return 'empty'
        return (contract.radicado_ccf && contract.caja_fecha_confirmacion) ? 'confirmed' : 'pending'
      
      case 'confirmacion_cesantias':
        if (!contract.solicitud_cesantias) return 'empty'
        return (contract.fondo_cesantias && contract.cesantias_fecha_confirmacion) ? 'confirmed' : 'pending'
      
      case 'confirmacion_pension':
        if (!contract.solicitud_fondo_pension) return 'empty'
        return (contract.fondo_pension && contract.pension_fecha_confirmacion) ? 'confirmed' : 'pending'
    }
    
    // Campos reales de BD
    const baseValue = contract[field as keyof Contract] as boolean
    
    // Si el campo base no está marcado, está vacío
    if (!baseValue) return 'empty'
    
    // Verificar confirmación basada en presencia de datos para campos con modal
    switch (field) {
      case 'examenes':
        return contract.examenes_fecha ? 'confirmed' : 'pending'
      
      case 'recibido_contrato_firmado':
        return contract.contrato_fecha_confirmacion ? 'confirmed' : 'pending'
      
      default:
        // Para campos simples como programacion_cita_examenes, envio_contrato, solicitudes
        return baseValue ? 'confirmed' : 'empty'
    }
  }

  // Función para mostrar toast informativo
  const showInfoToast = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    // Crear elemento de toast temporal
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
      type === 'info' ? 'bg-blue-500 text-white' :
      type === 'warning' ? 'bg-amber-500 text-white' :
      'bg-green-500 text-white'
    }`
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="flex-shrink-0">
          ${type === 'info' ? '💡' : type === 'warning' ? '⚠️' : '✅'}
        </div>
        <div class="text-sm font-medium">${message}</div>
      </div>
    `
    
    document.body.appendChild(toast)
    
    // Animar entrada
    setTimeout(() => toast.classList.add('translate-x-0'), 100)
    
    // Remover después de 3 segundos
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0')
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 3000)
  }

  // Toggle inline de campos de onboarding (reales y virtuales)
  const handleToggleOnboarding = async (contractId: string, field: OnboardingField, currentValue: boolean) => {
    if (!canUpdate) return

    // Buscar el contrato para verificar si se puede editar
    const contract = contracts.find(c => c.id === contractId)
    if (!contract || !getContractStatusConfig(contract).can_edit) {
      showInfoToast('Este contrato no se puede editar porque ya está aprobado', 'warning')
      return
    }

    const fieldConfig = onboardingFields.find(f => f.key === field)
    const isVirtualField = fieldConfig?.isVirtual || false

    // MANEJO DE CAMPOS VIRTUALES (confirmaciones)
    if (isVirtualField) {
      const confirmationState = getFieldConfirmationState(contract, field)
      
      if (confirmationState === 'confirmed') {
        // Si está confirmado y se quiere desmarcar, limpiar datos
        const fieldLabel = fieldConfig?.label || field
        setConfirmModalData({
          title: 'Eliminar Confirmación',
          message: `⚠️ ADVERTENCIA: Está a punto de eliminar la confirmación de "${fieldLabel}".\n\nSe eliminarán los datos asociados (fechas, nombres, etc.).\n\n¿Está seguro de que desea continuar?`,
          onConfirm: async () => {
            await clearAssociatedData(contractId, field)
            showInfoToast(`Datos de confirmación de ${fieldLabel} eliminados`, 'info')
          },
          type: 'warning'
        })
        setShowConfirmModal(true)
        return
      }
      
      if (confirmationState === 'empty') {
        showInfoToast('Primero debe marcar la solicitud correspondiente', 'warning')
        return
      }
      
      // Si está pending, abrir modal para confirmar
      setDetailModalData({
        contract,
        field,
        title: getModalTitle(field),
        type: getModalType(field)
      })
      setShowDetailModal(true)
      return
    }

    // MANEJO DE CAMPOS REALES (solicitudes)
    // Si se está desmarcando (currentValue es true, queremos marcar como false)
    if (currentValue) {
      const confirmationState = getFieldConfirmationState(contract, field)
      
      // Si está confirmado (tiene datos), mostrar advertencia
      if (confirmationState === 'confirmed') {
        const fieldLabel = fieldConfig?.label || field
        setConfirmModalData({
          title: 'Desmarcar Campo',
          message: `⚠️ ADVERTENCIA: Está a punto de desmarcar "${fieldLabel}" que ya tiene información completada.\n\nAl desmarcar se perderán los datos asociados (fechas, nombres, etc.).\n\n¿Está seguro de que desea continuar?`,
          onConfirm: async () => {
            await clearAssociatedData(contractId, field)
            showInfoToast(`${fieldLabel} y sus datos asociados han sido eliminados`, 'info')
          },
          type: 'warning'
        })
        setShowConfirmModal(true)
        return
      }
    }

    // Si se está marcando (currentValue es false, queremos marcar como true)
    if (!currentValue) {
      // Verificar dependencias
      const { canMark, message } = canMarkField(contract, field)
      if (!canMark) {
        showInfoToast(message!, 'warning')
        return
      }

      // Si es un campo que requiere información adicional, abrir modal
      if (fieldConfig?.requiresModal) {
        setDetailModalData({
          contract,
          field,
          title: getModalTitle(field),
          type: getModalType(field)
        })
        setShowDetailModal(true)
        return
      }
    }

    // Para campos simples o desmarcado sin datos, actualizar directamente
    await updateOnboardingField(contractId, field, !currentValue)
    
    // Mostrar mensaje de éxito
    const fieldLabel = fieldConfig?.label || field
    showInfoToast(
      `${fieldLabel} ${!currentValue ? 'marcado' : 'desmarcado'} correctamente`, 
      'success'
    )
  }

  // Obtener título del modal según el campo
  const getModalTitle = (field: OnboardingField): string => {
    const titles: Record<string, string> = {
      'examenes': 'Confirmación de Exámenes Médicos',
      'recibido_contrato_firmado': 'Confirmación de Contrato Firmado',
      'solicitud_inscripcion_arl': 'Información de ARL',
      'confirmacion_arl': 'Confirmación de ARL',
      'solicitud_eps': 'Información de EPS',
      'confirmacion_eps': 'Confirmación de EPS',
      'envio_inscripcion_caja': 'Información de Caja de Compensación',
      'confirmacion_caja': 'Confirmación de Caja de Compensación',
      'solicitud_cesantias': 'Información de Cesantías',
      'confirmacion_cesantias': 'Confirmación de Cesantías',
      'solicitud_fondo_pension': 'Información de Fondo de Pensión',
      'confirmacion_pension': 'Confirmación de Fondo de Pensión'
    }
    return titles[field] || 'Información Adicional'
  }

  // Obtener tipo del modal según el campo
  const getModalType = (field: OnboardingField): 'arl' | 'eps' | 'caja' | 'cesantias' | 'pension' => {
    const types: Record<string, 'arl' | 'eps' | 'caja' | 'cesantias' | 'pension'> = {
      'examenes': 'arl', // Reutilizamos el tipo para fechas simples
      'recibido_contrato_firmado': 'arl', // Reutilizamos el tipo para fechas simples
      'solicitud_inscripcion_arl': 'arl',
      'confirmacion_arl': 'arl',
      'solicitud_eps': 'eps',
      'confirmacion_eps': 'eps',
      'envio_inscripcion_caja': 'caja',
      'confirmacion_caja': 'caja',
      'solicitud_cesantias': 'cesantias',
      'confirmacion_cesantias': 'cesantias',
      'solicitud_fondo_pension': 'pension',
      'confirmacion_pension': 'pension'
    }
    return types[field] || 'arl'
  }

  // Limpiar datos asociados cuando se desmarca un campo confirmado
  const clearAssociatedData = async (contractId: string, field: OnboardingField) => {
    const newLoadingInline = new Set(loadingInline)
    newLoadingInline.add(contractId)
    setLoadingInline(newLoadingInline)

    try {
      let updateData: Record<string, any> = {}

      // Manejar campos virtuales y reales
      switch (field) {
        case 'examenes':
          updateData = { [field]: false, examenes_fecha: null }
          break
        
        case 'recibido_contrato_firmado':
          updateData = { [field]: false, contrato_fecha_confirmacion: null }
          break
        
        case 'solicitud_inscripcion_arl':
          updateData = { [field]: false, arl_nombre: null, arl_fecha_confirmacion: null }
          break
        
        case 'confirmacion_arl':
          updateData = { arl_nombre: null, arl_fecha_confirmacion: null }
          break
        
        case 'solicitud_eps':
          updateData = { [field]: false, radicado_eps: null, eps_fecha_confirmacion: null }
          break
        
        case 'confirmacion_eps':
          updateData = { radicado_eps: null, eps_fecha_confirmacion: null }
          break
        
        case 'envio_inscripcion_caja':
          updateData = { [field]: false, radicado_ccf: null, caja_fecha_confirmacion: null }
          break
        
        case 'confirmacion_caja':
          updateData = { radicado_ccf: null, caja_fecha_confirmacion: null }
          break
        
        case 'solicitud_cesantias':
          updateData = { [field]: false, fondo_cesantias: null, cesantias_fecha_confirmacion: null }
          break
        
        case 'confirmacion_cesantias':
          updateData = { fondo_cesantias: null, cesantias_fecha_confirmacion: null }
          break
        
        case 'solicitud_fondo_pension':
          updateData = { [field]: false, fondo_pension: null, pension_fecha_confirmacion: null }
          break
        
        case 'confirmacion_pension':
          updateData = { fondo_pension: null, pension_fecha_confirmacion: null }
          break

        default:
          updateData = { [field]: false }
          break
      }

      const { error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contractId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error clearing associated data:', error)
    } finally {
      const newLoadingInline = new Set(loadingInline)
      newLoadingInline.delete(contractId)
      setLoadingInline(newLoadingInline)
    }
  }

  // Actualizar campo de onboarding (función separada para reutilización)
  const updateOnboardingField = async (contractId: string, field: OnboardingField, value: boolean) => {
    const newLoadingInline = new Set(loadingInline)
    newLoadingInline.add(contractId)
    setLoadingInline(newLoadingInline)

    try {
      const { error } = await supabase
        .from('contracts')
        .update({ [field]: value })
        .eq('id', contractId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error updating onboarding field:', error)
    } finally {
      const newLoadingInline = new Set(loadingInline)
      newLoadingInline.delete(contractId)
      setLoadingInline(newLoadingInline)
    }
  }



  // Actualizar campo individual
  const handleFieldUpdate = async (contractId: string, fieldName: string, value: any) => {
    if (!canUpdate) return

    try {
      const { error } = await supabase
        .from('contracts')
        .update({ [fieldName]: value })
        .eq('id', contractId)

      if (error) throw error
      onUpdate() // Refrescar datos
    } catch (error) {
      console.error('Error updating field:', error)
    }
  }

  // Toggle expandir fila
  const toggleRowExpansion = (contractId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(contractId)) {
      newExpanded.delete(contractId)
    } else {
      newExpanded.add(contractId)
    }
    setExpandedRows(newExpanded)
  }

  // Calcular progreso visual
  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-green-400'
    if (progress >= 50) return 'bg-yellow-400'
    if (progress >= 25) return 'bg-orange-400'
    return 'bg-red-400'
  }

  // Reorganizado con lógica de dependencias y campos correctos
  const onboardingFields = [
    // EXÁMENES MÉDICOS
    { key: 'programacion_cita_examenes' as OnboardingField, label: 'Prog Cita', category: 'examenes' },
    { key: 'examenes' as OnboardingField, label: 'Exámenes', category: 'examenes', requiresModal: true, dependency: 'programacion_cita_examenes' },
    
    // CONTRATOS
    { key: 'envio_contrato' as OnboardingField, label: 'Envío', category: 'contratos' },
    { key: 'recibido_contrato_firmado' as OnboardingField, label: 'Contrato Firmado', category: 'contratos', requiresModal: true, dependency: 'envio_contrato' },
    
    // ARL - Solicitud + Confirmación (visual)
    { key: 'solicitud_inscripcion_arl' as OnboardingField, label: 'Sol ARL', category: 'arl' },
    { key: 'confirmacion_arl' as OnboardingField, label: 'ARL Conf', category: 'arl', requiresModal: true, dependency: 'solicitud_inscripcion_arl', isVirtual: true },
    
    // EPS - Solicitud + Confirmación (visual)
    { key: 'solicitud_eps' as OnboardingField, label: 'Sol EPS', category: 'eps' },
    { key: 'confirmacion_eps' as OnboardingField, label: 'EPS Conf', category: 'eps', requiresModal: true, dependency: 'solicitud_eps', isVirtual: true },
    
    // CAJA DE COMPENSACIÓN - Envío + Confirmación (visual)
    { key: 'envio_inscripcion_caja' as OnboardingField, label: 'Env Caja', category: 'caja' },
    { key: 'confirmacion_caja' as OnboardingField, label: 'Caja Conf', category: 'caja', requiresModal: true, dependency: 'envio_inscripcion_caja', isVirtual: true },
    
    // CESANTÍAS - Solicitud + Confirmación (visual)
    { key: 'solicitud_cesantias' as OnboardingField, label: 'Sol Cesantías', category: 'cesantias' },
    { key: 'confirmacion_cesantias' as OnboardingField, label: 'Cesantías Conf', category: 'cesantias', requiresModal: true, dependency: 'solicitud_cesantias', isVirtual: true },
    
    // PENSIÓN - Solicitud + Confirmación (visual)
    { key: 'solicitud_fondo_pension' as OnboardingField, label: 'Sol Pensión', category: 'pension' },
    { key: 'confirmacion_pension' as OnboardingField, label: 'Pensión Conf', category: 'pension', requiresModal: true, dependency: 'solicitud_fondo_pension', isVirtual: true }
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Tabla con scroll unificado */}
      <div className="hidden lg:block overflow-x-auto">
        <div style={{ minWidth: `${calculateMinWidth()}px` }}>
          
          {/* Header de tabla */}
          <div className="grid gap-2 p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-700 text-base" style={{gridTemplateColumns: generateGridColumns()}}>
            
            {/* Acciones al principio */}
            <div>Acciones</div>
            
            {/* Campos principales */}
            <div>Empleado</div>
            <div>Empresa</div>
            <div>Contrato</div>
            <div>F. Ingreso</div>
            <div>F. Terminación</div>
            <div>Total Remuneración</div>
            
            {/* Todos los campos de onboarding (12 campos) con labels escritos */}
            {onboardingFields.map(field => (
              <div key={field.key} className="text-center text-sm">
                <div className="break-words leading-tight font-medium">{field.label}</div>
              </div>
            ))}
            
            {/* Progreso */}
            <div>Progreso</div>
          </div>

          {/* Filas de la tabla dentro del mismo contenedor */}
          <div className="divide-y divide-gray-100">
            {contracts
              .filter(contract => contract.id) // Filtrar contratos sin ID
              .map((contract) => {
              const isExpanded = expandedRows.has(contract.id!)
              const progress = contract.contracts_onboarding_progress || 0

              return (
                <ContractRowWithCurrentData key={contract.id!} contract={contract} refreshTrigger={refreshTrigger + localRefreshTrigger}>
                  {(currentData) => (
                    <div>
                      {/* Fila principal - Dentro del scroll unificado */}
                      <div className={`grid gap-2 p-3 hover:bg-gray-50 transition-colors`} style={{gridTemplateColumns: generateGridColumns()}}>
                        
                        {/* Acciones al principio */}
                        <div className="flex flex-col items-start space-y-1">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => toggleRowExpansion(contract.id!)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Ver detalles"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {getContractStatusConfig(contract).can_edit ? (
                              canUpdate && (
                                <button
                                  onClick={() => onEdit(contract)}
                                  className="p-1 text-[#004C4C] hover:text-[#065C5C] transition-colors"
                                  title="Editar contrato"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => onEdit(contract)}
                                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                title="Ver contrato (solo lectura)"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            
                            {/* Botón de historial compacto */}
                            <button
                              onClick={() => {
                                setHistoryContract(contract)
                                setShowHistoryModal(true)
                              }}
                              className="p-1 text-[#004C4C] hover:text-[#065C5C] transition-colors"
                              title="Ver historial completo del contrato"
                            >
                              <History className="h-4 w-4" />
                            </button>
                            {canDelete && getContractStatusConfig(contract).can_delete && (
                              <button
                                onClick={() => setContractToDelete(contract)}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                title="Eliminar contrato"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          {/* Botón de aprobación */}
                          {getContractStatusConfig(contract).can_approve && onApprove && (
                            <ContractApprovalButton 
                              contract={contract} 
                              onSuccess={() => onApprove(contract)}
                              className="text-xs px-2 py-1 whitespace-nowrap"
                            />
                          )}
                          
                          {/* Botón de novedades */}
                          {contract.status_aprobacion === 'aprobado' && !currentData.is_terminated && (
                            <NovedadButton
                              contractId={contract.id!}
                              contractName={currentData.fullName}
                              onSuccess={handleNovedadSuccess}
                              className="text-xs px-2 py-1 whitespace-nowrap"
                            />
                          )}
                          
                        </div>

                        {/* Empleado */}
                        <div>
                          <div className="font-medium text-gray-900 text-base">
                            {currentData.loading ? (
                              <div className="flex items-center space-x-2">
                                <span>{contract.contracts_full_name || `${contract.primer_nombre} ${contract.primer_apellido}`}</span>
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              </div>
                            ) : (
                              currentData.fullName
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mb-1">{contract.tipo_identificacion} {contract.numero_identificacion}</div>
                          
                          <ContractStatusCompact 
                            contract={contract} 
                            isTerminated={currentData.is_terminated}
                            fechaTerminacion={currentData.fecha_terminacion}
                          />
                        </div>

                    {/* Empresa */}
                    <div>
                      <span className={`inline-block px-2 py-1 text-sm rounded-full font-medium ${
                        contract.empresa_interna === 'Good' 
                          ? 'bg-[#87E0E0] text-[#004C4C]' 
                          : 'bg-[#5FD3D2] text-[#004C4C]'
                      }`}>
                        {contract.empresa_interna}
                      </span>
                      <div className="text-sm text-gray-500 mt-1 break-words leading-tight">
                        {contract.company?.name || 'Sin empresa'}
                      </div>
                    </div>

                    {/* Contrato */}
                    <div>
                      <div className="text-base font-medium truncate">{contract.numero_contrato_helisa}</div>
                      
                      {/* Tipo de contrato en negrilla */}
                      <div className="text-sm font-bold text-gray-900 mt-1">
                        {contract.tipo_contrato === 'fijo' ? 'Fijo' :
                         contract.tipo_contrato === 'indefinido' ? 'Indefinido' :
                         contract.tipo_contrato === 'obra_labor' ? 'Obra/Labor' :
                         contract.tipo_contrato}
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-1">
                        {currentData.loading ? (
                          contract.cargo || '-'
                        ) : (
                          currentData.cargo || '-'
                        )}
                      </div>
                    </div>

                    {/* Fecha ingreso */}
                    <div className="text-base">
                      {formatDate(contract.fecha_ingreso)}
                    </div>

                    {/* Fecha terminación */}
                    <div className="text-base">
                      {currentData.loading ? (
                        contract.fecha_fin ? (
                          <div>
                            <span className="text-orange-600 font-medium">
                              {formatDate(contract.fecha_fin)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Indefinido</span>
                        )
                      ) : currentData.is_terminated ? (
                        <div>
                          <span className="text-red-600 font-bold">
                            Terminado: {formatDate(currentData.fecha_terminacion!)}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              if (!currentData.fecha_terminacion || !contract.fecha_ingreso) return ''
                              const fechaInicio = new Date(contract.fecha_ingreso)
                              const fechaTerminacion = new Date(currentData.fecha_terminacion)
                              const diffTime = fechaTerminacion.getTime() - fechaInicio.getTime()
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                              return `Duró ${diffDays} días`
                            })()}
                          </div>
                        </div>
                      ) : contract.tipo_contrato === 'fijo' ? (
                        // VISTA ESPECIAL PARA CONTRATOS FIJOS
                        <ContractFixedTermView 
                          contract={contract}
                          currentData={currentData}
                          formatDate={formatDate}
                        />
                      ) : (
                        currentData.fecha_fin_actual ? (
                          <div>
                            <span className="text-orange-600 font-medium">
                              {formatDate(currentData.fecha_fin_actual)}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {(() => {
                                const fechaFin = new Date(currentData.fecha_fin_actual)
                                const hoy = new Date()
                                hoy.setHours(0, 0, 0, 0)
                                fechaFin.setHours(0, 0, 0, 0)
                                
                                const diffTime = fechaFin.getTime() - hoy.getTime()
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                
                                if (diffDays > 0) {
                                  return `Faltan ${diffDays} días`
                                } else if (diffDays === 0) {
                                  return 'Vence hoy'
                                } else {
                                  return `Venció hace ${Math.abs(diffDays)} días`
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Indefinido</span>
                        )
                      )}
                    </div>

                    {/* Total Remuneración */}
                    <div className="text-base">
                      <div className="font-medium text-green-700">
                        {formatCurrencyLocal(
                          (currentData.salario || 0) + 
                          (currentData.auxilio_salarial_actual || 0) + 
                          (currentData.auxilio_no_salarial_actual || 0)
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Total remuneración
                      </div>
                    </div>

                    {/* Todos los campos de onboarding (12 campos) */}
                    {onboardingFields.map(field => {
                      const isLoading = loadingInline.has(contract.id!)
                      const isVirtual = field.isVirtual || false
                      const confirmationState = getFieldConfirmationState(contract, field.key)
                      const statusConfig = getContractStatusConfig(contract)
                      const canEditField = canUpdate && statusConfig.can_edit
                      
                      // Para campos virtuales, el "currentValue" se determina por el estado de confirmación
                      const currentValue = isVirtual 
                        ? confirmationState === 'confirmed'
                        : contract[field.key as keyof Contract] as boolean
                      
                      // Determinar estilo basado en el estado de confirmación (Verde=Solicitudes, Amarillo=Confirmaciones)
                      const getButtonStyle = () => {
                        if (isVirtual) {
                          // Campos virtuales (confirmaciones) - AMARILLO cuando confirmado
                          switch (confirmationState) {
                            case 'empty':
                              return 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            case 'pending':
                              return 'bg-gray-300 text-gray-500 hover:bg-gray-400 shadow-sm'
                            case 'confirmed':
                              return 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm'
                            default:
                              return 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }
                        } else {
                          // Campos reales (solicitudes) - VERDE cuando marcado
                          switch (confirmationState) {
                            case 'empty':
                              return 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            case 'pending':
                            case 'confirmed':
                              return 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                            default:
                              return 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }
                        }
                      }

                      const getTooltipText = () => {
                        const base = `${field.label}: `
                        if (isVirtual) {
                          switch (confirmationState) {
                            case 'empty':
                              return base + 'Requiere solicitud primero'
                            case 'pending':
                              return base + 'Pendiente de confirmar'
                            case 'confirmed':
                              return base + 'Confirmado'
                            default:
                              return base + 'Pendiente'
                          }
                        } else {
                          switch (confirmationState) {
                            case 'empty':
                              return base + 'No solicitado'
                            case 'pending':
                              return base + 'Solicitado (sin datos)'
                            case 'confirmed':
                              return base + 'Solicitado con datos'
                            default:
                              return base + 'Pendiente'
                          }
                        }
                      }
                      
                      return (
                        <div key={field.key} className="flex justify-center">
                          <button
                            onClick={() => handleToggleOnboarding(contract.id!, field.key, currentValue)}
                            disabled={!canEditField || isLoading}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                              getButtonStyle()
                            } ${!canEditField ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={`${getTooltipText()} ${!statusConfig.can_edit ? '(Solo lectura)' : ''}`}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : confirmationState === 'empty' ? (
                              <X className="h-3 w-3" />
                            ) : isVirtual && confirmationState === 'pending' ? (
                              <div className="w-2 h-2 bg-gray-600 rounded-full" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )
                    })}

                    {/* Progreso */}
                    <div>
                      <div className="flex items-center space-x-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fila expandida - SOLO INFORMATIVA (no editable) */}
              {isExpanded && (
                <div className="hidden lg:block bg-gray-50 px-4 py-4 border-t border-gray-200">
                  
                  {/* Primera fila: 4 columnas COMPACTAS */}
                  <div className="flex gap-4 text-sm mb-6 max-w-5xl">
                    
                    {/* Información Personal */}
                    <div className="h-full w-64">
                      <div className="font-semibold text-gray-800 mb-3 text-base h-6">Información Personal</div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Email:</span>
                          <span className="text-gray-800">
                            {currentData.loading ? (
                              <div className="flex items-center space-x-1">
                                <span>{contract.email || 'No registrado'}</span>
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              </div>
                            ) : (
                              currentData.email || 'No registrado'
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Teléfono:</span>
                          <span className="text-gray-800">
                            {currentData.loading ? (
                              <div className="flex items-center space-x-1">
                                <span>{contract.celular || 'No registrado'}</span>
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              </div>
                            ) : (
                              currentData.celular || 'No registrado'
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">F. Nacimiento:</span>
                          <span className="text-gray-800">{formatDate(contract.fecha_nacimiento)}</span>
                        </div>
                        {/* Campo género no disponible */}
                      </div>
                    </div>

                    {/* Información Contractual */}
                    <div className="h-full w-56">
                      <div className="font-semibold text-gray-800 mb-3 text-base h-6">Información Contractual</div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Tipo Contrato:</span>
                          <span className="text-gray-800">{contract.tipo_contrato || 'No especificado'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Ciudad Labora:</span>
                          <span className="text-gray-800">{currentData.ciudad_labora_actual || 'No especificado'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Tipo Salario:</span>
                          <span className="text-gray-800">{contract.tipo_salario || 'No especificado'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Aporta SENA:</span>
                          <span className="text-gray-800">
                            {currentData.loading ? (
                              <div className="flex items-center space-x-1">
                                <span>{contract.base_sena ? 'Sí' : 'No'}</span>
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              </div>
                            ) : (
                              currentData.aporta_sena_actual ? 'Sí' : 'No'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compensación */}
                    <div className="h-full w-52">
                      <div className="font-semibold text-gray-800 mb-3 text-base h-6">Compensación</div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Salario Base:</span>
                          <span className="text-gray-800 font-medium">{formatCurrencyLocal(currentData.salario)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Auxilio Salarial:</span>
                          <span className="text-gray-800">{formatCurrencyLocal(currentData.auxilio_salarial_actual)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Concepto Aux. Salarial:</span>
                          <span className="text-gray-800">{currentData.auxilio_salarial_concepto_actual || contract.auxilio_salarial_concepto || 'No especificado'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">💰 Total Remuneración:</span>
                          <span className="text-green-700 font-bold text-lg">
                            {formatCurrencyLocal(
                              (currentData.salario || 0) + 
                              (currentData.auxilio_salarial_actual || 0) + 
                              (currentData.auxilio_no_salarial_actual || 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auxilios No Salariales */}
                    <div className="h-full w-48">
                      <div className="font-semibold text-gray-800 mb-3 text-base h-6">Auxilios No Salariales</div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Auxilio No Salarial:</span>
                          <span className="text-gray-800">{formatCurrencyLocal(currentData.auxilio_no_salarial_actual)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Concepto Aux. No Salarial:</span>
                          <span className="text-gray-800">{currentData.auxilio_no_salarial_concepto_actual || contract.auxilio_no_salarial_concepto || 'No especificado'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Auxilio Transporte:</span>
                          <span className="text-gray-800">{formatCurrencyLocal(currentData.auxilio_transporte_actual)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">🏛️ Aporta SENA:</span>
                          <span className="text-gray-800">
                            {currentData.loading ? (
                              <div className="flex items-center space-x-1">
                                <span>{contract.base_sena ? 'Sí' : 'No'}</span>
                                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                              </div>
                            ) : (
                              currentData.aporta_sena_actual ? 'Sí' : 'No'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segunda fila: 3 columnas COMPACTAS */}
                  <div className="flex gap-4 text-sm max-w-7xl">
                    
                    {/* Beneficiarios */}
                    <div className="w-64">
                      <div className="font-semibold text-gray-800 mb-3 text-base h-6">Beneficiarios</div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Hijos:</span>
                          <span className="text-gray-800">{currentData.beneficiario_hijo_actual ?? contract.beneficiario_hijo ?? 0}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Madre:</span>
                          <span className="text-gray-800">{(currentData.beneficiario_madre_actual ?? contract.beneficiario_madre ?? 0) === 1 ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Padre:</span>
                          <span className="text-gray-800">{(currentData.beneficiario_padre_actual ?? contract.beneficiario_padre ?? 0) === 1 ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Cónyuge:</span>
                          <span className="text-gray-800">{(currentData.beneficiario_conyuge_actual ?? contract.beneficiario_conyuge ?? 0) === 1 ? 'Sí' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Información Médica */}
                    <div className="w-64">
                      <div className="font-semibold text-gray-800 mb-3 text-base h-6">🏥 Información Médica</div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Condición Médica:</span>
                          <span className="text-gray-800">
                            {contract.tiene_condicion_medica ? 'Sí tiene' : 'No tiene'}
                          </span>
                        </div>
                        {contract.tiene_condicion_medica && contract.condicion_medica_detalle && (
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-xs font-medium">Detalle:</span>
                            <span className="text-gray-800 text-xs leading-relaxed bg-orange-50 p-2 rounded border">
                              {contract.condicion_medica_detalle}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Afiliaciones */}
                    <ContractAfiliacionesSection 
                      contract={contract}
                      refreshTrigger={refreshTrigger}
                    />

                    {/* Documentos y Observaciones - Expandido */}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 mb-3 text-base h-6">Documentos</div>
                      <div className="space-y-3 max-w-2xl">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">URL Dropbox:</span>
                          {contract.dropbox ? (
                            <a 
                              href={contract.dropbox} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[#004C4C] hover:text-[#065C5C] text-sm underline break-all"
                            >
                              Ver documentos
                            </a>
                          ) : (
                            <span className="text-gray-800">No registrado</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs font-medium">Observaciones:</span>
                          <span className="text-gray-800 text-sm leading-relaxed">
                            {contract.observacion || 'Sin observaciones'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Nota informativa */}
                  <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500 italic">
                      Para editar esta información, usa el botón "Editar" y abre el modal completo
                    </p>
                  </div>
                </div>
              )}

                    </div>
                  )}
                </ContractRowWithCurrentData>
              )
            })}
          </div>
        </div>
      </div>

      {/* Vista móvil */}
      <div className="lg:hidden divide-y divide-gray-100">
        {contracts
          .filter(contract => contract.id) // Filtrar contratos sin ID
          .map((contract) => {
          const statusConfig = getContractStatusConfig(contract)

          return (
            <ContractRowWithCurrentData key={contract.id!} contract={contract} refreshTrigger={refreshTrigger + localRefreshTrigger}>
              {(currentData) => (
                <div className="p-4 space-y-3">
                  {/* Info básica */}
                  <div className="space-y-2">
                    <div className="font-medium text-gray-900 text-lg">
                      {currentData.loading ? (
                        <div className="flex items-center space-x-2">
                          <span>{contract.contracts_full_name || `${contract.primer_nombre} ${contract.primer_apellido}`}</span>
                          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        currentData.fullName
                      )}
                    </div>
                    
                    {/* Info contratos fijos - misma lógica que desktop */}
                    {contract.tipo_contrato === 'fijo' && (
                      <div className="text-sm mt-1">
                        <span className="font-medium">Contrato Fijo</span>
                        <span className="text-gray-400"> • </span>
                        <ContractFixedTermView 
                          contract={contract}
                          currentData={currentData}
                          formatDate={formatDate}
                        />
                      </div>
                    )}
                    
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    contract.empresa_interna === 'Good' 
                      ? 'bg-[#87E0E0] text-[#004C4C]' 
                      : 'bg-[#5FD3D2] text-[#004C4C]'
                  }`}>
                    {contract.empresa_interna}
                  </span>
                  <span className="text-gray-600">
                    {contract.company?.name || 'Sin empresa cliente'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {currentData.ciudad_labora_actual && `${currentData.ciudad_labora_actual} • `}
                  {currentData.loading ? (
                    contract.cargo || 'Sin cargo definido'
                  ) : (
                    currentData.cargo || 'Sin cargo definido'
                  )}
                </div>
              </div>

              {/* Status badges */}
              <div className="flex items-center space-x-2">
                <ContractStatusCompact contract={contract} />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {/* Botón de editar/ver */}
                  {statusConfig.can_edit ? (
                    canUpdate && (
                      <button
                        onClick={() => onEdit(contract)}
                        className="flex items-center space-x-1 px-3 py-2 bg-[#004C4C] text-white rounded-lg text-sm font-medium hover:bg-[#065C5C] transition-colors flex-shrink-0"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Editar</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => onEdit(contract)}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors flex-shrink-0"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver</span>
                    </button>
                  )}
                  
                  {/* Botón de historial */}
                  <button
                    onClick={() => {
                      setHistoryContract(contract)
                      setShowHistoryModal(true)
                    }}
                    className="flex items-center space-x-1 px-3 py-2 bg-[#004C4C] text-white rounded-lg text-sm font-medium hover:bg-[#065C5C] transition-colors flex-shrink-0"
                    title="Ver historial completo del contrato"
                  >
                    <History className="h-4 w-4" />
                    <span>Historial</span>
                  </button>
                  
                  {/* Botón de aprobar */}
                  {statusConfig.can_approve && onApprove && (
                    <div className="flex-shrink-0">
                      <ContractApprovalButton 
                        contract={contract}
                        onSuccess={() => onApprove(contract)}
                        className="px-3 py-2 text-sm font-medium"
                      />
                    </div>
                  )}
                  
                  {/* Botón de novedades */}
                  {contract.status_aprobacion === 'aprobado' && !currentData.is_terminated && (
                    <div className="flex-shrink-0">
                      <NovedadButton
                        contractId={contract.id!}
                        contractName={currentData.fullName}
                        onSuccess={handleNovedadSuccess}
                        className="px-3 py-2 text-sm font-medium"
                      />
                    </div>
                  )}
                  
                  
                  {/* Botón de eliminar */}
                  {canDelete && statusConfig.can_delete && (
                    <button
                      onClick={() => setContractToDelete(contract)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
                </div>
              )}
            </ContractRowWithCurrentData>
          )
        })}
      </div>

      {/* Empty state */}
      {contracts.length === 0 && (
        <div className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contratos</h3>
          <p className="text-gray-500">No se encontraron contratos que coincidan con los filtros.</p>
        </div>
      )}

      {/* Modal de Eliminación */}
      <DeleteContractModal
        isOpen={!!contractToDelete}
        onClose={() => setContractToDelete(null)}
        onSuccess={() => {
          setContractToDelete(null)
          onUpdate()
        }}
        contract={contractToDelete}
      />

      {/* Modal de Información Adicional */}
      <OnboardingDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onSave={async (data) => {
          if (!detailModalData.contract) return
          
          const updates: Record<string, any> = {}
          
          // Para campos virtuales, NO actualizar el campo base en BD
          const isVirtualField = detailModalData.field.startsWith('confirmacion_')
          
          if (!isVirtualField) {
            // Solo para campos reales (no virtuales)
            updates[detailModalData.field] = true
          }
          
          // Agregar fecha según el campo
          if (data.dateField === 'examenes') {
            updates['examenes_fecha'] = data.date
          } else if (data.dateField === 'contrato') {
            updates['contrato_fecha_confirmacion'] = data.date
          } else {
            updates[`${data.dateField}_fecha_confirmacion`] = data.date
          }
          
          // Agregar campo de texto si existe
          if (data.textField && data.text) {
            updates[data.textField] = data.text
          }

          try {
            const { error } = await supabase
              .from('contracts')
              .update(updates)
              .eq('id', detailModalData.contract.id!)

            if (error) throw error
            
            // Mostrar mensaje de éxito
            const fieldLabel = onboardingFields.find(f => f.key === detailModalData.field)?.label || detailModalData.field
            showInfoToast(`${fieldLabel} confirmado correctamente con fecha ${data.date}`, 'success')
            
            onUpdate()
            setShowDetailModal(false)
          } catch (error) {
            console.error('Error updating contract details:', error)
            showInfoToast('Error al guardar la información. Intenta de nuevo.', 'warning')
          }
        }}
        data={detailModalData}
      />

      {/* Modal de Confirmación Personalizado */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmModalData.onConfirm}
        title={confirmModalData.title}
        message={confirmModalData.message}
        type={confirmModalData.type}
        confirmText="Sí, continuar"
        cancelText="Cancelar"
      />

      {/* Contract History Modal */}
      <ContractHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false)
          setHistoryContract(null)
        }}
        contract={historyContract}
      />
    </div>
  )
}
