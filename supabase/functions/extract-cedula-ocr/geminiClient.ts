/**
 * Cliente para Google Gemini API
 * Reemplaza GoogleVisionClient + CedulaParser con una solución más simple y efectiva
 */

import { ExtractedFields, FieldConfidence } from './types.ts'

export interface GeminiResponse {
  success: boolean
  fields: ExtractedFields
  confidence: FieldConfidence
  documentType: 'CC' | 'CE' | 'desconocido'
  processingTime: number
}

export class GeminiClient {
  private apiKey: string
  private model: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor() {
    this.apiKey = Deno.env.get('GEMINI_API_KEY') || ''
    this.model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY no configurada')
    }
  }

  /**
   * Procesa múltiples imágenes en una sola llamada a Gemini (MÁS RÁPIDO)
   */
  async processMultipleImages(files: Array<{data: string, type: string, name: string}>): Promise<GeminiResponse> {
    const startTime = Date.now()

    try {
      console.log(`🤖 Procesando ${files.length} imágenes con Gemini 1.5 Flash en una sola llamada...`)
      
      const prompt = this.buildMultiImagePrompt()
      
      // Construir partes del contenido: texto + todas las imágenes
      const parts = [{ text: prompt }]
      
      files.forEach((file, index) => {
        let cleanBase64 = file.data
        if (file.data.includes(',')) {
          cleanBase64 = file.data.split(',')[1]
        }
        
        parts.push({
          inline_data: {
            mime_type: file.type,
            data: cleanBase64
          }
        } as any)
        
        console.log(`📷 Imagen ${index + 1}: ${file.name} (${file.type})`)
      })
      
      const requestBody = {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        }
      }

      console.log('📤 Enviando request con múltiples imágenes a Gemini API...')
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error de Gemini API:', errorText)
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📥 Respuesta de Gemini recibida')
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const geminiText = data.candidates[0].content.parts[0].text
        console.log('📝 Respuesta de Gemini:', geminiText)
        
        // Log de tokens consumidos
        if (data.usageMetadata) {
          console.log('📊 Tokens consumidos:', {
            promptTokens: data.usageMetadata.promptTokenCount,
            candidatesTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount
          })
        }

        const processingTime = Date.now() - startTime
        console.log(`⏱️ Procesamiento completado en ${processingTime}ms`)

        const result = this.parseGeminiResponse(geminiText)
        return {
          ...result,
          processingTime
        }
      } else {
        throw new Error('Respuesta inesperada de Gemini API')
      }

    } catch (error) {
      console.error('❌ Error procesando con Gemini:', error)
      const processingTime = Date.now() - startTime
      
      throw new Error(`Error en Gemini: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Procesa una imagen de cédula y extrae los datos estructurados (MÉTODO LEGACY)
   */
  async processImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<GeminiResponse> {
    const startTime = Date.now()
    
    try {
      console.log('🤖 Procesando imagen con Gemini 1.5 Flash...')
      
      // Limpiar base64 si tiene prefijo
      let cleanBase64 = imageBase64
      if (imageBase64.includes(',')) {
        cleanBase64 = imageBase64.split(',')[1]
      }
      
      const prompt = this.buildPrompt()
      
      const requestBody = {
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        }
      }

      console.log('📤 Enviando request a Gemini API...')
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error de Gemini API:', errorText)
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('📥 Respuesta de Gemini recibida')
      
      // Log de uso de tokens (si está disponible en la respuesta)
      if (result.usageMetadata) {
        console.log('📊 Tokens consumidos:', {
          promptTokens: result.usageMetadata.promptTokenCount || 0,
          candidatesTokens: result.usageMetadata.candidatesTokenCount || 0,
          totalTokens: result.usageMetadata.totalTokenCount || 0
        })
      }
      
      if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Respuesta vacía de Gemini')
      }

      const geminiText = result.candidates[0].content.parts[0].text
      console.log('📝 Respuesta de Gemini:', geminiText)
      
      // Parsear la respuesta JSON de Gemini
      const parsedData = this.parseGeminiResponse(geminiText)
      
      const processingTime = Date.now() - startTime
      console.log(`⏱️ Procesamiento completado en ${processingTime}ms`)
      
      return {
        ...parsedData,
        processingTime
      }

    } catch (error) {
      console.error('❌ Error procesando con Gemini:', error)
      throw new Error(`Error en Gemini: ${error.message}`)
    }
  }

  /**
   * Construye el prompt optimizado para múltiples imágenes
   */
  private buildMultiImagePrompt(): string {
    return `Eres un experto extractor de datos de documentos de identidad colombianos con especialización en OCR de alta precisión. Te voy a enviar múltiples imágenes de cédulas (frente y reverso, o un PDF con múltiples páginas).

ANÁLISIS INICIAL - IDENTIFICA EL DOCUMENTO:
1. Localiza el FRENTE (imagen con foto de la persona)
2. Identifica el tipo: "CÉDULA DE CIUDADANÍA" (CC) o "Cédula de Extranjería" (CE)
3. Determina si es formato antiguo o nuevo (NUIP)

NÚMERO DE DOCUMENTO - INSTRUCCIONES CRÍTICAS DE OCR:

📍 UBICACIÓN ESPECÍFICA:
- Cédulas NUEVAS: Buscar "NUIP" seguido del número (ej: NUIP 2.000.017.701)
- Cédulas ANTIGUAS: Número grande arriba del nombre (ej: 1.020.742.434)
- Extranjería: "No:" seguido del número (ej: No. 379929)

🔍 TÉCNICAS OCR PARA NÚMEROS:
1. SOLO del FRENTE (donde está la foto) - NUNCA del reverso
2. IGNORA códigos de barras, números pequeños (altura: 1.78), fechas
3. Longitud válida: 6-11 dígitos (ej: 51554033, 1020742434, 2000017701)
4. Elimina puntos y espacios: 1.020.742.434 → 1020742434

⚠️ DÍGITOS PROBLEMÁTICOS - VERIFICA CUIDADOSAMENTE:
- 4 vs 1: El 4 tiene líneas más gruesas y ángulos
- 8 vs 6: El 8 tiene dos círculos cerrados completos
- 0 vs O: Los números son más regulares y uniformes
- 5 vs S: El 5 es más angular, la S es más curva
- 2 vs Z: El 2 tiene base horizontal, la Z es más diagonal

✅ VALIDACIÓN DEL NÚMERO:
- Debe contener SOLO dígitos (0-9)
- Longitud entre 6-11 caracteres
- No puede empezar con 0
- Si encuentras letras mezcladas, es incorrecto

NOMBRES Y APELLIDOS:
- Busca etiquetas: "APELLIDOS", "NOMBRES"
- Formato típico: "APELLIDO1 APELLIDO2" en una línea, "NOMBRES" en otra
- Extrae principalmente texto IMPRESO/TIPOGRAFIADO
- Si no hay segundo nombre visible, déjalo como null
- NO inventes nombres que no están claramente escritos

FECHAS - BUSCA CUIDADOSAMENTE:
- Fecha de nacimiento: Busca "Fecha de nacimiento" o similar
- Fecha de expedición: Busca "Fecha de expedición", "Fecha y lugar de expedición", o fechas cerca de firmas/sellos
- Formatos posibles: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, YYYY/MM/DD
- Convierte TODO a formato: YYYY-MM-DD
- Si encuentras múltiples fechas, usa contexto para identificar cuál es cuál

MESES EN ESPAÑOL:
ENE=01, FEB=02, MAR=03, ABR=04, MAY=05, JUN=06, 
JUL=07, AGO=08, SEP=09, OCT=10, NOV=11, DIC=12

PROCESO DE EXTRACCIÓN:
1. Analiza cada imagen cuidadosamente
2. Para el NÚMERO: Examina dígito por dígito, verifica coherencia
3. Para NOMBRES: Solo texto impreso, ignora manuscritos
4. Para FECHAS: Identifica formato y convierte correctamente
5. Asigna confianza basada en claridad visual

Formato de Salida:
Responde ÚNICAMENTE con un JSON válido:
{
  "tipo_documento": "CC|CE|desconocido",
  "numero_cedula": "string con solo números o null",
  "numero_cedula_confianza": 0-100,
  "primer_nombre": "string o null",
  "primer_nombre_confianza": 0-100,
  "segundo_nombre": "string o null",
  "segundo_nombre_confianza": 0-100,
  "primer_apellido": "string o null",
  "primer_apellido_confianza": 0-100,
  "segundo_apellido": "string o null", 
  "segundo_apellido_confianza": 0-100,
  "fecha_nacimiento": "YYYY-MM-DD o null",
  "fecha_nacimiento_confianza": 0-100,
  "fecha_expedicion_documento": "YYYY-MM-DD o null",
  "fecha_expedicion_documento_confianza": 0-100
}

Niveles de confianza (0-100):
- 90-100: Texto completamente claro y validado
- 70-89: Muy probable, pequeñas dudas en 1-2 caracteres
- 50-69: Moderadamente seguro, algunos caracteres ambiguos
- 30-49: Poco seguro, varios caracteres dudosos
- 0-29: Muy incierto, texto borroso o dañado

EJEMPLOS DE NÚMEROS VÁLIDOS:
✅ 51554033 (8 dígitos)
✅ 1020742434 (10 dígitos) 
✅ 2000017701 (10 dígitos)
✅ 379929 (6 dígitos - extranjería)

Si un campo es null, su confianza debe ser 0. Analiza todas las imágenes y combina la información más precisa y confiable. No agregues texto adicional fuera del JSON.`
  }

  /**
   * Construye el prompt optimizado para extracción de datos de cédulas colombianas (MÉTODO LEGACY)
   */
  private buildPrompt(): string {
    return `Eres un experto extractor de datos de documentos de identidad colombianos con especialización en OCR de alta precisión. Analiza cuidadosamente la imagen de la cédula.

ANÁLISIS INICIAL:
1. Identifica si es "CÉDULA DE CIUDADANÍA" (CC) o "Cédula de Extranjería" (CE)
2. Determina si es formato antiguo o nuevo (NUIP)

NÚMERO DE DOCUMENTO - OCR CRÍTICO:

📍 UBICACIÓN ESPECÍFICA:
- Cédulas NUEVAS: Buscar "NUIP" seguido del número (ej: NUIP 2.000.017.701)
- Cédulas ANTIGUAS: Número grande arriba del nombre (ej: 1.020.742.434)
- Extranjería: "No:" seguido del número (ej: No. 379929)

🔍 TÉCNICAS OCR PARA NÚMEROS:
1. Longitud válida: 6-11 dígitos (ej: 51554033, 1020742434, 2000017701)
2. Elimina puntos y espacios: 1.020.742.434 → 1020742434
3. IGNORA números pequeños como altura (1.78), fechas, códigos

⚠️ DÍGITOS PROBLEMÁTICOS - VERIFICA CUIDADOSAMENTE:
- 4 vs 1: El 4 tiene líneas más gruesas y ángulos
- 8 vs 6: El 8 tiene dos círculos cerrados completos
- 0 vs O: Los números son más regulares y uniformes
- 5 vs S: El 5 es más angular, la S es más curva
- 2 vs Z: El 2 tiene base horizontal, la Z es más diagonal

✅ VALIDACIÓN DEL NÚMERO:
- Debe contener SOLO dígitos (0-9)
- Longitud entre 6-11 caracteres
- No puede empezar con 0
- Si encuentras letras mezcladas, es incorrecto

NOMBRES Y APELLIDOS:
- Busca etiquetas: "APELLIDOS", "NOMBRES"
- Formato típico: "APELLIDO1 APELLIDO2" en una línea, "NOMBRES" en otra
- Extrae principalmente texto IMPRESO/TIPOGRAFIADO
- Si no hay segundo nombre visible, déjalo como null
- NO inventes nombres que no están claramente escritos

FECHAS - BUSCA CUIDADOSAMENTE:
- Fecha de nacimiento: Busca "Fecha de nacimiento" o similar
- Fecha de expedición: Busca "Fecha de expedición", "Fecha y lugar de expedición", o fechas cerca de firmas/sellos
- Formatos posibles: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, YYYY/MM/DD
- Convierte TODO a formato: YYYY-MM-DD
- Si encuentras múltiples fechas, usa contexto para identificar cuál es cuál

MESES EN ESPAÑOL:
ENE=01, FEB=02, MAR=03, ABR=04, MAY=05, JUN=06, 
JUL=07, AGO=08, SEP=09, OCT=10, NOV=11, DIC=12

PROCESO DE EXTRACCIÓN:
1. Para el NÚMERO: Examina dígito por dígito, verifica coherencia
2. Para NOMBRES: Solo texto impreso, ignora manuscritos
3. Para FECHAS: Identifica formato y convierte correctamente
4. Asigna confianza basada en claridad visual

Formato de Salida:
Responde ÚNICAMENTE con un JSON válido:
{
  "tipo_documento": "CC|CE|desconocido",
  "numero_cedula": "string con solo números o null",
  "numero_cedula_confianza": 0-100,
  "primer_nombre": "string o null",
  "primer_nombre_confianza": 0-100,
  "segundo_nombre": "string o null",
  "segundo_nombre_confianza": 0-100,
  "primer_apellido": "string o null",
  "primer_apellido_confianza": 0-100,
  "segundo_apellido": "string o null", 
  "segundo_apellido_confianza": 0-100,
  "fecha_nacimiento": "YYYY-MM-DD o null",
  "fecha_nacimiento_confianza": 0-100,
  "fecha_expedicion_documento": "YYYY-MM-DD o null",
  "fecha_expedicion_documento_confianza": 0-100
}

Niveles de confianza (0-100):
- 90-100: Texto completamente claro y validado
- 70-89: Muy probable, pequeñas dudas en 1-2 caracteres
- 50-69: Moderadamente seguro, algunos caracteres ambiguos
- 30-49: Poco seguro, varios caracteres dudosos
- 0-29: Muy incierto, texto borroso o dañado

EJEMPLOS DE NÚMEROS VÁLIDOS:
✅ 51554033 (8 dígitos)
✅ 1020742434 (10 dígitos) 
✅ 2000017701 (10 dígitos)
✅ 379929 (6 dígitos - extranjería)

Si un campo es null, su confianza debe ser 0. No agregues texto adicional fuera del JSON.`
  }

  /**
   * Parsea la respuesta JSON de Gemini y la convierte al formato esperado
   */
  private parseGeminiResponse(geminiText: string): Omit<GeminiResponse, 'processingTime'> {
    try {
      // Limpiar la respuesta para extraer solo el JSON
      let jsonText = geminiText.trim()
      
      // Remover markdown si existe
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      // Buscar el JSON en la respuesta
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }
      
      console.log('🔍 Parseando JSON:', jsonText)
      const parsed = JSON.parse(jsonText)
      
      // Mapear a nuestro formato con capitalización de nombres
      const fields: ExtractedFields = {
        numero_cedula: parsed.numero_cedula || null,
        primer_nombre: this.capitalizeText(parsed.primer_nombre) || null,
        segundo_nombre: this.capitalizeText(parsed.segundo_nombre) || null,
        primer_apellido: this.capitalizeText(parsed.primer_apellido) || null,
        segundo_apellido: this.capitalizeText(parsed.segundo_apellido) || null,
        fecha_nacimiento: parsed.fecha_nacimiento || null,
        fecha_expedicion_documento: parsed.fecha_expedicion_documento || null
      }
      
      // Mapear confianzas numéricas (0-100) a nuestro formato de texto
      const confidence: FieldConfidence = {
        numero_cedula: this.mapNumericConfidence(parsed.numero_cedula_confianza || 0),
        primer_nombre: this.mapNumericConfidence(parsed.primer_nombre_confianza || 0),
        segundo_nombre: this.mapNumericConfidence(parsed.segundo_nombre_confianza || 0),
        primer_apellido: this.mapNumericConfidence(parsed.primer_apellido_confianza || 0),
        segundo_apellido: this.mapNumericConfidence(parsed.segundo_apellido_confianza || 0),
        fecha_nacimiento: this.mapNumericConfidence(parsed.fecha_nacimiento_confianza || 0),
        fecha_expedicion_documento: this.mapNumericConfidence(parsed.fecha_expedicion_documento_confianza || 0)
      }
      
      // También guardamos las confianzas numéricas para comparación
      const numericConfidence = {
        numero_cedula: parsed.numero_cedula_confianza || 0,
        primer_nombre: parsed.primer_nombre_confianza || 0,
        segundo_nombre: parsed.segundo_nombre_confianza || 0,
        primer_apellido: parsed.primer_apellido_confianza || 0,
        segundo_apellido: parsed.segundo_apellido_confianza || 0,
        fecha_nacimiento: parsed.fecha_nacimiento_confianza || 0,
        fecha_expedicion_documento: parsed.fecha_expedicion_documento_confianza || 0
      }
      
      const documentType = parsed.tipo_documento === 'CC' ? 'CC' : 
                          parsed.tipo_documento === 'CE' ? 'CE' : 'desconocido'
      
      console.log('✅ Datos parseados exitosamente:', {
        documentType,
        fieldsFound: Object.values(fields).filter(v => v !== null).length
      })
      
      return {
        success: true,
        fields,
        confidence,
        documentType,
        numericConfidence // Incluir para comparación precisa
      }
      
    } catch (error) {
      console.error('❌ Error parseando respuesta de Gemini:', error)
      console.error('📄 Texto original:', geminiText)
      
      // Respuesta de fallback
      return {
        success: false,
        fields: {
          numero_cedula: null,
          primer_nombre: null,
          segundo_nombre: null,
          primer_apellido: null,
          segundo_apellido: null,
          fecha_nacimiento: null,
          fecha_expedicion_documento: null
        },
        confidence: {
          numero_cedula: 'bajo',
          primer_nombre: 'bajo',
          segundo_nombre: 'bajo',
          primer_apellido: 'bajo',
          segundo_apellido: 'bajo',
          fecha_nacimiento: 'bajo',
          fecha_expedicion_documento: 'bajo'
        },
        documentType: 'desconocido'
      }
    }
  }

  /**
   * Mapea la confianza numérica (0-100) a nuestro sistema de texto
   */
  private mapNumericConfidence(numericConfidence: number): 'alto' | 'medio' | 'bajo' {
    if (numericConfidence >= 70) return 'alto'
    if (numericConfidence >= 40) return 'medio'
    return 'bajo'
  }

  /**
   * Capitaliza texto: primera letra mayúscula, resto minúsculas
   */
  private capitalizeText(text: string | null): string | null {
    if (!text) return null
    return text.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
  }

  /**
   * Verifica si un campo es de nombre/apellido para aplicar capitalización
   */
  private isNameField(field: string): boolean {
    return ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido'].includes(field)
  }

  /**
   * Mapea la confianza de Gemini a nuestro sistema (legacy)
   */
  private mapConfidence(geminiConfidence: string): 'alto' | 'medio' | 'bajo' {
    switch (geminiConfidence.toLowerCase()) {
      case 'alta': return 'alto'
      case 'media': return 'medio'
      case 'baja': return 'bajo'
      default: return 'medio'
    }
  }

  /**
   * Combinación SIMPLE y RÁPIDA para 2 imágenes
   * Si campo es null → usar el otro. Si ambos tienen datos → usar el de mayor confianza
   */
  combineResultsSimple(results: any[]): Omit<GeminiResponse, 'processingTime'> {
    console.log(`⚡ Combinación rápida de ${results.length} resultados...`)
    
    if (results.length === 1) return results[0]
    
    const result1 = results[0]
    const result2 = results[1]
    
    const combinedFields: ExtractedFields = {
      numero_cedula: null,
      primer_nombre: null,
      segundo_nombre: null,
      primer_apellido: null,
      segundo_apellido: null,
      fecha_nacimiento: null,
      fecha_expedicion_documento: null
    }

    const combinedConfidence: FieldConfidence = {
      numero_cedula: 'bajo',
      primer_nombre: 'bajo',
      segundo_nombre: 'bajo',
      primer_apellido: 'bajo',
      segundo_apellido: 'bajo',
      fecha_nacimiento: 'bajo',
      fecha_expedicion_documento: 'bajo'
    }
    
    // Para cada campo: si uno es null, usar el otro. Si ambos tienen datos, usar el de mayor confianza
    const fieldNames = Object.keys(combinedFields) as (keyof ExtractedFields)[]
    
    for (const field of fieldNames) {
      const value1 = result1.fields[field]
      const value2 = result2.fields[field]
      const numConf1 = result1.numericConfidence?.[field] || 0
      const numConf2 = result2.numericConfidence?.[field] || 0
      
      if (!value1 && value2) {
        // Solo el segundo tiene datos
        const finalValue = this.isNameField(field) ? this.capitalizeText(value2) : value2
        combinedFields[field] = finalValue
        combinedConfidence[field] = result2.confidence[field]
        console.log(`✅ Campo ${field}: "${finalValue}" (${numConf2}%) - solo imagen 2 tenía datos`)
      } else if (value1 && !value2) {
        // Solo el primero tiene datos
        const finalValue = this.isNameField(field) ? this.capitalizeText(value1) : value1
        combinedFields[field] = finalValue
        combinedConfidence[field] = result1.confidence[field]
        console.log(`✅ Campo ${field}: "${finalValue}" (${numConf1}%) - solo imagen 1 tenía datos`)
      } else if (value1 && value2) {
        // Ambos tienen datos: usar el de mayor confianza numérica (SIN AMBIGÜEDAD)
        if (numConf1 > numConf2) {
          const finalValue = this.isNameField(field) ? this.capitalizeText(value1) : value1
          combinedFields[field] = finalValue
          combinedConfidence[field] = result1.confidence[field]
          console.log(`✅ Campo ${field}: "${finalValue}" (${numConf1}%) vs "${value2}" (${numConf2}%) - ganó imagen 1`)
        } else if (numConf2 > numConf1) {
          const finalValue = this.isNameField(field) ? this.capitalizeText(value2) : value2
          combinedFields[field] = finalValue
          combinedConfidence[field] = result2.confidence[field]
          console.log(`✅ Campo ${field}: "${finalValue}" (${numConf2}%) vs "${value1}" (${numConf1}%) - ganó imagen 2`)
        } else {
          // Empate real (muy raro) - usar el primero
          const finalValue = this.isNameField(field) ? this.capitalizeText(value1) : value1
          combinedFields[field] = finalValue
          combinedConfidence[field] = result1.confidence[field]
          console.log(`⚖️ Campo ${field}: empate ${numConf1}% - usando imagen 1 por defecto`)
        }
      }
      // Si ambos son null, queda null
    }
    
    // Tipo de documento: preferir CC sobre CE
    let documentType = result1.documentType
    if (result2.documentType === 'CC' && result1.documentType !== 'CC') {
      documentType = result2.documentType
    }
    
    console.log(`⚡ Combinación completada en una pasada simple`)
    
    return {
      success: true,
      fields: combinedFields,
      confidence: combinedConfidence,
      documentType: documentType as 'CC' | 'CE' | 'desconocido'
    }
  }

  /**
   * Combina resultados de múltiples imágenes de forma inteligente
   * NUNCA pierde datos - siempre elige el mejor valor para cada campo
   */
  combineResults(results: any[]): Omit<GeminiResponse, 'processingTime'> {
    console.log(`🔄 Combinando ${results.length} resultados de forma inteligente...`)
    
    const combinedFields: ExtractedFields = {
      numero_cedula: null,
      primer_nombre: null,
      segundo_nombre: null,
      primer_apellido: null,
      segundo_apellido: null,
      fecha_nacimiento: null,
      fecha_expedicion_documento: null
    }

    const combinedConfidence: FieldConfidence = {
      numero_cedula: 'bajo',
      primer_nombre: 'bajo',
      segundo_nombre: 'bajo',
      primer_apellido: 'bajo',
      segundo_apellido: 'bajo',
      fecha_nacimiento: 'bajo',
      fecha_expedicion_documento: 'bajo'
    }

    let bestDocumentType = 'desconocido'
    
    // Para cada campo, elegir el mejor valor de TODOS los resultados
    const fieldNames = Object.keys(combinedFields) as (keyof ExtractedFields)[]
    
    for (const fieldName of fieldNames) {
      let bestValue = null
      let bestConfidence: 'alto' | 'medio' | 'bajo' = 'bajo'
      let bestSource = ''
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const value = result.fields[fieldName]
        const confidence = result.confidence[fieldName]
        
        if (value && value !== null && value.toString().trim() !== '') {
          const confidenceScore = confidence === 'alto' ? 3 : confidence === 'medio' ? 2 : 1
          const currentScore = bestConfidence === 'alto' ? 3 : bestConfidence === 'medio' ? 2 : 1
          
          // Criterios de selección (en orden de prioridad):
          // 1. Mayor confianza
          // 2. Si misma confianza, valor más largo/completo
          // 3. Si todo igual, preferir el primer resultado
          const isBetter = confidenceScore > currentScore || 
                          (confidenceScore === currentScore && bestValue && typeof value === 'string' && typeof bestValue === 'string' && value.length > bestValue.length) ||
                          (confidenceScore === currentScore && !bestValue)
          
          if (isBetter) {
            bestValue = value
            bestConfidence = confidence
            bestSource = `archivo ${i + 1}`
            
            console.log(`✅ Campo ${fieldName}: "${value}" (${confidence}) desde ${bestSource}`)
          }
        }
      }
      
      combinedFields[fieldName] = bestValue
      combinedConfidence[fieldName] = bestValue ? bestConfidence : 'bajo'
    }
    
    // Determinar el mejor tipo de documento (priorizar CC sobre CE)
    const documentTypes = results.map(r => r.documentType).filter(t => t !== 'desconocido')
    if (documentTypes.includes('CC')) {
      bestDocumentType = 'CC'
    } else if (documentTypes.includes('CE')) {
      bestDocumentType = 'CE'
    } else if (documentTypes.length > 0) {
      bestDocumentType = documentTypes[0]
    }
    
    const finalFieldsCount = Object.values(combinedFields).filter(v => v !== null).length
    console.log(`🎯 Combinación completada: ${finalFieldsCount} campos extraídos de ${results.length} imágenes`)
    
    return {
      success: true,
      fields: combinedFields,
      confidence: combinedConfidence,
      documentType: bestDocumentType as 'CC' | 'CE' | 'desconocido'
    }
  }
}
