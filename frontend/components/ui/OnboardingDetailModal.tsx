'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, FileText, Info } from 'lucide-react'
import { Contract } from '../../types/contract'
import { supabase } from '../../lib/supabaseClient'
import AutocompleteSelect from './AutocompleteSelect'

interface OnboardingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    text?: string
    date?: string
    textField?: string
    dateField: string
  }) => void
  data: {
    contract: Contract | null
    field: string
    title: string
    type: 'arl' | 'eps' | 'caja' | 'cesantias' | 'pension'
  }
}

interface ModalConfig {
  textLabel: string | null
  textPlaceholder: string
  textField: string
  dateField: string
  icon: JSX.Element
  description: string
  isAutomatic?: boolean
  automaticValue?: string
  isDropdown?: boolean
  dropdownTable?: 'eps' | 'fondos_cesantias' | 'fondos_pension'
}

/**
 * Modal para capturar información adicional en procesos de onboarding
 * Permite ingresar texto descriptivo y fecha de confirmación
 */
export default function OnboardingDetailModal({
  isOpen,
  onClose,
  onSave,
  data
}: OnboardingDetailModalProps) {
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estados para campos automáticos
  const [arlActiva, setArlActiva] = useState('')
  const [cajaActiva, setCajaActiva] = useState('')
  const [loadingAutoFields, setLoadingAutoFields] = useState(false)

  // Funciones para cargar campos automáticos
  const loadArlActiva = async (empresaId: string, fechaContrato: string) => {
    if (!empresaId || !fechaContrato) {
      setArlActiva('')
      return
    }
    
    setLoadingAutoFields(true)
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
        if (error.code !== 'PGRST116') {
          console.error('Error loading ARL activa:', error)
        }
        setArlActiva('')
        return
      }

      const nombreArl = (data?.arls as any)?.nombre || ''
      setArlActiva(nombreArl)
    } catch (error: any) {
      if (error.code !== 'PGRST116') {
        console.error('Error loading ARL activa:', error)
      }
      setArlActiva('')
    } finally {
      setLoadingAutoFields(false)
    }
  }

  const loadCajaActiva = async (empresaId: string, ciudadId: string, fechaContrato: string) => {
    if (!empresaId || !ciudadId || !fechaContrato) {
      setCajaActiva('')
      return
    }
    
    setLoadingAutoFields(true)
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
        if (error.code !== 'PGRST116') {
          console.error('Error loading caja activa:', error)
        }
        setCajaActiva('')
        return
      }

      const nombreCaja = (data?.cajas_compensacion as any)?.nombre || ''
      setCajaActiva(nombreCaja)
    } catch (error: any) {
      if (error.code !== 'PGRST116') {
        console.error('Error loading caja activa:', error)
      }
      setCajaActiva('')
    } finally {
      setLoadingAutoFields(false)
    }
  }

  // Resetear formulario cuando cambia el modal
  useEffect(() => {
    if (isOpen && data.contract) {
      setText('')
      setDate(new Date().toISOString().split('T')[0]) // Fecha actual por defecto
      
      // Cargar campos automáticos según el tipo
      const fechaContrato = data.contract.fecha_ingreso
      if (fechaContrato) {
        if (data.type === 'arl' && data.contract.empresa_final_id) {
          loadArlActiva(data.contract.empresa_final_id, fechaContrato)
        } else if (data.type === 'caja' && data.contract.empresa_final_id && data.contract.ciudad_labora) {
          loadCajaActiva(data.contract.empresa_final_id, data.contract.ciudad_labora, fechaContrato)
        }
      }
    }
  }, [isOpen, data.contract, data.type])

  // Configuración según el tipo de modal
  const getModalConfig = (): ModalConfig => {
    // Para campos que solo requieren fecha (examenes, contrato firmado)
    if (data.field === 'examenes') {
      return {
        textLabel: null, // No requiere campo de texto
        textPlaceholder: '',
        textField: '',
        dateField: 'examenes',
        icon: <FileText className="h-5 w-5" />,
        description: 'Confirma la fecha en que se realizaron los exámenes médicos'
      }
    }
    
    if (data.field === 'recibido_contrato_firmado') {
      return {
        textLabel: null, // No requiere campo de texto
        textPlaceholder: '',
        textField: '',
        dateField: 'contrato',
        icon: <FileText className="h-5 w-5" />,
        description: 'Confirma la fecha en que se recibió el contrato firmado'
      }
    }

    switch (data.type) {
      case 'arl':
        return {
          textLabel: null, // Campo automático
          textPlaceholder: '',
          textField: 'arl_nombre',
          dateField: 'arl',
          icon: <FileText className="h-5 w-5" />,
          description: 'La ARL se asigna automáticamente según la configuración activa de la empresa en la fecha del contrato',
          isAutomatic: true,
          automaticValue: arlActiva
        }
      case 'eps':
        return {
          textLabel: 'EPS',
          textPlaceholder: '',
          textField: 'radicado_eps',
          dateField: 'eps',
          icon: <FileText className="h-5 w-5" />,
          description: 'Selecciona la EPS de la lista y confirma la fecha',
          isDropdown: true,
          dropdownTable: 'eps' as const
        }
      case 'caja':
        return {
          textLabel: null, // Campo automático
          textPlaceholder: '',
          textField: 'radicado_ccf',
          dateField: 'caja',
          icon: <FileText className="h-5 w-5" />,
          description: 'La Caja de Compensación se asigna automáticamente según la configuración activa de la empresa y ciudad en la fecha del contrato',
          isAutomatic: true,
          automaticValue: cajaActiva
        }
      case 'cesantias':
        return {
          textLabel: 'Fondo de Cesantías',
          textPlaceholder: '',
          textField: 'fondo_cesantias',
          dateField: 'cesantias',
          icon: <FileText className="h-5 w-5" />,
          description: 'Selecciona el fondo de cesantías de la lista y confirma la fecha',
          isDropdown: true,
          dropdownTable: 'fondos_cesantias' as const
        }
      case 'pension':
        return {
          textLabel: 'Fondo de Pensión',
          textPlaceholder: '',
          textField: 'fondo_pension',
          dateField: 'pension',
          icon: <FileText className="h-5 w-5" />,
          description: 'Selecciona el fondo de pensión de la lista y confirma la fecha',
          isDropdown: true,
          dropdownTable: 'fondos_pension' as const
        }
      default:
        return {
          textLabel: 'Información',
          textPlaceholder: 'Ingresa la información...',
          textField: '',
          dateField: '',
          icon: <FileText className="h-5 w-5" />,
          description: 'Ingresa la información solicitada'
        }
    }
  }

  const config = getModalConfig()

  const handleSave = async () => {
    // Para campos automáticos, usar el valor automático
    const finalText = config.isAutomatic 
      ? config.automaticValue 
      : config.textLabel 
        ? text.trim() 
        : undefined

    // Validaciones
    if (config.textLabel && !finalText) {
      return
    }

    if (config.isAutomatic && !config.automaticValue) {
      return // No se puede guardar sin valor automático
    }

    if (!date) {
      return
    }

    setLoading(true)
    try {
      await onSave({
        text: finalText,
        date,
        textField: config.textField,
        dateField: config.dateField
      })
    } catch (error) {
      console.error('Error saving onboarding details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#004C4C] to-[#065C5C]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg text-white">
              {config.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{data.title}</h3>
              <p className="text-sm text-[#E6F5F7] opacity-90">
                {data.contract?.contracts_full_name || 'Sin nombre'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Descripción */}
          <p className="text-sm text-gray-600">
            {config.description}
          </p>

          {/* Campo automático (ARL/Caja) */}
          {config.isAutomatic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {data.type === 'arl' ? 'ARL Asignada' : 'Caja de Compensación Asignada'} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loadingAutoFields ? 'Cargando...' : config.automaticValue || 'No disponible'}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              {!config.automaticValue && !loadingAutoFields && (
                <p className="text-amber-600 text-xs mt-1 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  No se encontró configuración activa para la fecha del contrato
                </p>
              )}
            </div>
          )}

          {/* Autocomplete (EPS/Cesantías/Pensión) */}
          {config.isDropdown && config.dropdownTable && (
            <div>
              <AutocompleteSelect
                tableName={config.dropdownTable}
                selectedValue={text}
                onSelect={(value) => setText(value)}
                placeholder={`Escribir o buscar ${config.textLabel?.toLowerCase()}...`}
                disabled={loading}
                label={`${config.textLabel} *`}
                error={!text.trim() && config.textLabel !== null}
              />
            </div>
          )}

          {/* Campo de texto tradicional (para casos especiales) */}
          {config.textLabel && !config.isDropdown && !config.isAutomatic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {config.textLabel} *
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={config.textPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors"
                disabled={loading}
              />
            </div>
          )}

          {/* Campo de fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha de Confirmación *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-colors"
              disabled={loading}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={
              loading || 
              (config.isAutomatic && !config.automaticValue) ||
              (config.textLabel && !config.isAutomatic && !text.trim()) || 
              !date
            }
            className="px-6 py-2 bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white font-medium rounded-lg hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>

      </div>
    </div>
  )
}
