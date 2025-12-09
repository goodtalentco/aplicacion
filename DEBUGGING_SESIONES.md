# 🔍 Guía de Debugging de Sesiones - GOOD Talent

## 📋 Cambios Implementados

### ✅ FASE 1: Cambios Ultra-Seguros + Sistema de Debugging

Se implementaron mejoras que **NO rompen funcionalidad existente** pero añaden:

1. **Configuración explícita de Supabase** - Garantiza comportamiento consistente
2. **Refresh de sesión más proactivo** - 10 minutos en vez de 5 minutos
3. **Sistema completo de debugging** - Visibilidad total del estado de la sesión
4. **Tracking de visibilidad** - Detecta y maneja inactividad del usuario

---

## 🎯 Objetivo

Diagnosticar y resolver el problema de "congelamiento" que ocurre después de ~5 minutos de inactividad en producción (Vercel).

---

## 🛠️ Cómo Usar el Sistema de Debugging

### 1️⃣ **Durante Testing en Producción**

Después de deployar a Vercel:

1. Abre la aplicación en el navegador
2. Abre **DevTools** (F12) → pestaña **Console**
3. Deja el navegador/pestaña inactivo por **5-10 minutos**
4. Regresa y trata de usar la aplicación
5. Revisa los logs en la consola

---

### 2️⃣ **Comandos Disponibles en la Consola**

El sistema expone comandos globales para debugging manual:

```javascript
// Ver resumen de logs (errores y advertencias recientes)
window.sessionDebug.summary()

// Ver todos los logs almacenados
window.sessionDebug.logs()

// Exportar logs como texto (para compartir)
window.sessionDebug.export()

// Limpiar logs
window.sessionDebug.clear()
```

---

### 3️⃣ **Tipos de Logs que Verás**

#### 🟢 **Eventos Normales** (todo funciona)
```
🟢 [SessionDebug] 14:23:15 - Cliente Supabase inicializado
🟢 [SessionDebug] 14:23:16 - Sesión inicializada
🔵 [SessionDebug] 14:28:16 - Verificación de sesión (intervalo)
```

#### ⚠️ **Advertencias** (atención pero no crítico)
```
⚠️ [SessionDebug] 14:30:00 - Usuario inactivo detectado
   └─ { inactiveDuration: "300s (5m 0s)", tabHidden: true }

⚠️ [SessionDebug] 14:35:00 - Sesión próxima a expirar
```

#### 🔴 **Errores Críticos** (aquí está el problema)
```
🔴 [SessionDebug] 14:35:20 - ❌ REFRESH DE SESIÓN FALLÓ
   └─ { error: "Network timeout", timestamp: "..." }

🔴 [SessionDebug] 14:35:25 - 🚨 PROBLEMA DETECTADO: Sesión perdida
   └─ { lastError: {...}, inactiveTime: 325, lastActivity: "..." }
```

---

### 4️⃣ **Qué Buscar en los Logs**

#### ✅ **Escenario Ideal** (problema resuelto)
```
🟢 Sesión inicializada
🔵 Verificaciones periódicas exitosas
⏸️  Pestaña oculta (usuario inactivo)
⚠️ Usuario inactivo detectado (300s)
🔵 Intentando refrescar sesión (Quedan 580s...)
🟢 Sesión refrescada exitosamente
👁️ Usuario regresó a la pestaña
🟢 Sesión válida al regresar
```

#### ❌ **Escenario Problemático** (aún hay issues)
```
🟢 Sesión inicializada
⏸️  Pestaña oculta
⚠️ Usuario inactivo detectado (350s)
🔵 Intentando refrescar sesión
🔴 ❌ REFRESH DE SESIÓN FALLÓ
🔴 🚨 PROBLEMA DETECTADO: Sesión perdida
```

---

## 📊 Interpretación de Resultados

### **Caso A: Todo funciona después del deploy**

Si los logs muestran:
- ✅ Refreshes exitosos durante inactividad
- ✅ Sesión válida al regresar
- ✅ No hay errores de refresh

**→ PROBLEMA RESUELTO** ✅

---

### **Caso B: Aún hay problemas**

Si los logs muestran:
- ❌ Refreshes fallidos
- ❌ "Sesión perdida" después de inactividad
- ❌ Errores de red durante refresh

**→ Necesitamos analizar más:**

1. **Copia los logs completos:**
   ```javascript
   console.log(window.sessionDebug.export())
   ```

2. **Busca patrones:**
   - ¿A qué tiempo exacto falla? (¿siempre a los 5 min?)
   - ¿Qué error específico da el refresh?
   - ¿La sesión existe antes del refresh fallido?

3. **Comparte los logs** para análisis adicional

---

## 🔧 Cambios Técnicos Implementados

### 1. **supabaseClient.ts**
```typescript
// ANTES (implícito)
export const supabase = createClient(url, key)

// AHORA (explícito)
export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,      // ✅ Refresh automático
    persistSession: true,         // ✅ Persistir en localStorage
    detectSessionInUrl: true,     // ✅ Detectar en callbacks
    flowType: 'pkce'             // ✅ Flow seguro
  }
})
```

### 2. **PermissionsProvider.tsx**
- ✅ Refresh cuando quedan **10 minutos** (antes: 5 minutos)
- ✅ Tracking de tiempo de inactividad
- ✅ Logging detallado de cada operación
- ✅ Detección de problemas en tiempo real

### 3. **dashboard/layout.tsx**
- ✅ Listener de `visibilitychange`
- ✅ Verificación activa al regresar después de inactividad
- ✅ Refresh proactivo si la sesión está cerca de expirar

### 4. **sessionDebugger.ts** (NUEVO)
- ✅ Sistema centralizado de logs
- ✅ Formateo bonito en consola
- ✅ Almacenamiento en localStorage
- ✅ Comandos de debugging manual

---

## 📱 Testing Recomendado

### **Test 1: Inactividad de Pestaña**
1. Login en la app
2. Cambiar a otra pestaña/app
3. Esperar 5-7 minutos
4. Volver a la pestaña
5. Intentar interactuar
6. **Resultado esperado:** La app responde sin "congelamiento"

### **Test 2: Inactividad Prolongada**
1. Login en la app
2. Dejar pestaña visible pero sin tocar
3. Esperar 10-15 minutos
4. Intentar interactuar
5. **Resultado esperado:** La app responde normalmente

### **Test 3: Incógnito**
1. Abrir en modo incógnito
2. Login
3. Inactivo 5 minutos
4. Intentar usar
5. **Resultado esperado:** Funciona igual que en test 1

---

## 🚀 Próximos Pasos

### **Si el problema persiste:**

Implementaremos **FASE 2**:
- Estrategia de retry más agresiva
- Recuperación automática de sesión
- Fallback a re-login automático
- Sincronización de cache con sesión

### **Si el problema se resuelve:**

Podemos:
- Mantener el debugging activo 1-2 semanas
- Luego reducir verbosidad de logs
- Documentar la solución
- Considerar desactivar logs en producción (opcional)

---

## 💡 Tips para Debugging

1. **Mantén DevTools abierto** durante las pruebas
2. **No recargues la página** inmediatamente si hay problema - revisa logs primero
3. **Copia los logs ANTES de cerrar** la ventana
4. **Prueba en diferentes navegadores** (Chrome, Edge, Firefox)
5. **Prueba en mobile** también (DevTools remoto)

---

## 📞 Soporte

Si encuentras logs confusos o comportamiento inesperado:
1. Ejecuta `window.sessionDebug.summary()`
2. Copia el output
3. Ejecuta `window.sessionDebug.export()`
4. Comparte ambos outputs para análisis

---

## ⚡ Desactivar Debugging (Futuro)

Si quieres desactivar los logs después de resolver:

En `frontend/lib/sessionDebugger.ts`:
```typescript
const defaultConfig: DebugConfig = {
  enabled: false, // Cambiar a false
  // ...
}
```

O hacerlo condicional:
```typescript
enabled: process.env.NODE_ENV === 'development',
```

---

**Última actualización:** 2 de octubre, 2025
**Versión:** 1.0 - FASE 1 implementada

