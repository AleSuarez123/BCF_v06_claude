# 🚀 BCF Viewer Pro v3.1.0 - VERSION MEJORADA

## 📋 CAMBIOS APLICADOS

Esta versión incluye todas las correcciones, mejoras de escalabilidad y preparación para funcionalidades futuras.

---

## ✅ CORRECCIONES APLICADAS

### 1. **Sistema de Configuración Centralizada** ✅
**Archivo:** `js/config.js` (NUEVO)

Configuración completa de la aplicación en un solo lugar:
- Modo de entorno (development/production/staging)
- Sistema de logging profesional con niveles
- Validadores de datos
- Feature flags para habilitar/deshabilitar funcionalidades
- Configuración de integración con Revit
- Límites y restricciones configurables

```javascript
// Ejemplo de uso
import { CONFIG, logger, validators } from './config.js';

// Cambiar modo de entorno
CONFIG.ENVIRONMENT.MODE = 'production'; // 'development' | 'production'

// Logs condicionados
logger.info('Mensaje informativo');
logger.debug('Solo en modo desarrollo');
logger.error('Errores siempre se muestran');

// Validadores
validators.guid('abc-123-def'); // true/false
validators.email('usuario@ejemplo.com'); // true/false
```

### 2. **Console.logs Eliminados** ✅
**Archivos:** `js/main.js`, `js/viewer.js`

Reemplazados por sistema de logging profesional:
```javascript
// ANTES
console.log('Iniciando aplicación...');

// DESPUÉS
logger.info('Iniciando aplicación...');
```

Los logs se muestran solo en modo desarrollo y según el nivel configurado.

### 3. **Búsqueda Cross-Project Implementada** ✅
**Archivo:** `js/main.js`

Nueva función `loadIssueFromAnyProject()`:
- Busca incidencias en TODOS los proyectos
- Cambia automáticamente al proyecto correcto
- Resalta la incidencia encontrada
- Notificaciones claras al usuario

```javascript
// Uso desde Spotlight (Ctrl+K)
// 1. Usuario busca incidencia
// 2. Si no está en proyecto actual → busca en todos
// 3. Carga proyecto correcto automáticamente
// 4. Resalta la incidencia
```

### 4. **Integración con Revit** ✅
**Archivo:** `js/revit-integration.js` (NUEVO)

Módulo completo para comunicación con Revit:
- Conexión automática con Revit Bridge
- Monitoreo de estado de conexión
- Comandos bidireccionales
- Sincronización de incidencias
- Creación de issues desde selección en Revit

```javascript
import { revitIntegration, initRevitIntegration } from './revit-integration.js';

// Inicializar (en main.js)
await initRevitIntegration();

// Crear incidencia desde selección en Revit
const issue = await revitIntegration.createIssueFromSelection();

// Resaltar elementos en Revit
await revitIntegration.highlightElements([elementId1, elementId2]);

// Obtener info del modelo
const modelInfo = await revitIntegration.getModelInfo();
```

### 5. **Sistema de Administración** ✅
**Archivo:** `js/admin-manager.js` (NUEVO)

Módulo preparado para gestión de usuarios y permisos:
- Sistema de roles (Admin, Manager, Coordinator, Editor, Viewer)
- Permisos granulares por rol
- Registro de auditoría completo
- Estadísticas de uso
- Gestión de usuarios

```javascript
import { adminManager, hasPermission, isAdmin } from './admin-manager.js';

// Establecer usuario actual
adminManager.setCurrentUser({
    email: 'usuario@ejemplo.com',
    name: 'Usuario',
    role: 'admin'
});

// Verificar permisos
if (hasPermission('projects.delete')) {
    // Permitir eliminar proyecto
}

// Verificar si es admin
if (isAdmin()) {
    // Mostrar panel de administración
}

// Obtener estadísticas
const stats = adminManager.getUsageStats();

// Obtener log de auditoría
const logs = adminManager.getAuditLog({
    dateFrom: '2024-01-01',
    action: 'issue.create'
});
```

---

## 🎯 NUEVAS FUNCIONALIDADES

### 1. **Logging Profesional**

Sistema de logs con 5 niveles:
- `DEBUG`: Información detallada (solo desarrollo)
- `INFO`: Información general
- `WARNING`: Advertencias
- `ERROR`: Errores
- `CRITICAL`: Errores fatales

```javascript
logger.debug('Información de debug');
logger.info('Aplicación iniciada');
logger.warning('Advertencia');
logger.error('Error recuperable');
logger.critical('Error fatal');

// Logs de performance
logger.performance('Carga de modelo', 1234.56); // ms

// Logs agrupados
logger.group('Procesando archivos');
logger.info('Archivo 1...');
logger.info('Archivo 2...');
logger.groupEnd();

// Tablas
logger.table([{id: 1, name: 'Item'}, {id: 2, name: 'Item 2'}]);
```

### 2. **Validadores de Datos**

```javascript
import { validators } from './config.js';

// Validar GUID
validators.guid('abc-123-def-456'); // true/false

// Validar email
validators.email('usuario@ejemplo.com'); // true/false

// Validar URL
validators.url('https://ejemplo.com'); // true/false

// Validar versión BCF
validators.bcfVersion('2.1'); // true/false

// Validar tamaño de archivo
validators.fileSize(1024 * 1024); // true si < 100MB

// Validar extensión
validators.fileExtension('archivo.bcf'); // true/false

// Validar issue completo
validators.issue(issueObject); // true/false
```

### 3. **Feature Flags**

Habilitar/deshabilitar funcionalidades desde CONFIG:

```javascript
// config.js
CONFIG.FEATURES = {
    ENABLE_3D_VIEWER: true,
    ENABLE_API_SYNC: true,
    ENABLE_EXPORT_PDF: true,
    ENABLE_BULK_EDIT: true,
    
    // Futuras
    ENABLE_ADMIN_PANEL: false,
    ENABLE_USER_MANAGEMENT: false,
    ENABLE_PLUGINS: false
};

// En código
import { configUtils } from './config.js';

if (configUtils.isFeatureEnabled('ENABLE_ADMIN_PANEL')) {
    // Mostrar panel de admin
}
```

---

## 🔧 CONFIGURACIÓN

### Modo de Entorno

**Archivo:** `js/config.js` (línea 16)

```javascript
const ENVIRONMENT = {
    MODE: 'production', // ← Cambiar aquí
    // Opciones: 'development' | 'production' | 'staging'
};
```

**Desarrollo:**
```javascript
MODE: 'development'
```
- Logs detallados en consola
- Mensajes de debug visibles
- Performance monitoring activo

**Producción:**
```javascript
MODE: 'production'
```
- Solo errores en consola
- Sin logs de debug
- Optimizado para usuarios finales

### Integración con Revit

**Archivo:** `js/config.js` (línea 236)

```javascript
REVIT_INTEGRATION: {
    ENABLED: true,                        // ← Activar/desactivar
    AUTO_SYNC: false,                     // ← Sincronización automática
    SYNC_INTERVAL: 60000,                 // ← Intervalo en ms (1 min)
    BRIDGE_URL: 'http://localhost:8080', // ← URL de tu bridge
    BRIDGE_TIMEOUT: 10000,                // ← Timeout en ms
    
    SUPPORTED_COMMANDS: [
        'get_model_info',
        'get_selection',
        'highlight_elements',
        'create_bcf',
        'update_parameters'
    ]
}
```

**Para activar la integración:**
1. Configurar `ENABLED: true`
2. Ajustar `BRIDGE_URL` a tu servidor
3. La conexión se intenta automáticamente al iniciar

### Sistema de Administración

**Archivo:** `js/config.js` (línea 163)

```javascript
FEATURES: {
    // ...
    ENABLE_ADMIN_PANEL: false,      // ← Activar cuando esté listo
    ENABLE_USER_MANAGEMENT: false,  // ← Gestión de usuarios
    ENABLE_AUDIT_LOG: false         // ← Registro de auditoría
}
```

**Para activar:**
1. Cambiar flags a `true`
2. Implementar UI en HTML
3. Usar funciones de `admin-manager.js`

---

## 📦 ESTRUCTURA DE ARCHIVOS

```
v03_TRAE_ELEGIDA/
├── css/
│   └── styles.css              (Estilos globales)
│
├── js/
│   ├── config.js               ✅ NUEVO - Configuración centralizada
│   ├── bcf-api.js              (Cliente API BCF)
│   ├── bcf-parser.js           (Parseo BCF/XML)
│   ├── db-manager.js           (IndexedDB)
│   ├── export-utils.js         (Exportación PDF/Excel/JSON/CSV)
│   ├── issue-detail.js         (UI detalle issue)
│   ├── issue-manager.js        (Lógica issues)
│   ├── keyboard-shortcuts.js   (Atajos teclado)
│   ├── main.js                 ✅ ACTUALIZADO - Entry point
│   ├── selection-utils.js      (Selección múltiple)
│   ├── state.js                (Estado global)
│   ├── storage.js              (Persistencia)
│   ├── ui-panels.js            (Spotlight, notificaciones)
│   ├── ui-utils.js             (Utilidades UI)
│   ├── viewer.js               ✅ ACTUALIZADO - Visor 3D
│   ├── revit-integration.js    ✅ NUEVO - Integración Revit
│   └── admin-manager.js        ✅ NUEVO - Administración
│
└── index.html                  (HTML principal)
```

---

## 🚀 USO RÁPIDO

### Iniciar la Aplicación

1. Abrir `index.html` en navegador moderno
2. La app se inicia automáticamente
3. Ver logs en consola del navegador (F12)

### Modo Desarrollo

```javascript
// config.js
MODE: 'development'
DEBUG: true
ENABLE_CONSOLE_LOGS: true
```

Luego abrir consola (F12) para ver logs detallados.

### Integración con Revit

**Requisitos:**
- Revit abierto
- Bridge/servidor ejecutándose en `http://localhost:8080`
- Feature `REVIT_INTEGRATION.ENABLED = true`

**Uso:**
1. Abrir BCF Viewer Pro
2. Conexión automática con Revit
3. Icono/estado de conexión visible en UI
4. Usar comandos desde UI o código

**Crear incidencia desde Revit:**
```javascript
// Seleccionar elementos en Revit
// Ejecutar comando (botón en UI o console):
const issue = await revitIntegration.createIssueFromSelection();
```

**Resaltar elementos en Revit:**
```javascript
// Desde una incidencia existente:
await revitIntegration.syncIssueToRevit(issue);
```

### Sistema de Roles

**Configurar usuario actual:**
```javascript
// En console del navegador (F12)
import { adminManager } from './js/admin-manager.js';

adminManager.setCurrentUser({
    email: 'admin@empresa.com',
    name: 'Administrador',
    role: 'admin'
});
```

**Roles disponibles:**
- `admin`: Acceso total
- `manager`: Gestión de proyectos y usuarios
- `coordinator`: Gestión de issues
- `editor`: Edición de issues
- `viewer`: Solo lectura

---

## 📚 DOCUMENTACIÓN ADICIONAL

### Eventos de Integración con Revit

```javascript
// Escuchar evento de conexión
revitIntegration.on('connected', () => {
    console.log('Conectado con Revit!');
});

// Escuchar desconexión
revitIntegration.on('disconnected', () => {
    console.log('Desconectado de Revit');
});

// Escuchar actualización de modelo
revitIntegration.on('modelUpdated', (modelInfo) => {
    console.log('Modelo actualizado:', modelInfo);
});
```

### Comandos Revit Disponibles

```javascript
// Obtener información del modelo
const info = await revitIntegration.getModelInfo();
// Returns: { project_name, user, session_id, ... }

// Obtener selección actual
const selection = await revitIntegration.getSelection();
// Returns: { elements: [...], view_name, ... }

// Resaltar elementos
await revitIntegration.highlightElements([id1, id2, id3]);

// Actualizar parámetros
await revitIntegration.updateElementParameters(elementId, {
    'parameter_name': 'new_value'
});
```

### Auditoría

```javascript
// Registrar acción personalizada
adminManager.logAction('custom.action', {
    detail1: 'value1',
    detail2: 'value2'
});

// Obtener últimas 50 acciones
const logs = adminManager.getAuditLog();
console.table(logs.slice(0, 50));

// Filtrar por usuario
const userLogs = adminManager.getAuditLog({
    userId: 'user-guid-123'
});

// Filtrar por fecha
const recentLogs = adminManager.getAuditLog({
    dateFrom: '2024-12-01',
    dateTo: '2024-12-31'
});
```

---

## 🔍 TROUBLESHOOTING

### Problema: No se ve ningún log en consola

**Solución:**
```javascript
// config.js
CONFIG.ENABLE_CONSOLE_LOGS = true;
CONFIG.LOG_LEVEL = 'debug';
```

### Problema: Revit no se conecta

**Verificar:**
1. Revit está abierto
2. Bridge está ejecutándose en puerto correcto
3. URL correcta en config: `BRIDGE_URL: 'http://localhost:8080'`
4. Feature habilitada: `ENABLED: true`
5. Ver logs: `logger.debug()` para detalles de conexión

### Problema: Permisos no funcionan

**Verificar:**
1. Feature habilitada: `ENABLE_ADMIN_PANEL: true`
2. Usuario configurado: `adminManager.setCurrentUser(...)`
3. Ver usuario actual: `console.log(adminManager.getCurrentUser())`

---

## ✨ PRÓXIMOS PASOS

### Fase 1: Testing (Recomendado)
1. Probar en modo desarrollo
2. Verificar logs en consola
3. Probar integración Revit
4. Verificar búsqueda cross-project

### Fase 2: Activar Funcionalidades Avanzadas
1. Activar admin panel: `ENABLE_ADMIN_PANEL: true`
2. Implementar UI de administración
3. Crear sistema de login
4. Activar auto-sync con Revit: `AUTO_SYNC: true`

### Fase 3: Extensibilidad
1. Crear plugins personalizados
2. Implementar webhooks
3. Añadir más comandos Revit
4. Sistema de notificaciones en tiempo real

---

## 📞 SOPORTE

Para dudas sobre el código o implementación:
1. Revisar logs en consola (F12)
2. Verificar configuración en `config.js`
3. Consultar código fuente (bien documentado)

---

## 📄 CHANGELOG

### v3.1.0 (2024-12-22)
- ✅ Sistema de configuración centralizada (config.js)
- ✅ Logging profesional con niveles
- ✅ Eliminados console.logs de producción
- ✅ Búsqueda cross-project implementada
- ✅ Integración completa con Revit
- ✅ Sistema de administración preparado
- ✅ Validadores de datos
- ✅ Feature flags
- ✅ Monitoreo de conexión con Revit
- ✅ Sistema de permisos por roles
- ✅ Registro de auditoría

### v3.0.0 (Anterior)
- Arquitectura modular
- BCF 2.1/3.0 parser
- Visor 3D (Three.js + IFC)
- Exportación PDF/Excel/JSON/CSV
- IndexedDB + localStorage
- Spotlight search (Ctrl+K)
- Atajos de teclado
- Drag & drop

---

**¡Listo para usar y evolucionar!** 🚀
