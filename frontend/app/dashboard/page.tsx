'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Users, 
  Building2, 
  UserPlus, 
  FileText 
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getStatusVigencia } from '@/types/contract'
import MetricCard from '../../components/dashboard/MetricCard'
import ChartWidget from '../../components/dashboard/ChartWidget'
import ChangePasswordModal from '../../components/dashboard/ChangePasswordModal'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Calcula progreso de onboarding (12 pasos) igual que en contratos/contratación */
function computeOnboardingProgress(c: Record<string, unknown>): number {
  const steps = [
    !!c.programacion_cita_examenes,
    !!(c.examenes && c.examenes_fecha),
    !!c.envio_contrato,
    !!(c.recibido_contrato_firmado && c.contrato_fecha_confirmacion),
    !!c.solicitud_inscripcion_arl,
    !!(c.arl_nombre && c.arl_fecha_confirmacion),
    !!c.solicitud_eps,
    !!(c.radicado_eps && c.eps_fecha_confirmacion),
    !!c.envio_inscripcion_caja,
    !!(c.radicado_ccf && c.caja_fecha_confirmacion),
    !!(c.solicitud_cesantias && c.fondo_cesantias && c.cesantias_fecha_confirmacion),
    !!(c.solicitud_fondo_pension && c.fondo_pension && c.pension_fecha_confirmacion)
  ]
  const completed = steps.filter(Boolean).length
  return Math.round((completed / 12) * 100)
}

/** Formato relativo: "Hace X min", "Hace X horas", "Ayer", "Hace X días" */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours} h`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export default function DashboardPage() {
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [userAlias, setUserAlias] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [totalEmpleadosActivos, setTotalEmpleadosActivos] = useState<number>(0)
  const [totalEmpresas, setTotalEmpresas] = useState<number>(0)
  const [contratacionesEsteMes, setContratacionesEsteMes] = useState<number>(0)
  const [contratacionesPorMes, setContratacionesPorMes] = useState<{ name: string; value: number }[]>([])
  const [actividadReciente, setActividadReciente] = useState<Array<{ id: string; titulo: string; subtitulo: string; fecha: string; tipo: 'contrato' }>>([])

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('alias, is_temp_password')
            .eq('user_id', user.id)
            .single()
          if (profile) {
            setUserAlias(profile.alias)
            const forceChange = searchParams.get('change_password') === 'required'
            if (forceChange || profile.is_temp_password) setShowChangePassword(true)
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

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setDataLoading(true)
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const firstDayThisMonth = new Date(year, month, 1)
        const firstDayThisMonthStr = firstDayThisMonth.toISOString().split('T')[0]

        const { data: contractsData, error: contractsError } = await supabase
          .from('contracts')
          .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, cargo, created_at, updated_at, fecha_ingreso, fecha_fin, programacion_cita_examenes, examenes, examenes_fecha, envio_contrato, recibido_contrato_firmado, contrato_fecha_confirmacion, solicitud_inscripcion_arl, arl_nombre, arl_fecha_confirmacion, solicitud_eps, radicado_eps, eps_fecha_confirmacion, envio_inscripcion_caja, radicado_ccf, caja_fecha_confirmacion, solicitud_cesantias, fondo_cesantias, cesantias_fecha_confirmacion, solicitud_fondo_pension, fondo_pension, pension_fecha_confirmacion')
          .is('archived_at', null)

        if (contractsError) throw contractsError
        const contracts = contractsData || []

        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id')
          .eq('status', true)
          .is('archived_at', null)

        if (companiesError) throw companiesError
        setTotalEmpresas(companiesData?.length ?? 0)

        const empleadosActivos = contracts.filter((c: Record<string, unknown>) => {
          const progress = computeOnboardingProgress(c)
          if (progress < 100) return false
          const vigencia = getStatusVigencia(c.fecha_fin as string | null)
          return vigencia === 'activo'
        })
        setTotalEmpleadosActivos(empleadosActivos.length)

        const contratacionesMesActual = contracts.filter((c: Record<string, unknown>) => {
          const ingreso = c.fecha_ingreso as string | null | undefined
          if (!ingreso) return false
          return ingreso.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`
        })
        setContratacionesEsteMes(contratacionesMesActual.length)

        const meses: Record<string, number> = {}
        for (let m = 0; m < 12; m++) meses[MESES[m]] = 0
        contracts.forEach((c: Record<string, unknown>) => {
          const ingreso = c.fecha_ingreso as string | null | undefined
          if (!ingreso) return
          const [y, m] = ingreso.split('-').map(Number)
          if (y !== year) return
          meses[MESES[m - 1]] = (meses[MESES[m - 1]] || 0) + 1
        })
        setContratacionesPorMes(MESES.map(name => ({ name, value: meses[name] || 0 })))

        const conNombre = contracts.map((c: Record<string, unknown>) => {
          const fullName = [c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido].filter(Boolean).join(' ').trim()
          return { ...c, fullName: fullName || 'Sin nombre' }
        })
        type ContractWithName = Record<string, unknown> & { fullName: string; updated_at?: string; created_at?: string }
        const ordenados = (conNombre as ContractWithName[]).sort((a, b) => {
          const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
          const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
          return tb - ta
        })
        setActividadReciente(ordenados.slice(0, 8).map((c: Record<string, unknown> & { fullName: string }) => ({
          id: c.id as string,
          titulo: 'Contrato actualizado',
          subtitulo: `${c.fullName}${c.cargo ? ` - ${c.cargo}` : ''}`,
          fecha: (c.updated_at || c.created_at) as string,
          tipo: 'contrato' as const
        })))
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setDataLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  const handlePasswordChangeSuccess = () => {
    setShowChangePassword(false)
    router.replace('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Resumen general de la gestión de recursos humanos y nómina
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Empleados"
          value={dataLoading ? '—' : totalEmpleadosActivos}
          subtitle="Empleados activos"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Empresas"
          value={dataLoading ? '—' : totalEmpresas}
          subtitle="Total empresas"
          icon={Building2}
          color="green"
        />
        <MetricCard
          title="este mes"
          value={dataLoading ? '—' : contratacionesEsteMes}
          subtitle="Contrataciones del mes"
          icon={UserPlus}
          trend={{ value: contratacionesEsteMes, label: 'este mes', isPositive: true }}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <ChartWidget
          title="Contrataciones por mes"
          type="bar"
          data={contratacionesPorMes}
          height={300}
          showBarLabels
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Actividad Reciente</h3>
          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#87E0E0]" />
            </div>
          ) : actividadReciente.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">No hay actividad reciente</p>
          ) : (
            <div className="space-y-4">
              {actividadReciente.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/contratos?contractId=${item.id}`)}
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.titulo}</p>
                    <p className="text-xs text-gray-500 truncate">{item.subtitulo}</p>
                    <p className="text-xs text-gray-400">{formatRelativeTime(item.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onSuccess={handlePasswordChangeSuccess}
        userAlias={userAlias}
        isRequired={true}
      />
    </div>
  )
}
