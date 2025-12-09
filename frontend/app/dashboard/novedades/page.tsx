'use client'

import { Bell, Plus, Search } from 'lucide-react'

/**
 * Página del módulo Novedades
 * Placeholder para futuro desarrollo
 */
export default function NovedadesPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Bell className="h-8 w-8 text-[#87E0E0]" />
            <span>Novedades</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Gestión de novedades, incidencias y comunicaciones
          </p>
        </div>
        
        <button className="bg-gradient-to-r from-[#004C4C] to-[#065C5C] text-white px-6 py-3 rounded-xl font-semibold hover:from-[#065C5C] hover:to-[#0A6A6A] transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Nueva Novedad</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar novedades por empleado, tipo o descripción..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent">
              <option>Todas las novedades</option>
              <option>Pendientes</option>
              <option>Procesadas</option>
              <option>Rechazadas</option>
            </select>
            <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#87E0E0] focus:border-transparent">
              <option>Todos los tipos</option>
              <option>Licencias</option>
              <option>Permisos</option>
              <option>Incapacidades</option>
              <option>Vacaciones</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="h-12 w-12 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Módulo en Desarrollo
          </h3>
          
          <p className="text-gray-600 mb-6">
            El módulo de novedades estará disponible próximamente. 
            Incluirá herramientas para gestionar todas las incidencias y comunicaciones.
          </p>
          
          <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900">Funcionalidades planificadas:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Registro de novedades</li>
              <li>• Gestión de permisos y licencias</li>
              <li>• Solicitudes de vacaciones</li>
              <li>• Incapacidades médicas</li>
              <li>• Comunicaciones internas</li>
              <li>• Reportes de ausentismo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
