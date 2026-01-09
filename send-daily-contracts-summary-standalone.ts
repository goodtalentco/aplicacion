/**
 * Edge Function para enviar resumen diario de contrataciones pendientes
 * GOOD Talent - 2025
 * VERSIÓN STANDALONE - Para copiar en el editor del Dashboard
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Headers CORS inline (no se pueden usar imports externos en el editor)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface Contract {
  id: string
  primer_nombre: string
  segundo_nombre?: string | null
  primer_apellido: string
  segundo_apellido?: string | null
  numero_identificacion: string
  empresa_final_id?: string | null
  company?: { name: string } | null
  
  // Onboarding fields
  programacion_cita_examenes: boolean
  examenes: boolean
  examenes_fecha?: string | null
  solicitud_inscripcion_arl: boolean
  arl_nombre?: string | null
  arl_fecha_confirmacion?: string | null
  envio_contrato: boolean
  recibido_contrato_firmado: boolean
  contrato_fecha_confirmacion?: string | null
  solicitud_eps: boolean
  radicado_eps?: string | null
  eps_fecha_confirmacion?: string | null
  envio_inscripcion_caja: boolean
  radicado_ccf?: string | null
  caja_fecha_confirmacion?: string | null
  solicitud_cesantias: boolean
  fondo_cesantias?: string | null
  cesantias_fecha_confirmacion?: string | null
  solicitud_fondo_pension: boolean
  fondo_pension?: string | null
  pension_fecha_confirmacion?: string | null
}

interface PendingTask {
  type: string
  label: string
  contracts: Array<{
    nombre_completo: string
    cedula: string
    empresa?: string
  }>
}

serve(async (req: Request) => {
  console.log('🚀 Edge Function: send-daily-contracts-summary iniciada')
  
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validar método HTTP (POST para manual, GET para automático desde cron)
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Método no permitido. Use POST o GET.' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_URL_INTERNAL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables de entorno de Supabase no configuradas')
    }

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY no configurada')
    }

    // Obtener configuración
    console.log('📋 Obteniendo configuración...')
    const configResponse = await fetch(
      `${supabaseUrl}/rest/v1/daily_contracts_summary_config?select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!configResponse.ok) {
      throw new Error(`Error obteniendo configuración: ${configResponse.statusText}`)
    }

    const configs = await configResponse.json()
    const config = configs[0]

    if (!config) {
      throw new Error('No se encontró configuración. Por favor, configúrala en el panel de administración.')
    }

    // Si es GET (automático desde cron), verificar si está habilitado y es día/hora correcta
    if (req.method === 'GET') {
      if (!config.is_enabled) {
        console.log('⏸️ Envío automático deshabilitado')
        return new Response(
          JSON.stringify({ success: false, message: 'Envío automático deshabilitado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verificar día de la semana
      const now = new Date()
      // Ajustar a hora Colombia (UTC-5)
      const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
      const dayOfWeek = colombiaTime.getDay() // 0 = domingo, 1 = lunes, ..., 6 = sábado
      const sendDays: number[] = config.send_days_of_week || []
      
      if (!sendDays.includes(dayOfWeek)) {
        console.log(`⏸️ No es día de envío (hoy es día ${dayOfWeek})`)
        return new Response(
          JSON.stringify({ success: false, message: 'No es día de envío programado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verificar hora (opcional para GET, pero útil para validación)
      const currentTime = colombiaTime.toTimeString().slice(0, 5) // HH:MM
      const sendTime = config.send_time || '08:00'
      
      console.log(`🕐 Hora actual: ${currentTime}, Hora programada: ${sendTime}`)
    }

    // Obtener contratos con pendientes
    console.log('📊 Obteniendo contratos con pendientes...')
    const contractsResponse = await fetch(
      `${supabaseUrl}/rest/v1/contracts?select=id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,numero_identificacion,empresa_final_id,programacion_cita_examenes,examenes,examenes_fecha,solicitud_inscripcion_arl,arl_nombre,arl_fecha_confirmacion,envio_contrato,recibido_contrato_firmado,contrato_fecha_confirmacion,solicitud_eps,radicado_eps,eps_fecha_confirmacion,envio_inscripcion_caja,radicado_ccf,caja_fecha_confirmacion,solicitud_cesantias,fondo_cesantias,cesantias_fecha_confirmacion,solicitud_fondo_pension,fondo_pension,pension_fecha_confirmacion&archived_at=is.null`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!contractsResponse.ok) {
      throw new Error(`Error obteniendo contratos: ${contractsResponse.statusText}`)
    }

    const contracts: Contract[] = await contractsResponse.json()

    // Obtener empresas relacionadas
    const companyIds = Array.from(new Set(contracts.map(c => c.empresa_final_id).filter(Boolean))) as string[]
    const companiesMap: Record<string, { name: string }> = {}
    
    if (companyIds.length > 0) {
      // Construir query con múltiples OR (más compatible que IN con muchos IDs)
      // Para simplificar, obtenemos todas las empresas activas si hay muchas
      const companiesResponse = await fetch(
        `${supabaseUrl}/rest/v1/companies?select=id,name&archived_at=is.null`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (companiesResponse.ok) {
        const allCompanies: Array<{ id: string, name: string }> = await companiesResponse.json()
        allCompanies.forEach(company => {
          if (companyIds.includes(company.id)) {
            companiesMap[company.id] = { name: company.name }
          }
        })
      }
    }

    // Detectar pendientes y agrupar por tipo
    const pendingTasksMap = new Map<string, PendingTask>()

    contracts.forEach(contract => {
      const nombreCompleto = [
        contract.primer_nombre,
        contract.segundo_nombre,
        contract.primer_apellido,
        contract.segundo_apellido
      ].filter(Boolean).join(' ').trim()

      const empresa = contract.empresa_final_id ? (companiesMap[contract.empresa_final_id]?.name || 'Sin empresa') : 'Sin empresa'

      // Programación Cita Exámenes
      if (!contract.programacion_cita_examenes) {
        const key = 'programacion_cita_examenes'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Programación Cita Exámenes',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Exámenes Médicos
      if (contract.programacion_cita_examenes && !contract.examenes) {
        const key = 'examenes'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Exámenes Médicos',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Solicitud Inscripción ARL
      if (!contract.solicitud_inscripcion_arl) {
        const key = 'solicitud_inscripcion_arl'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Solicitud Inscripción ARL',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Confirmación ARL
      if (contract.solicitud_inscripcion_arl && (!contract.arl_nombre || !contract.arl_fecha_confirmacion)) {
        const key = 'confirmacion_arl'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Confirmación Inscripción ARL',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Envío Contrato
      if (!contract.envio_contrato) {
        const key = 'envio_contrato'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Envío de Contrato',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Contrato Firmado
      if (contract.envio_contrato && !contract.recibido_contrato_firmado) {
        const key = 'recibido_contrato_firmado'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Contrato Firmado',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Solicitud EPS
      if (!contract.solicitud_eps) {
        const key = 'solicitud_eps'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Solicitud Inscripción EPS',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Confirmación EPS
      if (contract.solicitud_eps && (!contract.radicado_eps || !contract.eps_fecha_confirmacion)) {
        const key = 'confirmacion_eps'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Confirmación Inscripción EPS',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Envío Inscripción Caja
      if (!contract.envio_inscripcion_caja) {
        const key = 'envio_inscripcion_caja'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Envío Inscripción Caja de Compensación',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Confirmación Caja
      if (contract.envio_inscripcion_caja && (!contract.radicado_ccf || !contract.caja_fecha_confirmacion)) {
        const key = 'confirmacion_caja'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Confirmación Inscripción Caja de Compensación',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Solicitud Cesantías
      if (!contract.solicitud_cesantias) {
        const key = 'solicitud_cesantias'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Solicitud Fondos de Cesantías',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Confirmación Cesantías
      if (contract.solicitud_cesantias && (!contract.fondo_cesantias || !contract.cesantias_fecha_confirmacion)) {
        const key = 'confirmacion_cesantias'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Confirmación Fondos de Cesantías',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Solicitud Pensión
      if (!contract.solicitud_fondo_pension) {
        const key = 'solicitud_fondo_pension'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Solicitud Fondo de Pensión',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }

      // Confirmación Pensión
      if (contract.solicitud_fondo_pension && (!contract.fondo_pension || !contract.pension_fecha_confirmacion)) {
        const key = 'confirmacion_pension'
        if (!pendingTasksMap.has(key)) {
          pendingTasksMap.set(key, {
            type: key,
            label: 'Confirmación Fondo de Pensión',
            contracts: []
          })
        }
        pendingTasksMap.get(key)!.contracts.push({
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa
        })
      }
    })

    const pendingTasks = Array.from(pendingTasksMap.values())

    // Si no hay pendientes, no enviar email
    if (pendingTasks.length === 0) {
      console.log('✅ No hay contrataciones pendientes')
      
      // Actualizar last_executed_at
      await fetch(
        `${supabaseUrl}/rest/v1/daily_contracts_summary_config?id=eq.${config.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            last_executed_at: new Date().toISOString(),
            last_error: null
          })
        }
      )

      return new Response(
        JSON.stringify({ success: true, message: 'No hay contrataciones pendientes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generar HTML del email
    const emailHtml = generateEmailHTML(pendingTasks)

    // Enviar email con Resend
    console.log('📧 Enviando email...')
    const recipientEmails: string[] = config.recipient_emails || []
    
    if (recipientEmails.length === 0) {
      throw new Error('No hay emails destinatarios configurados')
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL') || 'GOOD Talent <noreply@goodtalent.com>',
        to: recipientEmails,
        subject: `Resumen Diario de Contrataciones Pendientes - ${formatDateColombia(new Date().toISOString())}`,
        html: emailHtml
      })
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('❌ Error enviando email:', errorText)
      throw new Error(`Error enviando email: ${resendResponse.statusText}`)
    }

    const resendResult = await resendResponse.json()
    console.log('✅ Email enviado exitosamente:', resendResult.id)

    // Actualizar configuración con último envío
    await fetch(
      `${supabaseUrl}/rest/v1/daily_contracts_summary_config?id=eq.${config.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          last_sent_at: new Date().toISOString(),
          last_executed_at: new Date().toISOString(),
          last_error: null
        })
      }
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Resumen enviado exitosamente',
        emailId: resendResult.id,
        tasksCount: pendingTasks.length,
        totalContracts: pendingTasks.reduce((sum, task) => sum + task.contracts.length, 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Error en Edge Function:', error)
    
    // Intentar actualizar last_error (no crítico si falla)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_URL_INTERNAL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      
      if (supabaseUrl && supabaseServiceKey) {
        const configResponse = await fetch(
          `${supabaseUrl}/rest/v1/daily_contracts_summary_config?select=id&limit=1`,
          {
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (configResponse.ok) {
          const configs = await configResponse.json()
          if (configs[0]) {
            await fetch(
              `${supabaseUrl}/rest/v1/daily_contracts_summary_config?id=eq.${configs[0].id}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  last_executed_at: new Date().toISOString(),
                  last_error: error.message || 'Error desconocido'
                })
              }
            )
          }
        }
      }
    } catch (updateError) {
      console.error('Error actualizando last_error:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error interno del servidor'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Función para formatear fecha en formato colombiano (DD/MM/YYYY)
function formatDateColombia(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Función para generar HTML del email con tablas
function generateEmailHTML(pendingTasks: PendingTask[]): string {
  const fecha = formatDateColombia(new Date().toISOString())
  
  let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumen Diario de Contrataciones Pendientes</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #004C4C;
      border-bottom: 3px solid #87E0E0;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      background-color: #065C5C;
      color: white;
      padding: 12px 20px;
      border-radius: 6px 6px 0 0;
      font-weight: 600;
      margin-bottom: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background-color: white;
      border: 1px solid #e0e0e0;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }
    thead {
      background-color: #f8f9fa;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #004C4C;
      border-bottom: 2px solid #87E0E0;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:hover {
      background-color: #f8f9fa;
    }
    .count {
      display: inline-block;
      background-color: #87E0E0;
      color: #004C4C;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.9em;
      font-weight: 600;
      margin-left: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 0.9em;
      text-align: center;
    }
    .no-pending {
      text-align: center;
      padding: 40px;
      color: #666;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Resumen Diario de Contrataciones Pendientes</h1>
    <p style="color: #666; margin-bottom: 30px;">Fecha: <strong>${fecha}</strong></p>
`

  if (pendingTasks.length === 0) {
    html += `
    <div class="no-pending">
      <p>✅ No hay contrataciones pendientes en este momento.</p>
    </div>
    `
  } else {
    pendingTasks.forEach((task, index) => {
      html += `
    <div class="section">
      <h2 class="section-title">
        📋 ${task.label}
        <span class="count">${task.contracts.length} ${task.contracts.length === 1 ? 'persona' : 'personas'}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 40%;">Nombre Completo</th>
            <th style="width: 20%;">Cédula</th>
            <th style="width: 35%;">Empresa</th>
          </tr>
        </thead>
        <tbody>
`
      task.contracts.forEach((contract, contractIndex) => {
        html += `
          <tr>
            <td>${contractIndex + 1}</td>
            <td>${escapeHtml(contract.nombre_completo)}</td>
            <td>${escapeHtml(contract.cedula)}</td>
            <td>${escapeHtml(contract.empresa || 'Sin empresa')}</td>
          </tr>
`
      })
      
      html += `
        </tbody>
      </table>
    </div>
`
    })
  }

  html += `
    <div class="footer">
      <p>Este es un resumen automático generado por GOOD Talent.</p>
      <p>Si tienes preguntas, contacta al equipo de administración.</p>
    </div>
  </div>
</body>
</html>
`

  return html
}

// Función para escapar HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
