/**
 * Componente que renderiza una fila de contrato con datos actualizados
 * incluyendo las novedades más recientes
 */

import { Contract } from '../../types/contract'
import { useContractCurrentData } from '../../hooks/useContractCurrentData'

interface ContractRowWithCurrentDataProps {
  contract: Contract
  refreshTrigger?: number
  children: (currentData: {
    fullName: string
    celular: string | null
    email: string | null
    cargo: string | null
    ciudad_labora_actual: string | null
    salario: number | null
    auxilio_salarial_actual: number | null
    auxilio_no_salarial_actual: number | null
    auxilio_transporte_actual: number | null
    auxilio_salarial_concepto_actual: string | null
    auxilio_no_salarial_concepto_actual: string | null
    aporta_sena_actual: boolean
    fecha_fin_actual: string | null
    beneficiario_hijo_actual: number | null
    beneficiario_madre_actual: number | null
    beneficiario_padre_actual: number | null
    beneficiario_conyuge_actual: number | null
    is_terminated: boolean
    fecha_terminacion: string | null
    tipo_terminacion: string | null
    loading: boolean
  }) => React.ReactNode
}

export const ContractRowWithCurrentData: React.FC<ContractRowWithCurrentDataProps> = ({
  contract,
  refreshTrigger,
  children
}) => {
  const currentData = useContractCurrentData(contract, refreshTrigger)

  // Construir nombre completo con datos actualizados
  const fullName = `${currentData.primer_nombre}${
    currentData.segundo_nombre ? ` ${currentData.segundo_nombre}` : ''
  } ${currentData.primer_apellido}${
    currentData.segundo_apellido ? ` ${currentData.segundo_apellido}` : ''
  }`

  return (
    <>
      {children({
        fullName,
        celular: currentData.celular,
        email: currentData.email,
        cargo: currentData.cargo_actual,
        ciudad_labora_actual: currentData.ciudad_labora_actual,
        salario: currentData.salario_actual,
        auxilio_salarial_actual: currentData.auxilio_salarial_actual,
        auxilio_no_salarial_actual: currentData.auxilio_no_salarial_actual,
        auxilio_transporte_actual: currentData.auxilio_transporte_actual,
        auxilio_salarial_concepto_actual: currentData.auxilio_salarial_concepto_actual,
        auxilio_no_salarial_concepto_actual: currentData.auxilio_no_salarial_concepto_actual,
        aporta_sena_actual: currentData.aporta_sena_actual,
        fecha_fin_actual: currentData.fecha_fin_actual,
        beneficiario_hijo_actual: currentData.beneficiario_hijo_actual,
        beneficiario_madre_actual: currentData.beneficiario_madre_actual,
        beneficiario_padre_actual: currentData.beneficiario_padre_actual,
        beneficiario_conyuge_actual: currentData.beneficiario_conyuge_actual,
        is_terminated: currentData.is_terminated,
        fecha_terminacion: currentData.fecha_terminacion,
        tipo_terminacion: currentData.tipo_terminacion,
        loading: currentData.loading
      })}
    </>
  )
}
