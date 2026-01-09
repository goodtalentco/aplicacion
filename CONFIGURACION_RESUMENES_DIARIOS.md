# 📧 Configuración de Resúmenes Diarios de Contrataciones

Esta guía explica cómo configurar el sistema de resúmenes diarios por email de contrataciones pendientes.

---

## 📋 Tabla de Contenidos

1. [Variables de Entorno](#variables-de-entorno)
2. [Configuración de Resend](#configuración-de-resend)
3. [Configuración de pg_cron (Envío Automático)](#configuración-de-pg_cron-envío-automático)
4. [Verificación y Pruebas](#verificación-y-pruebas)
5. [Solución de Problemas](#solución-de-problemas)

---

## 🔐 Variables de Entorno

Necesitas configurar las siguientes variables de entorno en tu proyecto de Supabase:

### 1. En Supabase Dashboard

Ve a **Settings > Edge Functions > Secrets** y agrega:

#### `RESEND_API_KEY` (Requerido)
- **Descripción**: API Key de Resend para enviar emails
- **Cómo obtenerla**: 
  1. Crea una cuenta en [Resend](https://resend.com)
  2. Ve a API Keys en tu dashboard
  3. Crea una nueva API Key
  4. Copia el valor (formato: `re_xxxxxxxxxxxxx`)

#### `RESEND_FROM_EMAIL` (Opcional)
- **Descripción**: Email desde el cual se envían los resúmenes
- **Formato**: `"GOOD Talent <noreply@tudominio.com>"` o `"noreply@tudominio.com"`
- **Valor por defecto**: `"GOOD Talent <noreply@goodtalent.com>"` (si no se configura)
- **Requisito**: El dominio debe estar verificado en Resend

#### Variables ya existentes (verificar que estén configuradas):
- `SUPABASE_URL` - Ya debería estar configurada
- `SUPABASE_SERVICE_ROLE_KEY` - Ya debería estar configurada

---

## 📧 Configuración de Resend

### Paso 1: Crear cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta (plan gratuito incluye 3,000 emails/mes)
3. Verifica tu email

### Paso 2: Verificar dominio (Recomendado)

Para usar un dominio personalizado:

1. En Resend Dashboard, ve a **Domains**
2. Haz clic en **Add Domain**
3. Ingresa tu dominio (ej: `goodtalent.com`)
4. Agrega los registros DNS que Resend te proporciona a tu proveedor de DNS
5. Espera a que se verifique (puede tardar hasta 48 horas)

**Nota**: Si no tienes un dominio personalizado, puedes usar el dominio de Resend temporalmente, pero los emails pueden ir a spam.

### Paso 3: Obtener API Key

1. En Resend Dashboard, ve a **API Keys**
2. Haz clic en **Create API Key**
3. Dale un nombre (ej: "GOOD Talent Production")
4. Selecciona permisos (necesitas `Email:Send`)
5. Copia la API Key (solo se muestra una vez)
6. Guárdala de forma segura

### Paso 4: Configurar en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Settings > Edge Functions > Secrets**
3. Haz clic en **Add new secret**
4. Agrega:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Tu API Key de Resend
5. (Opcional) Agrega:
   - **Name**: `RESEND_FROM_EMAIL`
   - **Value**: `"GOOD Talent <noreply@tudominio.com>"` (reemplaza con tu dominio)

---

## ⏰ Configuración de pg_cron (Envío Automático)

pg_cron es una extensión de PostgreSQL que permite programar tareas. En Supabase, necesitas configurarla manualmente desde el SQL Editor.

### Opción A: Usando Supabase SQL Editor (Recomendado)

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Crea una nueva query y ejecuta:

```sql
-- 1. Habilitar extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Configurar el job para ejecutar la Edge Function todos los días a las 8:00 AM (hora Colombia)
-- IMPORTANTE: Reemplaza 'TU_PROYECTO_REF' con el reference ID de tu proyecto Supabase
-- Puedes encontrarlo en Settings > API > Project URL (es la parte después de https://)
SELECT cron.schedule(
  'send-daily-contracts-summary',  -- Nombre del job
  '0 8 * * 1-5',                   -- Cron expression: 8:00 AM, lunes a viernes (0=domingo, 1=lunes, 5=viernes)
  $$
  SELECT
    net.http_post(
      url := 'https://TU_PROYECTO_REF.supabase.co/functions/v1/send-daily-contracts-summary',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

**Nota**: El cron expression `'0 8 * * 1-5'` significa:
- `0` - Minuto 0
- `8` - Hora 8 (8:00 AM)
- `*` - Todos los días del mes
- `*` - Todos los meses
- `1-5` - Lunes a Viernes (1=lunes, 5=viernes)

### Opción B: Usando Supabase CLI (Alternativa)

Si prefieres usar la CLI:

1. Instala Supabase CLI si no la tienes
2. En tu proyecto, crea un archivo de migración:

```bash
supabase migration new configure_daily_summary_cron
```

3. Edita el archivo y agrega:

```sql
-- Habilitar extensión
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Configurar job
SELECT cron.schedule(
  'send-daily-contracts-summary',
  '0 8 * * 1-5',
  $$
  SELECT
    net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/send-daily-contracts-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    ) AS request_id;
  $$
);
```

4. Ejecuta la migración:

```bash
supabase db push
```

### Verificar que el job está configurado

Ejecuta en SQL Editor:

```sql
SELECT * FROM cron.job WHERE jobname = 'send-daily-contracts-summary';
```

### Eliminar el job (si necesitas desactivarlo temporalmente)

```sql
SELECT cron.unschedule('send-daily-contracts-summary');
```

### Actualizar el horario del job

```sql
-- Primero eliminar el job existente
SELECT cron.unschedule('send-daily-contracts-summary');

-- Luego crear uno nuevo con el horario actualizado
-- Ejemplo: Cambiar a 9:00 AM
SELECT cron.schedule(
  'send-daily-contracts-summary',
  '0 9 * * 1-5',  -- 9:00 AM en lugar de 8:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://TU_PROYECTO_REF.supabase.co/functions/v1/send-daily-contracts-summary',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

### ⚠️ Limitaciones de pg_cron en Supabase

- pg_cron puede no estar disponible en todos los planes de Supabase
- Si no tienes acceso a pg_cron, puedes usar servicios externos como:
  - **Vercel Cron Jobs** (si usas Vercel para deployment)
  - **GitHub Actions** con schedule
  - **AWS EventBridge** o **Cloud Scheduler**
  - Servicios como **Cron-job.org** o **EasyCron**

---

## 🧪 Verificación y Pruebas

### 1. Verificar que la migración se ejecutó correctamente

Ejecuta en SQL Editor:

```sql
-- Verificar que la tabla existe
SELECT * FROM daily_contracts_summary_config;

-- Debería retornar una fila con configuración por defecto
```

### 2. Verificar que la Edge Function está desplegada

```bash
# Desde la raíz del proyecto
supabase functions list

# Deberías ver: send-daily-contracts-summary
```

Si no está desplegada:

```bash
supabase functions deploy send-daily-contracts-summary
```

### 3. Probar envío manual desde la aplicación

1. Inicia sesión en la aplicación
2. Ve a **Configuración** (desde el menú del usuario)
3. Haz clic en **Enviar Resumen Manualmente**
4. Verifica que recibes el email

### 4. Verificar logs de la Edge Function

1. Ve a Supabase Dashboard > **Edge Functions**
2. Selecciona `send-daily-contracts-summary`
3. Ve a la pestaña **Logs**
4. Revisa los logs para ver si hay errores

### 5. Probar el envío automático (simular)

Puedes probar manualmente llamando a la Edge Function:

```bash
curl -X GET \
  'https://TU_PROYECTO_REF.supabase.co/functions/v1/send-daily-contracts-summary' \
  -H 'Authorization: Bearer TU_SERVICE_ROLE_KEY'
```

O desde el SQL Editor (simula lo que hace pg_cron):

```sql
SELECT
  net.http_post(
    url := 'https://TU_PROYECTO_REF.supabase.co/functions/v1/send-daily-contracts-summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
```

---

## 🔧 Solución de Problemas

### Error: "RESEND_API_KEY no configurada"

**Solución**: 
- Verifica que agregaste la variable de entorno en Supabase Dashboard > Settings > Edge Functions > Secrets
- Asegúrate de que el nombre sea exactamente `RESEND_API_KEY` (case-sensitive)
- Redeploya la Edge Function después de agregar la variable

### Error: "No se encontró configuración"

**Solución**:
- Ejecuta la migración `00000000000036_add_daily_contracts_summary_config.sql`
- Verifica que la tabla `daily_contracts_summary_config` existe
- La migración crea automáticamente una configuración por defecto

### Los emails no se envían

**Pasos a verificar**:
1. Revisa los logs de la Edge Function en Supabase Dashboard
2. Verifica que el dominio está verificado en Resend
3. Verifica que `RESEND_FROM_EMAIL` tiene el formato correcto
4. Revisa la carpeta de spam en los emails destinatarios
5. Verifica que los emails destinatarios están configurados en la tabla de configuración

### pg_cron no funciona

**Posibles causas**:
- Tu plan de Supabase no incluye pg_cron
- El job no está configurado correctamente
- Hay un error en la URL o headers

**Solución**:
- Verifica que puedes ejecutar `SELECT * FROM cron.job;` (si da error, pg_cron no está disponible)
- Revisa los logs de la base de datos
- Considera usar un servicio externo de cron si pg_cron no está disponible

### El email se envía pero está vacío

**Solución**:
- Verifica que hay contratos en la base de datos
- Verifica que los contratos tienen campos pendientes
- Revisa los logs de la Edge Function para ver cuántos contratos se encontraron

---

## 📝 Notas Adicionales

### Configuración desde la aplicación

Una vez que todo esté configurado, puedes:

1. **Configurar emails destinatarios**: Desde la página de Configuración en la aplicación
2. **Cambiar horario**: Desde la página de Configuración (pero el cron de pg_cron debe actualizarse manualmente)
3. **Cambiar días de la semana**: Desde la página de Configuración (pero el cron de pg_cron debe actualizarse manualmente)
4. **Activar/desactivar**: Desde la página de Configuración
5. **Envío manual**: Botón disponible en la página de Configuración

### Seguridad

- **Nunca** commits la `RESEND_API_KEY` al repositorio
- Usa siempre variables de entorno para secretos
- La `SERVICE_ROLE_KEY` solo debe usarse en el servidor/Edge Functions, nunca en el frontend

### Límites de Resend

- Plan gratuito: 3,000 emails/mes
- Plan Pro: 50,000 emails/mes
- Revisa [Resend Pricing](https://resend.com/pricing) para más información

---

## 📚 Recursos Adicionales

- [Documentación de Resend](https://resend.com/docs)
- [Documentación de Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentación de pg_cron](https://github.com/citusdata/pg_cron)
- [Cron Expression Generator](https://crontab.guru/)

---

**Última actualización**: 2025-01-22
