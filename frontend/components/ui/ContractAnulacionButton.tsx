'use client'

import { useState } from 'react'
import { XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Contract } from '../../types/contract'

interface ContractAnulacionButtonProps {
  contract: Contract
  onSuccess: () => void
  className?: string
}

/**
 * Botón para anular contratos con confirmación y motivo obligatorio
 */
export default function ContractAnulacionButton({ 
  contract, 
  onSuccess, 
  className = '' 
}: ContractAnulacionButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  const handleAnular = async () => {
    // Validar motivo
    if (!motivo.trim()) {
      setError('El motivo de anulación es obligatorio')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Anular el contrato
      const { data, error } = await supabase.rpc('anular_contract', {
        contract_id: contract.id,
        anulador_user_id: (await supabase.auth.getUser()).data.user?.id,
        motivo: motivo.trim()
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Error al anular contrato')
      }

      // Éxito - mostrar feedback y actualizar
      setShowConfirmation(false)
      setMotivo('')
      onSuccess()
    } catch (error: any) {
      console.error('Error anulando contract:', error)
      setError(error.message || 'Error al anular el contrato')
    } finally {
      setLoading(false)
    }
  }

  // No mostrar si el contrato ya está anulado
  if (contract.archived_at) {
    return null
  }

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={() => setShowConfirmation(true)}
        className={`
          inline-flex items-center px-3 py-1.5 rounded-md font-medium text-xs
          bg-gradient-to-r from-red-600 to-red-700 text-white
          hover:from-red-700 hover:to-red-800
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 hover:shadow-md
          ${className}
        `}
      >
        <XCircle className="h-4 w-4 mr-1.5" />
        Anular Contrato
      </button>

      {/* Modal de confirmación */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Anular Contrato
                </h3>
                <p className="text-sm text-gray-500">
                  {contract.primer_nombre} {contract.primer_apellido}
                </p>
              </div>
            </div>

            {/* Advertencia */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>⚠️ Advertencia:</strong> Esta acción anulará el contrato permanentemente. 
                El contrato quedará archivado y no aparecerá en las listas activas.
              </p>
            </div>

            {/* Campo de motivo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de Anulación <span className="text-red-600">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  setError(null) // Limpiar error al escribir
                }}
                placeholder="Ej: Empleado no se presentó a trabajar, renuncia antes de iniciar, etc."
                rows={4}
                className={`
                  w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent
                  ${error && error.includes('motivo') ? 'border-red-500' : 'border-gray-300'}
                `}
                disabled={loading}
              />
              {error && error.includes('motivo') && (
                <p className="text-red-600 text-xs mt-1">{error}</p>
              )}
            </div>

            {/* Error general */}
            {error && !error.includes('motivo') && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  setMotivo('')
                  setError(null)
                }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnular}
                disabled={loading || !motivo.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>Confirmar Anulación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

