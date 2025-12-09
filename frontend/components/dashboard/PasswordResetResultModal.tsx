/**
 * Modal para mostrar el resultado del reset de contraseña
 * Muestra la nueva contraseña temporal que debe compartir el admin
 */

'use client'

import { useState } from 'react'
import { Check, Copy, Key, X, Eye, EyeOff } from 'lucide-react'

interface PasswordResetResultModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    alias: string
    notification_email: string
    temporary_password: string
  } | null
}

export default function PasswordResetResultModal({ 
  isOpen, 
  onClose, 
  user 
}: PasswordResetResultModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen || !user) return null

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copying to clipboard:', err)
    }
  }

  const copyCredentials = async () => {
    const credentials = `Usuario: ${user.alias}\nContraseña temporal: ${user.temporary_password}`
    await copyToClipboard(credentials)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Key className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Contraseña Reseteada
                </h3>
                <p className="text-sm text-gray-600">
                  Nueva contraseña temporal generada
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Success message */}
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-700">
              La contraseña de <strong>{user.alias}</strong> ha sido reseteada exitosamente.
            </p>
          </div>

          {/* Credentials */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="w-4 h-4 mr-2" />
              Nuevas credenciales
            </h4>
            
            <div className="space-y-4">
              {/* Alias */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <span className="text-sm text-gray-600">Usuario:</span>
                  <div className="font-mono font-medium text-gray-900">{user.alias}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(user.alias)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copiar usuario"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Contraseña temporal:</span>
                  <div className="font-mono font-medium text-gray-900 flex items-center">
                    <span className="mr-2">
                      {showPassword ? user.temporary_password : '••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(user.temporary_password)}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                  title="Copiar contraseña"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Copy all button */}
            <button
              onClick={copyCredentials}
              className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition-all ${
                copied 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              {copied ? (
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>¡Copiado!</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Copy className="w-4 h-4" />
                  <span>Copiar credenciales completas</span>
                </div>
              )}
            </button>
          </div>

          {/* Important note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-amber-600 mt-0.5">
                ⚠️
              </div>
              <div className="text-sm text-amber-800">
                <strong>Importante:</strong> Comparte estas credenciales con el usuario de forma segura. 
                El usuario deberá cambiar esta contraseña temporal en su próximo acceso al sistema.
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white font-semibold rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all duration-200"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
