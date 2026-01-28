/**
 * Contenido reutilizable de Tablas Auxiliares
 * Usado en /dashboard/tablas-auxiliares y dentro de Configuración
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  MapPin,
  Building,
  Shield,
  PiggyBank,
  Landmark,
  Cross,
  Target,
  ArrowRight,
  Database,
  Calculator,
  Download
} from 'lucide-react'
import { downloadAllAuxiliaryTablesForImport } from '@/utils/downloadAuxiliaryTable'

interface TableMetrics {
  ciudades: number
  cajas_compensacion: number
  arls: number
  fondos_cesantias: number
  fondos_pension: number
  eps: number
  lineas_negocio: number
  parametros_anuales: number
}

interface AuxiliaryTable {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  route: string
  color: string
  count: number
}

interface TablasAuxiliaresContentProps {
  /** Si true, no muestra el título principal (para uso dentro de la tarjeta de Configuración) */
  embedded?: boolean
}

export default function TablasAuxiliaresContent({ embedded = false }: TablasAuxiliaresContentProps) {
  const [metrics, setMetrics] = useState<TableMetrics>({
    ciudades: 0,
    cajas_compensacion: 0,
    arls: 0,
    fondos_cesantias: 0,
    fondos_pension: 0,
    eps: 0,
    lineas_negocio: 0,
    parametros_anuales: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleDownloadAll = async () => {
    try {
      setLoading(true)
      await downloadAllAuxiliaryTablesForImport()
      alert('✅ Todas las tablas auxiliares han sido descargadas exitosamente en formato Excel')
    } catch (error) {
      alert('❌ Error al descargar las tablas auxiliares')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const [
          ciudadesResult,
          cajasResult,
          arlsResult,
          cesantiasResult,
          pensionResult,
          epsResult,
          lineasNegocioResult,
          parametrosResult
        ] = await Promise.all([
          supabase.from('ciudades').select('*', { count: 'exact', head: true }),
          supabase.from('cajas_compensacion').select('*', { count: 'exact', head: true }),
          supabase.from('arls').select('*', { count: 'exact', head: true }),
          supabase.from('fondos_cesantias').select('*', { count: 'exact', head: true }),
          supabase.from('fondos_pension').select('*', { count: 'exact', head: true }),
          supabase.from('eps').select('*', { count: 'exact', head: true }),
          supabase.from('lineas_negocio').select('*', { count: 'exact', head: true }),
          supabase.from('parametros_anuales').select('*', { count: 'exact', head: true })
        ])
        setMetrics({
          ciudades: ciudadesResult.count || 0,
          cajas_compensacion: cajasResult.count || 0,
          arls: arlsResult.count || 0,
          fondos_cesantias: cesantiasResult.count || 0,
          fondos_pension: pensionResult.count || 0,
          eps: epsResult.count || 0,
          lineas_negocio: lineasNegocioResult.count || 0,
          parametros_anuales: parametrosResult.count || 0
        })
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  const auxiliaryTables: AuxiliaryTable[] = [
    { id: 'ciudades', name: 'Ciudades', description: 'Ciudades principales de Colombia para cajas de compensación', icon: MapPin, route: '/dashboard/tablas-auxiliares/ciudades', color: 'from-blue-500 to-blue-600', count: metrics.ciudades },
    { id: 'cajas', name: 'Cajas de Compensación', description: 'Cajas de compensación familiar por ciudad', icon: Building, route: '/dashboard/tablas-auxiliares/cajas', color: 'from-green-500 to-green-600', count: metrics.cajas_compensacion },
    { id: 'arls', name: 'ARL', description: 'Administradoras de Riesgos Laborales', icon: Shield, route: '/dashboard/tablas-auxiliares/arls', color: 'from-red-500 to-red-600', count: metrics.arls },
    { id: 'cesantias', name: 'Fondos de Cesantías', description: 'Fondos de cesantías disponibles', icon: PiggyBank, route: '/dashboard/tablas-auxiliares/cesantias', color: 'from-yellow-500 to-yellow-600', count: metrics.fondos_cesantias },
    { id: 'pension', name: 'Fondos de Pensión', description: 'Fondos de pensión disponibles', icon: Landmark, route: '/dashboard/tablas-auxiliares/pension', color: 'from-purple-500 to-purple-600', count: metrics.fondos_pension },
    { id: 'eps', name: 'EPS', description: 'Entidades Promotoras de Salud', icon: Cross, route: '/dashboard/tablas-auxiliares/eps', color: 'from-pink-500 to-pink-600', count: metrics.eps },
    { id: 'lineas-negocio', name: 'Líneas de Negocio', description: 'Gestión de líneas de negocio y responsables', icon: Target, route: '/dashboard/tablas-auxiliares/lineas-negocio', color: 'from-teal-500 to-teal-600', count: metrics.lineas_negocio },
    { id: 'parametros-anuales', name: 'Parámetros Anuales', description: 'Parámetros que cambian año a año (salarios, aportes, etc.)', icon: Calculator, route: '/dashboard/tablas-auxiliares/parametros-anuales', color: 'from-indigo-500 to-indigo-600', count: metrics.parametros_anuales }
  ]

  return (
    <div className={embedded ? 'w-full' : 'p-3 sm:p-6 max-w-7xl mx-auto w-full'}>
      {!embedded && (
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#004C4C] flex items-center">
                <Database className="w-8 h-8 mr-3 text-[#5FD3D2]" />
                Tablas Auxiliares
              </h1>
              <p className="text-[#065C5C] mt-1 text-sm sm:text-base">
                Gestiona las tablas administrativas del sistema
              </p>
            </div>
            <button
              onClick={handleDownloadAll}
              disabled={loading}
              className="px-4 py-2 bg-[#004C4C] text-white rounded-xl hover:bg-[#065C5C] transition-colors flex items-center space-x-2 disabled:opacity-50"
              title="Descargar todas las tablas auxiliares en formato Excel para importación masiva"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Descargar Todas (Excel)</span>
              <span className="sm:hidden">Descargar Todas</span>
            </button>
          </div>
        </div>
      )}

      {embedded && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleDownloadAll}
            disabled={loading}
            className="px-4 py-2 bg-[#004C4C] text-white rounded-xl hover:bg-[#065C5C] transition-colors flex items-center space-x-2 disabled:opacity-50"
            title="Descargar todas las tablas auxiliares en formato Excel"
          >
            <Download className="h-4 w-4" />
            Descargar Todas (Excel)
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {auxiliaryTables.map((table) => {
          const Icon = table.icon
          return (
            <div
              key={table.id}
              onClick={() => router.push(table.route)}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-[#5FD3D2] transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className={`bg-gradient-to-r ${table.color} p-6 text-white relative overflow-hidden`}>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <Icon className="w-8 h-8" />
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                  <h3 className="text-xl font-bold mt-3 mb-1">{table.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm opacity-90">Registros:</span>
                    <span className="text-lg font-bold">{loading ? '...' : table.count.toLocaleString()}</span>
                  </div>
                </div>
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white bg-opacity-10" />
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white bg-opacity-10" />
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{table.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-gray-500">Activo</span>
                  </div>
                  <span className="text-xs text-[#5FD3D2] font-medium group-hover:text-[#004C4C] transition-colors">Ver tabla →</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
