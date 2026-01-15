/**
 * Componente selector de usuarios para asignar responsable de contratación
 * Muestra lista de usuarios activos del sistema
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Loader2, User, Search } from 'lucide-react'

interface User {
  id: string
  email: string
  alias?: string
  display_name?: string | null
}

interface UserSelectorProps {
  selectedUserId?: string | null
  onSelect: (userId: string | null) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  label?: string
}

export default function UserSelector({
  selectedUserId,
  onSelect,
  placeholder = 'Seleccionar usuario...',
  disabled = false,
  error = false,
  label
}: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Usar la función RPC que obtiene usuarios con perfiles
      const { data, error } = await supabase.rpc('get_all_user_profiles')
      
      if (error) {
        console.error('Error loading users:', error)
        return
      }

      // Filtrar solo usuarios activos y formatear
      const activeUsers = (data || [])
        .filter((u: any) => u.is_active !== false)
        .map((u: any) => ({
          id: u.user_id,
          email: u.auth_email || u.notification_email || '',
          alias: u.alias || null,
          display_name: u.display_name || null
        }))
        .sort((a, b) => {
          const nameA = a.display_name || a.alias || a.email
          const nameB = b.display_name || b.alias || b.email
          return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
        })

      setUsers(activeUsers)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(u => u.id === selectedUserId)
  const displayName = selectedUser 
    ? (selectedUser.display_name || selectedUser.alias || selectedUser.email)
    : null

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    const email = user.email.toLowerCase()
    const alias = (user.alias || '').toLowerCase()
    const displayName = (user.display_name || '').toLowerCase()
    
    return email.includes(searchLower) || 
           alias.includes(searchLower) || 
           displayName.includes(searchLower)
  })

  const handleSelect = (userId: string) => {
    onSelect(userId)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(null)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0] transition-all ${
            error 
              ? 'border-red-500 bg-red-50' 
              : 'border-gray-300 bg-white'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'} flex items-center justify-between`}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-gray-400 flex-shrink-0" />
                <span className="text-gray-500 text-sm">Cargando usuarios...</span>
              </>
            ) : displayName ? (
              <>
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900 text-sm truncate">{displayName}</span>
              </>
            ) : (
              <span className="text-gray-500 text-sm">{placeholder}</span>
            )}
          </div>
          
          {selectedUserId && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              ×
            </button>
          )}
          
          <svg 
            className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Buscador */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#87E0E0] focus:border-[#87E0E0]"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de usuarios */}
            <div className="overflow-y-auto max-h-48">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Cargando usuarios...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                </div>
              ) : (
                <div className="py-1">
                  {filteredUsers.map((user) => {
                    const isSelected = user.id === selectedUserId
                    const displayName = user.display_name || user.alias || user.email
                    
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelect(user.id)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-[#87E0E0] bg-opacity-20' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {displayName}
                            </div>
                            {user.email && user.email !== displayName && (
                              <div className="text-xs text-gray-500 truncate">
                                {user.email}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-2 h-2 bg-[#5FD3D2] rounded-full flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click fuera para cerrar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
