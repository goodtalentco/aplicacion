# 📊 Schema de Base de Datos - GOOD Talent
## Estado: CONSOLIDADO v4.2 - SISTEMA COMPLETO CON PERÍODOS DE CONTRATOS FIJOS
*Última actualización: 2025-01-22*

> **🚀 SISTEMA COMPLETO:** Schema consolidado con sistema de novedades laborales implementado.
> **Archivos:** 18 migraciones que incluyen sistema base + novedades + optimizaciones
> **Contenido:** Permisos + Empresas + Contratos + Tablas Auxiliares + Líneas de Negocio + Sistema Completo de Novedades + Funciones Helper

## 🎯 Tablas del Sistema de Permisos

### 1. `permissions` – Catálogo de Permisos

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único del permiso | `abc-123-def-456` |
| `table_name` | TEXT | Nombre de la tabla/módulo | `contracts`, `companies` |
| `action` | TEXT | Acción permitida | `view`, `create`, `edit`, `delete` |
| `description` | TEXT | Descripción legible del permiso | `"Ver contratos laborales"` |
| `is_active` | BOOLEAN | Si el permiso está activo | `true`, `false` |
| `created_at` | TIMESTAMP | Fecha de creación | `2025-01-12 10:30:00` |
| `updated_at` | TIMESTAMP | Fecha de última actualización | `2025-01-12 15:45:00` |

**Restricciones:**
- `UNIQUE(table_name, action)` - No duplicados
- `table_name` y `action` son obligatorios

**Propósito:** Define todos los permisos disponibles en el sistema. Es como un catálogo.

---

### 2. `user_permissions` – Asignación de Permisos a Usuarios

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único de la asignación | `xyz-789-abc-123` |
| `user_id` | UUID (FK) | Usuario al que se asigna el permiso | `user-123-456` |
| `permission_id` | UUID (FK) | Permiso que se asigna | `perm-abc-123` |
| `granted_at` | TIMESTAMP | Cuándo se otorgó el permiso | `2025-01-12 14:20:00` |
| `granted_by` | UUID (FK) | Quién otorgó el permiso | `admin-789-123` |
| `is_active` | BOOLEAN | Si el permiso está activo | `true`, `false` |
| `created_at` | TIMESTAMP | Fecha de creación | `2025-01-12 14:20:00` |
| `updated_at` | TIMESTAMP | Fecha de última actualización | `2025-01-12 16:00:00` |

**Relaciones:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `permission_id` → `permissions(id)` ON DELETE CASCADE  
- `granted_by` → `auth.users(id)` ON DELETE SET NULL

**Restricciones:**
- `UNIQUE(user_id, permission_id)` - Un permiso por usuario
- `user_id` y `permission_id` son obligatorios

**Propósito:** Conecta usuarios específicos con permisos específicos. Define quién puede hacer qué.

---

## 🔐 Seguridad y RLS (Row Level Security)

### Políticas Implementadas:

**Tabla `permissions`:**
- **Ver:** Solo usuarios con permiso `permissions.view` o super admins
- **Crear/Editar/Eliminar:** Solo super admins

**Tabla `user_permissions`:**
- **Ver:** Usuarios pueden ver sus propios permisos, o usuarios con permiso `user_permissions.view`
- **Crear:** Usuarios con permiso `user_permissions.create` 
- **Editar:** Usuarios con permiso `user_permissions.edit`
- **Eliminar:** Usuarios con permiso `user_permissions.delete`
- **IMPORTANTE:** RLS está HABILITADO y las políticas usan consultas directas sin recursión

### Funciones Helper:

- `has_permission(user_id, table_name, action)` - Verifica si un usuario tiene un permiso específico
- `is_super_admin(user_id)` - Verifica si un usuario es super administrador
- `my_permissions()` - Lista los permisos del usuario actual
- `create_super_admin(user_id)` - Otorga todos los permisos a un usuario
- `get_users_with_permissions()` - Obtiene todos los usuarios con conteo de permisos, `is_active` (confirmado y no baneado) y `is_banned`
- `get_user_permissions(user_id)` - Obtiene todos los permisos de un usuario específico
- `assign_permission_to_user(user_id, permission_id, assigned_by)` - Asigna un permiso a un usuario
- `revoke_permission_from_user(user_id, permission_id)` - Revoca un permiso de un usuario
- `get_user_handle(user_id)` - Obtiene la parte local del email (antes de @) de un usuario
- `companies_created_by_handle(company)` - Computed column: handle del creador de empresa
- `companies_updated_by_handle(company)` - Computed column: handle del editor de empresa

---

## 📋 Permisos Predefinidos del Sistema

### Módulos y Acciones Disponibles:

| Módulo | Acciones Disponibles | Descripción |
|--------|---------------------|-------------|
| `permissions` | `view` | Ver catálogo de permisos |
| `user_permissions` | `view`, `create`, `edit`, `delete` | Gestionar asignaciones de permisos |

| `companies` | `view`, `create`, `edit`, `delete` | Gestión de empresas |
| `contracts` | `view`, `create`, `edit`, `delete`, `archive` | Gestión de contratos |
| `legal` | `view`, `create`, `edit`, `delete` | Documentos legales |
| `sst` | `view`, `create`, `edit`, `delete` | Seguridad y Salud en el Trabajo |
| `news` | `view`, `create`, `edit`, `delete` | Novedades del sistema |
| `dashboard` | `view` | Acceso al dashboard |
| `reports` | `view`, `create`, `export` | Reportes y exportaciones |
| `tablas_auxiliares` | `view`, `create`, `edit`, `delete` | Gestión de tablas auxiliares administrativas |
| `lineas_negocio` | `view`, `create`, `edit`, `delete` | Gestión del catálogo de líneas de negocio |
| `linea_negocio_responsables` | `view`, `create`, `edit`, `delete` | Asignación de responsables a líneas de negocio |
| `empresa_lineas_negocio` | `view`, `create`, `edit`, `delete` | Asignación de líneas de negocio a empresas |

**NOTA:** El módulo `employees` fue removido del sistema. Todos los permisos relacionados con empleados han sido eliminados.

---

## 🚀 Ejemplo Práctico

### Crear un Super Administrador:
```sql
-- Opción 1: Usar función helper
SELECT create_super_admin('tu-user-id-aqui');

-- Opción 2: Manual
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT 'tu-user-id', id, 'tu-user-id' FROM permissions WHERE is_active = true;
```

### Asignar permisos específicos a un usuario:
```sql
-- Dar permiso para ver y crear empresas
INSERT INTO user_permissions (user_id, permission_id, granted_by) VALUES
('usuario-123', (SELECT id FROM permissions WHERE table_name='companies' AND action='view'), 'admin-456'),
('usuario-123', (SELECT id FROM permissions WHERE table_name='companies' AND action='create'), 'admin-456');
```

### Verificar permisos de un usuario:
```sql
-- Ver mis propios permisos
SELECT * FROM my_permissions();

-- Verificar si un usuario tiene un permiso específico
SELECT has_permission('usuario-123', 'companies', 'view');
```

---

## 🎯 Flujo de Trabajo

1. **Instalación:** Ejecutar migraciones para crear tablas y permisos base
2. **Primer Super Admin:** Crear usando `create_super_admin(user_id)`
3. **Gestión:** Super admins pueden asignar permisos específicos a otros usuarios
4. **Verificación:** El sistema verifica permisos automáticamente vía RLS
5. **Auditoría:** Cada asignación queda registrada con fecha y quien la otorgó

---

## 🏢 Tabla de Empresas

### 3. `companies` – Empresas Clientes

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440000` |
| `name` | TEXT | Nombre de la empresa cliente | `Good Temporal` |
| `tax_id` | TEXT | NIT o identificación tributaria | `900123456` |
| `grupo_empresarial_id` | UUID (FK) | Grupo empresarial al que pertenece (opcional) | `grupo-uuid` |
| `accounts_contact_name` | TEXT | Nombre del contacto de cuentas por cobrar | `María Pérez` |
| `accounts_contact_email` | TEXT | Email del contacto de cuentas por cobrar | `mperez@good.com` |
| `accounts_contact_phone` | TEXT | Teléfono del contacto de cuentas por cobrar | `+57 300 123 4567` |
| `status` | BOOLEAN | Estado: true = activa, false = inactiva | `true` |
| `created_at` | TIMESTAMPTZ | Fecha de creación del registro | `2025-01-14 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-14 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |
| `archived_at` | TIMESTAMPTZ | Fecha de archivado (soft delete) | `NULL` |
| `archived_by` | UUID (FK) | Usuario que archivó el registro | `NULL` |

**Relaciones:**
- `grupo_empresarial_id` → `grupos_empresariales(id)`
- `created_by` → `auth.users(id)`
- `updated_by` → `auth.users(id)` 
- `archived_by` → `auth.users(id)`

**Restricciones:**
- `UNIQUE(tax_id)` - NIT único por empresa
- Validación de email en `accounts_contact_email`
- Lógica de archivado: si `archived_at` no es NULL, `archived_by` debe tener valor

**Índices:**
- `idx_companies_name` - Búsqueda por nombre
- `idx_companies_tax_id` - Búsqueda por NIT
- `idx_companies_status` - Filtro por estado
- `idx_companies_archived_at` - Empresas no archivadas

**Seguridad RLS:**
- **Ver:** Usuarios con permiso `companies.view`
- **Crear:** Usuarios con permiso `companies.create`
- **Editar:** Usuarios con permiso `companies.edit`
- **Eliminar:** Usuarios con permiso `companies.delete`
- **NOTA:** Las políticas usan la función `has_permission()` con SECURITY DEFINER

**Triggers:**
- `trigger_companies_updated_at` - Actualiza automáticamente `updated_at` y `updated_by`

---

## 🏢 Tabla de Grupos Empresariales

### 3.1. `grupos_empresariales` – Grupos Empresariales

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440001` |
| `nombre` | TEXT | Nombre único del grupo empresarial | `Grupo Empresarial ABC` |
| `descripcion` | TEXT | Descripción opcional del grupo | `Holding de empresas del sector financiero` |
| `created_at` | TIMESTAMPTZ | Fecha de creación del registro | `2025-01-22 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-22 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Relaciones:**
- `created_by` → `auth.users(id)`
- `updated_by` → `auth.users(id)`

**Restricciones:**
- `UNIQUE(nombre)` - Nombre único por grupo empresarial
- Validación de nombre no vacío

**Índices:**
- `idx_grupos_empresariales_nombre` - Búsqueda por nombre
- `idx_grupos_empresariales_created_at` - Filtro por fecha de creación

**Seguridad RLS:**
- **Ver:** Usuarios con permiso `companies.view`
- **Crear:** Usuarios con permiso `companies.create`
- **Editar:** Usuarios con permiso `companies.edit`
- **Eliminar:** Usuarios con permiso `companies.delete`

**Triggers:**
- `trigger_grupos_empresariales_updated_at` - Actualiza automáticamente `updated_at` y `updated_by`

**Funciones Helper:**
- `get_or_create_grupo_empresarial(nombre)` - Obtiene o crea un grupo empresarial
- `get_empresas_por_grupo(grupo_id)` - Obtiene empresas de un grupo
- `get_grupos_empresariales_with_count()` - Lista grupos con conteo de empresas

**Propósito:** Permite agrupar empresas relacionadas bajo un mismo grupo empresarial para mejor organización y gestión.

---

## 📋 Tabla de Contratos

### 4. `contracts` – Contratos Laborales

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440001` |
| `primer_nombre` | TEXT | Primer nombre del empleado | `Juan` |
| `segundo_nombre` | TEXT | Segundo nombre (opcional) | `Carlos` |
| `primer_apellido` | TEXT | Primer apellido del empleado | `Pérez` |
| `segundo_apellido` | TEXT | Segundo apellido (opcional) | `González` |
| `tipo_identificacion` | TEXT | Tipo de documento (texto libre) | `CC`, `Cédula de Ciudadanía` |
| `numero_identificacion` | TEXT | Número de identificación | `1234567890` |
| `fecha_expedicion_documento` | DATE | Fecha de expedición del documento | `2010-03-15` |
| `fecha_nacimiento` | DATE | Fecha de nacimiento | `1990-05-15` |
| `celular` | TEXT | Número de celular | `+57 300 123 4567` |
| `email` | TEXT | Correo electrónico | `juan.perez@email.com` |
| `empresa_interna` | TEXT | Empresa interna (texto libre) | `Good`, `Temporal`, `Outsourcing` |
| `empresa_final_id` | UUID (FK) | Empresa cliente final | `company-uuid` |
| `ciudad_labora` | TEXT | Ciudad donde labora | `Bogotá` |
| `cargo` | TEXT | Cargo del empleado | `Desarrollador` |
| `numero_contrato_helisa` | TEXT | Número de contrato único en Helisa | `CONT-2025-001` |
| `base_sena` | BOOLEAN | Aporta al SENA (default: true) | `true` |
| `fecha_ingreso` | DATE | Fecha de ingreso | `2025-01-15` |
| `tipo_contrato` | TEXT | Tipo de contrato (texto libre) | `Indefinido`, `Término Fijo`, `Por Obra` |
| `fecha_fin` | DATE | Fecha de terminación | `2025-12-31` |
| `tipo_salario` | TEXT | Tipo de salario (texto libre) | `Ordinario`, `Integral`, `Mixto` |
| `salario` | NUMERIC(14,2) | Salario base | `3500000.00` |
| `auxilio_salarial` | NUMERIC(14,2) | Auxilio salarial | `150000.00` |
| `auxilio_salarial_concepto` | TEXT | Concepto del auxilio salarial | `Transporte` |
| `auxilio_no_salarial` | NUMERIC(14,2) | Auxilio no salarial | `100000.00` |
| `auxilio_no_salarial_concepto` | TEXT | Concepto del auxilio no salarial | `Alimentación` |
| `auxilio_transporte` | NUMERIC(14,2) | Auxilio de transporte mensual | `140606.00` |
| `tiene_condicion_medica` | BOOLEAN | Indica si tiene condición médica especial | `false` |
| `condicion_medica_detalle` | TEXT | Descripción de la condición médica | `NULL` |
| `beneficiario_hijo` | INTEGER | Número de hijos beneficiarios | `2` |
| `beneficiario_madre` | INTEGER | Madre beneficiaria (0/1) | `1` |
| `beneficiario_padre` | INTEGER | Padre beneficiario (0/1) | `0` |
| `beneficiario_conyuge` | INTEGER | Cónyuge beneficiario (0/1) | `1` |
| `fecha_solicitud` | DATE | Fecha de solicitud | `2025-01-10` |
| `fecha_radicado` | DATE | Fecha de radicado | `2025-01-12` |
| `programacion_cita_examenes` | BOOLEAN | Programación de exámenes | `true` |
| `examenes` | BOOLEAN | Exámenes realizados | `false` |
| `examenes_fecha` | DATE | Fecha de exámenes médicos | `2025-01-15` |
| `solicitud_inscripcion_arl` | BOOLEAN | Solicitud inscripción ARL | `true` |
| `arl_nombre` | TEXT | Nombre de la ARL (confirmación inferida si tiene datos) | `Positiva` |
| `arl_fecha_confirmacion` | DATE | Fecha confirmación ARL | `2025-01-15` |
| `envio_contrato` | BOOLEAN | Contrato enviado | `true` |
| `recibido_contrato_firmado` | BOOLEAN | Contrato firmado recibido | `false` |
| `contrato_fecha_confirmacion` | DATE | Fecha confirmación contrato | `2025-01-15` |
| `solicitud_eps` | BOOLEAN | Solicitud EPS | `true` |
| `eps_fecha_confirmacion` | DATE | Fecha confirmación EPS (confirmación inferida si tiene datos) | `2025-01-15` |
| `envio_inscripcion_caja` | BOOLEAN | Envío a caja | `false` |
| `caja_fecha_confirmacion` | DATE | Fecha confirmación caja (confirmación inferida si tiene datos) | `2025-01-15` |
| `solicitud_cesantias` | BOOLEAN | Solicitud cesantías (confirmación inferida si tiene fondo + fecha) | `false` |
| `fondo_cesantias` | TEXT | Fondo de cesantías | `Protección` |
| `cesantias_fecha_confirmacion` | DATE | Fecha confirmación cesantías | `2025-01-15` |
| `solicitud_fondo_pension` | BOOLEAN | Solicitud fondo pensión (confirmación inferida si tiene fondo + fecha) | `false` |
| `fondo_pension` | TEXT | Fondo de pensión | `Porvenir` |
| `pension_fecha_confirmacion` | DATE | Fecha confirmación pensión | `2025-01-15` |
| `dropbox` | TEXT | URL de soporte en Dropbox | `https://dropbox.com/folder/contract-001` |
| `radicado_eps` | TEXT | Radicado EPS | `RAD-EPS-2025-001` |
| `radicado_ccf` | TEXT | Radicado CCF | `RAD-CCF-2025-001` |
| `observacion` | TEXT | Observaciones adicionales | `Pendiente documentos` |
| `status_aprobacion` | TEXT | Estado de aprobación (borrador, aprobado) | `borrador` |
| `approved_at` | TIMESTAMPTZ | Fecha de aprobación | `2025-01-15 16:30:00` |
| `approved_by` | UUID (FK) | Usuario que aprobó el contrato | `user-uuid` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Relaciones:**
- `empresa_final_id` → `companies(id)`
- `created_by` → `auth.users(id)`
- `updated_by` → `auth.users(id)`
- `approved_by` → `auth.users(id)`

**Restricciones:**
- `UNIQUE(numero_contrato_helisa)` - Número de contrato único
- Validación de email y URL de Dropbox
- Lógica de fecha_fin: obligatoria excepto para contratos indefinidos
- Beneficiarios: madre, padre, cónyuge solo pueden ser 0 o 1
- Estado de aprobación: solo puede ser 'borrador' o 'aprobado'
- Lógica de aprobación: una vez aprobado no se puede editar ni eliminar
- **ACTUALIZADO:** Los campos dropdown ahora permiten texto libre (sin restricciones CHECK)

**Índices:**
- `idx_contracts_numero_contrato_helisa` - Búsqueda por número de contrato
- `idx_contracts_numero_identificacion` - Búsqueda por identificación
- `idx_contracts_empresa_final_id` - Filtro por empresa
- `idx_contracts_nombres` - Búsqueda por nombres
- `idx_contracts_fecha_ingreso` - Filtro por fecha de ingreso

**Seguridad RLS:**
- **Ver:** Usuarios con permiso `contracts.view`
- **Crear:** Usuarios con permiso `contracts.create`
- **Editar:** Usuarios con permiso `contracts.edit`
- **Eliminar:** Usuarios con permiso `contracts.delete`

**Computed Columns:**
- `contracts_created_by_handle(contract)` - Handle del creador
- `contracts_updated_by_handle(contract)` - Handle del editor
- `contracts_full_name(contract)` - Nombre completo del empleado
- `contracts_onboarding_progress(contract)` - Progreso de onboarding (0-100) **SIMPLIFICADO**
- `get_contract_full_status(contract)` - Estado completo con flags de permisos

**Funciones del Sistema de Estados:**
- `calculate_contract_status_vigencia(fecha_fin)` - Calcula si está activo/terminado
- `approve_contract(contract_id, user_id)` - Función segura para aprobar contratos

**Triggers:**
- `trigger_contracts_updated_at` - Actualiza automáticamente `updated_at` y `updated_by`

---

## 🎯 CAMBIOS v2.1 - ONBOARDING SIMPLIFICADO

### ✅ **Columnas ELIMINADAS (redundantes):**
- ❌ `inscripcion_arl` - Confirmación inferida por `arl_nombre` + `arl_fecha_confirmacion`
- ❌ `confirmacion_eps` - Confirmación inferida por `radicado_eps` + `eps_fecha_confirmacion`
- ❌ `confirmacion_inscripcion_caja` - Confirmación inferida por `radicado_ccf` + `caja_fecha_confirmacion`

### 🔄 **Nueva Lógica de Confirmación:**

**Estado de cada proceso:**
- **🔵 No Solicitado:** Campo boolean = false
- **🟡 Solicitado pero Sin Confirmar:** Campo boolean = true, pero sin datos adicionales
- **🟢 Confirmado:** Campo boolean = true + datos completos (texto + fecha)

**Ejemplos:**
```sql
-- ARL No Solicitado
solicitud_inscripcion_arl = false

-- ARL Solicitado pero Sin Confirmar  
solicitud_inscripcion_arl = true
arl_nombre = NULL
arl_fecha_confirmacion = NULL

-- ARL Confirmado
solicitud_inscripcion_arl = true
arl_nombre = 'Positiva'
arl_fecha_confirmacion = '2025-01-15'
```

### 📊 **Función de Progreso Actualizada:**

La función `contracts_onboarding_progress()` ahora calcula 12 pasos:
- Exámenes (2): Programación + Realización
- Contratos (2): Envío + Firma
- ARL (2): Solicitud + Confirmación (por datos)
- EPS (2): Solicitud + Confirmación (por datos)
- Caja (2): Envío + Confirmación (por datos)
- Cesantías (1): Completado (por datos)
- Pensión (1): Completado (por datos)

---

## 📋 MIGRACIÓN CONSOLIDADA

La migración consolidada `00000000000000_initial_schema_consolidated.sql` contiene:

✅ **Estado completo del sistema (v2.1)**
- Todas las tablas: `permissions`, `user_permissions`, `companies`, `contracts`
- Todas las funciones helper con SECURITY DEFINER
- Políticas RLS completas y optimizadas
- Permisos iniciales (sin módulo employees)
- Computed columns para handles de usuario
- Índices optimizados para rendimiento
- Triggers de auditoría automática
- **NUEVO:** Onboarding simplificado sin columnas redundantes

✅ **Listo para producción**
- Idempotente: ejecutable múltiples veces sin problemas
- Comentado completamente
- Verificaciones incluidas
- GRANTs configurados correctamente

---

## 🗂️ Tablas Auxiliares Administrativas

### 5. `ciudades` – Ciudades Principales

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440002` |
| `nombre` | TEXT | Nombre de la ciudad | `Bogotá` |
| `es_activa` | BOOLEAN | Si está disponible para nuevas asignaciones | `true` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Restricciones:**
- `UNIQUE(nombre)` - Nombre único por ciudad
- Validación de nombre no vacío

**Soft Delete:**
- `es_activa = false` desactiva la ciudad pero preserva historial

### 6. `cajas_compensacion` – Cajas de Compensación Familiar

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440003` |
| `nombre` | TEXT | Nombre de la caja | `Colsubsidio` |
| `ciudad_id` | UUID (FK) | Ciudad donde opera | `ciudad-uuid` |
| `es_activa` | BOOLEAN | Si está disponible para nuevas asignaciones | `true` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Relaciones:**
- `ciudad_id` → `ciudades(id)` ON DELETE CASCADE

**Restricciones:**
- `UNIQUE(nombre, ciudad_id)` - Una caja por nombre y ciudad
- Validación de nombre no vacío

**Soft Delete:**
- `es_activa = false` desactiva la caja pero preserva historial

### 7. `arls` – Administradoras de Riesgos Laborales

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440004` |
| `nombre` | TEXT | Nombre de la ARL | `ARL SURA` |
| `es_activa` | BOOLEAN | Si está disponible para nuevas asignaciones | `true` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Restricciones:**
- `UNIQUE(nombre)` - Nombre único por ARL
- Validación de nombre no vacío

**Soft Delete:**
- `es_activa = false` desactiva la ARL pero preserva historial

### 8. `fondos_cesantias` – Fondos de Cesantías

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440005` |
| `nombre` | TEXT | Nombre del fondo | `Porvenir` |
| `es_activa` | BOOLEAN | Si está disponible para nuevas asignaciones | `true` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Restricciones:**
- `UNIQUE(nombre)` - Nombre único por fondo
- Validación de nombre no vacío

**Soft Delete:**
- `es_activa = false` desactiva el fondo pero preserva historial

### 9. `fondos_pension` – Fondos de Pensión

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440006` |
| `nombre` | TEXT | Nombre del fondo | `Protección` |
| `es_activa` | BOOLEAN | Si está disponible para nuevas asignaciones | `true` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Restricciones:**
- `UNIQUE(nombre)` - Nombre único por fondo
- Validación de nombre no vacío

**Soft Delete:**
- `es_activa = false` desactiva el fondo pero preserva historial

### 10. `eps` – Entidades Promotoras de Salud

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440007` |
| `nombre` | TEXT | Nombre de la EPS | `EPS Sura` |
| `es_activa` | BOOLEAN | Si está disponible para nuevas asignaciones | `true` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Restricciones:**
- `UNIQUE(nombre)` - Nombre único por EPS
- Validación de nombre no vacío

**Soft Delete:**
- `es_activa = false` desactiva la EPS pero preserva historial

## 🔐 Seguridad RLS - Tablas Auxiliares

**Todas las tablas auxiliares tienen:**
- **Ver:** `has_permission(auth.uid(), 'tablas_auxiliares', 'view')`
- **Crear:** `has_permission(auth.uid(), 'tablas_auxiliares', 'create')`
- **Editar:** `has_permission(auth.uid(), 'tablas_auxiliares', 'edit')`
- **Eliminar:** `has_permission(auth.uid(), 'tablas_auxiliares', 'delete')`

**Triggers:**
- `update_auxiliary_tables_updated_at()` - Actualiza automáticamente `updated_at` y `updated_by`

## 📊 Datos Precargados

Las tablas auxiliares incluyen datos iniciales del sistema colombiano:
- **29 ciudades principales**
- **45 cajas de compensación** (relacionadas con ciudades)
- **8 ARLs principales**
- **5 fondos de cesantías**
- **5 fondos de pensión**
- **28 EPS disponibles**

---

## 🏢 Sistema de Líneas de Negocio

### 11. `lineas_negocio` – Catálogo de Líneas de Negocio

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440008` |
| `nombre` | TEXT | Nombre de la línea de negocio | `Legal Laboral` |
| `descripcion` | TEXT | Descripción detallada del servicio | `Asesoría jurídica especializada en derecho laboral` |
| `es_activa` | BOOLEAN | Si está disponible para asignar | `true` |
| `color_hex` | TEXT | Color para UI (formato hexadecimal) | `#004C4C` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Relaciones:**
- `created_by` → `auth.users(id)`
- `updated_by` → `auth.users(id)`

**Restricciones:**
- `UNIQUE(nombre)` - Nombre único por línea de negocio
- Validación de nombre y descripción no vacíos
- Validación de formato color hexadecimal (#RRGGBB)

### 12. `linea_negocio_responsables` – Responsables de Líneas de Negocio

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440009` |
| `linea_negocio_id` | UUID (FK) | Línea de negocio asignada | `linea-uuid` |
| `user_id` | UUID (FK) | Usuario responsable | `user-uuid` |
| `es_asignado_principal` | BOOLEAN | Si es el responsable principal | `true` |
| `fecha_asignacion` | TIMESTAMPTZ | Fecha de asignación | `2025-01-15 10:00:00` |
| `asignado_por` | UUID (FK) | Usuario que realizó la asignación | `admin-uuid` |
| `es_activo` | BOOLEAN | Si la asignación está activa | `true` |

**Relaciones:**
- `linea_negocio_id` → `lineas_negocio(id)` ON DELETE CASCADE
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `asignado_por` → `auth.users(id)`

**Restricciones:**
- `UNIQUE(linea_negocio_id, user_id)` - Un responsable por línea de negocio
- Lógica de asignación: siempre debe haber un asignado principal por línea

### 13. `empresa_lineas_negocio` – Líneas de Negocio por Empresa

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440010` |
| `empresa_id` | UUID (FK) | Empresa cliente | `company-uuid` |
| `linea_negocio_id` | UUID (FK) | Línea de negocio contratada | `linea-uuid` |
| `fecha_asignacion` | TIMESTAMPTZ | Fecha de asignación | `2025-01-15 10:00:00` |
| `asignado_por` | UUID (FK) | Usuario que realizó la asignación | `admin-uuid` |
| `es_activa` | BOOLEAN | Si el servicio está activo | `true` |

**Relaciones:**
- `empresa_id` → `companies(id)` ON DELETE CASCADE
- `linea_negocio_id` → `lineas_negocio(id)` ON DELETE CASCADE
- `asignado_por` → `auth.users(id)`

**Restricciones:**
- `UNIQUE(empresa_id, linea_negocio_id)` - Una línea por empresa
- Lógica de negocio: una empresa puede tener múltiples líneas de negocio

## 🔐 Seguridad RLS - Líneas de Negocio

**Todas las tablas de líneas de negocio tienen:**
- **Ver:** `has_permission(auth.uid(), '[tabla]', 'view')`
- **Crear:** `has_permission(auth.uid(), '[tabla]', 'create')`
- **Editar:** `has_permission(auth.uid(), '[tabla]', 'edit')`
- **Eliminar:** `has_permission(auth.uid(), '[tabla]', 'delete')`

**Triggers:**
- `trigger_lineas_negocio_updated_at` - Actualiza automáticamente `updated_at` y `updated_by`

## 📊 Funciones Helper - Líneas de Negocio

- `get_linea_negocio_responsables(linea_id)` - Obtiene responsables activos de una línea
- `get_empresa_lineas_negocio(empresa_id)` - Obtiene líneas de negocio de una empresa
- `get_empresas_por_linea_negocio(linea_id)` - Obtiene empresas con una línea específica

## 📋 Datos Precargados - Líneas de Negocio

Las líneas de negocio incluyen datos iniciales del sistema:
- **Legal Laboral** - Asesoría jurídica especializada (#004C4C)
- **Riesgos Laborales** - Gestión de SST y prevención (#065C5C)
- **Payroll** - Administración de nómina completa (#0A6A6A)
- **Selección** - Reclutamiento y evaluación de talento (#87E0E0)
- **Contratación y Administración** - Gestión integral de personal (#5FD3D2)
- **Temporales** - Suministro de personal temporal (#58BFC2)

---

## 🚀 MIGRACIÓN CONSOLIDADA v3.0

### Archivos de Migración Unificada

El sistema ahora utiliza **4 archivos de migración consolidados** que incluyen todo el schema:

1. **`00000000000000_initial_complete_schema.sql`** - Schema principal
   - ✅ Sistema de permisos (permissions, user_permissions)
   - ✅ Tabla de empresas (companies) con auditoría
   - ✅ Tabla de contratos (contracts) v2.1 completa
   - ✅ Tablas auxiliares (6 tablas)
   - ✅ Sistema de líneas de negocio (3 tablas)
   - ✅ Índices y foreign keys
   - ✅ Triggers de auditoría

2. **`00000000000001_initial_complete_schema_part2.sql`** - Funciones y lógica
   - ✅ Funciones helper con SECURITY DEFINER
   - ✅ Computed columns para companies y contracts
   - ✅ Funciones específicas de contratos
   - ✅ Funciones de líneas de negocio
   - ✅ Habilitación de RLS
   - ✅ Políticas principales

3. **`00000000000002_initial_complete_schema_part3.sql`** - RLS y permisos
   - ✅ Políticas RLS para tablas auxiliares
   - ✅ Políticas optimizadas para líneas de negocio
   - ✅ Permisos iniciales del sistema (40+ permisos)
   - ✅ Grants para rol authenticated

4. **`00000000000003_initial_complete_schema_data.sql`** - Datos y verificación
   - ✅ Datos iniciales del sistema colombiano
   - ✅ 29 ciudades + 39 cajas de compensación
   - ✅ 8 ARLs + 5 fondos + 28 EPS
   - ✅ 6 líneas de negocio predefinidas
   - ✅ Comentarios completos
   - ✅ Verificaciones post-migración

### Beneficios de la Consolidación

✅ **Idempotencia:** Ejecutable múltiples veces sin errores  
✅ **Completitud:** Todo el sistema en una sola migración  
✅ **Optimización:** RLS flexible para mejor usabilidad  
✅ **Datos:** Precargado con información del sistema colombiano  
✅ **Documentación:** Comentarios completos en todas las funciones  
✅ **Verificación:** Checks automáticos post-migración  
✅ **Vista Segura:** Vista `usuarios_basicos` para resolver problemas RLS del frontend  

### Instrucciones de Uso

```bash
# 1. Borrar base de datos actual
supabase db reset

# 2. Ejecutar migración consolidada
supabase db push

# 3. Crear primer super admin
supabase sql --db-url="your-db-url" --file=- <<EOF
SELECT create_super_admin('tu-user-id-aqui');
EOF

# 4. Verificar funcionamiento
supabase sql --db-url="your-db-url" --file=- <<EOF
SELECT my_permissions();
EOF
```

### Archivos Antiguos (Ya NO Usar)

Los siguientes archivos han sido **consolidados** y ya no se deben usar:
- ❌ `20250115000008_add_auxiliary_tables.sql`
- ❌ `20250115000009_add_business_lines.sql`
- ❌ `20250115000010_fix_business_lines_rls.sql`
- ❌ `20250115000011_fix_business_lines_issues.sql`
- ❌ `20250115000012_fix_rls_and_remove_color.sql`
- ❌ `20250115000013_fix_business_lines_company_permissions.sql`
- ❌ `20250115000014_comprehensive_business_lines_fix.sql`
- ❌ `20250115000015_add_business_lines_assignment_function.sql`
- ❌ `20250115999999_consolidated_schema_complete.sql`

### Estado Final del Sistema

**📊 Tablas:** 13 tablas principales con RLS habilitado  
**🔐 Permisos:** 40+ permisos granulares para todos los módulos  
**🏢 Empresas:** Gestión completa con líneas de negocio  
**📋 Contratos:** Sistema completo v2.1 con onboarding simplificado  
**🗂️ Auxiliares:** 6 tablas con datos del sistema colombiano  
**🎯 Líneas:** 6 líneas de negocio predefinidas con responsables  
**⚡ Performance:** Índices optimizados para consultas frecuentes  
**🔄 Auditoría:** Triggers automáticos en todas las tablas  

---

## 🔢 Tabla de Parámetros Anuales

### 12. `parametros_anuales` – Parámetros que Cambian Año a Año

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único | `550e8400-e29b-41d4-a716-446655440009` |
| `tipo_parametro` | TEXT | Tipo de parámetro | `salario_minimo`, `auxilio_transporte` |
| `año` | INTEGER | Año de vigencia | `2024`, `2025` |
| `valor_numerico` | DECIMAL(15,4) | Valor numérico del parámetro | `1300000`, `4.0`, `162000` |
| `valor_texto` | TEXT | Valor texto/JSON del parámetro | `false`, `{"0-1160000": 0}` |
| `tipo_dato` | TEXT | Tipo de dato del valor | `numerico`, `texto`, `booleano`, `json` |
| `unidad` | TEXT | Unidad del valor | `pesos`, `porcentaje`, `dias` |
| `descripcion` | TEXT | Descripción del parámetro | `Salario mínimo legal vigente` |
| `es_activo` | BOOLEAN | Si está activo | `true` |
| `fecha_vigencia_inicio` | DATE | Inicio de vigencia | `2024-01-01` |
| `fecha_vigencia_fin` | DATE | Fin de vigencia | `2024-12-31` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-15 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |
| `updated_at` | TIMESTAMPTZ | Fecha de última edición | `2025-01-15 14:30:00` |
| `updated_by` | UUID (FK) | Usuario que realizó la última edición | `user-uuid` |

**Restricciones:**
- `UNIQUE(tipo_parametro, año)` - Un parámetro por año
- Validación de año entre 2020-2050
- Validación de valor según tipo_dato
- Nombre de tipo_parametro no vacío

**Ejemplos de Uso:**
```sql
-- Obtener salario mínimo 2024
SELECT * FROM get_parametro_anual('salario_minimo', 2024);

-- Obtener auxilio de transporte año actual
SELECT * FROM get_parametro_anual('auxilio_transporte');
```

**Tipos de Parámetros Disponibles:**
- `salario_minimo` - Salario mínimo legal vigente
- `auxilio_transporte` - Auxilio de transporte
- `salario_integral` - Límite mínimo salario integral  
- `uvt` - Unidad de Valor Tributario

**Soft Delete:**
- `es_activo = false` desactiva el parámetro pero preserva historial

**RLS:**
- Mismas políticas que tablas auxiliares (`tablas_auxiliares.*`)

---

## 📋 Historial de Cambios Recientes

### 2025-01-15 - Migración 00000000000009
- ✅ **Campos dropdown liberados**: Eliminadas restricciones CHECK de:
  - `tipo_identificacion` - Ahora acepta cualquier texto
  - `empresa_interna` - Ahora acepta cualquier texto  
  - `tipo_contrato` - Ahora acepta cualquier texto
  - `tipo_salario` - Ahora acepta cualquier texto
- 🎯 **Propósito**: Permitir flexibilidad en los nombres mostrados en dropdowns

---

## 👤 Sistema de Perfiles de Usuario con Alias

### 14. `user_profiles` – Perfiles de Usuario con Alias

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `user_id` | UUID (PK) | Usuario de auth.users | `user-uuid` |
| `alias` | TEXT | Alias único para login | `jcanal`, `mperez` |
| `notification_email` | TEXT | Email real para notificaciones | `comercial@grupogood.co` |
| `display_name` | TEXT | Nombre para mostrar | `Juan Canal` |
| `is_temp_password` | BOOLEAN | Si tiene contraseña temporal | `true` |
| `temp_password_expires_at` | TIMESTAMPTZ | Cuándo expira la contraseña temporal | `2025-01-29 10:00:00` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-22 10:00:00` |
| `updated_at` | TIMESTAMPTZ | Fecha de actualización | `2025-01-22 14:30:00` |
| `created_by` | UUID (FK) | Usuario que creó el perfil | `admin-uuid` |
| `updated_by` | UUID (FK) | Usuario que actualizó el perfil | `admin-uuid` |

**Relaciones:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `created_by` → `auth.users(id)`
- `updated_by` → `auth.users(id)`

**Restricciones:**
- `UNIQUE(alias)` - Alias único por usuario
- Validación de email en `notification_email`
- Validación de formato de alias (solo letras, números, puntos, guiones)

**Propósito:** Permite login con alias en lugar de email, múltiples usuarios pueden compartir el mismo email de notificaciones.

### Funciones Helper - Perfiles de Usuario

- `get_user_id_by_alias(alias)` - Obtiene UUID por alias
- `get_alias_by_user_id(user_id)` - Obtiene alias por UUID
- `get_user_profile_by_alias(alias)` - Obtiene perfil completo por alias
- `get_all_user_profiles()` - Lista todos los perfiles con información de auth
- `mark_password_as_permanent(user_id)` - Marca contraseña como permanente
- `generate_internal_email(alias)` - Genera email interno único

### Sistema de Contraseñas Temporales

**Flujo:**
1. Admin crea usuario con alias + contraseña temporal
2. Usuario se loguea con alias + contraseña temporal
3. Sistema detecta `is_temp_password = true`
4. Fuerza cambio de contraseña antes de acceder
5. Marca `is_temp_password = false` al cambiar

**RLS:**
- **Ver:** Usuarios con permisos de gestión o propio perfil
- **Crear:** Usuarios con permisos de gestión
- **Editar:** Usuarios con permisos de gestión o propio perfil
- **Eliminar:** Solo super admins

---

---

## 🕒 Sistema de Períodos de Contratos Fijos

### 15. `historial_contratos_fijos` – Períodos de Contratos a Término Fijo

**Propósito:** Gestión completa del historial de períodos de contratos fijos, incluyendo períodos históricos y prórrogas.

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | UUID (PK) | Identificador único del período | `period-uuid-123` |
| `contract_id` | UUID (FK) | ID del contrato | `contract-uuid-456` |
| `numero_periodo` | INTEGER | Número secuencial del período | `1`, `2`, `3` |
| `fecha_inicio` | DATE | Fecha de inicio del período | `2024-01-01` |
| `fecha_fin` | DATE | Fecha de fin del período | `2024-12-31` |
| `tipo_periodo` | TEXT | Tipo de período | `inicial`, `prorroga_automatica`, `prorroga_acordada` |
| `es_periodo_actual` | BOOLEAN | Si es el período activo actual | `true`, `false` |
| `soporte_url` | TEXT | URL de documentos de soporte | `https://drive.google.com/...` |
| `observaciones` | TEXT | Observaciones del período | `Prórroga por necesidades del servicio` |
| `created_at` | TIMESTAMPTZ | Fecha de creación | `2025-01-22 10:00:00` |
| `created_by` | UUID (FK) | Usuario que creó el registro | `user-uuid` |

**Relaciones:**
- `contract_id` → `contracts(id)` (CASCADE DELETE)
- `created_by` → `auth.users(id)`

**Restricciones:**
- `numero_periodo > 0` - Número de período debe ser positivo
- `tipo_periodo IN ('inicial', 'prorroga_automatica', 'prorroga_acordada')` - Tipos válidos
- `fecha_inicio < fecha_fin` - Fechas válidas
- `UNIQUE(contract_id, numero_periodo)` - No duplicar números de período por contrato
- `UNIQUE(contract_id, es_periodo_actual)` - Solo un período actual por contrato (cuando es_periodo_actual = true)

**Índices:**
- `idx_historial_contratos_contract_periodo` - Búsqueda por contrato y período
- `idx_historial_contratos_fechas` - Búsqueda por fechas
- `idx_historial_contratos_periodo_actual` - Períodos actuales
- `idx_unique_periodo_actual` - Único período actual por contrato

**Funciones SQL Helper:**

#### `get_contract_fixed_status(contract_uuid UUID) → JSONB`
Obtiene el estado completo del historial de un contrato fijo.

**Retorna:**
```json
{
  "total_periodos": 3,
  "periodo_actual": 3,
  "dias_totales": 1095,
  "años_totales": 3.0,
  "proximo_periodo": 4,
  "debe_ser_indefinido": false,
  "alerta_legal": "ALERTA - Próximo período debe ser indefinido"
}
```

#### `create_contract_period(contract_uuid, fecha_inicio, fecha_fin, tipo_periodo, es_actual, user_id) → UUID`
Crea un nuevo período en el historial del contrato.

#### `extend_contract_period(contract_uuid, nueva_fecha_fin, tipo_periodo, motivo, user_id) → JSONB`
Extiende un contrato fijo con una nueva prórroga.

**Seguridad RLS:**
- **Ver:** Usuarios con permiso `contracts.view`
- **Crear:** Usuarios con permiso `contracts.create` 
- **Editar:** Usuarios con permiso `contracts.edit`
- **Eliminar:** Usuarios con permiso `contracts.delete`

**Triggers:**
- Validación automática de fechas y períodos
- Mantenimiento de integridad referencial
- Auditoría de cambios

---

*Sistema consolidado GOOD Talent v4.2 - Con Sistema de Períodos de Contratos Fijos + Alias de Usuario + Grupos Empresariales*