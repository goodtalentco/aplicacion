/**
 * Hook para obtener la información más actualizada de un contrato,
 * combinando datos originales con las novedades más recientes
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Contract } from '../types/contract'

// Función helper para detectar si un string es UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

interface ContractCurrentData {
  // Datos personales actualizados
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  celular: string | null
  email: string | null
  
  // Datos económicos actualizados
  salario_actual: number | null
  auxilio_salarial_actual: number | null
  auxilio_no_salarial_actual: number | null
  auxilio_transporte_actual: number | null
  
  // Conceptos de auxilios actualizados
  auxilio_salarial_concepto_actual: string | null
  auxilio_no_salarial_concepto_actual: string | null
  
  // Entidades actualizadas
  eps_actual: string | null
  pension_actual: string | null
  cesantias_actual: string | null
  
  // Cargo actual
  cargo_actual: string | null
  
  // Ciudad actual (nombre, no ID)
  ciudad_labora_actual: string | null
  
  // SENA actual
  aporta_sena_actual: boolean
  
  // Fecha de finalización actual (con prórrogas)
  fecha_fin_actual: string | null
  
  // Beneficiarios actualizados
  beneficiario_hijo_actual: number | null
  beneficiario_madre_actual: number | null
  beneficiario_padre_actual: number | null
  beneficiario_conyuge_actual: number | null
  
  // Información de terminación
  is_terminated: boolean
  fecha_terminacion: string | null
  tipo_terminacion: string | null
  
  // Estado de carga
  loading: boolean
  error: string | null
}

export const useContractCurrentData = (contract: Contract, refreshTrigger?: number): ContractCurrentData => {
  const [currentData, setCurrentData] = useState<ContractCurrentData>({
    // Inicializar con datos originales del contrato
    primer_nombre: contract.primer_nombre,
    segundo_nombre: contract.segundo_nombre ?? null,
    primer_apellido: contract.primer_apellido,
    segundo_apellido: contract.segundo_apellido ?? null,
    celular: contract.celular ?? null,
    email: contract.email ?? null,
    salario_actual: contract.salario ?? null,
    auxilio_salarial_actual: contract.auxilio_salarial ?? null,
    auxilio_no_salarial_actual: contract.auxilio_no_salarial ?? null,
    auxilio_transporte_actual: contract.auxilio_transporte ?? null,
    auxilio_salarial_concepto_actual: contract.auxilio_salarial_concepto ?? null,
    auxilio_no_salarial_concepto_actual: contract.auxilio_no_salarial_concepto ?? null,
    eps_actual: contract.radicado_eps ?? null, // EPS se almacena como radicado_eps
    pension_actual: contract.fondo_pension ?? null,
    cesantias_actual: contract.fondo_cesantias ?? null,
    cargo_actual: contract.cargo ?? null,
    ciudad_labora_actual: contract.ciudad_labora ?? null,
    aporta_sena_actual: contract.base_sena ?? true,
    fecha_fin_actual: contract.fecha_fin ?? null,
    beneficiario_hijo_actual: contract.beneficiario_hijo ?? null,
    beneficiario_madre_actual: contract.beneficiario_madre ?? null,
    beneficiario_padre_actual: contract.beneficiario_padre ?? null,
    beneficiario_conyuge_actual: contract.beneficiario_conyuge ?? null,
    is_terminated: false,
    fecha_terminacion: null,
    tipo_terminacion: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const fetchCurrentData = async () => {
      if (!contract.id) return

      try {
        setCurrentData(prev => ({ ...prev, loading: true, error: null }))

        // 1. Obtener datos personales más recientes
        const { data: datosPersonales } = await supabase
          .from('novedades_datos_personales')
          .select('campo, valor_nuevo, created_at')
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: false })

        // 2. Obtener datos económicos más recientes (incluyendo conceptos)
        const { data: datosEconomicos } = await supabase
          .from('novedades_economicas')
          .select('tipo, valor_nuevo, concepto, created_at')
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: false })

        // 3. Obtener entidades más recientes
        const { data: entidades } = await supabase
          .from('novedades_entidades')
          .select('tipo, entidad_nueva, created_at')
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: false })

        // 4. Obtener cargo más reciente
        const { data: cambiosCargo } = await supabase
          .from('novedades_cambio_cargo')
          .select('cargo_nuevo, aporta_sena, created_at')
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: false })
          .limit(1)

        // 5. Obtener prórroga más reciente
        const { data: prorrogas } = await supabase
          .from('novedades_tiempo_laboral')
          .select('nueva_fecha_fin, created_at')
          .eq('contract_id', contract.id)
          .eq('tipo_tiempo', 'prorroga')
          .order('created_at', { ascending: false })
          .limit(1)

        // 6. Obtener beneficiarios más recientes
        const { data: beneficiarios } = await supabase
          .from('novedades_beneficiarios')
          .select('tipo_beneficiario, valor_nuevo, created_at')
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: false })

        // 7. Obtener información de terminación (sin error si no existe)
        const { data: terminacionArray } = await supabase
          .from('novedades_terminacion')
          .select('fecha, tipo_terminacion, created_at')
          .eq('contract_id', contract.id)
          .limit(1)
        
        const terminacion = terminacionArray?.[0] || null
        
        // 8. Resolver nombre de ciudad si es un UUID
        let ciudadNombre = contract.ciudad_labora
        if (contract.ciudad_labora && isUUID(contract.ciudad_labora)) {
          try {
            const { data: ciudadData } = await supabase
              .from('ciudades')
              .select('nombre')
              .eq('id', contract.ciudad_labora)
              .single()
            
            if (ciudadData) {
              ciudadNombre = ciudadData.nombre
            }
          } catch (error) {
            console.log('Error resolviendo ciudad:', error)
            // Mantener el valor original si falla
          }
        }
        
        

        // Procesar datos personales
        const datosPersonalesMap = new Map<string, string>()
        if (datosPersonales) {
          datosPersonales.forEach(novedad => {
            if (!datosPersonalesMap.has(novedad.campo)) {
              datosPersonalesMap.set(novedad.campo, novedad.valor_nuevo)
            }
          })
        }

        // Procesar datos económicos
        const datosEconomicosMap = new Map<string, number>()
        const conceptosEconomicosMap = new Map<string, string>()
        if (datosEconomicos) {
          datosEconomicos.forEach(novedad => {
            if (!datosEconomicosMap.has(novedad.tipo)) {
              datosEconomicosMap.set(novedad.tipo, parseFloat(novedad.valor_nuevo))
              if (novedad.concepto) {
                conceptosEconomicosMap.set(novedad.tipo, novedad.concepto)
              }
            }
          })
        }

        // Procesar entidades
        const entidadesMap = new Map<string, string>()
        if (entidades) {
          entidades.forEach(novedad => {
            if (!entidadesMap.has(novedad.tipo)) {
              entidadesMap.set(novedad.tipo, novedad.entidad_nueva)
            }
          })
        }

        // Actualizar estado con los datos más recientes
        setCurrentData(prev => ({
          ...prev,
          // Datos personales (usar novedad si existe, sino mantener original)
          primer_nombre: datosPersonalesMap.get('primer_nombre') || prev.primer_nombre,
          segundo_nombre: datosPersonalesMap.get('segundo_nombre') || prev.segundo_nombre,
          primer_apellido: datosPersonalesMap.get('primer_apellido') || prev.primer_apellido,
          segundo_apellido: datosPersonalesMap.get('segundo_apellido') || prev.segundo_apellido,
          celular: datosPersonalesMap.get('celular') || prev.celular,
          email: datosPersonalesMap.get('email') || prev.email,
          
          // Datos económicos
          salario_actual: datosEconomicosMap.get('salario') || prev.salario_actual,
          auxilio_salarial_actual: datosEconomicosMap.get('auxilio_salarial') || prev.auxilio_salarial_actual,
          auxilio_no_salarial_actual: datosEconomicosMap.get('auxilio_no_salarial') || prev.auxilio_no_salarial_actual,
          auxilio_transporte_actual: datosEconomicosMap.get('auxilio_transporte') || prev.auxilio_transporte_actual,
          
          // Conceptos de auxilios
          auxilio_salarial_concepto_actual: conceptosEconomicosMap.get('auxilio_salarial') || prev.auxilio_salarial_concepto_actual,
          auxilio_no_salarial_concepto_actual: conceptosEconomicosMap.get('auxilio_no_salarial') || prev.auxilio_no_salarial_concepto_actual,
          
          // Entidades
          eps_actual: entidadesMap.get('eps') || prev.eps_actual,
          pension_actual: entidadesMap.get('fondo_pension') || prev.pension_actual,
          cesantias_actual: entidadesMap.get('fondo_cesantias') || prev.cesantias_actual,
          
          // Cargo
          cargo_actual: cambiosCargo?.[0]?.cargo_nuevo || prev.cargo_actual,
          
          // Ciudad (resuelta)
          ciudad_labora_actual: ciudadNombre ?? null,
          
          // SENA - igual que cargo
          aporta_sena_actual: cambiosCargo?.[0]?.aporta_sena ?? prev.aporta_sena_actual,
          
          // Fecha fin - usar prórroga más reciente si existe
          fecha_fin_actual: prorrogas?.[0]?.nueva_fecha_fin || prev.fecha_fin_actual,
          
          // Beneficiarios - usar novedades más recientes si existen
          beneficiario_hijo_actual: (() => {
            const ultimoHijo = beneficiarios?.find(b => b.tipo_beneficiario === 'hijo')
            return ultimoHijo ? ultimoHijo.valor_nuevo : prev.beneficiario_hijo_actual
          })(),
          beneficiario_madre_actual: (() => {
            const ultimaMadre = beneficiarios?.find(b => b.tipo_beneficiario === 'madre')
            return ultimaMadre ? ultimaMadre.valor_nuevo : prev.beneficiario_madre_actual
          })(),
          beneficiario_padre_actual: (() => {
            const ultimoPadre = beneficiarios?.find(b => b.tipo_beneficiario === 'padre')
            return ultimoPadre ? ultimoPadre.valor_nuevo : prev.beneficiario_padre_actual
          })(),
          beneficiario_conyuge_actual: (() => {
            const ultimoConyuge = beneficiarios?.find(b => b.tipo_beneficiario === 'conyuge')
            return ultimoConyuge ? ultimoConyuge.valor_nuevo : prev.beneficiario_conyuge_actual
          })(),
          
          // Información de terminación
          is_terminated: !!terminacion,
          fecha_terminacion: terminacion?.fecha || null,
          tipo_terminacion: terminacion?.tipo_terminacion || null,
          
          loading: false,
          error: null
        }))

      } catch (error) {
        console.error('Error fetching current contract data:', error)
        setCurrentData(prev => ({
          ...prev,
          loading: false,
          error: 'Error al cargar datos actualizados'
        }))
      }
    }

    fetchCurrentData()
  }, [contract.id, refreshTrigger])
  

  return currentData
}
