'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Contract } from '../../types/contract'

interface DeleteContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  contract: Contract | null
}

/**
 * Modal moderno para confirmar eliminación de contratos
 */
export default function DeleteContractModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  contract 
}: DeleteContractModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!contract) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error deleting contract:', error)
      setError(error.message || 'Error al eliminar el contrato')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !contract) return null

  const fullName = contract.contracts_full_name || 
    `${contract.primer_nombre} ${contract.primer_apellido}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Eliminar Contrato
            </h3>
            <p className="text-sm text-gray-500">
              Esta acción no se puede deshacer
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Información del contrato */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                ¿Estás seguro de eliminar este contrato?
              </h4>
              <div className="mt-2 text-sm text-red-700">
                <p className="font-medium">{fullName}</p>
                <p>Contrato: {contract.numero_contrato_helisa}</p>
                <p>Empresa: {contract.company?.name || 'No especificada'}</p>
              </div>
              <p className="mt-2 text-sm text-red-600">
                Se eliminará toda la información y el historial del contrato permanentemente.
              </p>
            </div>
          </div>
        </div>

        {/* Error si existe */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </div>
            ) : (
              'Sí, Eliminar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
