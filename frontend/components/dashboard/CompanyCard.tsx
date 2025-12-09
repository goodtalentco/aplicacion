'use client'

import { useState } from 'react'
import { Edit3, Archive, Mail, Phone, User, Calendar, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatDateColombiaLong } from '../../utils/dateUtils'

interface Company {
  id: string
  name: string
  tax_id: string
  grupo_empresarial_id?: string
  grupo_empresarial?: {
    id: string
    nombre: string
    descripcion?: string
  }
  accounts_contact_name?: string
  accounts_contact_email?: string
  accounts_contact_phone?: string
  comercial_contact_name?: string
  comercial_contact_email?: string
  comercial_contact_phone?: string
  status: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  archived_at?: string | null
  archived_by?: string | null
  companies_created_by_handle?: string | null
  companies_updated_by_handle?: string | null
  business_lines?: Array<{
    id: string
    nombre: string
    descripcion?: string
    es_activa?: boolean
    estado?: string
  }>
}

interface CompanyCardProps {
  company: Company
  onEdit: (company: Company) => void
  onUpdate: () => void
  canUpdate: boolean
  canDelete: boolean
}

/**
 * Tarjeta moderna para mostrar información de empresas
 * Incluye acciones de editar, activar/desactivar y archivar
 */
export default function CompanyCard({
  company,
  onEdit,
  onUpdate,
  canUpdate,
  canDelete
}: CompanyCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

  const isArchived = !!company.archived_at

  // Usar formateo de fecha correcto para Colombia (evita problema de zona horaria)
  const formatDate = formatDateColombiaLong


  const handleArchive = async () => {
    if (!canDelete) return
    
    setLoading('archive')
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { error } = await supabase
        .from('companies')
        .update({ 
          archived_at: new Date().toISOString(),
          status: false,
          archived_by: user.id,
          updated_by: user.id
        })
        .eq('id', company.id)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error archiving company:', error)
    } finally {
      setLoading(null)
      setShowConfirm(null)
    }
  }

  const handleUnarchive = async () => {
    if (!canUpdate) return
    
    setLoading('unarchive')
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { error } = await supabase
        .from('companies')
        .update({ 
          archived_at: null,
          archived_by: null,
          status: true,
          updated_by: user.id
        })
        .eq('id', company.id)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error unarchiving company:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col h-full min-h-[520px]`}>
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          {isArchived ? (
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              Archivada
            </span>
          ) : company.status ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              Activa
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
              Inactiva
            </span>
          )}
        </div>

        {/* Company Header - banda a todo el ancho de la tarjeta */}
        <div className="mb-4">
          <div className="-mx-6 -mt-6 rounded-t-2xl bg-[#F1F5F9] border-b border-gray-200 px-6 py-3 sm:py-4 pr-20 h-[72px] flex flex-col justify-center">
            <h3 className="text-base sm:text-lg md:text-xl leading-tight font-bold text-[#004C4C] truncate">
              {company.name}
            </h3>
            <p className="text-xs text-[#065C5C] font-medium mt-1 truncate min-h-[16px]">
              {company.grupo_empresarial ? company.grupo_empresarial.nombre : ''}
            </p>
          </div>
          <p className="mt-2 text-sm text-gray-500 pr-16">NIT: {company.tax_id}</p>
        </div>

        {/* Contact Information - Siempre mostrar ambas secciones */}
        <div className="space-y-4 mb-6">
          
          {/* Contacto Comercial - Siempre presente */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contacto Comercial</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 font-medium">
                  {company.comercial_contact_name || 'No disponible'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                {company.comercial_contact_email ? (
                  <a 
                    href={`mailto:${company.comercial_contact_email}`}
                    className="text-[#004C4C] hover:text-[#065C5C] transition-colors truncate"
                  >
                    {company.comercial_contact_email}
                  </a>
                ) : (
                  <span className="text-gray-500">No disponible</span>
                )}
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                {company.comercial_contact_phone ? (
                  <a 
                    href={`tel:${company.comercial_contact_phone}`}
                    className="text-[#004C4C] hover:text-[#065C5C] transition-colors"
                  >
                    {company.comercial_contact_phone}
                  </a>
                ) : (
                  <span className="text-gray-500">No disponible</span>
                )}
              </div>
            </div>
          </div>

          {/* Contacto de Cartera - Siempre presente */}
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contacto de Cartera</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 font-medium">
                  {company.accounts_contact_name || 'No disponible'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                {company.accounts_contact_email ? (
                  <a 
                    href={`mailto:${company.accounts_contact_email}`}
                    className="text-[#004C4C] hover:text-[#065C5C] transition-colors truncate"
                  >
                    {company.accounts_contact_email}
                  </a>
                ) : (
                  <span className="text-gray-500">No disponible</span>
                )}
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                {company.accounts_contact_phone ? (
                  <a 
                    href={`tel:${company.accounts_contact_phone}`}
                    className="text-[#004C4C] hover:text-[#065C5C] transition-colors"
                  >
                    {company.accounts_contact_phone}
                  </a>
                ) : (
                  <span className="text-gray-500">No disponible</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Líneas de Negocio - Siempre presente */}
        <div className="border-t border-gray-100 pt-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <div className="w-3 h-3 bg-[#004C4C] rounded-sm mr-2"></div>
            Líneas de Negocio
          </h4>
          <div className="flex flex-wrap gap-2">
            {company.business_lines && company.business_lines.length > 0 ? (
              company.business_lines.map((businessLine) => (
                <span
                  key={businessLine.id}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    businessLine.es_activa !== false
                      ? 'bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white'
                      : 'bg-gray-200 text-gray-600 line-through'
                  }`}
                  title={`${businessLine.descripcion || businessLine.nombre}${
                    businessLine.es_activa === false ? ' (Descontinuada)' : ''
                  }`}
                >
                  {businessLine.nombre}
                  {businessLine.es_activa === false && (
                    <span className="ml-1 text-xs opacity-75">❌</span>
                  )}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                No disponible
              </span>
            )}
          </div>
        </div>

        {/* Metadata (altura consistente y usuarios creador/editor) */}
        <div className="border-t border-gray-100 pt-4 mb-4">
          <div className="flex flex-col space-y-1 text-sm text-gray-500 min-h-[44px]">
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>Creada: {formatDate(company.created_at)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>
                Actualizada: {company.updated_at !== company.created_at ? formatDate(company.updated_at) : '—'}
              </span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-500">
            <div>
              <span className="font-medium">Creado por: </span>
              <span title={company.companies_created_by_handle || ''}>{company.companies_created_by_handle ?? 'N/D'}</span>
            </div>
            <div>
              <span className="font-medium">Editado por: </span>
              <span title={company.companies_updated_by_handle || ''}>{company.companies_updated_by_handle ?? 'N/D'}</span>
            </div>
          </div>
        </div>

        {/* Spacer para empujar los botones hacia abajo */}
        <div className="flex-grow"></div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Editar */}
          {canUpdate && !isArchived && (
            <button
              onClick={() => onEdit(company)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-base"
            >
              <Edit3 className="h-4 w-4" />
              <span>Editar</span>
            </button>
          )}

          {/* Archivar - Acción principal que desactiva y archiva */}
          {canDelete && !isArchived && (
            <button
              onClick={() => setShowConfirm('archive')}
              className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-base"
            >
              <Archive className="h-4 w-4" />
              <span>Archivar</span>
            </button>
          )}

          {/* Desarchivar */}
          {canUpdate && isArchived && (
            <button
              onClick={handleUnarchive}
              disabled={loading === 'unarchive'}
              className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-base"
            >
              {loading === 'unarchive' ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Archive className="h-4 w-4" />
              )}
              <span>Restaurar</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm === 'archive' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Confirmar Archivado</h3>
                <p className="text-base text-gray-600">Esta acción no se puede deshacer fácilmente</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que deseas archivar la empresa <strong>{company.name}</strong>?
              Esta acción desactivará la empresa y la moverá al archivo histórico.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleArchive}
                disabled={loading === 'archive'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading === 'archive' ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Archivando...</span>
                  </div>
                ) : (
                  'Archivar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
