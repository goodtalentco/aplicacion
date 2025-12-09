'use client'

import { useState, useEffect } from 'react'
import { X, Building2, User, Mail, Phone, AlertCircle, Target } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import ARLSection from './ARLSection'
import CajasSection from './CajasSection'

interface Company {
  id?: string
  name: string
  tax_id: string
  grupo_empresarial_id?: string
  accounts_contact_name?: string
  accounts_contact_email?: string
  accounts_contact_phone?: string
  comercial_contact_name?: string
  comercial_contact_email?: string
  comercial_contact_phone?: string
  status: boolean
}

interface GrupoEmpresarial {
  id: string
  nombre: string
  descripcion?: string
}

interface BusinessLine {
  id: string
  nombre: string
  descripcion: string
  es_activa: boolean
  color_hex: string
  responsables_count?: number
}

interface CompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  company?: Company | null
  mode: 'create' | 'edit'
}

/**
 * Modal moderno para crear y editar empresas
 * Diseño responsive con glassmorphism y validaciones en tiempo real
 */
export default function CompanyModal({
  isOpen,
  onClose,
  onSuccess,
  company,
  mode
}: CompanyModalProps) {
  const [formData, setFormData] = useState<Company>({
    name: '',
    tax_id: '',
    grupo_empresarial_id: '',
    accounts_contact_name: '',
    accounts_contact_email: '',
    accounts_contact_phone: '',
    comercial_contact_name: '',
    comercial_contact_email: '',
    comercial_contact_phone: '',
    status: true
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Estados para líneas de negocio
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([])
  const [selectedBusinessLines, setSelectedBusinessLines] = useState<string[]>([])
  const [loadingBusinessLines, setLoadingBusinessLines] = useState(false)
  
  // Estados para ARL y Cajas
  const [arlData, setARLData] = useState<{arl_id: string, fecha_inicio: string} | null>(null)
  const [cajasData, setCajasData] = useState<{ciudad_id: string, caja_id: string, fecha_inicio: string}[]>([])
  const [deletedCajasIds, setDeletedCajasIds] = useState<string[]>([])
  
  // Estados para grupos empresariales
  const [gruposEmpresariales, setGruposEmpresariales] = useState<GrupoEmpresarial[]>([])
  const [grupoEmpresarialInput, setGrupoEmpresarialInput] = useState('')
  const [showGrupoSuggestions, setShowGrupoSuggestions] = useState(false)
  const [loadingGrupos, setLoadingGrupos] = useState(false)
  
  // Las notificaciones visuales se manejan desde el padre con Toast

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Cargar líneas de negocio disponibles
  const loadBusinessLines = async () => {
    try {
      setLoadingBusinessLines(true)
      
      const { data, error } = await supabase
        .from('lineas_negocio')
        .select('*')
        .eq('es_activa', true)
        .order('nombre', { ascending: true })

      if (error) throw error
      
      setBusinessLines(data || [])
    } catch (error) {
      console.error('Error loading business lines:', error)
    } finally {
      setLoadingBusinessLines(false)
    }
  }

  // Cargar grupos empresariales disponibles
  const loadGruposEmpresariales = async (searchTerm = '') => {
    try {
      setLoadingGrupos(true)
      
      let query = supabase
        .from('grupos_empresariales')
        .select('id, nombre, descripcion')
        .order('nombre', { ascending: true })

      if (searchTerm.trim()) {
        query = query.ilike('nombre', `%${searchTerm.trim()}%`)
      }

      const { data, error } = await query.limit(10)

      if (error) throw error
      
      setGruposEmpresariales(data || [])
    } catch (error) {
      console.error('Error loading grupos empresariales:', error)
      setGruposEmpresariales([])
    } finally {
      setLoadingGrupos(false)
    }
  }

  // Manejar selección de grupo empresarial
  const handleGrupoEmpresarialSelect = (grupo: GrupoEmpresarial) => {
    setFormData(prev => ({
      ...prev,
      grupo_empresarial_id: grupo.id
    }))
    setGrupoEmpresarialInput(grupo.nombre)
    setShowGrupoSuggestions(false)
  }

  // Crear nuevo grupo empresarial si no existe
  const createGrupoEmpresarial = async (nombre: string) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_grupo_empresarial', {
        grupo_nombre: nombre.trim()
      })

      if (error) throw error

      // Actualizar el formData con el ID del grupo (creado o existente)
      setFormData(prev => ({
        ...prev,
        grupo_empresarial_id: data
      }))

      return data
    } catch (error) {
      console.error('Error creating grupo empresarial:', error)
      throw error
    }
  }

  // Cargar nombre del grupo empresarial por ID (para modo edición)
  const loadGrupoEmpresarialName = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('grupos_empresariales')
        .select('nombre')
        .eq('id', grupoId)
        .single()

      if (error) throw error
      
      if (data) {
        setGrupoEmpresarialInput(data.nombre)
      }
    } catch (error) {
      console.error('Error loading grupo empresarial name:', error)
    }
  }

  // Cargar líneas de negocio asignadas a la empresa (en modo edición)
  const loadCompanyBusinessLines = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('empresa_lineas_negocio')
        .select('linea_negocio_id')
        .eq('empresa_id', companyId)
        .eq('es_activa', true)

      if (error) throw error

      const assignedIds = data?.map(item => item.linea_negocio_id) || []
      setSelectedBusinessLines(assignedIds)
    } catch (error) {
      console.error('Error loading company business lines:', error)
    }
  }

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      // Cargar líneas de negocio disponibles
      loadBusinessLines()
      // Cargar grupos empresariales disponibles
      loadGruposEmpresariales()

      if (mode === 'edit' && company) {
        // En modo edición, inicializar todo de una vez
        setFormData({
          ...company,
          grupo_empresarial_id: company.grupo_empresarial_id || '',
          accounts_contact_name: company.accounts_contact_name || '',
          accounts_contact_email: company.accounts_contact_email || '',
          accounts_contact_phone: company.accounts_contact_phone || '',
          comercial_contact_name: company.comercial_contact_name || '',
          comercial_contact_email: company.comercial_contact_email || '',
          comercial_contact_phone: company.comercial_contact_phone || ''
        })
        // Cargar líneas de negocio ya asignadas
        loadCompanyBusinessLines(company.id!)
        // Si tiene grupo empresarial, cargar su nombre
        if (company.grupo_empresarial_id) {
          loadGrupoEmpresarialName(company.grupo_empresarial_id)
        }
      } else if (mode === 'create') {
        // En modo creación, limpiar todo
        setFormData({
          name: '',
          tax_id: '',
          grupo_empresarial_id: '',
          accounts_contact_name: '',
          accounts_contact_email: '',
          accounts_contact_phone: '',
          comercial_contact_name: '',
          comercial_contact_email: '',
          comercial_contact_phone: '',
          status: true
        })
        setSelectedBusinessLines([])
        setARLData(null)
        setCajasData([])
        setDeletedCajasIds([])
        setGrupoEmpresarialInput('')
      }
      setErrors({})
      setShowGrupoSuggestions(false)
    } else {
      // Al cerrar, limpiar estados para evitar parpadeos en próxima apertura
      setFormData({
        name: '',
        tax_id: '',
        grupo_empresarial_id: '',
        accounts_contact_name: '',
        accounts_contact_email: '',
        accounts_contact_phone: '',
        comercial_contact_name: '',
        comercial_contact_email: '',
        comercial_contact_phone: '',
        status: true
      })
      setSelectedBusinessLines([])
      setBusinessLines([])
      setLoadingBusinessLines(false)
      setARLData(null)
      setCajasData([])
      setDeletedCajasIds([])
      setGruposEmpresariales([])
      setGrupoEmpresarialInput('')
      setShowGrupoSuggestions(false)
      setErrors({})
    }
  }, [isOpen, company, mode])

  // Validaciones en tiempo real
  const validateField = (name: string, value: string | boolean) => {
    switch (name) {
      case 'name':
        return typeof value === 'string' && value.trim().length >= 2 
          ? '' : 'El nombre debe tener al menos 2 caracteres'
      
      case 'tax_id':
        return typeof value === 'string' && /^[0-9]{7,15}$/.test(value.replace(/\D/g, ''))
          ? '' : 'NIT debe tener entre 7 y 15 dígitos'
      
      case 'accounts_contact_name':
      case 'comercial_contact_name':
        return typeof value === 'string' && (value.trim().length === 0 || value.trim().length >= 2)
          ? '' : 'El nombre debe tener al menos 2 caracteres'
      
      case 'accounts_contact_email':
      case 'comercial_contact_email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return typeof value === 'string' && (value.trim() === '' || emailRegex.test(value))
          ? '' : 'Email inválido'
      
      case 'accounts_contact_phone':
      case 'comercial_contact_phone':
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,15}$/
        return typeof value === 'string' && (value.trim() === '' || phoneRegex.test(value.replace(/\s/g, '')))
          ? '' : 'Teléfono inválido (7-15 dígitos)'
      
      default:
        return ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))

    // Validar en tiempo real
    const error = validateField(name, newValue)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }

  // Manejar selección de líneas de negocio
  const handleBusinessLineToggle = (businessLineId: string) => {
    setSelectedBusinessLines(prev => {
      if (prev.includes(businessLineId)) {
        // Remover si ya está seleccionada
        return prev.filter(id => id !== businessLineId)
      } else {
        // Agregar si no está seleccionada
        return [...prev, businessLineId]
      }
    })
  }

  // Manejar asignaciones de líneas de negocio después de guardar empresa
  const handleBusinessLinesAssignment = async (companyId: string, currentUser: any) => {
    try {
      // Usar función SQL segura para manejar asignaciones
      const { error } = await supabase.rpc('assign_business_lines_to_company', {
        p_empresa_id: companyId,
        p_lineas_negocio_ids: selectedBusinessLines,
        p_asignado_por: currentUser.id
      })

      if (error) throw error
    } catch (error) {
      console.error('Error handling business lines assignment:', error)
      throw error
    }
  }

  // Manejar asignación de ARL después de guardar empresa
  const handleARLAssignment = async (companyId: string, currentUser: any) => {
    if (!arlData || !arlData.arl_id) return
    
    try {
      if (mode === 'create') {
        // Modo creación: insertar directamente
        const { error } = await supabase
          .from('empresa_arls')
          .insert([{
            empresa_id: companyId,
            arl_id: arlData.arl_id,
            fecha_inicio: arlData.fecha_inicio,
            created_by: currentUser.id,
            updated_by: currentUser.id
          }])

        if (error) throw error
      } else {
        // Modo edición: usar función de cambio
        const { data, error } = await supabase.rpc('cambiar_empresa_arl', {
          p_empresa_id: companyId,
          p_nueva_arl_id: arlData.arl_id,
          p_fecha_cambio: arlData.fecha_inicio,
          p_usuario_id: currentUser.id
        })

        if (error) throw error
        if (data && !data.success) {
          throw new Error(data.error || 'Error al cambiar ARL')
        }
      }
    } catch (error) {
      console.error('Error handling ARL assignment:', error)
      throw error
    }
  }

  // Manejar asignaciones de Cajas después de guardar empresa
  const handleCajasAssignment = async (companyId: string, currentUser: any) => {
    try {
      if (mode === 'create') {
        // Modo creación: insertar directamente
        if (cajasData.length > 0) {
          const cajasToInsert = cajasData.map(caja => ({
            empresa_id: companyId,
            ciudad_id: caja.ciudad_id,
            caja_compensacion_id: caja.caja_id,
            fecha_inicio: caja.fecha_inicio,
            created_by: currentUser.id,
            updated_by: currentUser.id
          }))

          const { error } = await supabase
            .from('empresa_cajas_compensacion')
            .insert(cajasToInsert)

          if (error) throw error
        }
      } else {
        // Modo edición: manejar eliminaciones y cambios
        
        // 1. Primero cerrar cajas eliminadas
        for (const ciudadId of deletedCajasIds) {
          const { data, error } = await supabase.rpc('cerrar_empresa_caja', {
            p_empresa_id: companyId,
            p_ciudad_id: ciudadId,
            p_fecha_cierre: new Date().toISOString().split('T')[0],
            p_usuario_id: currentUser.id
          })

          if (error) throw error
          if (data && !data.success) {
            console.warn('Warning al cerrar caja:', data.error)
          }
        }
        
        // 2. Luego procesar cambios/adiciones
        for (const caja of cajasData) {
          const { data, error } = await supabase.rpc('cambiar_empresa_caja', {
            p_empresa_id: companyId,
            p_ciudad_id: caja.ciudad_id,
            p_nueva_caja_id: caja.caja_id,
            p_fecha_cambio: caja.fecha_inicio,
            p_usuario_id: currentUser.id
          })

          if (error) throw error
          if (data && !data.success) {
            throw new Error(data.error || 'Error al cambiar caja de compensación')
          }
        }
      }
    } catch (error) {
      console.error('Error handling Cajas assignment:', error)
      throw error
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'status') {
        const error = validateField(key, value)
        if (error) newErrors[key] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Manejar grupo empresarial si se especificó
      let grupoEmpresarialId = formData.grupo_empresarial_id || null
      if (grupoEmpresarialInput.trim() && !grupoEmpresarialId) {
        // Si hay texto pero no ID, crear o buscar el grupo
        grupoEmpresarialId = await createGrupoEmpresarial(grupoEmpresarialInput)
      }

      if (mode === 'create') {
        // Crear empresa y obtener el ID
        const { data: companyData, error } = await supabase
          .from('companies')
          .insert([{
            name: formData.name.trim(),
            tax_id: formData.tax_id.replace(/\D/g, ''),
            grupo_empresarial_id: grupoEmpresarialId,
            accounts_contact_name: formData.accounts_contact_name?.trim() || null,
            accounts_contact_email: formData.accounts_contact_email?.trim().toLowerCase() || null,
            accounts_contact_phone: formData.accounts_contact_phone?.trim() || null,
            comercial_contact_name: formData.comercial_contact_name?.trim() || null,
            comercial_contact_email: formData.comercial_contact_email?.trim().toLowerCase() || null,
            comercial_contact_phone: formData.comercial_contact_phone?.trim() || null,
            status: formData.status,
            created_by: user.id,
            updated_by: user.id
          }])
          .select()
          .single()

        if (error) throw error

        // Asignar líneas de negocio si hay alguna seleccionada
        if (companyData && selectedBusinessLines.length > 0) {
          await handleBusinessLinesAssignment(companyData.id, user)
        }
        
        // Asignar ARL si se seleccionó
        if (companyData) {
          await handleARLAssignment(companyData.id, user)
        }
        
        // Asignar Cajas si se seleccionaron
        if (companyData) {
          await handleCajasAssignment(companyData.id, user)
        }

        onSuccess()
        onClose()
        return
      } else {
        // Actualizar empresa
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name.trim(),
            tax_id: formData.tax_id.replace(/\D/g, ''),
            grupo_empresarial_id: grupoEmpresarialId,
            accounts_contact_name: formData.accounts_contact_name?.trim() || null,
            accounts_contact_email: formData.accounts_contact_email?.trim().toLowerCase() || null,
            accounts_contact_phone: formData.accounts_contact_phone?.trim() || null,
            comercial_contact_name: formData.comercial_contact_name?.trim() || null,
            comercial_contact_email: formData.comercial_contact_email?.trim().toLowerCase() || null,
            comercial_contact_phone: formData.comercial_contact_phone?.trim() || null,
            status: formData.status,
            updated_by: user.id
          })
          .eq('id', company?.id)

        if (error) throw error

        // Actualizar líneas de negocio asignadas
        if (company?.id) {
          await handleBusinessLinesAssignment(company.id, user)
        }
        
        // Actualizar ARL si se cambió
        if (company?.id && arlData) {
          await handleARLAssignment(company.id, user)
        }
        
        // Actualizar Cajas si se cambiaron o eliminaron
        if (company?.id && (cajasData.length > 0 || deletedCajasIds.length > 0)) {
          await handleCajasAssignment(company.id, user)
        }

        onSuccess()
        onClose()
        return
      }

    } catch (error: any) {
      console.error('Error saving company:', error)
      
      if (error.code === '23505') {
        // Solo mostrar error de NIT duplicado en modo creación
        // En modo edición, este error no debería ocurrir si no se cambió el NIT
        if (mode === 'create') {
          setErrors({ tax_id: 'Este NIT ya está registrado' })
        } else {
          // En modo edición, verificar si realmente cambió el NIT
          const originalTaxId = company?.tax_id?.replace(/\D/g, '') || ''
          const newTaxId = formData.tax_id.replace(/\D/g, '')
          
          if (originalTaxId !== newTaxId) {
            setErrors({ tax_id: 'Este NIT ya está registrado por otra empresa' })
          } else {
            setErrors({ general: 'Error inesperado al actualizar. Intenta nuevamente.' })
          }
        }
      } else {
        setErrors({ general: error.message || 'Error al guardar la empresa' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl mx-auto my-0 flex flex-col h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] lg:h-auto lg:max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#87E0E0] rounded-full flex items-center justify-center">
              <Building2 className="h-4 w-4 text-[#004C4C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {mode === 'create' ? 'Nueva Empresa' : 'Editar Empresa'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 hover:bg-[#0A6A6A] rounded-full flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          
          {/* Mensaje de éxito eliminado: padre mostrará Toast */}

          {/* Error general */}
          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Layout responsivo: 1 columna en móvil, 2 en desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* COLUMNA IZQUIERDA - EMPRESA Y CONTACTOS */}
              <div className="space-y-8">
                
                {/* Información de la Empresa */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#004C4C] to-[#065C5C] rounded-xl flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Información de la Empresa</h3>
                  </div>
                  
                  <div className="space-y-5">

                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nombre de la Empresa *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                          errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Good Temporal SAS"
                        required
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* NIT */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      NIT *
                    </label>
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                        errors.tax_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="900123456"
                      required
                    />
                    {errors.tax_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.tax_id}</p>
                    )}
                  </div>

                  {/* Grupo Empresarial */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Grupo Empresarial
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={grupoEmpresarialInput}
                        onChange={(e) => {
                          setGrupoEmpresarialInput(e.target.value)
                          setShowGrupoSuggestions(true)
                          if (e.target.value.trim()) {
                            loadGruposEmpresariales(e.target.value)
                          } else {
                            setFormData(prev => ({ ...prev, grupo_empresarial_id: '' }))
                            loadGruposEmpresariales()
                          }
                        }}
                        onFocus={() => {
                          setShowGrupoSuggestions(true)
                          if (!grupoEmpresarialInput.trim()) {
                            loadGruposEmpresariales()
                          }
                        }}
                        onBlur={() => {
                          // Retrasar el cierre para permitir clicks en sugerencias
                          setTimeout(() => setShowGrupoSuggestions(false), 200)
                        }}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm border-gray-300"
                        placeholder="Ej: Grupo Empresarial ABC (opcional)"
                      />
                    </div>
                    
                    {/* Sugerencias de grupos empresariales */}
                    {showGrupoSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingGrupos ? (
                          <div className="p-3 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-[#87E0E0] border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-2 text-sm text-gray-500">Buscando...</span>
                          </div>
                        ) : gruposEmpresariales.length > 0 ? (
                          <>
                            {gruposEmpresariales.map((grupo) => (
                              <button
                                key={grupo.id}
                                type="button"
                                onClick={() => handleGrupoEmpresarialSelect(grupo)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="font-medium text-sm text-gray-900">{grupo.nombre}</div>
                                {grupo.descripcion && (
                                  <div className="text-xs text-gray-500 mt-1">{grupo.descripcion}</div>
                                )}
                              </button>
                            ))}
                            {grupoEmpresarialInput.trim() && !gruposEmpresariales.some(g => 
                              g.nombre.toLowerCase() === grupoEmpresarialInput.toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onClick={() => {
                                  createGrupoEmpresarial(grupoEmpresarialInput)
                                  setShowGrupoSuggestions(false)
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-t border-gray-200 transition-colors"
                              >
                                <div className="font-medium text-sm text-blue-600">
                                  + Crear "{grupoEmpresarialInput}"
                                </div>
                                <div className="text-xs text-blue-500 mt-1">
                                  Crear nuevo grupo empresarial
                                </div>
                              </button>
                            )}
                          </>
                        ) : grupoEmpresarialInput.trim() ? (
                          <button
                            type="button"
                            onClick={() => {
                              createGrupoEmpresarial(grupoEmpresarialInput)
                              setShowGrupoSuggestions(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-sm text-blue-600">
                              + Crear "{grupoEmpresarialInput}"
                            </div>
                            <div className="text-xs text-blue-500 mt-1">
                              Crear nuevo grupo empresarial
                            </div>
                          </button>
                        ) : (
                          <div className="p-3 text-sm text-gray-500 text-center">
                            No hay grupos disponibles
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                </div>

                {/* Contacto Comercial */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#004C4C] to-[#065C5C] rounded-xl flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Contacto Comercial</h3>
                  </div>
                  
                  <div className="space-y-5">

                  {/* Nombre comercial */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        name="comercial_contact_name"
                        value={formData.comercial_contact_name || ''}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                          errors.comercial_contact_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Juan Comercial"
                      />
                    </div>
                    {errors.comercial_contact_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.comercial_contact_name}</p>
                    )}
                  </div>

                  {/* Email y Teléfono comercial en grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email comercial */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          name="comercial_contact_email"
                          value={formData.comercial_contact_email || ''}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                            errors.comercial_contact_email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="jcomercial@empresa.com"
                        />
                      </div>
                      {errors.comercial_contact_email && (
                        <p className="mt-1 text-sm text-red-600">{errors.comercial_contact_email}</p>
                      )}
                    </div>

                    {/* Teléfono comercial */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          name="comercial_contact_phone"
                          value={formData.comercial_contact_phone || ''}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                            errors.comercial_contact_phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="+57 300 123 4567"
                        />
                      </div>
                      {errors.comercial_contact_phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.comercial_contact_phone}</p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                {/* Contacto de Cartera */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#004C4C] to-[#065C5C] rounded-xl flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">Contacto de Cartera</h3>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">Opcional</span>
                  </div>
                  
                  <div className="space-y-5">

                  {/* Nombre del contacto */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        name="accounts_contact_name"
                        value={formData.accounts_contact_name || ''}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                          errors.accounts_contact_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Ej: María Cartera"
                      />
                    </div>
                    {errors.accounts_contact_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.accounts_contact_name}</p>
                    )}
                  </div>

                  {/* Email y Teléfono de cartera en grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          name="accounts_contact_email"
                          value={formData.accounts_contact_email || ''}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                            errors.accounts_contact_email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="mcartera@empresa.com"
                        />
                      </div>
                      {errors.accounts_contact_email && (
                        <p className="mt-1 text-sm text-red-600">{errors.accounts_contact_email}</p>
                      )}
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          name="accounts_contact_phone"
                          value={formData.accounts_contact_phone || ''}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors text-sm ${
                            errors.accounts_contact_phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="+57 300 123 4567"
                        />
                      </div>
                      {errors.accounts_contact_phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.accounts_contact_phone}</p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA - CONFIGURACIONES OPERATIVAS */}
              <div className="space-y-8 relative">
                
                {/* Separador visual para desktop */}
                <div className="hidden lg:block absolute -left-6 top-0 bottom-0 w-px bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200"></div>
                
                {/* Líneas de Negocio */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#004C4C] to-[#065C5C] rounded-xl flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Líneas de Negocio</h3>
                  </div>

                  {loadingBusinessLines ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-[#87E0E0] border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-3 text-sm text-gray-500">Cargando líneas de negocio...</span>
                    </div>
                  ) : businessLines.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No hay líneas de negocio disponibles</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {businessLines.map((businessLine) => (
                          <div
                            key={businessLine.id}
                            className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                              selectedBusinessLines.includes(businessLine.id)
                                ? 'bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white shadow-lg transform scale-[1.02]'
                                : 'bg-white border-2 border-gray-100 hover:border-[#87E0E0] hover:shadow-md'
                            }`}
                            onClick={() => handleBusinessLineToggle(businessLine.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-semibold ${
                                  selectedBusinessLines.includes(businessLine.id)
                                    ? 'text-white'
                                    : 'text-gray-900'
                                }`}>
                                  {businessLine.nombre}
                                </h4>
                              </div>
                              
                              <div className={`ml-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                selectedBusinessLines.includes(businessLine.id)
                                  ? 'border-white bg-white'
                                  : 'border-gray-300 group-hover:border-[#87E0E0]'
                              }`}>
                                {selectedBusinessLines.includes(businessLine.id) && (
                                  <svg className="w-3 h-3 text-[#004C4C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            
                            {/* Efecto de brillo sutil para seleccionadas */}
                            {selectedBusinessLines.includes(businessLine.id) && (
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Contador mejorado */}
                      <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {selectedBusinessLines.length > 0 ? (
                              <>
                                <span className="font-bold text-[#004C4C]">{selectedBusinessLines.length}</span>
                                <span className="ml-1">{` línea${selectedBusinessLines.length !== 1 ? 's' : ''} seleccionada${selectedBusinessLines.length !== 1 ? 's' : ''}`}</span>
                              </>
                            ) : (
                              <span className="text-gray-500">Ninguna línea seleccionada</span>
                            )}
                          </span>
                          
                          {selectedBusinessLines.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedBusinessLines([])}
                              className="text-xs text-gray-500 hover:text-red-600 transition-colors font-medium"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ARL Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <ARLSection
                    empresaId={company?.id}
                    isCreating={mode === 'create'}
                    onARLChange={(arlId, fechaInicio) => {
                      if (arlId && fechaInicio) {
                        setARLData({
                          arl_id: arlId,
                          fecha_inicio: fechaInicio
                        })
                      } else {
                        setARLData(null)
                      }
                    }}
                  />
                </div>

                {/* Cajas Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <CajasSection
                    empresaId={company?.id}
                    isCreating={mode === 'create'}
                    onCajasChange={(cajas) => {
                      setCajasData(cajas)
                    }}
                    onCajasDelete={(deletedIds) => {
                      setDeletedCajasIds(deletedIds)
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-1.5 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white rounded-lg hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </div>
            ) : (
              mode === 'create' ? 'Crear Empresa' : 'Actualizar Empresa'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
