'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Building2, 
  Users, 
  FileText, 
  Bell, 
  Scale, 
  Shield,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'

/**
 * Sidebar de navegación principal del dashboard colapsable
 * Incluye los 6 módulos principales + dashboard home
 */
export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'Empresas',
      href: '/dashboard/empresas',
      icon: Building2
    },

    {
      name: 'Contratos',
      href: '/dashboard/contratos',
      icon: FileText
    },
    {
      name: 'Novedades',
      href: '/dashboard/novedades',
      icon: Bell
    },
    {
      name: 'Legal',
      href: '/dashboard/legal',
      icon: Scale
    },
    {
      name: 'SST',
      href: '/dashboard/sst',
      icon: Shield
    }
  ]

  const isActive = (item: typeof navigationItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <div className={`hidden lg:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-[#004C4C] to-[#065C5C] text-white flex-col shadow-xl transition-all duration-300 ease-in-out relative`}>
      
      {/* Toggle Button - Más moderno */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-20 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center text-[#004C4C] hover:bg-gray-100 hover:shadow-xl transition-all duration-200 hover:scale-110"
      >
        {isCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      {/* Logo / Icon - Alineación consistente */}
      <div className="h-24 flex items-center justify-center border-b border-[#0A6A6A] border-opacity-30 transition-all duration-300">
        <div className="flex items-center justify-center">
          {isCollapsed ? (
            // Icono G cuando está colapsado - mismo tamaño que el logo expandido
            <div className="w-12 h-12 bg-gradient-to-br from-[#87E0E0] to-[#5FD3D2] rounded-xl flex items-center justify-center">
              <span className="text-[#004C4C] font-bold text-xl">G</span>
            </div>
          ) : (
            // Logo grande cuando está expandido
            <div className="flex items-center justify-center w-full px-4">
              <img 
                src="https://irvgruylufihzoveycph.supabase.co/storage/v1/object/public/generales/Logo.png"
                alt="GOOD Talent Logo"
                className="w-auto object-contain h-12 max-w-full transition-all duration-300"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation - Alineación consistente */}
      <nav className="flex-1 py-6">
        <div className="space-y-1 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            
            return (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className={`
                    flex items-center h-12 ${isCollapsed ? 'justify-center px-3' : 'px-3'} text-sm font-medium rounded-xl transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] text-[#004C4C] shadow-lg'
                      : 'text-[#E6F5F7] hover:bg-[#0A6A6A] hover:bg-opacity-40 hover:text-white'
                    }
                  `}
                >
                  <Icon 
                    className={`
                      h-5 w-5 transition-colors duration-200 ${isCollapsed ? '' : 'mr-3'}
                      ${active ? 'text-[#004C4C]' : 'text-[#87E0E0] group-hover:text-white'}
                    `} 
                  />
                  
                  {!isCollapsed && (
                    <span className="font-semibold">{item.name}</span>
                  )}
                </Link>
                
                {/* Tooltip para modo colapsado */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#0A6A6A] border-opacity-30">
          <div className="text-center">
            <p className="text-xs text-[#87E0E0] font-medium">
              Portal Corporativo Integral
            </p>
            <p className="text-xs text-[#E6F5F7] opacity-75 mt-1">
              Recursos Humanos & Legal
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
