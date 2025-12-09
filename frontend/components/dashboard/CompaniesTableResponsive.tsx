/**
 * Tabla de empresas moderna y responsive
 * Nueva vista de tabla para empresas con diseño híbrido móvil/desktop
 */

'use client'

import { 
  Edit, 
  Eye,
  Trash2,
  Building2,
  Mail,
  Phone,
  Archive,
  ArchiveRestore
} from 'lucide-react'
import ResponsiveDataTable from '../ui/ResponsiveDataTable'

interface Company {
  id: string
  name: string
  tax_id: string
  accounts_contact_name: string
  accounts_contact_email: string
  accounts_contact_phone: string
  status: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  archived_at?: string | null
}

interface CompaniesTableResponsiveProps {
  companies: Company[]
  loading: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
  onAdd: () => void
  onArchive?: (company: Company) => void
  onRestore?: (company: Company) => void
}

export default function CompaniesTableResponsive({
  companies,
  loading,
  canCreate,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onAdd,
  onArchive,
  onRestore
}: CompaniesTableResponsiveProps) {

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: 'name',
      label: 'Empresa',
      sortable: true,
      mobileShow: true,
      render: (value: string, record: Company) => (
        <div className="flex items-center">
          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">NIT: {record.tax_id}</div>
          </div>
        </div>
      )
    },
    {
      key: 'accounts_contact_name',
      label: 'Contacto',
      sortable: true,
      mobileShow: true,
      render: (value: string, record: Company) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="flex items-center text-xs text-gray-500">
            <Mail className="w-3 h-3 mr-1" />
            {record.accounts_contact_email}
          </div>
        </div>
      )
    },
    {
      key: 'accounts_contact_phone',
      label: 'Teléfono',
      sortable: false,
      mobileShow: false,
      render: (value: string) => (
        <div className="flex items-center text-sm">
          <Phone className="w-3 h-3 text-gray-400 mr-1" />
          {value || 'No registrado'}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      sortable: true,
      mobileShow: true,
      render: (value: boolean, record: Company) => (
        <div className="flex flex-col space-y-1">
          {record.archived_at ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <Archive className="w-3 h-3 mr-1" />
              Archivada
            </span>
          ) : (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              value 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {value ? 'Activa' : 'Inactiva'}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Fecha Creación',
      sortable: true,
      mobileShow: false,
      render: (value: string) => new Date(value).toLocaleDateString('es-ES')
    }
  ]

  // Configuración de acciones
  const actions = [
    {
      key: 'view',
      label: 'Ver',
      icon: Eye,
      color: 'blue' as const,
      onClick: (record: Company) => {
        // Implementar vista de detalles
        console.log('Ver empresa:', record)
      },
      show: () => true
    },
    {
      key: 'edit',
      label: 'Editar',
      icon: Edit,
      color: 'blue' as const,
      onClick: (record: Company) => onEdit(record),
      show: (record: Company) => canEdit && !record.archived_at
    },
    {
      key: 'archive',
      label: 'Archivar',
      icon: Archive,
      color: 'yellow' as const,
      onClick: (record: Company) => onArchive && onArchive(record),
      show: (record: Company) => Boolean(onArchive) && !record.archived_at
    },
    {
      key: 'restore',
      label: 'Restaurar',
      icon: ArchiveRestore,
      color: 'green' as const,
      onClick: (record: Company) => onRestore && onRestore(record),
      show: (record: Company) => Boolean(onRestore) && Boolean(record.archived_at)
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: Trash2,
      color: 'red' as const,
      onClick: (record: Company) => onDelete(record),
      show: (record: Company) => canDelete && Boolean(record.archived_at)
    }
  ]

  // Función para generar título móvil
  const getMobileTitle = (company: Company) => {
    return company.name
  }

  // Función para generar subtítulo móvil
  const getMobileSubtitle = (company: Company) => {
    return `${company.accounts_contact_name} • ${company.tax_id}`
  }

  // Función para generar badge móvil
  const getMobileBadge = (company: Company) => {
    if (company.archived_at) {
      return (
        <div className="flex items-center space-x-1">
          <Archive className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-600 font-medium">Archivada</span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${company.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className={`text-xs font-medium ${company.status ? 'text-green-600' : 'text-red-600'}`}>
          {company.status ? 'Activa' : 'Inactiva'}
        </span>
      </div>
    )
  }

  return (
    <ResponsiveDataTable
      data={companies}
      columns={columns}
      actions={actions}
      loading={loading}
      searchPlaceholder="Buscar empresas..."
      onAdd={canCreate ? onAdd : undefined}
      canCreate={canCreate}
      emptyMessage="No hay empresas registradas"
      addButtonText="Nueva Empresa"
      mobileTitle={getMobileTitle}
      mobileSubtitle={getMobileSubtitle}
      mobileBadge={getMobileBadge}
    />
  )
}
