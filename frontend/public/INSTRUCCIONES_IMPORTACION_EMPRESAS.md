# 📋 Instrucciones para Importación Masiva de Empresas

## 📥 Descargar Plantilla

1. Haz clic en el botón **"Descargar Plantilla"** en la página de Empresas
2. Se descargará un archivo CSV llamado `plantilla-importacion-empresas.csv`
3. Abre el archivo con Excel, Google Sheets o cualquier editor de texto

## 📝 Formato del Archivo CSV

### Columnas Requeridas (Obligatorias)

| Columna | Descripción | Ejemplo | Notas |
|---------|-------------|---------|-------|
| `nombre_empresa` | Nombre completo de la empresa | `Good Talent S.A.S.` | No puede estar vacío |
| `nit` | NIT o identificación tributaria | `900123456-7` | Debe ser único, solo números y guiones |
| `contacto_cuentas_nombre` | Nombre del contacto de cuentas por cobrar | `María Pérez` | No puede estar vacío |
| `contacto_cuentas_email` | Email del contacto de cuentas | `mperez@goodtalent.com` | Debe ser un email válido |
| `contacto_cuentas_telefono` | Teléfono del contacto de cuentas | `+57 300 123 4567` | No puede estar vacío |

### Columnas Opcionales

| Columna | Descripción | Ejemplo | Notas |
|---------|-------------|---------|-------|
| `grupo_empresarial` | Nombre del grupo empresarial | `Grupo Empresarial Good` | Si no existe, se creará automáticamente. Dejar vacío si no aplica |
| `contacto_comercial_nombre` | Nombre del contacto comercial | `Juan García` | Dejar vacío si no aplica |
| `contacto_comercial_email` | Email del contacto comercial | `jgarcia@goodtalent.com` | Debe ser un email válido si se proporciona |
| `contacto_comercial_telefono` | Teléfono del contacto comercial | `+57 301 234 5678` | Dejar vacío si no aplica |
| `estado` | Estado de la empresa | `Activa` o `Inactiva` | Por defecto será `Activa` si se deja vacío |

## ✅ Ejemplos de Uso

### Ejemplo 1: Empresa Completa
```csv
nombre_empresa,nit,grupo_empresarial,contacto_cuentas_nombre,contacto_cuentas_email,contacto_cuentas_telefono,contacto_comercial_nombre,contacto_comercial_email,contacto_comercial_telefono,estado
Good Talent S.A.S.,900123456-7,Grupo Empresarial Good,María Pérez,mperez@goodtalent.com,+57 300 123 4567,Juan García,jgarcia@goodtalent.com,+57 301 234 5678,Activa
```

### Ejemplo 2: Empresa Mínima (Solo Campos Requeridos)
```csv
nombre_empresa,nit,grupo_empresarial,contacto_cuentas_nombre,contacto_cuentas_email,contacto_cuentas_telefono,contacto_comercial_nombre,contacto_comercial_email,contacto_comercial_telefono,estado
Empresa Ejemplo S.A.,800987654-3,,Carlos Rodríguez,crodriguez@ejemplo.com,+57 320 555 1234,,,,
```

## ⚠️ Reglas Importantes

1. **NIT Único**: Cada empresa debe tener un NIT único. Si intentas importar un NIT que ya existe, esa fila será rechazada.

2. **Formato de Email**: Los emails deben tener un formato válido (ejemplo: `usuario@dominio.com`).

3. **Grupos Empresariales**: Si especificas un grupo empresarial que no existe, se creará automáticamente. Si dejas el campo vacío, la empresa no tendrá grupo empresarial.

4. **Estado**: 
   - Escribe `Activa` para empresas activas
   - Escribe `Inactiva` para empresas inactivas
   - Si dejas vacío, se establecerá como `Activa` por defecto

5. **Formato CSV**:
   - Usa comas (`,`) como separadores
   - Si un campo contiene comas, envuélvelo entre comillas dobles (`"`)
   - No elimines la primera fila (encabezados)
   - Cada fila después de los encabezados es una empresa

6. **Codificación (IMPORTANTE)**: 
   - Guarda el archivo en formato **UTF-8** para caracteres especiales (ñ, acentos, etc.)
   - En **Excel**: "Archivo" → "Guardar como" → Selecciona "CSV UTF-8 (delimitado por comas) (*.csv)"
   - En **Google Sheets**: "Archivo" → "Descargar" → "Valores separados por comas (.csv, actual)" (ya viene en UTF-8)
   - Si guardas con codificación incorrecta, los caracteres especiales aparecerán como símbolos extraños ()

## 🚀 Proceso de Importación

1. Descarga la plantilla
2. Completa los datos de las empresas siguiendo los ejemplos
3. Guarda el archivo CSV
4. En la página de Empresas, haz clic en **"Importar Empresas"** (próximamente)
5. Selecciona tu archivo CSV
6. Revisa la vista previa de los datos
7. Confirma la importación
8. Revisa el reporte de empresas importadas y errores (si los hay)

## ❓ Preguntas Frecuentes

**P: ¿Puedo importar empresas sin grupo empresarial?**  
R: Sí, deja el campo `grupo_empresarial` vacío.

**P: ¿Qué pasa si un NIT ya existe?**  
R: Esa fila será rechazada y aparecerá en el reporte de errores. La empresa no se duplicará.

**P: ¿Puedo importar solo algunas columnas?**  
R: Sí, pero las columnas requeridas (`nombre_empresa`, `nit`, `contacto_cuentas_nombre`, `contacto_cuentas_email`, `contacto_cuentas_telefono`) son obligatorias.

**P: ¿Cómo manejo campos con comas?**  
R: Envuelve el campo completo entre comillas dobles: `"Empresa, S.A.S."`

**P: ¿Puedo importar miles de empresas a la vez?**  
R: Sí, el sistema procesará la importación en lotes para optimizar el rendimiento.
