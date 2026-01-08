# 📊 Guía de Exportación Avanzada

## 🎯 Resumen

El sistema de Exportación Avanzada te permite personalizar completamente qué datos exportar y en qué formato, con preferencias que se guardan automáticamente.

---

## ✨ Características Principales

### **1. Múltiples Formatos de Salida**

| Formato | Extensión | Uso Recomendado | Tamaño |
|---------|-----------|-----------------|--------|
| **BCF .bcfzip** | `.bcfzip` | Estándar BuildingSMART, máxima compatibilidad con herramientas BIM | Pequeño (comprimido) |
| **BCF XML** | `.xml` | Revisar estructura, debugging, desarrollo | Mediano (sin comprimir) |
| **JSON** | `.json` | Integración con aplicaciones, APIs, desarrollo | Pequeño |
| **CSV** | `.csv` | Excel, Google Sheets, análisis de datos | Muy pequeño |
| **Excel** | `.xlsx` | Análisis avanzado, gráficos, múltiples hojas | Mediano |
| **PDF** | `.pdf` | Informes impresos, presentaciones | Mediano/Grande |

---

### **2. Selección Granular de Datos**

Puedes incluir o excluir:

- ✅ Incidencias Abiertas
- ✅ Incidencias En Progreso
- ✅ Incidencias Cerradas
- ✅ Comentarios
- ✅ Capturas de Pantalla (Snapshots)
- ✅ Responsables (Assignees)
- ✅ Estados
- ✅ Prioridades
- ✅ Fechas (Creación, Modificación, Vencimiento)
- ✅ Etiquetas (Labels)
- ✅ Archivos Adjuntos
- ✅ Puntos de Vista 3D (Viewpoints)

---

### **3. Opciones de Alcance**

| Opción | Descripción | Cuándo Usar |
|--------|-------------|-------------|
| **Todas las incidencias** | Exporta todo el proyecto | Backup completo, migración |
| **Solo incidencias filtradas** | Exporta según filtros actuales | Reportes específicos (ej: solo "High Priority") |
| **Solo incidencias seleccionadas** | Exporta incidencias marcadas | Subset específico de issues |

---

### **4. Organización Avanzada**

#### **Agrupar Por:**
- Sin agrupación
- Estado (Open, InProgress, Closed)
- Prioridad (High, Medium, Low)
- Responsable
- Tipo de Incidencia

#### **Ordenar Por:**
- Fecha (más reciente primero / más antiguo primero)
- Título (A-Z / Z-A)
- Prioridad (Alta a Baja)

---

## 🚀 Cómo Usar

### **Método 1: Desde la Consola (Debugging/Testing)**

```javascript
// En la consola del navegador (F12):

// Abrir modal de exportación avanzada
advancedExport.openAdvancedExportModal();

// Exportar directamente sin modal (formato rápido)
const issues = AppState.currentIssues;
const projectName = AppState.currentProject.name;

// JSON
BCFSimpleExporter.exportAsJSON(issues, projectName);

// XML
BCFSimpleExporter.exportAsXML(issues, projectName);

// CSV
BCFSimpleExporter.exportAsCSV(issues, projectName);
```

---

### **Método 2: Integración en el UI** (Próximamente)

En una versión futura, se agregará un botón en la interfaz:
```
Exportar > Exportación Avanzada...
```

---

## ⚙️ Configuración Detallada

### **Tab 1: Contenido** 📦

Define **qué datos** incluir en la exportación.

**Ejemplo de Uso:**
- **Reporte de incidencias pendientes:**
  - ✅ Abiertas, ✅ En Progreso, ❌ Cerradas
  - ✅ Responsables, ✅ Fechas, ✅ Prioridades

- **Archivo completo de proyecto:**
  - ✅ Todas las opciones habilitadas

- **Export ligero (solo info básica):**
  - ❌ Snapshots, ❌ Comentarios, ❌ Adjuntos

---

### **Tab 2: Formato** 🎨

Selecciona el **formato de salida** y opciones específicas.

#### **Opciones BCF (.bcfzip / .xml)**

```
Versión BCF:
- [x] BCF 3.0 (Recomendado)  → Más funcionalidades, compatible con software moderno
- [ ] BCF 2.1                 → Mayor compatibilidad con software antiguo

[x] Comprimir archivo          → Reduce tamaño (solo .bcfzip)
```

**Cuándo usar cada versión:**
- **BCF 3.0:** Revit 2019+, Navisworks 2020+, Solibri 9+
- **BCF 2.1:** Versiones antiguas de software BIM

---

#### **Opciones Excel (.xlsx)**

```
[x] Usar múltiples hojas (por estado)
    → Hoja 1: Abiertas
    → Hoja 2: En Progreso
    → Hoja 3: Cerradas

[ ] Incluir gráficos
    → Gráfico de barras por prioridad
    → Gráfico circular por estado
```

---

#### **Opciones PDF**

```
Orientación:
- [x] Vertical (Portrait)    → Más información por página
- [ ] Horizontal (Landscape)  → Mejor para tablas anchas

Tamaño de página:
- [x] A4      → Estándar europeo
- [ ] Letter  → Estándar USA
- [ ] Legal   → Documentos legales

[x] Incluir imágenes (snapshots)
```

---

### **Tab 3: Avanzado** ⚙️

Opciones de **organización y metadata**.

```
Agrupar por: [Estado ▼]
    Sin agrupación
    Estado         ← Recomendado para reportes
    Prioridad      ← Recomendado para triage
    Responsable    ← Recomendado para asignaciones
    Tipo

Ordenar por: [Fecha (más reciente primero) ▼]
    Fecha (más reciente primero)  ← Default
    Fecha (más antiguo primero)
    Título (A-Z)
    Título (Z-A)
    Prioridad (Alta a Baja)       ← Para triage

[x] Incluir metadatos del proyecto
    → Nombre, fecha de creación, autor, etc.
```

---

## 💾 Persistencia de Preferencias

Tus preferencias se **guardan automáticamente** en `localStorage` y se restauran la próxima vez que abres el modal.

**Ubicación:** `localStorage.bcf_export_preferences`

**Restaurar valores por defecto:**
```
Botón "Restaurar Valores" en el modal
```

---

## 📊 Ejemplos de Uso

### **Ejemplo 1: Reporte Semanal para el Cliente**

**Objetivo:** PDF con solo incidencias abiertas y en progreso.

```
Tab Contenido:
  ✅ Abiertas
  ✅ En Progreso
  ❌ Cerradas
  ✅ Responsables
  ✅ Fechas
  ✅ Prioridades
  ✅ Snapshots

Tab Formato:
  Formato: PDF
  Orientación: Portrait
  Tamaño: A4
  ✅ Incluir imágenes

Tab Avanzado:
  Agrupar por: Prioridad
  Ordenar por: Prioridad (Alta a Baja)
  ✅ Incluir metadatos
```

**Resultado:** `Proyecto_Report_2026-01-08.pdf` con incidencias organizadas por prioridad.

---

### **Ejemplo 2: Backup Completo del Proyecto**

**Objetivo:** BCF .bcfzip con TODOS los datos.

```
Tab Contenido:
  ✅ Todas las opciones habilitadas

Tab Formato:
  Formato: BCF .bcfzip
  Versión: BCF 3.0
  ✅ Comprimir archivo

Tab Avanzado:
  Agrupar por: Sin agrupación
  Ordenar por: Fecha (más reciente primero)
  ✅ Incluir metadatos
```

**Resultado:** `Proyecto_BCF3.0_2026-01-08.bcfzip` compatible con cualquier herramienta BIM.

---

### **Ejemplo 3: Análisis de Datos en Excel**

**Objetivo:** Excel con hojas separadas por estado para análisis.

```
Tab Contenido:
  ✅ Abiertas
  ✅ En Progreso
  ✅ Cerradas
  ✅ Todas las opciones de datos

Tab Formato:
  Formato: Excel
  ✅ Usar múltiples hojas
  ✅ Incluir gráficos

Tab Avanzado:
  Agrupar por: Estado
  Ordenar por: Prioridad
```

**Resultado:** `Proyecto_Export.xlsx` con 3 hojas + gráficos.

---

### **Ejemplo 4: Export para Desarrollo (JSON)**

**Objetivo:** JSON con solo incidencias abiertas para integración API.

```
Tab Contenido:
  ✅ Abiertas
  ❌ En Progreso
  ❌ Cerradas
  ✅ Comentarios
  ❌ Snapshots (no necesarios para API)

Tab Formato:
  Formato: JSON

Tab Avanzado:
  Agrupar por: Sin agrupación
  Ordenar por: Fecha (más reciente primero)
```

**Resultado:** `Proyecto_Export_timestamp.json` listo para consumir desde API.

---

## 🔬 Testing y Debugging

### **Verificar Configuración**

```javascript
// Ver preferencias actuales
console.log(advancedExport.preferences);

// Ver incidencias que se exportarían
const config = advancedExport.preferences;
const issues = advancedExport.getIssuesToExport(config);
console.log('Issues a exportar:', issues.length);
console.log(issues);
```

### **Forzar Reset de Preferencias**

```javascript
// Restaurar defaults
advancedExport.preferences = advancedExport.getDefaultPreferences();
advancedExport.savePreferences(advancedExport.preferences);
```

### **Export Manual sin Modal**

```javascript
// Configurar manualmente
const config = {
    includeOpenIssues: true,
    includeClosedIssues: false,
    format: 'json',
    scope: 'all',
    sortBy: 'date-desc'
};

const issues = advancedExport.getIssuesToExport(config);
await advancedExport.exportInFormat(config, issues);
```

---

## 🎯 Casos de Uso Recomendados

| Caso de Uso | Formato | Configuración |
|-------------|---------|---------------|
| **Migración a otro sistema** | BCF .bcfzip | Todo incluido, BCF 3.0 |
| **Reporte semanal cliente** | PDF | Solo abiertas/en progreso, con imágenes |
| **Análisis estadístico** | Excel | Múltiples hojas, con gráficos |
| **Integración API** | JSON | Sin snapshots, solo datos estructurados |
| **Revisión rápida** | CSV | Datos básicos, sin imágenes |
| **Debugging BCF** | BCF XML | Sin comprimir para revisar estructura |

---

## 🐛 Solución de Problemas

### **Problema: "No hay incidencias para exportar"**

**Causas:**
1. Todos los checkboxes de estado están desmarcados
2. El alcance es "seleccionadas" pero no hay incidencias seleccionadas
3. Los filtros actuales no devuelven resultados

**Solución:**
- Habilitar al menos un checkbox de estado (Abiertas/En Progreso/Cerradas)
- Cambiar alcance a "Todas las incidencias"
- Revisar el contador en el modal: `📊 X incidencias para exportar`

---

### **Problema: Export falla con error**

**Verificar:**
```javascript
// En consola:
BCFDebugger.exportLogs();  // Descargar logs
BCFDebugger.printReport();  // Ver resumen
```

---

### **Problema: El archivo descargado está vacío**

**Causas:**
- Error durante la generación del archivo
- Problema con JSZip (solo para BCF .bcfzip)

**Solución:**
- Probar con formato alternativo (JSON o CSV)
- Verificar logs en consola
- Usar exportador simple: `BCFSimpleExporter.exportAsJSON(AppState.currentIssues, 'Test')`

---

## 💡 Tips y Mejores Prácticas

### **Performance**

- ✅ Para proyectos grandes (>1000 incidencias): usar JSON o CSV
- ✅ Desactivar "Incluir snapshots" reduce tamaño en 70-90%
- ✅ BCF 3.0 es más eficiente que BCF 2.1

### **Compatibilidad**

- ✅ BCF .bcfzip es el más compatible con herramientas BIM
- ✅ CSV funciona en cualquier software (Excel, Google Sheets, LibreOffice)
- ✅ JSON es perfecto para desarrollo e integraciones

### **Organización**

- ✅ Usar "Agrupar por estado" para reportes de progreso
- ✅ Usar "Agrupar por responsable" para asignaciones
- ✅ Usar "Ordenar por prioridad" para triage

---

## 📚 API Reference

### **Clase: AdvancedExport**

```javascript
// Instancia global
window.advancedExport

// Métodos principales
advancedExport.openAdvancedExportModal()           // Abrir modal
advancedExport.loadPreferences()                    // Cargar preferencias
advancedExport.savePreferences(config)              // Guardar preferencias
advancedExport.getIssuesToExport(config)            // Obtener issues
advancedExport.exportInFormat(config, issues)       // Exportar
```

### **Clase: BCFSimpleExporter**

```javascript
// Exportadores simples (sin modal)
BCFSimpleExporter.exportAsJSON(issues, projectName)
BCFSimpleExporter.exportAsXML(issues, projectName)
BCFSimpleExporter.exportAsCSV(issues, projectName)
BCFSimpleExporter.downloadBlob(blob, filename)
```

---

## 🔗 Referencias

- **BuildingSMART BCF Standard:** https://github.com/buildingSMART/BCF-XML
- **Guía de Debugging:** Ver `DEBUGGING_BCF_EXPORT.md`
- **BCF Viewers gratuitos:**
  - BIMcollab ZOOM: https://www.bimcollab.com/zoom/
  - Tekla BIMsight: https://www.tekla.com/products/bim-collaboration

---

## ✅ Resumen

El sistema de Exportación Avanzada ofrece:

- ✅ **6 formatos** de salida
- ✅ **12 opciones** de contenido personalizables
- ✅ **3 alcances** diferentes
- ✅ **5 opciones** de agrupación
- ✅ **5 opciones** de ordenamiento
- ✅ **Persistencia** automática de preferencias
- ✅ **Feedback** visual en tiempo real
- ✅ **Manejo robusto** de errores
- ✅ **Logging** completo para debugging

**¡Listo para usar!** 🚀
