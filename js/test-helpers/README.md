# Testing Utilities - BCF Viewer Pro

Utilidades para generar datos de prueba y facilitar el desarrollo y testing de la aplicación.

## 📁 Archivos

### `mock-data.js`

Factories para generar datos de prueba consistentes y realistas.

#### Funciones Principales

##### `createMockIssue(overrides)`

Genera una incidencia BCF mock con datos realistas.

```javascript
import { createMockIssue } from './test-helpers/mock-data.js';

// Issue básico
const issue = createMockIssue();

// Issue personalizado
const urgentIssue = createMockIssue({
    priority: 'High',
    topicStatus: 'Open',
    title: 'Problema crítico en estructura'
});
```

##### `generateBulkIssues(count, baseOverrides)`

Genera múltiples issues en bulk.

```javascript
import { generateBulkIssues } from './test-helpers/mock-data.js';

// 100 issues aleatorios
const issues = generateBulkIssues(100);

// 50 issues de alta prioridad
const urgentIssues = generateBulkIssues(50, { priority: 'High' });
```

##### `createMockProject(overrides)`

Genera un proyecto BCF completo.

```javascript
import { createMockProject } from './test-helpers/mock-data.js';

const project = createMockProject({
    name: 'Torre Central',
    issueCount: 150
});
```

#### Datasets Predefinidos

```javascript
import { TEST_DATASETS } from './test-helpers/mock-data.js';

// Dataset pequeño (10 issues)
const small = TEST_DATASETS.small();

// Dataset mediano (100 issues)
const medium = TEST_DATASETS.medium();

// Dataset grande (1000 issues)
const large = TEST_DATASETS.large();

// Dataset muy grande (5000 issues)
const xlarge = TEST_DATASETS.xlarge();

// Dataset de alta prioridad (20 issues críticos)
const highPriority = TEST_DATASETS.highPriority();

// Dataset con deadlines próximos (15 issues)
const dueSoon = TEST_DATASETS.dueSoon();

// Dataset mixto realista (50 issues variados)
const realistic = TEST_DATASETS.realistic();
```

### `../debug/dev-tools.js`

Herramientas de debugging disponibles desde la consola del navegador.

## 🛠️ Uso de DevTools

### Activación

Agrega `?dev=1` a la URL para cargar DevTools:

```
http://localhost:8000/index.html?dev=1
```

### Comandos Disponibles

#### Inyectar Datos de Prueba

```javascript
// 100 issues aleatorios
DevTools.injectTestData(100);

// Dataset predefinido
DevTools.injectTestData('large'); // 1000 issues
DevTools.injectTestData('highPriority'); // 20 issues críticos

// Con opciones
DevTools.injectTestData(50, {
    clearFirst: false,  // No limpiar datos existentes
    render: true,       // Re-renderizar UI
    projectName: 'Mi Proyecto de Prueba'
});
```

#### Ver Estado de la Aplicación

```javascript
// Resumen básico
DevTools.logState();

// Información detallada
DevTools.logState(true);
```

#### Exportar/Importar Estado

```javascript
// Exportar estado actual
DevTools.exportState();
DevTools.exportState('mi-backup.json');

// Importar (desde consola)
const input = document.createElement('input');
input.type = 'file';
input.accept = 'application/json';
input.onchange = e => DevTools.importState(e.target.files[0]);
input.click();
```

#### Medir Rendimiento

```javascript
// Medir una función
await DevTools.measurePerformance(() => {
    applyFiltersAndSort();
    renderIssues();
}, 'Filtrado y Renderizado');

// Múltiples iteraciones
await DevTools.measurePerformance(
    () => renderIssues(),
    'Render Issues',
    10  // 10 iteraciones
);
```

#### Resetear Aplicación

```javascript
// Limpia todos los datos
DevTools.reset();
```

#### Ayuda

```javascript
// Muestra todos los comandos
DevTools.help();
```

## 📊 Casos de Uso

### Testing de Virtual Scrolling

```javascript
// Probar con 1000 items
DevTools.injectTestData('large');

// Verificar rendimiento
await DevTools.measurePerformance(
    () => renderIssues(),
    'Virtual Scrolling - 1000 items'
);
```

### Testing de Filtros

```javascript
// Dataset realista mixto
DevTools.injectTestData('realistic');

// Aplicar filtros manualmente desde UI
// Medir rendimiento
await DevTools.measurePerformance(
    () => applyFiltersAndSort(),
    'Filtrado'
);
```

### Testing de Bulk Actions

```javascript
// 500 issues
DevTools.injectTestData(500);

// Seleccionar múltiples issues desde UI
// Probar acciones masivas
```

### Desarrollo de Nuevas Features

```javascript
// Estado inicial limpio
DevTools.reset();

// Inyectar datos específicos
const project = createMockProject({ name: 'Feature Test' });
const issues = generateBulkIssues(20, {
    topicStatus: 'Open',
    priority: 'High'
});

// Desarrollar y probar...
```

### Debugging de Issues Específicos

```javascript
// Crear issue problemático
const problematicIssue = createMockIssue({
    title: 'Issue con datos especiales',
    description: 'Descripción muy larga...'.repeat(100),
    comments: createMockComments(50)
});

// Inyectar en AppState
AppState.currentIssues.push(problematicIssue);
renderIssues();
```

## 🎯 Ejemplos Prácticos

### Ejemplo 1: Testing de Rendimiento Completo

```javascript
// 1. Cargar datos
DevTools.injectTestData('large');

// 2. Medir renderizado inicial
const initial = await DevTools.measurePerformance(
    () => renderIssues(),
    'Renderizado Inicial'
);

// 3. Aplicar filtro y medir
AppState.filters.priorities = ['High'];
const filtered = await DevTools.measurePerformance(
    () => {
        applyFiltersAndSort();
        renderIssues();
    },
    'Filtrado + Render'
);

// 4. Comparar
console.log('Ratio:', filtered.avg / initial.avg);
```

### Ejemplo 2: Snapshot de Estado para Debugging

```javascript
// 1. Reproducir estado problemático
DevTools.injectTestData('realistic');

// 2. Aplicar configuración que causa bug
// ... manipular UI ...

// 3. Exportar estado
DevTools.exportState('bug-reproduction.json');

// 4. Compartir archivo con equipo
// 5. Otro desarrollador puede importar y ver exactamente el mismo estado
```

### Ejemplo 3: Desarrollo Iterativo

```javascript
// 1. Estado base
DevTools.reset();
DevTools.injectTestData(50);

// 2. Exportar baseline
DevTools.exportState('baseline.json');

// 3. Hacer cambios en código...

// 4. Probar cambios con mismo dataset
// (recargar página, ?dev=1)
const input = document.createElement('input');
input.type = 'file';
input.onchange = e => DevTools.importState(e.target.files[0]);
input.click();
// Seleccionar baseline.json

// 5. Verificar que cambios funcionan correctamente
```

## 🚀 Tips y Best Practices

1. **Usa datasets apropiados:**
   - `small` para desarrollo rápido
   - `medium` para testing funcional
   - `large` para testing de performance
   - `realistic` para demos

2. **Mide siempre el rendimiento:**
   ```javascript
   await DevTools.measurePerformance(myFunction, 'Description', 10);
   ```

3. **Exporta estados antes de cambios grandes:**
   ```javascript
   DevTools.exportState('before-refactor.json');
   ```

4. **Usa clearFirst: false para testing incremental:**
   ```javascript
   DevTools.injectTestData(10, { clearFirst: false });
   ```

5. **Combina factories para casos edge:**
   ```javascript
   const edgeCase = createMockIssue({
       title: 'A'.repeat(500), // Título muy largo
       comments: createMockComments(100) // Muchos comentarios
   });
   ```

## ⚠️ Advertencias

- **No usar en producción:** Estas herramientas son solo para desarrollo
- **Datos mock no son válidos para BCF real:** Son solo para testing de UI/UX
- **Storage puede llenarse:** Los datasets grandes ocupan espacio
- **Rendimiento:** Datasets XL (5000+ items) pueden causar lag en navegadores antiguos

## 📝 Contribuir

Para agregar nuevas factories o datasets:

1. Edita `mock-data.js`
2. Agrega la función con JSDoc completo
3. Exporta la función
4. Actualiza este README
5. Agrega ejemplos de uso

## 🔗 Referencias

- [BCF API Specification](https://github.com/buildingSMART/BCF-API)
- [BCF XML 2.1 Spec](https://github.com/buildingSMART/BCF-XML)
