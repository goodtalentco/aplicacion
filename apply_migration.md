# 🚀 Aplicar Migración de Estados de Contratos

## 📋 Pasos para ejecutar la migración:

### 1. Conectar a Supabase
1. Ve a tu dashboard de Supabase
2. Abre el SQL Editor
3. Copia y pega el contenido de: `supabase/migrations/20250115000002_add_contract_status_system.sql`

### 2. Ejecutar la migración
```sql
-- Pega todo el contenido del archivo de migración aquí
-- La migración incluye:
-- ✅ Nuevas columnas (status_aprobacion, approved_at, approved_by)
-- ✅ Funciones para calcular estados
-- ✅ Función segura para aprobar contratos
-- ✅ Índices para performance
-- ✅ Migración de datos existentes (todos se marcan como 'aprobado')
```

### 3. Verificar la migración
Ejecuta esta consulta para verificar que todo funcionó:
```sql
SELECT 
  id,
  primer_nombre,
  primer_apellido,
  status_aprobacion,
  approved_at,
  approved_by,
  calculate_contract_status_vigencia(fecha_fin) as status_vigencia
FROM contracts 
LIMIT 5;
```

### 4. Probar funciones
```sql
-- Verificar función de estado completo
SELECT get_contract_full_status(c.*) FROM contracts c LIMIT 1;

-- Probar aprobación (reemplaza 'contract-id' y 'user-id')
SELECT approve_contract('contract-id', 'user-id');
```

## 🎯 Resultados esperados:
- ✅ Todos los contratos existentes tendrán `status_aprobacion = 'aprobado'`
- ✅ Los nuevos contratos empezarán como `'borrador'`
- ✅ El frontend mostrará badges de estado correctamente
- ✅ Los contratos aprobados serán de solo lectura
- ✅ Los borradores tendrán botón de aprobación

## 🔧 Si hay problemas:
1. **Error "Cannot read properties of undefined"**: La migración no se ha ejecutado aún
2. **Error de permisos**: Asegúrate de tener permisos de administrador en Supabase
3. **Frontend no actualiza**: Limpia el cache en el navegador (F5 o Ctrl+Shift+R)

## 📱 Después de la migración:
1. Refresca la página de contratos
2. Verifica que aparecen los badges de estado
3. Crea un nuevo contrato (debería estar en "borrador")
4. Prueba el botón "Aprobar Contrato"
