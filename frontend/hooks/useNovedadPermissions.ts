/**
 * Hook para validar permisos específicos de novedades
 * Evita que usuarios sin permisos lleguen hasta el error de RLS
 */

import { usePermissions } from '../lib/usePermissions'

interface NovedadPermissionMap {
  datos_personales: string
  cambio_cargo: string
  entidades: string
  economicas: string
  tiempo_laboral: string
  incapacidad: string
  beneficiarios: string
  terminacion: string
  historial_contratos: string
}

const NOVEDAD_PERMISSIONS: NovedadPermissionMap = {
  datos_personales: 'novedades_datos_personales',
  cambio_cargo: 'novedades_cambio_cargo',
  entidades: 'novedades_entidades',
  economicas: 'novedades_economicas',
  tiempo_laboral: 'novedades_tiempo_laboral',
  incapacidad: 'novedades_incapacidad',
  beneficiarios: 'novedades_beneficiarios',
  terminacion: 'novedades_terminacion',
  historial_contratos: 'historial_contratos_fijos'
}

export const useNovedadPermissions = () => {
  const { permissions } = usePermissions()

  const hasNovedadPermission = (novedadType: keyof NovedadPermissionMap): boolean => {
    const tableName = NOVEDAD_PERMISSIONS[novedadType]
    
    // Verificar si tiene permiso de crear para esta tabla específica
    const hasCreatePermission = permissions.some(p => 
      p.table_name === tableName && p.action === 'create'
    )
    
    return hasCreatePermission
  }

  const getNovedadPermissionName = (novedadType: keyof NovedadPermissionMap): string => {
    const typeNames: Record<keyof NovedadPermissionMap, string> = {
      datos_personales: 'Datos Personales',
      cambio_cargo: 'Cambio de Cargo',
      entidades: 'Entidades (EPS/Pensión/Cesantías)',
      economicas: 'Cambios Económicos',
      tiempo_laboral: 'Tiempo Laboral',
      incapacidad: 'Incapacidades',
      beneficiarios: 'Beneficiarios',
      terminacion: 'Terminación de Contrato',
      historial_contratos: 'Historial de Contratos'
    }
    
    return typeNames[novedadType]
  }

  return {
    hasNovedadPermission,
    getNovedadPermissionName
  }
}
