/**
 * Página de gestión de usuarios y permisos
 * Solo accesible para usuarios con permisos de gestión
 * El contenido también está disponible dentro de Configuración
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import GestionUsuariosContent from '@/components/dashboard/GestionUsuariosContent'

export default function UserManagementPage() {
  const router = useRouter()
  const { canManageUsers, loading: permissionsLoading } = usePermissions()
  const hasManagePermission = canManageUsers()

  useEffect(() => {
    if (!permissionsLoading && !hasManagePermission) {
      router.push('/dashboard')
    }
  }, [hasManagePermission, permissionsLoading, router])

  if (permissionsLoading || !hasManagePermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5FD3D2]" />
      </div>
    )
  }

  return <GestionUsuariosContent />
}
