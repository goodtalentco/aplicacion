'use client'

import { useState } from 'react'
import { 
  User, 
  Briefcase, 
  Heart, 
  DollarSign, 
  Calendar, 
  UserX, 
  Users, 
  FileText,
  X 
} from 'lucide-react'
import { useNovedadPermissions } from '../../hooks/useNovedadPermissions'
import { PermissionDeniedModal } from '../ui/PermissionDeniedModal'

/**
 * Selector de tipo de novedad con diseño moderno
 * Permite al usuario elegir qué tipo de novedad quiere crear
 */

export interface NovedadType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  permission?: string // Permiso requerido
}

interface NovedadTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectType: (type: NovedadType) => void
  contractId: string
  contractName: string
}

const NOVEDAD_TYPES: NovedadType[] = [
  {
    id: 'datos_personales',
    title: 'Datos Personales',
    description: 'Cambios en teléfono, email, dirección',
    icon: <User className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-300',
    permission: 'novedades_datos_personales.create'
  },
  {
    id: 'cambio_cargo',
    title: 'Cambio de Cargo',
    description: 'Promociones y cambios de posición',
    icon: <Briefcase className="w-6 h-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200 hover:border-purple-300',
    permission: 'novedades_cambio_cargo.create'
  },
  {
    id: 'entidades',
    title: 'Entidades',
    description: 'Cambios de EPS, Pensión, Cesantías',
    icon: <Heart className="w-6 h-6" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200 hover:border-red-300',
    permission: 'novedades_entidades.create'
  },
  {
    id: 'economicas',
    title: 'Económicas',
    description: 'Cambios salariales y auxilios',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200 hover:border-green-300',
    permission: 'novedades_economicas.create'
  },
  {
    id: 'tiempo_laboral',
    title: 'Tiempo Laboral',
    description: 'Prórrogas, vacaciones, suspensiones',
    icon: <Calendar className="w-6 h-6" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200 hover:border-indigo-300',
    permission: 'novedades_tiempo_laboral.create'
  },
  {
    id: 'incapacidad',
    title: 'Incapacidades',
    description: 'Incapacidades médicas y laborales',
    icon: <UserX className="w-6 h-6" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200 hover:border-orange-300',
    permission: 'novedades_incapacidad.create'
  },
  {
    id: 'beneficiarios',
    title: 'Beneficiarios',
    description: 'Cambios en hijos, cónyuge, padres',
    icon: <Users className="w-6 h-6" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200 hover:border-teal-300',
    permission: 'novedades_beneficiarios.create'
  },
  {
    id: 'terminacion',
    title: 'Terminación',
    description: 'Finalización del contrato',
    icon: <FileText className="w-6 h-6" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    permission: 'novedades_terminacion.create'
  }
]

export default function NovedadTypeSelector({
  isOpen,
  onClose,
  onSelectType,
  contractId,
  contractName
}: NovedadTypeSelectorProps) {
  const { hasNovedadPermission, getNovedadPermissionName } = useNovedadPermissions()
  const [selectedType, setSelectedType] = useState<NovedadType | null>(null)
  const [showPermissionDenied, setShowPermissionDenied] = useState(false)
  const [deniedPermissionType, setDeniedPermissionType] = useState<string>('')

  const handleTypeClick = (type: NovedadType) => {
    // Validar permisos antes de proceder
    if (!hasNovedadPermission(type.id as any)) {
      setDeniedPermissionType(getNovedadPermissionName(type.id as any))
      setShowPermissionDenied(true)
      return
    }

    // Si tiene permisos, proceder normalmente
    onSelectType(type)
  }

  if (!isOpen) return null

  const handleSelectType = (type: NovedadType) => {
    setSelectedType(type)
    // Pequeña animación antes de proceder
    setTimeout(() => {
      handleTypeClick(type) // Usar la nueva función que valida permisos
      setSelectedType(null)
    }, 150)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nueva Novedad</h2>
              <p className="text-sm text-gray-600 mt-1">
                Contrato: <span className="font-medium">{contractName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Selecciona el tipo de novedad
            </h3>
            <p className="text-gray-600">
              Elige qué información del contrato quieres modificar
            </p>
          </div>

          {/* Grid de tipos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NOVEDAD_TYPES.map((type) => {
              const hasPermission = hasNovedadPermission(type.id as any)
              
              return (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type)}
                  disabled={!hasPermission}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all duration-200 text-left group
                    ${hasPermission 
                      ? type.borderColor 
                      : 'border-gray-200'
                    }
                    ${selectedType?.id === type.id 
                      ? 'scale-95 opacity-75' 
                      : hasPermission 
                        ? 'hover:scale-105 hover:shadow-lg'
                        : 'cursor-not-allowed opacity-60'
                    }
                    ${hasPermission ? type.bgColor : 'bg-gray-50'}
                  `}
                >
                  {/* Indicador de permiso denegado */}
                  {!hasPermission && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-red-600" />
                      </div>
                    </div>
                  )}

                  {/* Icono */}
                  <div className={`
                    inline-flex p-3 rounded-lg mb-4 ${hasPermission ? type.color : 'text-gray-400'} ${hasPermission ? type.bgColor : 'bg-gray-100'}
                    group-hover:scale-110 transition-transform duration-200
                  `}>
                    {type.icon}
                  </div>

                  {/* Contenido */}
                  <div>
                    <h4 className={`font-semibold mb-2 ${hasPermission ? 'text-gray-900 group-hover:text-gray-700' : 'text-gray-500'}`}>
                      {type.title}
                      {!hasPermission && (
                        <span className="ml-2 text-xs text-red-600 font-normal">(Sin acceso)</span>
                      )}
                    </h4>
                    <p className={`text-sm ${hasPermission ? 'text-gray-600 group-hover:text-gray-500' : 'text-gray-400'}`}>
                      {type.description}
                    </p>
                  </div>

                  {/* Indicador de hover */}
                  <div className="absolute inset-0 rounded-xl bg-white bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* Modal de permisos denegados */}
      <PermissionDeniedModal
        isOpen={showPermissionDenied}
        onClose={() => setShowPermissionDenied(false)}
        permissionType={deniedPermissionType}
      />
    </div>
  )
}
