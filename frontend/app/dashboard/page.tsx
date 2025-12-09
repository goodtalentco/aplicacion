'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Users, 
  Building2, 
  UserPlus, 
  Shield, 
  AlertTriangle,
  FileText 
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import MetricCard from '../../components/dashboard/MetricCard'
import ChartWidget from '../../components/dashboard/ChartWidget'
import ChangePasswordModal from '../../components/dashboard/ChangePasswordModal'

/**
 * Página principal del dashboard con métricas y gráficas
 * Muestra datos ficticios para visualización
 */
export default function DashboardPage() {
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [userAlias, setUserAlias] = useState<string>()
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Verificar si necesita cambio de contraseña
  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Obtener perfil del usuario
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('alias, is_temp_password')
            .eq('user_id', user.id)
            .single()
          
          if (profile) {
            setUserAlias(profile.alias)
            
            // Verificar si necesita cambio de contraseña (por parámetro URL o perfil)
            const forceChange = searchParams.get('change_password') === 'required'
            if (forceChange || profile.is_temp_password) {
              setShowChangePassword(true)
            }
          }
        }
      } catch (error) {
        console.error('Error checking password status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkPasswordStatus()
  }, [searchParams])

  const handlePasswordChangeSuccess = () => {
    setShowChangePassword(false)
    // Limpiar el parámetro de la URL
    router.replace('/dashboard')
  }
  
  // Datos ficticios para el dashboard
  const contratacionesData = [
    { name: 'Ene', value: 45 },
    { name: 'Feb', value: 52 },
    { name: 'Mar', value: 48 },
    { name: 'Abr', value: 61 },
    { name: 'May', value: 55 },
  ]

  const sstData = [
    { name: 'Resueltos', value: 32 },
    { name: 'En proceso', value: 13 },
  ]

  const empresasData = [
    { name: 'Activas', value: 8 },
    { name: 'Inactivas', value: 4 },
  ]

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Resumen general de la gestión de recursos humanos, nómina y cumplimiento legal
        </p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        <MetricCard
          title="Empleados"
          value={12}
          subtitle="Empleados activos"
          icon={Users}
          color="blue"
        />
        
        <MetricCard
          title="Empleados"
          value={384}
          subtitle="Total histórico"
          icon={Building2}
          color="green"
        />
        
        <MetricCard
          title="este mes"
          value={6}
          subtitle="Nuevas contrataciones"
          icon={UserPlus}
          trend={{ value: 37, label: 'este mes', isPositive: true }}
          color="purple"
        />
        
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Contrataciones Chart */}
        <ChartWidget
          title="Contrataciones"
          type="bar"
          data={contratacionesData}
          height={300}
        />
        
        {/* SST Chart */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">SST</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">45</span>
                  <span className="text-sm font-semibold text-gray-600">Incidentes</span>
                </div>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-green-600 text-sm font-semibold">↗️ 37% este mes</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            
            {/* SST Pie Chart */}
            <div style={{ height: 200 }}>
              <ChartWidget
                title=""
                type="pie"
                data={sstData}
                height={200}
                colors={['#87E0E0', '#5FD3D2']}
              />
            </div>
          </div>
        </div>
        
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Empleados por Empresa */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Empleados por Empresa</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-[#87E0E0] rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Activas</span>
              </div>
              <span className="text-sm font-bold text-gray-900">8 empresas</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-[#004C4C] rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Inactivas</span>
              </div>
              <span className="text-sm font-bold text-gray-900">4 empresas</span>
            </div>
          </div>
          
          {/* Mini Pie Chart */}
          <div className="mt-6" style={{ height: 150 }}>
            <ChartWidget
              title=""
              type="pie"
              data={empresasData}
              height={150}
              colors={['#87E0E0', '#004C4C']}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Actividad Reciente</h3>
          
          <div className="space-y-4">
            
            <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nuevo empleado contratado</p>
                <p className="text-xs text-gray-500">Juan Pérez - Desarrollador Frontend</p>
                <p className="text-xs text-gray-400">Hace 2 horas</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Incidente SST reportado</p>
                <p className="text-xs text-gray-500">Oficina central - Nivel bajo</p>
                <p className="text-xs text-gray-400">Hace 4 horas</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Documento legal actualizado</p>
                <p className="text-xs text-gray-500">Contrato tipo - Versión 2.1</p>
                <p className="text-xs text-gray-400">Ayer</p>
              </div>
            </div>

          </div>
        </div>
        
      </div>
      
      {/* Modal de cambio de contraseña */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onSuccess={handlePasswordChangeSuccess}
        userAlias={userAlias}
        isRequired={true} // Siempre es obligatorio cuando se muestra desde dashboard
      />
    </div>
  )
}
