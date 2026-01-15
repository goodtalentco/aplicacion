# 📋 Cómo Autorizar (Aprobar) Contratos

## ✅ El Sistema de Aprobación Existe

El botón de aprobación **SÍ está implementado** en el código. Aparece automáticamente cuando se cumplen ciertas condiciones.

## 📍 Dónde Aparece el Botón

El botón **"Aprobar"** aparece en la **tabla de contratos** (`/dashboard/contratos`):

1. **En la columna de acciones** (primera columna de la tabla)
2. **Solo para contratos en estado "Borrador"**
3. Es un **botón verde** con el texto "Aprobar" y un ícono de check (✓)

## 🔍 Condiciones para Ver el Botón

El botón aparece cuando:
- ✅ El contrato tiene `status_aprobacion = 'borrador'`
- ✅ La función `onApprove` está configurada (ya lo está)

## 📝 Estados de los Contratos

Los contratos pueden tener dos estados de aprobación:
- **`borrador`**: Contrato nuevo o en edición, puede ser aprobado → **MUESTRA EL BOTÓN**
- **`aprobado`**: Contrato ya aprobado → **NO MUESTRA EL BOTÓN** (muestra "Aprobado" en texto)

## ⚠️ ¿Por Qué No Veo el Botón?

Si no ves el botón de aprobación, es porque:

1. **Todos tus contratos ya están aprobados**: 
   - Si los contratos fueron creados antes de implementar el sistema de aprobación, tienen `status_aprobacion = null`
   - El código trata `null` como `'aprobado'` por defecto
   - Por lo tanto, no muestra el botón

2. **Los contratos nuevos SÍ deberían tener el botón**:
   - Los contratos nuevos se crean con `status_aprobacion = 'borrador'`
   - Deberías ver el botón verde "Aprobar" en esos contratos

## 🧪 Cómo Verificar

1. Ve a la página de **Contratos** (`/dashboard/contratos`)
2. Busca contratos que tengan el badge/etiqueta **"Borrador"** (amarillo/ámbar)
3. En esos contratos deberías ver el botón verde **"Aprobar"** en la primera columna (acciones)

## 💡 Cómo Probar

1. **Crea un contrato nuevo**:
   - Click en "Nuevo Contrato" o el botón "+"
   - Llena los datos básicos y guarda
   - El contrato se crea como "borrador"

2. **Busca el botón "Aprobar"**:
   - En la tabla, en la primera columna (acciones)
   - Debería ser un botón verde con "Aprobar"

3. **Click en "Aprobar"**:
   - Se abre un modal de confirmación
   - Muestra el número de contrato (generado automáticamente)
   - Confirma para aprobar

## 📋 Ubicación Visual en la Tabla

```
┌─────────────────────────────────────────┐
│ Acciones │ Empleado │ Empresa │ ...     │
├─────────────────────────────────────────┤
│ [✓ Aprobar] │ Juan Pérez │ ... │ ...   │ ← Botón aquí si está en "borrador"
│ [✅ Aprobado] │ María López │ ... │ ... │ ← Texto si ya está aprobado
└─────────────────────────────────────────┘
```

## 🔍 Si Todavía No Lo Ves

1. **Verifica que tienes contratos en estado "borrador"**:
   - Busca badges amarillos que digan "Borrador"
   - O filtra por estado "Borrador" en los filtros de la página

2. **Crea un contrato nuevo para probar**

3. **Si el problema persiste**, puede ser que los contratos existentes tengan `status_aprobacion = null` y el código los trata como aprobados. En ese caso, podrías necesitar actualizar los contratos existentes a "borrador" si quieres aprobarlos.
