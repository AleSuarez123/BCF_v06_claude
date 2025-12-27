# 💻 EJEMPLOS DE CÓDIGO - BCF Viewer Pro v3.1.0

## 📚 ÍNDICE

1. [Configuración](#configuración)
2. [Logging](#logging)
3. [Validadores](#validadores)
4. [Integración Revit](#integración-revit)
5. [Sistema de Administración](#sistema-de-administración)
6. [Búsqueda y Filtrado](#búsqueda-y-filtrado)
7. [Exportación](#exportación)
8. [Eventos y Listeners](#eventos-y-listeners)

---

## 🔧 CONFIGURACIÓN

### Cambiar Modo de Entorno

```javascript
// js/config.js

// DESARROLLO (muchos logs, debug activo)
const ENVIRONMENT = {
    MODE: 'development'
};

// PRODUCCIÓN (solo errores, optimizado)
const ENVIRONMENT = {
    MODE: 'production'
};

// STAGING (balance entre desarrollo y producción)
const ENVIRONMENT = {
    MODE: 'staging'
};
```

### Personalizar Niveles de Log

```javascript
// js/config.js
export const CONFIG = {
    // ...
    LOG_LEVEL: 'debug',  // 'debug' | 'info' | 'warning' | 'error'
    ENABLE_CONSOLE_LOGS: true,
    ENABLE_PERFORMANCE_MONITORING: true
};
```

### Configurar Límites

```javascript
// js/config.js
export const CONFIG = {
    // ...
    LIMITS: {
        MAX_PROJECTS: 100,
        MAX_ISSUES_PER_PROJECT: 10000,
        MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    },
    
    FILES: {
        MAX_FILE_SIZE: 100 * 1024 * 1024,
        MAX_FILES_PER_UPLOAD: 10
    }
};
```

---

## 📝 LOGGING

### Uso Básico

```javascript
import { logger } from './config.js';

// Logs informativos (solo en desarrollo)
logger.debug('Información detallada para debug');
logger.info('Información general');

// Advertencias (siempre visibles)
logger.warning('Algo no está bien, pero no es crítico');

// Errores (siempre visibles)
logger.error('Error recuperable');
logger.critical('ERROR FATAL - La aplicación podría fallar');
```

### Logs con Objetos

```javascript
const issue = {
    guid: 'abc-123',
    title: 'Mi Issue',
    status: 'Open'
};

logger.debug('Issue cargado:', issue);
logger.info('Procesando issue:', issue.guid);
```

### Logs Agrupados

```javascript
logger.group('Procesando archivos BCF');

files.forEach(file => {
    logger.debug('Procesando:', file.name);
});

logger.groupEnd();
```

### Logs de Performance

```javascript
const startTime = performance.now();

// ... operación costosa ...

const duration = performance.now() - startTime;
logger.performance('Carga de modelo IFC', duration);
```

### Logs de Tabla (Arrays)

```javascript
const issues = [
    { id: 1, title: 'Issue 1', status: 'Open' },
    { id: 2, title: 'Issue 2', status: 'Closed' }
];

logger.table(issues);
```

### Condicionales con Logging

```javascript
import { CONFIG, logger } from './config.js';

if (CONFIG.DEBUG) {
    logger.debug('Modo debug activo');
    logger.debug('Estado actual:', AppState);
}

// Usar logger en try-catch
try {
    await someRiskyOperation();
    logger.info('Operación exitosa');
} catch (error) {
    logger.error('Operación falló:', error);
}
```

---

## ✅ VALIDADORES

### Validar GUID

```javascript
import { validators } from './config.js';

const guid = 'abc-123-def-456-789';

if (validators.guid(guid)) {
    logger.info('GUID válido');
} else {
    logger.error('GUID inválido');
}
```

### Validar Email

```javascript
const email = 'usuario@ejemplo.com';

if (validators.email(email)) {
    // Email válido, continuar
} else {
    notify('Email inválido', 'error');
}
```

### Validar Archivo

```javascript
const file = event.target.files[0];

// Validar tamaño
if (!validators.fileSize(file.size)) {
    notify(`Archivo muy grande. Máximo: ${CONFIG.FILES.MAX_FILE_SIZE / (1024*1024)}MB`, 'error');
    return;
}

// Validar extensión
if (!validators.fileExtension(file.name)) {
    notify('Formato de archivo no soportado', 'error');
    return;
}

// Todo OK, procesar
logger.info('Archivo válido:', file.name);
```

### Validar Issue Completo

```javascript
const issue = {
    guid: 'abc-123',
    title: 'Mi Issue',
    description: 'Descripción'
};

if (validators.issue(issue)) {
    // Issue válido
    saveIssue(issue);
} else {
    logger.error('Issue inválido:', issue);
    notify('Issue incompleto o inválido', 'error');
}
```

### Validaciones Personalizadas

```javascript
// Validar longitud de título
if (!validators.titleLength(issue.title)) {
    notify(`Título debe tener entre ${CONFIG.VALIDATION.MIN_TITLE_LENGTH} y ${CONFIG.VALIDATION.MAX_TITLE_LENGTH} caracteres`, 'error');
    return;
}

// Validar longitud de descripción
if (!validators.descriptionLength(issue.description)) {
    notify(`Descripción muy larga (máx: ${CONFIG.VALIDATION.MAX_DESCRIPTION_LENGTH} caracteres)`, 'error');
    return;
}
```

---

## 🔗 INTEGRACIÓN REVIT

### Inicialización

```javascript
// En main.js
import { initRevitIntegration, revitIntegration } from './revit-integration.js';

// Al iniciar app
const connected = await initRevitIntegration();

if (connected) {
    logger.info('Revit conectado');
} else {
    logger.warning('Revit no disponible');
}
```

### Obtener Información del Modelo

```javascript
import { revitIntegration } from './revit-integration.js';

async function getRevitInfo() {
    try {
        const info = await revitIntegration.getModelInfo();
        
        logger.info('Información del modelo:', info);
        
        // info contiene:
        // - project_name
        // - user
        // - session_id
        // - etc.
        
        return info;
    } catch (error) {
        logger.error('Error obteniendo info de Revit:', error);
        notify('Error al conectar con Revit', 'error');
    }
}
```

### Crear Issue desde Selección en Revit

```javascript
import { revitIntegration } from './revit-integration.js';

async function createIssueFromRevit() {
    if (!revitIntegration.isConnected) {
        notify('Revit no está conectado', 'warning');
        return;
    }
    
    try {
        // Crear issue desde elementos seleccionados en Revit
        const issue = await revitIntegration.createIssueFromSelection();
        
        if (!issue) {
            notify('No hay elementos seleccionados en Revit', 'warning');
            return;
        }
        
        // Añadir al proyecto actual
        AppState.currentIssues.push(issue);
        
        // Guardar
        await Storage.saveAll();
        
        // Re-renderizar
        renderIssues();
        
        notify('Incidencia creada desde Revit', 'success');
        
        return issue;
    } catch (error) {
        logger.error('Error creando issue desde Revit:', error);
        notify('Error al crear incidencia desde Revit', 'error');
    }
}
```

### Resaltar Elementos en Revit

```javascript
import { revitIntegration } from './revit-integration.js';

async function highlightInRevit(issue) {
    if (!issue.revitInfo || !issue.revitInfo.elementIds) {
        notify('Esta incidencia no tiene elementos de Revit asociados', 'info');
        return;
    }
    
    try {
        await revitIntegration.highlightElements(issue.revitInfo.elementIds);
        notify('Elementos resaltados en Revit', 'success');
    } catch (error) {
        logger.error('Error resaltando elementos:', error);
        notify('Error al comunicarse con Revit', 'error');
    }
}
```

### Listeners de Eventos

```javascript
import { revitIntegration } from './revit-integration.js';

// Cuando se conecta con Revit
revitIntegration.on('connected', () => {
    logger.info('✅ Conexión con Revit establecida');
    notify('Conectado con Revit', 'success');
    
    // Actualizar UI (mostrar botones de Revit, etc.)
    updateRevitUI(true);
});

// Cuando se desconecta
revitIntegration.on('disconnected', () => {
    logger.warning('⚠️ Conexión con Revit perdida');
    notify('Desconectado de Revit', 'warning');
    
    // Actualizar UI
    updateRevitUI(false);
});

// Cuando el modelo se actualiza
revitIntegration.on('modelUpdated', (modelInfo) => {
    logger.info('Modelo de Revit actualizado:', modelInfo);
    
    // Sincronizar issues si es necesario
    syncIssuesWithRevit();
});
```

### Auto-Sincronización

```javascript
import { revitIntegration } from './revit-integration.js';

// Iniciar sincronización automática
revitIntegration.startAutoSync();

// Detener sincronización automática
revitIntegration.stopAutoSync();

// Sincronización manual
await revitIntegration.performSync();
```

---

## 👥 SISTEMA DE ADMINISTRACIÓN

### Configurar Usuario Actual

```javascript
import { adminManager } from './admin-manager.js';

// Establecer usuario (típicamente después de login)
adminManager.setCurrentUser({
    email: 'usuario@empresa.com',
    name: 'Juan Pérez',
    role: 'admin' // 'admin' | 'manager' | 'coordinator' | 'editor' | 'viewer'
});

// Obtener usuario actual
const user = adminManager.getCurrentUser();
logger.info('Usuario actual:', user);
```

### Verificar Permisos

```javascript
import { adminManager, hasPermission, isAdmin } from './admin-manager.js';

// Verificar permiso específico
if (hasPermission('projects.delete')) {
    // Mostrar botón de eliminar proyecto
    showDeleteButton();
}

// Verificar si es admin
if (isAdmin()) {
    // Mostrar panel de administración
    showAdminPanel();
}

// Verificar rol
if (adminManager.hasRole('manager')) {
    // Funcionalidad específica de manager
}
```

### Gestión de Usuarios

```javascript
import { adminManager } from './admin-manager.js';

// Crear nuevo usuario (solo admin)
try {
    const newUser = adminManager.createUser({
        email: 'nuevo@empresa.com',
        name: 'Nuevo Usuario',
        role: 'editor'
    });
    
    logger.info('Usuario creado:', newUser);
    notify('Usuario creado exitosamente', 'success');
} catch (error) {
    logger.error('Error creando usuario:', error);
    notify(error.message, 'error');
}

// Listar todos los usuarios
try {
    const users = adminManager.listUsers();
    logger.table(users);
} catch (error) {
    logger.error('Sin permisos para ver usuarios');
}

// Actualizar usuario
adminManager.updateUser(userId, {
    role: 'manager',
    name: 'Nombre Actualizado'
});

// Desactivar usuario
adminManager.deactivateUser(userId);
```

### Registro de Auditoría

```javascript
import { adminManager } from './admin-manager.js';

// Registrar acción personalizada
adminManager.logAction('issue.exported', {
    issueId: issue.guid,
    format: 'PDF',
    timestamp: new Date().toISOString()
});

// Obtener log completo
const logs = adminManager.getAuditLog();

// Filtrar por usuario
const userLogs = adminManager.getAuditLog({
    userId: 'user-guid-123'
});

// Filtrar por fecha
const recentLogs = adminManager.getAuditLog({
    dateFrom: '2024-12-01',
    dateTo: '2024-12-31'
});

// Filtrar por acción
const exportLogs = adminManager.getAuditLog({
    action: 'issue.exported'
});

// Mostrar en tabla
logger.table(logs.slice(0, 50));
```

### Estadísticas

```javascript
import { adminManager } from './admin-manager.js';

// Obtener estadísticas de uso
const stats = adminManager.getUsageStats();

logger.info('Estadísticas:', stats);

// stats contiene:
// - totalUsers
// - totalProjects
// - totalIssues
// - last30Days { totalActions, uniqueUsers, topActions }
// - usersByRole
// - storageUsage

// Mostrar en UI
document.getElementById('total-users').textContent = stats.totalUsers;
document.getElementById('total-projects').textContent = stats.totalProjects;
```

### Exportar/Importar Configuración

```javascript
import { adminManager } from './admin-manager.js';

// Exportar
const exportData = adminManager.exportAdminData();
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);

// Descargar
const a = document.createElement('a');
a.href = url;
a.download = 'admin-config-backup.json';
a.click();

// Importar
const file = event.target.files[0];
const reader = new FileReader();

reader.onload = (e) => {
    try {
        const data = JSON.parse(e.target.result);
        adminManager.importAdminData(data);
        notify('Configuración importada', 'success');
    } catch (error) {
        logger.error('Error importando:', error);
        notify('Error al importar configuración', 'error');
    }
};

reader.readAsText(file);
```

---

## 🔍 BÚSQUEDA Y FILTRADO

### Búsqueda Cross-Project

```javascript
import { loadIssueFromAnyProject } from './main.js';

// Buscar issue en todos los proyectos
async function searchIssueGlobally(issueId) {
    await loadIssueFromAnyProject(issueId);
}

// Uso desde botón
document.getElementById('btn-search').addEventListener('click', () => {
    const issueId = document.getElementById('issue-id-input').value;
    searchIssueGlobally(issueId);
});
```

### Filtrado Avanzado

```javascript
import { AppState } from './state.js';

// Filtrar issues por múltiples criterios
function filterIssues(criteria) {
    let filtered = [...AppState.currentIssues];
    
    // Por estado
    if (criteria.status && criteria.status.length > 0) {
        filtered = filtered.filter(i => criteria.status.includes(i.topicStatus));
    }
    
    // Por prioridad
    if (criteria.priority && criteria.priority.length > 0) {
        filtered = filtered.filter(i => criteria.priority.includes(i.priority));
    }
    
    // Por fecha
    if (criteria.dateFrom) {
        filtered = filtered.filter(i => new Date(i.creationDate) >= new Date(criteria.dateFrom));
    }
    
    if (criteria.dateTo) {
        filtered = filtered.filter(i => new Date(i.creationDate) <= new Date(criteria.dateTo));
    }
    
    // Por texto
    if (criteria.search) {
        const search = criteria.search.toLowerCase();
        filtered = filtered.filter(i => 
            i.title.toLowerCase().includes(search) ||
            i.description?.toLowerCase().includes(search)
        );
    }
    
    return filtered;
}

// Uso
const filtered = filterIssues({
    status: ['Open', 'In Progress'],
    priority: ['High'],
    dateFrom: '2024-01-01',
    search: 'puertas'
});

logger.info(`${filtered.length} issues encontradas`);
```

---

## 📤 EXPORTACIÓN

### Exportar a PDF

```javascript
import { exportToPDF } from './export-utils.js';

// Export simple
await exportToPDF(false);

// Export con detalles
await exportToPDF(true);
```

### Exportar a Excel

```javascript
import { exportToExcel } from './export-utils.js';

await exportToExcel();
```

### Exportar a JSON

```javascript
import { exportToJSON } from './export-utils.js';

await exportToJSON();
```

### Exportar Personalizado

```javascript
import { AppState } from './state.js';

function exportCustomFormat() {
    const data = {
        project: AppState.currentProject.name,
        exportDate: new Date().toISOString(),
        issues: AppState.filteredIssues.map(issue => ({
            id: issue.guid,
            title: issue.title,
            status: issue.topicStatus,
            priority: issue.priority,
            author: issue.author,
            date: issue.creationDate
        }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    notify('Datos exportados', 'success');
}
```

---

## 🎧 EVENTOS Y LISTENERS

### Eventos Globales

```javascript
// Escuchar cambios en el estado
import { AppState } from './state.js';

// Crear un observer simple
let previousIssuesCount = AppState.currentIssues.length;

setInterval(() => {
    if (AppState.currentIssues.length !== previousIssuesCount) {
        logger.info('Issues changed:', AppState.currentIssues.length);
        onIssuesChanged();
        previousIssuesCount = AppState.currentIssues.length;
    }
}, 1000);

function onIssuesChanged() {
    // Tu lógica
    updateStats();
    renderIssues();
}
```

### Custom Events

```javascript
// Emitir evento personalizado
function issueCreated(issue) {
    const event = new CustomEvent('issue:created', {
        detail: { issue }
    });
    
    document.dispatchEvent(event);
}

// Escuchar evento
document.addEventListener('issue:created', (event) => {
    logger.info('Issue creado:', event.detail.issue);
    notify(`Issue creado: ${event.detail.issue.title}`, 'success');
});
```

---

## 🎨 PERSONALIZACIÓN UI

### Cambiar Tema

```javascript
// Cambiar a tema oscuro
document.body.classList.add('dark-theme');
document.body.classList.remove('light-theme');

// Cambiar a tema claro
document.body.classList.add('light-theme');
document.body.classList.remove('dark-theme');

// Guardar preferencia
AppState.theme = 'dark'; // o 'light'
Storage.saveSettings();
```

### Notificaciones Personalizadas

```javascript
import { notify } from './ui-utils.js';

// Notificación simple
notify('Operación completada', 'success');

// Notificación con duración personalizada
notify('Procesando...', 'info', 5000); // 5 segundos

// Tipos: 'success', 'error', 'warning', 'info'
```

---

## 🔄 ASYNC/AWAIT PATTERNS

### Operaciones Encadenadas

```javascript
async function processFiles(files) {
    try {
        logger.info('Procesando archivos...');
        
        // Paso 1
        const parsed = await parseFiles(files);
        logger.debug('Archivos parseados:', parsed.length);
        
        // Paso 2
        const validated = await validateIssues(parsed);
        logger.debug('Issues validados:', validated.length);
        
        // Paso 3
        await saveToDatabase(validated);
        logger.info('Guardado en base de datos');
        
        // Paso 4
        renderIssues();
        
        notify('Archivos procesados correctamente', 'success');
    } catch (error) {
        logger.error('Error procesando archivos:', error);
        notify('Error al procesar archivos', 'error');
    }
}
```

### Promise.all para Operaciones Paralelas

```javascript
async function loadMultipleProjects(projectIds) {
    try {
        logger.info('Cargando múltiples proyectos...');
        
        const promises = projectIds.map(id => loadProject(id));
        const projects = await Promise.all(promises);
        
        logger.info('Proyectos cargados:', projects.length);
        
        return projects;
    } catch (error) {
        logger.error('Error cargando proyectos:', error);
        throw error;
    }
}
```

---

**¡Usa estos ejemplos como referencia para desarrollar nuevas funcionalidades!** 💻

*Ejemplos de código v3.1.0 - 2024-12-22*
