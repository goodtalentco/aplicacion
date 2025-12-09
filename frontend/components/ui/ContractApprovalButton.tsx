'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Loader2, Shield, Calendar, User } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Contract } from '../../types/contract'

interface ContractApprovalButtonProps {
  contract: Contract
  onSuccess: () => void
  className?: string
}

/**
 * Botón moderno para aprobar contratos con confirmación y feedback visual
 */
export default function ContractApprovalButton({ 
  contract, 
  onSuccess, 
  className = '' 
}: ContractApprovalButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numeroContrato, setNumeroContrato] = useState('')

  // Generar número de contrato automáticamente cuando se abre el modal
  useEffect(() => {
    if (showConfirmation) {
      const generateContractNumber = () => {
        const cedula = contract.numero_identificacion || 'SIN-CEDULA'
        const fechaIngreso = contract.fecha_ingreso || 'SIN-FECHA'
        const empresaCliente = contract.company?.name || 'SIN-EMPRESA'
        
        // Limpiar empresa cliente (quitar espacios y caracteres especiales)
        const empresaLimpia = empresaCliente
          .toUpperCase()
          .replace(/\s+/g, '-')
          .replace(/[^A-Z0-9-]/g, '')
          .substring(0, 15) // Máximo 15 caracteres
        
        return `${cedula}-${fechaIngreso}-${empresaLimpia}`
      }
      
      setNumeroContrato(generateContractNumber())
    }
  }, [showConfirmation, contract])

  const handleApprove = async () => {
    setLoading(true)
    setError(null)

    try {
      // Aprobar el contrato con el número de contrato
      const { data, error } = await supabase.rpc('approve_contract', {
        contract_id: contract.id,
        approver_user_id: (await supabase.auth.getUser()).data.user?.id,
        contract_number: numeroContrato.trim()
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Error al aprobar contrato')
      }

      // Éxito - mostrar feedback y actualizar
      setShowConfirmation(false)
      setNumeroContrato('')
      onSuccess()
    } catch (error: any) {
      console.error('Error approving contract:', error)
      setError(error.message || 'Error al aprobar el contrato')
    } finally {
      setLoading(false)
    }
  }

  if (contract.status_aprobacion === 'aprobado') {
    return (
      <div className="flex items-center text-green-600 text-sm">
        <CheckCircle className="h-4 w-4 mr-1.5" />
        Aprobado
      </div>
    )
  }

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={() => setShowConfirmation(true)}
        className={`
          inline-flex items-center px-3 py-1.5 rounded-md font-medium text-xs
          bg-gradient-to-r from-green-600 to-green-700 text-white
          hover:from-green-700 hover:to-green-800
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 hover:shadow-md
          ${className}
        `}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle className="h-3 w-3 mr-1.5" />
        )}
        {loading ? 'Aprobando...' : 'Aprobar'}
      </button>

      {/* Modal de confirmación */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col">
            {/* Header fijo */}
            <div className="flex items-center p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Aprobar Contrato
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Información del contrato */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="font-medium">{contract.contracts_full_name || `${contract.primer_nombre} ${contract.primer_apellido}`}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Empresa:</span> {contract.company?.name || 'No especificada'}
                  </div>
                </div>
              </div>

              {/* Número de contrato generado automáticamente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contrato *
                </label>
                <input
                  type="text"
                  value={numeroContrato}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="Generando número de contrato..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número generado automáticamente: cédula-fecha_ingreso-empresa_cliente
                </p>
              </div>

              {/* Advertencia de campos incompletos - Más compacta */}
              {(() => {
                const missingFields = []
                
                // Campos básicos obligatorios
                if (!contract.salario || contract.salario === 0) missingFields.push('Salario')
                if (!contract.ciudad_labora?.trim()) missingFields.push('Ciudad donde labora')
                if (!contract.celular?.trim()) missingFields.push('Celular')
                if (!contract.email?.trim()) missingFields.push('Email')
                if (!contract.fecha_ingreso) missingFields.push('Fecha de ingreso')
                if (!contract.dropbox?.trim()) missingFields.push('URL de Dropbox')
                
                // Campos de onboarding
                if (!contract.programacion_cita_examenes) missingFields.push('Programación cita exámenes')
                if (!contract.examenes) missingFields.push('Exámenes médicos')
                if (!contract.solicitud_inscripcion_arl) missingFields.push('Solicitud inscripción ARL')
                if (!(contract.arl_nombre && contract.arl_fecha_confirmacion)) missingFields.push('Confirmación ARL')
                if (!contract.envio_contrato) missingFields.push('Envío contrato')
                if (!contract.recibido_contrato_firmado) missingFields.push('Contrato firmado recibido')
                if (!contract.solicitud_eps) missingFields.push('Solicitud EPS')
                if (!contract.eps_fecha_confirmacion) missingFields.push('Confirmación EPS')
                if (!contract.envio_inscripcion_caja) missingFields.push('Envío inscripción caja')
                if (!contract.caja_fecha_confirmacion) missingFields.push('Confirmación inscripción caja')
                if (!contract.radicado_eps) missingFields.push('Radicado EPS')
                if (!contract.radicado_ccf) missingFields.push('Radicado CCF')
                
                // Validación de auxilios con conceptos
                if (contract.auxilio_salarial && contract.auxilio_salarial > 0 && !contract.auxilio_salarial_concepto?.trim()) {
                  missingFields.push('Concepto del auxilio salarial')
                }
                if (contract.auxilio_no_salarial && contract.auxilio_no_salarial > 0 && !contract.auxilio_no_salarial_concepto?.trim()) {
                  missingFields.push('Concepto del auxilio no salarial')
                }
                
                return missingFields.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Calendar className="h-4 w-4 text-orange-400" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-orange-800">
                          Campos pendientes ({missingFields.length})
                        </h4>
                        <div className="text-xs sm:text-sm text-orange-700 mt-1">
                          <p>Los siguientes campos están pendientes:</p>
                          <div className="max-h-24 sm:max-h-32 overflow-y-auto mt-1">
                            <ul className="list-disc list-inside space-y-0.5">
                              {missingFields.map((field, index) => (
                                <li key={index}>{field}</li>
                              ))}
                            </ul>
                          </div>
                          <p className="mt-2 font-medium text-orange-800">Puedes aprobar el contrato de todas formas.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Advertencia - Más compacta */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Shield className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      ¿Estás seguro?
                    </h4>
                    <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                      Una vez aprobado, este contrato no podrá ser editado ni eliminado. 
                      Solo podrás hacer cambios mediante novedades de nómina.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error si existe */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Botones fijos en la parte inferior */}
            <div className="flex space-x-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  setError(null)
                  setNumeroContrato('')
                }}
                className="flex-1 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aprobando...
                  </div>
                ) : (
                  'Sí, Aprobar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
