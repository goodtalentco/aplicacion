'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Building2, 
  Users, 
  FileText, 
  Bell, 
  Scale, 
  Shield,
  LayoutDashboard 
} from 'lucide-react'

/**
 * Navegación inferior moderna para móvil
 * Siempre visible en la parte inferior de la pantalla
 */
export default function BottomNavigation() {
  const pathname = usePathname()

  const navigationItems = [
    {
      name: 'Inicio',
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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <nav className="flex items-center justify-around py-1 px-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-0 flex-1
                ${active
                  ? 'bg-gradient-to-t from-[#87E0E0] to-[#5FD3D2] text-[#004C4C] shadow-md'
                  : 'text-gray-600 hover:text-[#004C4C] hover:bg-gray-100'
                }
              `}
            >
              <Icon 
                className={`
                  h-5 w-5 mb-1 transition-colors duration-200
                  ${active ? 'text-[#004C4C]' : 'text-gray-600'}
                `} 
              />
              
              <span className={`
                text-[10px] font-semibold text-center leading-tight
                ${active ? 'text-[#004C4C]' : 'text-gray-600'}
              `}>
                {item.name}
              </span>
            </Link>
          )
        })}
        
        {/* More menu for remaining modules */}
        <div className="relative group flex flex-col items-center justify-center p-2 rounded-lg min-w-0 flex-1 hover:bg-gray-100 transition-all duration-200">
          <div className="flex flex-col items-center cursor-pointer">
            <div className="flex space-x-0.5 mb-1 h-5 items-center">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
            <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">
              Más
            </span>
          </div>
          
          {/* Dropdown menu para módulos adicionales */}
          <div className="absolute bottom-full mb-2 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <Link
              href="/dashboard/legal"
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              <Scale className="h-5 w-5" />
              <span className="text-sm font-medium">Legal</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}
