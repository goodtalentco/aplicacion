/**
 * Edge Function para notificar vencimientos de contratos
 * GOOD Talent - 2025
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Contract {
  id: string
  primer_nombre: string
  segundo_nombre?: string | null
  primer_apellido: string
  segundo_apellido?: string | null
  numero_identificacion: string
  empresa_final_id?: string | null
  company?: { name: string } | null
  fecha_fin: string | null
  status_aprobacion: string
  archived_at: string | null
}

interface ExpiringContract {
  contract_id: string
  nombre_completo: string
  cedula: string
  empresa?: string
  fecha_vencimiento: string
  dias_restantes: number
}

serve(async (req: Request) => {
  console.log('🚀 Edge Function: notify-contract-expirations iniciada')
  
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables de entorno de Supabase no configuradas')
    }

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY no configurada')
    }

    // Crear cliente de Supabase con Service Role Key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Obtener configuración
    console.log('📋 Obteniendo configuración...')
    const { data: configs, error: configError } = await supabase
      .from('contract_expiration_notifications_config')
      .select('*')
      .limit(1)

    if (configError) {
      throw new Error(`Error obteniendo configuración: ${configError.message}`)
    }

    const config = configs?.[0]

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
      const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
      const dayOfWeek = colombiaTime.getDay()
      const sendDays: number[] = config.send_days_of_week || []
      
      if (!sendDays.includes(dayOfWeek)) {
        console.log(`⏸️ No es día de envío (hoy es día ${dayOfWeek})`)
        return new Response(
          JSON.stringify({ success: false, message: 'No es día de envío programado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const currentTime = colombiaTime.toTimeString().slice(0, 5)
      const sendTime = config.send_time || '08:00'
      
      console.log(`🕐 Hora actual: ${currentTime}, Hora programada: ${sendTime}`)
    }

    // Obtener días antes del vencimiento configurados
    const daysBeforeExpiration: number[] = config.days_before_expiration || [14]
    
    // Obtener contratos que vencen en los días configurados
    console.log('📊 Obteniendo contratos próximos a vencer...')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiringContractsMap = new Map<string, ExpiringContract[]>()
    
    // Para cada día configurado, buscar contratos que vencen en ese día
    for (const daysBefore of daysBeforeExpiration) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + daysBefore)
      targetDate.setHours(23, 59, 59, 999)
      
      const targetDateStr = targetDate.toISOString().split('T')[0]
      
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,numero_identificacion,empresa_final_id,fecha_fin,status_aprobacion,archived_at')
        .eq('fecha_fin', targetDateStr)
        .eq('status_aprobacion', 'aprobado')
        .is('archived_at', null)
        .not('fecha_fin', 'is', null)

      if (contractsError) {
        console.error(`Error obteniendo contratos para ${daysBefore} días:`, contractsError)
        continue
      }

      if (!contracts || contracts.length === 0) {
        continue
      }

      // Obtener empresas relacionadas
      const companyIds = Array.from(new Set((contracts || []).map(c => c.empresa_final_id).filter(Boolean))) as string[]
      const companiesMap: Record<string, { name: string }> = {}
      
      if (companyIds.length > 0) {
        const { data: allCompanies, error: companiesError } = await supabase
          .from('companies')
          .select('id,name')
          .is('archived_at', null)
        
        if (!companiesError && allCompanies) {
          allCompanies.forEach(company => {
            if (companyIds.includes(company.id)) {
              companiesMap[company.id] = { name: company.name }
            }
          })
        }
      }

      // Procesar contratos y verificar si ya se notificó
      const contractsToNotify: ExpiringContract[] = []
      
      for (const contract of contracts) {
        // Verificar si ya se envió notificación para este contrato en este día
        const { data: existingNotification } = await supabase
          .from('contract_expiration_notifications')
          .select('id')
          .eq('contract_id', contract.id)
          .eq('days_before_expiration', daysBefore)
          .gte('sent_at', new Date(today.setHours(0, 0, 0, 0)).toISOString())
          .limit(1)

        if (existingNotification && existingNotification.length > 0) {
          console.log(`⏭️ Ya se notificó el contrato ${contract.id} para ${daysBefore} días antes`)
          continue
        }

        const nombreCompleto = [
          contract.primer_nombre,
          contract.segundo_nombre,
          contract.primer_apellido,
          contract.segundo_apellido
        ].filter(Boolean).join(' ').trim()

        const empresa = contract.empresa_final_id ? (companiesMap[contract.empresa_final_id]?.name || 'Sin empresa') : 'Sin empresa'

        contractsToNotify.push({
          contract_id: contract.id,
          nombre_completo: nombreCompleto,
          cedula: contract.numero_identificacion,
          empresa,
          fecha_vencimiento: contract.fecha_fin!,
          dias_restantes: daysBefore
        })
      }

      if (contractsToNotify.length > 0) {
        expiringContractsMap.set(daysBefore.toString(), contractsToNotify)
      }
    }

    // Si no hay contratos próximos a vencer, no enviar email
    if (expiringContractsMap.size === 0) {
      console.log('✅ No hay contratos próximos a vencer')
      
      // Actualizar last_executed_at
      await supabase
        .from('contract_expiration_notifications_config')
        .update({
          last_executed_at: new Date().toISOString(),
          last_error: null
        })
        .eq('id', config.id)

      return new Response(
        JSON.stringify({ success: true, message: 'No hay contratos próximos a vencer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generar HTML del email
    const emailHtml = generateEmailHTML(expiringContractsMap)

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
        subject: `Notificación de Vencimiento de Contratos - ${formatDateColombia(new Date().toISOString())}`,
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

    // Registrar notificaciones enviadas en la base de datos
    const notificationsToInsert: Array<{
      contract_id: string
      days_before_expiration: number
      expiration_date: string
      recipient_email: string
    }> = []

    for (const [daysBefore, contracts] of expiringContractsMap.entries()) {
      for (const contract of contracts) {
        for (const email of recipientEmails) {
          notificationsToInsert.push({
            contract_id: contract.contract_id,
            days_before_expiration: parseInt(daysBefore),
            expiration_date: contract.fecha_vencimiento,
            recipient_email: email
          })
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('contract_expiration_notifications')
        .insert(notificationsToInsert)

      if (insertError) {
        console.error('⚠️ Error registrando notificaciones:', insertError)
        // No fallar si solo falla el registro
      }
    }

    // Actualizar configuración con último envío
    await supabase
      .from('contract_expiration_notifications_config')
      .update({
        last_sent_at: new Date().toISOString(),
        last_executed_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', config.id)

    const totalContracts = Array.from(expiringContractsMap.values()).reduce((sum, contracts) => sum + contracts.length, 0)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notificaciones enviadas exitosamente',
        emailId: resendResult.id,
        totalContracts,
        daysBefore: Array.from(expiringContractsMap.keys())
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('💥 Error en Edge Function:', error)
    
    // Intentar actualizar last_error (no crítico si falla)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      
      if (supabaseUrl && supabaseServiceKey) {
        const errorSupabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
        
        const { data: configs } = await errorSupabase
          .from('contract_expiration_notifications_config')
          .select('id')
          .limit(1)
        
        if (configs && configs[0]) {
          await errorSupabase
            .from('contract_expiration_notifications_config')
            .update({
              last_executed_at: new Date().toISOString(),
              last_error: error.message || 'Error desconocido'
            })
            .eq('id', configs[0].id)
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

// Función para generar HTML del email
function generateEmailHTML(expiringContractsMap: Map<string, ExpiringContract[]>): string {
  const fecha = formatDateColombia(new Date().toISOString())
  
  let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación de Vencimiento de Contratos</title>
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
    .warning {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ Notificación de Vencimiento de Contratos</h1>
    <p style="color: #666; margin-bottom: 30px;">Fecha: <strong>${fecha}</strong></p>
    
    <div class="warning">
      <strong>⚠️ Atención:</strong> Los siguientes contratos están próximos a vencer. Por favor, revisa y toma las acciones necesarias.
    </div>
`

  // Ordenar por días antes del vencimiento (mayor a menor)
  const sortedDays = Array.from(expiringContractsMap.keys()).sort((a, b) => parseInt(b) - parseInt(a))

  sortedDays.forEach((daysBefore) => {
    const contracts = expiringContractsMap.get(daysBefore) || []
    const days = parseInt(daysBefore)
    
    html += `
    <div class="section">
      <h2 class="section-title">
        ⏰ Contratos que vencen en ${days} ${days === 1 ? 'día' : 'días'}
        <span class="count">${contracts.length} ${contracts.length === 1 ? 'contrato' : 'contratos'}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 35%;">Nombre Completo</th>
            <th style="width: 20%;">Cédula</th>
            <th style="width: 25%;">Empresa</th>
            <th style="width: 15%;">Fecha Vencimiento</th>
          </tr>
        </thead>
        <tbody>
`
    contracts.forEach((contract, index) => {
      html += `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(contract.nombre_completo)}</td>
            <td>${escapeHtml(contract.cedula)}</td>
            <td>${escapeHtml(contract.empresa || 'Sin empresa')}</td>
            <td>${formatDateColombia(contract.fecha_vencimiento)}</td>
          </tr>
`
    })
    
    html += `
        </tbody>
      </table>
    </div>
`
  })

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
