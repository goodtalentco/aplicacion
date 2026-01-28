/**
 * Utilidad para descargar tablas auxiliares como Excel
 */

import { supabase } from '../lib/supabaseClient'
import * as XLSX from 'xlsx'

interface DownloadOptions {
  tableName: string
  fileName: string
  columns?: string[] // Si no se especifica, descarga todas las columnas
  filterActive?: boolean // Si es true, solo descarga registros con es_activa = true
}

/**
 * Descarga una tabla auxiliar como archivo Excel (.xlsx)
 */
export async function downloadAuxiliaryTableExcel({
  tableName,
  fileName,
  columns = ['nombre'],
  filterActive = true
}: DownloadOptions): Promise<void> {
  try {
    // Construir query
    let query = supabase
      .from(tableName)
      .select(columns.join(','))

    // Filtrar solo activos si se solicita
    if (filterActive) {
      query = query.eq('es_activa', true)
    }

    // Ordenar por nombre
    query = query.order('nombre', { ascending: true })

    const { data, error } = await query

    if (error) {
      throw new Error(`Error al obtener datos: ${error.message}`)
    }

    if (!data || data.length === 0) {
      alert('No hay datos para descargar')
      return
    }

    // Preparar datos para Excel
    const excelData = data.map((row: any) => {
      const rowData: any = {}
      columns.forEach(col => {
        rowData[col] = row[col] || ''
      })
      return rowData
    })

    // Crear workbook
    const wb = XLSX.utils.book_new()
    
    // Crear worksheet desde los datos
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Ajustar ancho de columnas
    const colWidths = columns.map(col => ({
      wch: Math.max(col.length, 15) // Mínimo 15 caracteres de ancho
    }))
    ws['!cols'] = colWidths

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Datos')

    // Generar archivo Excel
    XLSX.writeFile(wb, `${fileName}.xlsx`)

  } catch (error) {
    console.error('Error descargando tabla auxiliar:', error)
    alert(error instanceof Error ? error.message : 'Error al descargar el archivo')
    throw error
  }
}

/**
 * Descarga una tabla auxiliar como archivo CSV (mantenido para compatibilidad)
 * @deprecated Usar downloadAuxiliaryTableExcel en su lugar
 */
export async function downloadAuxiliaryTableCSV({
  tableName,
  fileName,
  columns = ['nombre'],
  filterActive = true
}: DownloadOptions): Promise<void> {
  // Por defecto, usar Excel
  return downloadAuxiliaryTableExcel({
    tableName,
    fileName,
    columns,
    filterActive
  })
}

/**
 * Descarga todas las tablas auxiliares relevantes para importación como Excel
 */
export async function downloadAllAuxiliaryTablesForImport(): Promise<void> {
  const tables = [
    { tableName: 'eps', fileName: 'eps', columns: ['nombre'] },
    { tableName: 'arls', fileName: 'arls', columns: ['nombre'] },
    { tableName: 'fondos_pension', fileName: 'fondos_pension', columns: ['nombre'] },
    { tableName: 'fondos_cesantias', fileName: 'fondos_cesantias', columns: ['nombre'] },
    { tableName: 'cajas_compensacion', fileName: 'cajas_compensacion', columns: ['nombre'] },
    { tableName: 'ciudades', fileName: 'ciudades', columns: ['nombre'] }
  ]

  try {
    // Descargar todas las tablas
    for (const table of tables) {
      await downloadAuxiliaryTableExcel({
        tableName: table.tableName,
        fileName: table.fileName,
        columns: table.columns,
        filterActive: true
      })
      // Pequeña pausa entre descargas para evitar problemas
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error) {
    console.error('Error descargando tablas auxiliares:', error)
    throw error
  }
}
