/**
 * Hook para obtener las afiliaciones actuales de un contrato
 * Combina datos de novedades con afiliaciones automáticas por empresa/ciudad
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Contract } from '../types/contract'

interface ContractAfiliaciones {
  // Entidades con novedades (últimas)
  eps: string | null
  pension: string | null
  cesantias: string | null
  
  // Entidades automáticas por empresa/ciudad
  arl: string | null
  caja_compensacion: string | null
  
  // Estado de carga
  loading: boolean
  error: string | null
}

export const useContractAfiliaciones = (contract: Contract, refreshTrigger?: number): ContractAfiliaciones => {
  const [afiliaciones, setAfiliaciones] = useState<ContractAfiliaciones>({
    // Inicializar con datos originales del contrato
    eps: contract.radicado_eps || null,
    pension: contract.fondo_pension || null,
    cesantias: contract.fondo_cesantias || null,
    arl: contract.arl_nombre || null,
    caja_compensacion: null, // Se carga desde empresa_cajas_compensacion
    loading: true,
    error: null
  })

  useEffect(() => {
    const fetchAfiliaciones = async () => {
      if (!contract.id) return

      try {
        setAfiliaciones(prev => ({ ...prev, loading: true, error: null }))

        // 1. Obtener últimas novedades de entidades
        const { data: novedadesEntidades, error: errNovedades } = await supabase
          .from('novedades_entidades')
          .select('tipo, entidad_nueva, created_at')
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: false })

        // 2. Obtener caja de compensación por empresa/ciudad
        let cajaAfiliacion = null
        if (contract.empresa_final_id && contract.ciudad_labora) {
          try {
            // Intentar primero como UUID (ciudad_id directo)
            let { data: empresaCaja, error: errCaja1 } = await supabase
              .from('empresa_cajas_compensacion')
              .select(`
                caja_compensacion:cajas_compensacion(nombre)
              `)
              .eq('empresa_id', contract.empresa_final_id)
              .eq('ciudad_id', contract.ciudad_labora)
              .eq('estado', 'activa')
              .single()

            // Si no funciona como UUID, intentar como nombre de ciudad
            if (!empresaCaja && errCaja1) {
              const { data: ciudadData, error: errCiudad } = await supabase
                .from('ciudades')
                .select('id')
                .eq('nombre', contract.ciudad_labora)
                .single()

              if (ciudadData && !errCiudad) {
                const { data: empresaCaja2 } = await supabase
                  .from('empresa_cajas_compensacion')
                  .select(`
                    caja_compensacion:cajas_compensacion(nombre)
                  `)
                  .eq('empresa_id', contract.empresa_final_id)
                  .eq('ciudad_id', ciudadData.id)
                  .eq('estado', 'activa')
                  .single()
                
                empresaCaja = empresaCaja2
              }
            }

            cajaAfiliacion = (empresaCaja?.caja_compensacion as any)?.nombre || null
          } catch (error) {
            console.log('Error obteniendo caja de compensación:', error)
            cajaAfiliacion = null
          }
        }

        // 3. Procesar novedades de entidades (obtener la más reciente de cada tipo)
        const entidadesMap = new Map<string, string>()
        if (novedadesEntidades) {
          novedadesEntidades.forEach(novedad => {
            if (!entidadesMap.has(novedad.tipo)) {
              entidadesMap.set(novedad.tipo, novedad.entidad_nueva)
            }
          })
        }

        // 4. Actualizar estado con datos más recientes
        setAfiliaciones(prev => ({
          ...prev,
          // Entidades con novedades (usar novedad si existe, sino mantener original)
          eps: entidadesMap.get('eps') || prev.eps,
          pension: entidadesMap.get('fondo_pension') || prev.pension,
          cesantias: entidadesMap.get('fondo_cesantias') || prev.cesantias,
          
          // Afiliaciones automáticas
          caja_compensacion: cajaAfiliacion,
          // arl se mantiene como está (del contrato original)
          
          loading: false,
          error: null
        }))

      } catch (error) {
        console.error('Error fetching contract afiliaciones:', error)
        setAfiliaciones(prev => ({
          ...prev,
          loading: false,
          error: 'Error al cargar afiliaciones'
        }))
      }
    }

    fetchAfiliaciones()
  }, [contract.id, contract.empresa_final_id, contract.ciudad_labora, refreshTrigger])

  return afiliaciones
}
