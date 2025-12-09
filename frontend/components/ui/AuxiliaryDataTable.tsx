/**
 * Componente de tabla genérica para mostrar datos de tablas auxiliares
 * Con funciones de búsqueda, ordenamiento y acciones CRUD
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Edit, 
  Power, 
  X, 
  RotateCcw,
  ArrowUpDown,
  Loader2
} from 'lucide-react'

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, record: any) => React.ReactNode
}

interface AuxiliaryDataTableProps {
  data: any[]
  columns: Column[]
  loading: boolean
  searchPlaceholder?: string
  onAdd?: () => void
  onEdit?: (record: any) => void
  onDelete?: (record: any) => void
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  emptyMessage?: string
  addButtonText?: string
}

export default function AuxiliaryDataTable({
  data,
  columns,
  loading,
  searchPlaceholder = 'Buscar...',
  onAdd,
  onEdit,
  onDelete,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  emptyMessage = 'No hay registros disponibles',
  addButtonText = 'Agregar Registro'
}: AuxiliaryDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  // Debounce para búsqueda
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchInput), 250)
    return () => clearTimeout(id)
  }, [searchInput])

  // Filtrar datos
  const filteredData = data.filter(record => {
    if (!searchTerm) return true
    
    return columns.some(column => {
      const value = record[column.key]
      if (value == null) return false
      return value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  // Ordenar datos
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0
    
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1
    }
    return 0
  })

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setSortConfig(null)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header con controles */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5FD3D2] focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearchTerm('') }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center space-x-2">
            {/* Limpiar filtros */}
            {(searchTerm || sortConfig) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span className="text-sm font-medium">Limpiar</span>
              </button>
            )}

            {/* Botón agregar */}
            {canCreate && onAdd && (
              <button
                onClick={onAdd}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] text-white font-semibold rounded-lg hover:from-[#58BFC2] hover:to-[#5FD3D2] transition-all duration-200 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-sm">{addButtonText}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#5FD3D2]" />
              <span className="text-gray-500">Cargando datos...</span>
            </div>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron resultados' : 'Sin registros'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? `No hay registros que coincidan con "${searchTerm}".`
                : emptyMessage
              }
            </p>
            {!searchTerm && canCreate && onAdd && (
              <button
                onClick={onAdd}
                className="inline-flex items-center px-4 py-2 bg-[#5FD3D2] text-white rounded-lg hover:bg-[#58BFC2] transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                {addButtonText}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Vista móvil - Tarjetas modernas */}
            <div className="block lg:hidden space-y-3 p-3">
              {sortedData.map((record, index) => (
                <div key={record.id || index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all hover:border-[#5FD3D2] group">
                  <div className="space-y-4">
                    
                    {/* Header principal - Primer campo */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {columns[0].render 
                            ? columns[0].render(record[columns[0].key], record)
                            : record[columns[0].key]
                          }
                        </h3>
                        {/* Mostrar segundo campo importante si existe */}
                        {columns.length > 1 && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            <span className="font-medium">{columns[1].label}:</span>{' '}
                            {columns[1].render 
                              ? columns[1].render(record[columns[1].key], record)
                              : record[columns[1].key]
                            }
                          </p>
                        )}
                      </div>
                      
                      {/* Estado o badge si el primer campo es especial */}
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    </div>

                    {/* Información adicional en grid */}
                    {columns.length > 2 && (
                      <div className="grid grid-cols-1 gap-3 py-2 border-t border-gray-100">
                        {columns.slice(2).map((column) => (
                          <div key={column.key} className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {column.label}
                            </span>
                            <span className="text-sm font-medium text-gray-900 text-right">
                              {column.render 
                                ? column.render(record[column.key], record)
                                : record[column.key]
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Acciones en footer */}
                    {(canEdit || canDelete) && (
                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(record)}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all text-xs font-medium border border-blue-200 group-hover:scale-105"
                            title="Editar registro"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        )}
                        
                        {canDelete && onDelete && (
                          <button
                            onClick={() => onDelete(record)}
                            className="flex items-center space-x-1 px-3 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-all text-xs font-medium border border-orange-200 group-hover:scale-105"
                            title="Activar/Desactivar registro"
                          >
                            <Power className="w-3 h-3" />
                            <span>Estado</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop - Tabla tradicional mejorada */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                          column.sortable ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''
                        }`}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{column.label}</span>
                          {column.sortable && (
                            <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                          )}
                          {sortConfig?.key === column.key && (
                            <span className="text-[#5FD3D2] font-bold">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    {(canEdit || canDelete) && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all duration-200 group">
                      {columns.map((column) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {column.render 
                            ? column.render(record[column.key], record)
                            : record[column.key]
                          }
                        </td>
                      ))}
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && onEdit && (
                              <button
                                onClick={() => onEdit(record)}
                                className="inline-flex items-center p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110"
                                title="Editar registro"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && onDelete && (
                              <button
                                onClick={() => onDelete(record)}
                                className="inline-flex items-center p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-all hover:scale-110"
                                title="Activar/Desactivar registro"
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Footer con información */}
      {!loading && sortedData.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Mostrando {sortedData.length} de {data.length} registros
              {searchTerm && ` (filtrado por "${searchTerm}")`}
            </span>
            {sortConfig && (
              <span>
                Ordenado por {columns.find(c => c.key === sortConfig.key)?.label} 
                ({sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
