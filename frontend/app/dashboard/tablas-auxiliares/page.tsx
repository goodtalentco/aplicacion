/**
 * Página principal del módulo de Tablas Auxiliares
 * Muestra tarjetas para acceder a cada tabla auxiliar administrativa
 * El contenido también está disponible dentro de Configuración
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import TablasAuxiliaresContent from '@/components/dashboard/TablasAuxiliaresContent'

export default function TablesAuxiliariesPage() {
  const router = useRouter()
  const { canManageAuxTables, loading: permissionsLoading } = usePermissions()
  const hasAccessPermission = canManageAuxTables()

  useEffect(() => {
    if (!permissionsLoading && !hasAccessPermission) {
      router.push('/dashboard')
    }
  }, [hasAccessPermission, permissionsLoading, router])

  if (permissionsLoading || !hasAccessPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5FD3D2]" />
      </div>
    )
  }

  return <TablasAuxiliaresContent />
}
