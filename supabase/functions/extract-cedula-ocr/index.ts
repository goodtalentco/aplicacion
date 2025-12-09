/**
 * Edge Function para extracción de datos de cédulas colombianas
 * Integra Gemini 1.5 Flash para OCR inteligente
 * GOOD Talent - 2025
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { GeminiClient } from './geminiClient.ts'
import { OCRRequest, OCRResponse } from './types.ts'

serve(async (req: Request) => {
  console.log('🚀 Edge Function iniciada')
  console.log('📝 Método HTTP:', req.method)
  console.log('🌐 Headers:', Object.fromEntries(req.headers.entries()))
  
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondiendo a CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Método no permitido. Use POST.' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const startTime = Date.now()
    console.log('⏱️ Tiempo de inicio:', startTime)
    
    // Verificar variables de entorno
    console.log('🔐 Verificando variables de entorno...')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const geminiModel = Deno.env.get('GEMINI_MODEL')
    console.log('📋 GEMINI_API_KEY:', geminiApiKey ? '✅ Configurado' : '❌ Falta')
    console.log('🔑 GEMINI_MODEL:', geminiModel || 'gemini-1.5-flash (default)')
    
    // Parsear request
    let requestData: OCRRequest
    try {
      console.log('📦 Parseando request JSON...')
      requestData = await req.json()
      console.log('📊 Datos recibidos:', {
        filesCount: requestData.files?.length || 0,
        files: requestData.files?.map(f => ({
          name: f.name,
          type: f.type,
          size: f.data?.length || 0
        })) || []
      })
    } catch (error) {
      console.error('❌ Error parseando JSON:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'JSON inválido en el request' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar archivos
    if (!requestData.files || !Array.isArray(requestData.files) || requestData.files.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No se enviaron archivos para procesar' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (requestData.files.length > 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Máximo 2 archivos permitidos (frente y dorso)' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar tamaño y tipo de archivos
    for (const file of requestData.files) {
      if (!file.data || !file.type) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Archivo incompleto (falta data o type)' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validar tipo MIME
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Tipo de archivo no permitido: ${file.type}. Permitidos: JPG, PNG, PDF` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validar tamaño (aproximado desde base64)
      const sizeInBytes = (file.data.length * 3) / 4
      const maxSize = 15 * 1024 * 1024 // 15MB
      if (sizeInBytes > maxSize) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Archivo muy grande. Máximo 15MB por archivo.` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Inicializar cliente Gemini
    console.log('🔧 Inicializando Gemini client...')
    try {
      console.log('🤖 Creando GeminiClient...')
      const geminiClient = new GeminiClient()
      console.log('✅ GeminiClient creado exitosamente')

      // Procesar archivos con Gemini
      console.log('📁 Iniciando procesamiento con Gemini...')
      console.log(`📊 Total de archivos recibidos: ${requestData.files.length}`)
      
      let finalResult: any

      if (requestData.files.length === 1) {
        // Una sola imagen: usar método legacy (rápido y probado)
        const file = requestData.files[0]
        console.log(`📄 Procesando archivo único: ${file.name}`)
        
        const geminiResult = await geminiClient.processImage(file.data, file.type)
        
        console.log(`📊 Resultado:`, {
          success: geminiResult.success,
          documentType: geminiResult.documentType,
          fieldsFound: Object.values(geminiResult.fields).filter(v => v !== null).length
        })
        
        if (!geminiResult.success) {
          throw new Error('No se pudo procesar la imagen correctamente')
        }
        
        finalResult = geminiResult
        console.log('✅ Archivo único procesado exitosamente')
        
      } else {
        // Múltiples imágenes: usar nueva función optimizada (UNA SOLA LLAMADA)
        console.log(`🚀 Procesando ${requestData.files.length} imágenes en una sola llamada a Gemini...`)
        
        const geminiResult = await geminiClient.processMultipleImages(requestData.files)
        
        console.log(`📊 Resultado combinado:`, {
          success: geminiResult.success,
          documentType: geminiResult.documentType,
          fieldsFound: Object.values(geminiResult.fields).filter(v => v !== null).length
        })
        
        if (!geminiResult.success) {
          throw new Error('No se pudo procesar las imágenes correctamente')
        }
        
        finalResult = geminiResult
        console.log('✅ Múltiples imágenes procesadas exitosamente en una llamada')
      }

      const totalProcessingTime = Date.now() - startTime
      console.log('⏱️ Tiempo total de procesamiento:', totalProcessingTime, 'ms')

      // Construir respuesta en formato compatible
      console.log('📤 Construyendo respuesta final...')
      const response: OCRResponse = {
        success: true,
        fields: {
          ...finalResult.fields,
          tipo_identificacion: finalResult.documentType  // Agregar el tipo de documento
        },
        confidence: {
          ...finalResult.confidence,
          tipo_identificacion: 'alto'  // Gemini es muy bueno identificando tipo de documento
        },
        numericConfidence: finalResult.numericConfidence ? {
          ...finalResult.numericConfidence,
          tipo_identificacion: 95  // Alto porcentaje para tipo de documento
        } : undefined,
        debug: {
          detectedText: `Procesado con Gemini 1.5 Flash - ${requestData.files.length} archivo(s) - Tipo: ${finalResult.documentType}`,
          processingTime: totalProcessingTime,
          documentType: finalResult.documentType === 'CC' ? 'frente' : 
                       finalResult.documentType === 'CE' ? 'frente' : 'desconocido',
          filesProcessed: requestData.files.length,
          combinedResults: requestData.files.length > 1
        }
      }

      console.log('✅ Respuesta construida exitosamente')
      console.log('📊 Campos extraídos:', Object.entries(finalResult.fields)
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => `${key}: ${value}`)
      )

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (serviceError) {
      console.error('❌ Error en Gemini:', serviceError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error en Gemini: ${serviceError.message}`,
          details: serviceError.stack
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('💥 Error general en Edge Function:', error)
    console.error('📋 Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error interno del servidor: ${error.message}`,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* 
Ejemplo de uso desde el frontend:

const formData = {
  files: [
    {
      name: "cedula_frente.jpg",
      data: "base64string...",
      type: "image/jpeg"
    }
  ]
}

const response = await fetch('/functions/v1/extract-cedula-ocr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
})

const result = await response.json()
// result.fields contiene los datos extraídos por Gemini
// result.confidence contiene los niveles de confianza
// Gemini detecta automáticamente si es CC o CE
*/
