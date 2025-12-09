/**
 * Tabla de contratos moderna y responsive
 * Reemplaza ContractsTable con diseño moderno y vista híbrida móvil/desktop
 */

'use client'

import { useState } from 'react'
import { 
  Edit, 
  Eye,
  Trash2,
  FileText,
  Building2,
  User,
  Calendar,
  DollarSign
} from 'lucide-react'
import ResponsiveDataTable from '../ui/ResponsiveDataTable'
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

interface ContractsTableResponsiveProps {
  contracts: Contract[]
  companies: any[]
  loading: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  onEdit: (contract: Contract) => void
  onDelete: (contract: Contract) => void
  onAdd: () => void
  onApprovalChange: () => void
}

export default function ContractsTableResponsive({
  contracts,
  companies,
  loading,
  canCreate,
  canEdit,
  canDelete,
  canApprove,
  onEdit,
  onDelete,
  onAdd,
  onApprovalChange
}: ContractsTableResponsiveProps) {

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: 'numero_contrato',
      label: 'N° Contrato',
      sortable: true,
      mobileShow: true,
      render: (value: string) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {value || 'Sin asignar'}
        </span>
      )
    },
    {
      key: 'primer_nombre',
      label: 'Empleado',
      sortable: true,
      mobileShow: true,
      render: (value: string, record: Contract) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900">
            {`${record.primer_nombre} ${record.primer_apellido}`}
          </span>
        </div>
      )
    },
    {
      key: 'empresa_interna',
      label: 'Empresa',
      sortable: true,
      mobileShow: true,
      render: (value: string) => (
        <div className="flex items-center">
          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-gray-900">{value}</span>
        </div>
      )
    },
    {
      key: 'cargo',
      label: 'Cargo',
      sortable: true,
      mobileShow: false
    },
    {
      key: 'salario_base',
      label: 'Salario',
      sortable: true,
      mobileShow: true,
      render: (value: number, record: Contract) => (
        <div className="text-right">
          <span className="font-semibold text-green-600">
            {formatCurrency(calculateTotalRemuneration(record))}
          </span>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      )
    },
    {
      key: 'fecha_ingreso',
      label: 'Inicio',
      sortable: true,
      mobileShow: false,
      render: (value: string) => value ? (
        <div className="flex items-center text-sm">
          <Calendar className="w-3 h-3 text-gray-400 mr-1" />
          {formatDateColombia(value)}
        </div>
      ) : 'No definido'
    },
    {
      key: 'fecha_fin',
      label: 'Fin',
      sortable: true,
      mobileShow: false,
      render: (value: string) => value ? formatDateColombia(value) : 'Indefinido'
    },
    {
      key: 'status_aprobacion',
      label: 'Estado',
      sortable: false,
      mobileShow: true,
      render: (value: string, record: Contract) => (
        <div className="space-y-1">
          <ContractStatusCompact 
            contract={record}
          />
          {canApprove && value === 'borrador' && (
            <ContractApprovalButton
              contract={record}
              onSuccess={onApprovalChange}
            />
          )}
        </div>
      )
    }
  ]

  // Configuración de acciones
  const actions = [
    {
      key: 'view',
      label: 'Ver',
      icon: Eye,
      color: 'blue' as const,
      onClick: (record: Contract) => {
        // Implementar vista de detalles
        console.log('Ver contrato:', record)
      },
      show: () => true
    },
    {
      key: 'edit',
      label: 'Editar',
      icon: Edit,
      color: 'blue' as const,
      onClick: (record: Contract) => onEdit(record),
      show: () => canEdit
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: Trash2,
      color: 'red' as const,
      onClick: (record: Contract) => onDelete(record),
      show: () => canDelete
    }
  ]

  // Función para generar título móvil
  const getMobileTitle = (contract: Contract) => {
    return `${contract.primer_nombre} ${contract.primer_apellido}`
  }

  // Función para generar subtítulo móvil
  const getMobileSubtitle = (contract: Contract) => {
    return `${contract.empresa_interna} • ${contract.cargo || 'Sin cargo'}`
  }

  // Función para generar badge móvil
  const getMobileBadge = (contract: Contract) => {
    const statusConfig = getStatusAprobacionConfig(contract.status_aprobacion || 'aprobado')
    return (
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full bg-green-500`}></div>
        <span className={`text-xs font-medium text-green-600`}>
          {statusConfig.label}
        </span>
      </div>
    )
  }

  return (
    <ResponsiveDataTable
      data={contracts}
      columns={columns}
      actions={actions}
      loading={loading}
      searchPlaceholder="Buscar contratos..."
      onAdd={canCreate ? onAdd : undefined}
      canCreate={canCreate}
      emptyMessage="No hay contratos registrados"
      addButtonText="Nuevo Contrato"
      mobileTitle={getMobileTitle}
      mobileSubtitle={getMobileSubtitle}
      mobileBadge={getMobileBadge}
    />
  )
}
