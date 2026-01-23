# 📋 Instrucciones para Importación Masiva de Contratos

## 📥 Descargar Plantilla

1. Haz clic en el botón **"Descargar Plantilla"** en la página de Contratos
2. Se descargará un archivo CSV llamado `plantilla-importacion-contratos.csv`
3. Abre el archivo con Excel, Google Sheets o cualquier editor de texto

## 📝 Formato del Archivo CSV

### Columnas Requeridas (Obligatorias)

| Columna | Descripción | Ejemplo | Notas |
|---------|-------------|---------|-------|
| `primer_nombre` | Primer nombre del empleado | `Juan` | No puede estar vacío |
| `primer_apellido` | Primer apellido del empleado | `Pérez` | No puede estar vacío |
| `tipo_identificacion` | Tipo de documento | `CC`, `CE`, `Pasaporte`, `PEP`, `Otro` | Debe ser uno de los valores permitidos |
| `numero_identificacion` | Número de identificación | `1234567890` | Debe ser único |
| `fecha_nacimiento` | Fecha de nacimiento | `20/05/1990` | Formato: DD/MM/YYYY o DD-MM-YYYY |
| `empresa_interna` | Empresa interna | `Good` o `CPS` | Debe ser uno de estos valores |
| `empresa_final_nit` | NIT de la empresa cliente | `900123456-7` | La empresa debe existir en el sistema |
| `fecha_ingreso` | Fecha de ingreso del empleado | `15/01/2024` | Formato: DD/MM/YYYY o DD-MM-YYYY |

### Columnas Opcionales

| Columna | Descripción | Ejemplo | Notas |
|---------|-------------|---------|-------|
| `segundo_nombre` | Segundo nombre | `Carlos` | Dejar vacío si no aplica |
| `segundo_apellido` | Segundo apellido | `García` | Dejar vacío si no aplica |
| `fecha_expedicion_documento` | Fecha de expedición del documento | `15/01/2010` | Formato: DD/MM/YYYY |
| `celular` | Número de celular | `+57 300 123 4567` | Dejar vacío si no aplica |
| `email` | Email del empleado | `juan.perez@example.com` | Debe ser válido si se proporciona |
| `ciudad_labora` | Ciudad donde labora | `Bogotá` | Dejar vacío si no aplica |
| `cargo` | Cargo del empleado | `Desarrollador` | Dejar vacío si no aplica |
| `tipo_contrato` | Tipo de contrato | `Indefinido`, `Fijo`, `Obra`, `Aprendizaje` | Dejar vacío si no aplica |
| `fecha_fin` | Fecha de fin del contrato | `01/02/2025` | Requerido si tipo_contrato es "Fijo" |
| `tipo_salario` | Tipo de salario | `Integral` o `Ordinario` | Dejar vacío si no aplica |
| `moneda` | Moneda del salario | `COP` | Por defecto será COP |
| `salario` | Salario base | `5000000` | Número sin puntos ni comas |
| `auxilio_transporte` | Auxilio de transporte | `162000` | Número sin puntos ni comas |
| `eps_nombre` | Nombre de la EPS | `Sanitas` | Se creará automáticamente si no existe |
| `arl_nombre` | Nombre de la ARL | `Positiva` | Se creará automáticamente si no existe |
| `fondo_pension` | Fondo de pensión | `Protección` | Se creará automáticamente si no existe |
| `fondo_cesantias` | Fondo de cesantías | `Protección` | Se creará automáticamente si no existe |
| `caja_compensacion` | Caja de compensación | `Compensar` | Se creará automáticamente si no existe |

## ✅ Ejemplos de Uso

### Ejemplo 1: Contrato Completo
```csv
primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,tipo_identificacion,numero_identificacion,fecha_expedicion_documento,fecha_nacimiento,celular,email,empresa_interna,empresa_final_nit,ciudad_labora,cargo,fecha_ingreso,tipo_contrato,fecha_fin,tipo_salario,moneda,salario,auxilio_transporte,eps_nombre,arl_nombre,fondo_pension,fondo_cesantias,caja_compensacion
Juan,Carlos,Pérez,García,CC,1234567890,15/01/2010,20/05/1990,+57 300 123 4567,juan.perez@example.com,Good,900123456-7,Bogotá,Desarrollador,15/01/2024,Indefinido,,Integral,COP,5000000,162000,Sanitas,Positiva,Protección,Protección,Compensar
```

### Ejemplo 2: Contrato Mínimo (Solo Campos Requeridos)
```csv
primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,tipo_identificacion,numero_identificacion,fecha_expedicion_documento,fecha_nacimiento,celular,email,empresa_interna,empresa_final_nit,ciudad_labora,cargo,fecha_ingreso,tipo_contrato,fecha_fin,tipo_salario,moneda,salario,auxilio_transporte,eps_nombre,arl_nombre,fondo_pension,fondo_cesantias,caja_compensacion
María,,Rodríguez,,CC,9876543210,,12/08/1985,,,Good,900123456-7,,,01/02/2024,,,,,,
```

## ⚠️ Reglas Importantes

1. **Número de Identificación Único**: Cada empleado debe tener un número de identificación único. Si intentas importar un número que ya existe, esa fila será rechazada.

2. **Formato de Fechas**: 
   - Usa formato colombiano: **DD/MM/YYYY** o **DD-MM-YYYY** (ejemplo: `15/01/2024` o `15-01-2024`)
   - El sistema también acepta formato ISO (YYYY-MM-DD) para compatibilidad

3. **Empresa Final**: El NIT de la empresa debe existir en el sistema. Si no existe, esa fila será rechazada.

4. **Tipo de Contrato Fijo**: Si especificas `tipo_contrato` como "Fijo", debes proporcionar `fecha_fin`.

5. **Entidades Auxiliares**: Si especificas nombres de EPS, ARL, Fondos o Cajas que no existen, se crearán automáticamente.

6. **Onboarding Automático**: Los contratos importados se marcan automáticamente con onboarding 100% completo y status "aprobado".

7. **Formato CSV**:
   - Usa comas (`,`) como separadores
   - Si un campo contiene comas, envuélvelo entre comillas dobles (`"`)
   - No elimines la primera fila (encabezados)
   - Cada fila después de los encabezados es un contrato

8. **Codificación (MUY IMPORTANTE)**: 
   - Guarda el archivo en formato **UTF-8** para caracteres especiales (ñ, acentos, etc.)
   - En **Excel**: "Archivo" → "Guardar como" → Selecciona "CSV UTF-8 (delimitado por comas) (*.csv)"
   - En **Google Sheets**: "Archivo" → "Descargar" → "Valores separados por comas (.csv, actual)" (ya viene en UTF-8)
   - Si guardas con codificación incorrecta, los caracteres especiales aparecerán como símbolos extraños ()
   - El sistema detectará automáticamente problemas de codificación y te advertirá

## 🚀 Proceso de Importación

1. Descarga la plantilla
2. Completa los datos de los contratos siguiendo los ejemplos
3. **IMPORTANTE**: Guarda el archivo en formato UTF-8 (ver instrucciones arriba)
4. En la página de Contratos, haz clic en **"Importar"**
5. Selecciona tu archivo CSV
6. Revisa la vista previa de los datos
7. Confirma la importación
8. Revisa el reporte de contratos importados y errores (si los hay)

## ❓ Preguntas Frecuentes

**P: ¿Puedo importar contratos sin afiliaciones (EPS, ARL, etc.)?**  
R: Sí, las afiliaciones son opcionales. El contrato se creará sin ellas.

**P: ¿Qué pasa si un número de identificación ya existe?**  
R: Esa fila será rechazada y aparecerá en el reporte de errores. El contrato no se duplicará.

**P: ¿Puedo importar solo algunas columnas?**  
R: Sí, pero las columnas requeridas son obligatorias. Las demás pueden dejarse vacías.

**P: ¿Cómo manejo campos con comas?**  
R: Envuelve el campo completo entre comillas dobles: `"Empresa, S.A.S."`

**P: ¿Puedo importar miles de contratos a la vez?**  
R: Sí, el sistema procesará la importación en lotes para optimizar el rendimiento.

**P: ¿Los contratos importados aparecen en el módulo de Contratación?**  
R: No, los contratos importados tienen onboarding 100% completo, por lo que aparecen directamente en el módulo de Contratos.

**P: ¿Qué pasa si tengo caracteres especiales (tildes, ñ) en los nombres?**  
R: Asegúrate de guardar el archivo en formato UTF-8. El sistema detectará problemas de codificación y te advertirá.
