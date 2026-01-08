# 🔍 Guía de Debugging: Exportación BCF

Esta guía te ayudará a diagnosticar problemas con la exportación BCF (.bcfzip) utilizando el sistema de debugging integrado.

---

## 📋 Síntomas Comunes

### ❌ **"El botón no hace nada"**
- El botón de "Exportar > BCF (.bcfzip)" no responde al hacer click
- No aparece el modal
- No hay errores visibles

### ❌ **"Aparece el modal pero no exporta"**
- El modal se abre correctamente
- Al hacer click en "Exportar" no pasa nada
- La barra de progreso no se muestra

### ❌ **"Error durante la exportación"**
- Aparece mensaje de error
- La exportación se interrumpe
- El archivo no se descarga

---

## 🛠️ Herramientas de Debugging

### **1. BCFDebugger** - Sistema de Logging

El debugger genera logs detallados con colores por categoría:

| Categoría | Color | Descripción |
|-----------|-------|-------------|
| 🔵 DOM | Azul | Elementos del DOM (botones, modales) |
| 🟢 EVENT | Verde | Eventos de click y listeners |
| 🟣 MODAL | Morado | Apertura y cierre de modales |
| 🟠 EXPORT | Naranja | Proceso de exportación |
| 🔴 ERROR | Rojo | Errores y excepciones |
| 🟢 SUCCESS | Verde claro | Operaciones exitosas |
| 🔵 JSZIP | Cian | Estado de librería JSZip |

---

## 📊 Pasos para Diagnosticar

### **PASO 1: Abrir la Consola del Navegador**

```
Windows/Linux: F12 o Ctrl+Shift+I
Mac: Cmd+Option+I
```

Verás un mensaje de bienvenida:
```
🔍 BCF Debugger Cargado
Usa BCFDebugger.testButtonClick() para probar el botón
Usa BCFDebugger.testExportFunction() para probar exportación
Usa BCFDebugger.exportLogs() para exportar logs
```

---

### **PASO 2: Hacer Click en el Botón BCF**

1. En la aplicación, ve a un proyecto con incidencias
2. Click en **"Exportar"** (dropdown)
3. Click en **"BCF (.bcfzip)"**
4. **Observa la consola**

**Logs esperados (flujo correcto):**
```
[BCF-DEBUG][EVENT] Configurando botón BCF Export
[BCF-DEBUG][EVENT] ✓ Event listener registrado en botón BCF Export
[BCF-DEBUG][EVENT] 🖱️ CLICK en botón BCF Export detectado
[BCF-DEBUG][MODAL] 📂 openBCFExportModal() llamada
[BCF-DEBUG][MODAL] Proyecto actual
[BCF-DEBUG][MODAL] Buscando modal en DOM
[BCF-DEBUG][MODAL] ✅ Abriendo modal BCF Export
[BCF-DEBUG][MODAL] ✓ Modal mostrado con clase "show"
```

---

### **PASO 3: Interpretar los Logs**

#### ✅ **Escenario 1: Todo funciona correctamente**
```
[EVENT] 🖱️ CLICK en botón BCF Export detectado
[MODAL] ✅ Abriendo modal BCF Export
[EXPORT] 🚀 executeBCFExport() iniciada
[JSZIP] JSZip disponible: ✓ SÍ
[EXPORT] Topics recopilados: { count: 15 }
[EXPORT] Llamando a exporter.exportTopics()...
[SUCCESS] ✅ Blob generado exitosamente
[SUCCESS] ✓ Descarga iniciada
```
**➡️ Solución:** Todo funciona, el problema puede estar en otra parte (permisos de descarga, antivirus, etc.)

---

#### ❌ **Escenario 2: Botón no encontrado**
```
[EVENT] Configurando botón BCF Export
[ERROR] Botón BCF Export NO encontrado en DOM
```
**➡️ Problema:** El botón no existe en el HTML

**Soluciones:**
1. Verificar que estás en la página correcta (viewer)
2. Verificar que el dropdown de exportar existe
3. Inspeccionar HTML: buscar `id="btn-export-bcf"`

---

#### ❌ **Escenario 3: Modal no encontrado**
```
[EVENT] 🖱️ CLICK en botón BCF Export detectado
[MODAL] 📂 openBCFExportModal() llamada
[ERROR] Modal BCF Export NO encontrado
```
**➡️ Problema:** El modal no existe en el HTML

**Soluciones:**
1. Inspeccionar HTML: buscar `id="modal-export-bcf"`
2. Verificar que index.html contiene el modal
3. Verificar que no hay errores de carga de página

---

#### ❌ **Escenario 4: JSZip no disponible**
```
[EXPORT] 🚀 executeBCFExport() iniciada
[JSZIP] JSZip disponible: ✗ NO
[ERROR] JSZip no está cargado
```
**➡️ Problema:** La librería JSZip no se cargó

**Soluciones:**
1. Verificar conexión a internet (CDN)
2. Verificar en `index.html`:
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
   ```
3. Probar exportador alternativo (ver PASO 4)

---

#### ❌ **Escenario 5: No hay incidencias para exportar**
```
[EXPORT] Topics recopilados: { count: 0 }
[EXPORT] ⚠️ No hay topics para exportar
```
**➡️ Problema:** No hay incidencias en el proyecto o scope incorrecto

**Soluciones:**
1. Verificar que el proyecto tiene incidencias
2. Cambiar "Alcance" en el modal a "Todas las incidencias"
3. Verificar `AppState.currentIssues.length` en consola

---

### **PASO 4: Usar Comandos de Test Manual**

#### **Comando 1: Test del Botón**
```javascript
BCFDebugger.testButtonClick()
```
Ejecuta un test completo del botón:
- ✓ Verifica que el botón existe
- ✓ Verifica que el modal existe
- ✓ Verifica que el dropdown funciona
- ✓ Simula un click programático

**Resultado esperado:**
```
[EVENT] 🧪 Iniciando test manual del botón BCF...
[DOM] Botón BCF Export (#btn-export-bcf): ✓ EXISTE
[DOM] Modal BCF Export (#modal-export-bcf): ✓ EXISTE
[DOM] Dropdown Export (#export-dropdown): ✓ EXISTE
[EVENT] Ejecutando click programático en botón...
[EVENT] ✓ Click ejecutado correctamente
```

---

#### **Comando 2: Test de Exportación**
```javascript
BCFDebugger.testExportFunction()
```
Verifica todas las dependencias:
- ✓ AppState disponible
- ✓ JSZip disponible
- ✓ BCFExporter disponible

---

#### **Comando 3: Exportar Logs**
```javascript
BCFDebugger.exportLogs()
```
Descarga todos los logs como archivo JSON para análisis detallado.

---

### **PASO 5: Usar Exportadores Alternativos**

Si JSZip falla o necesitas un formato alternativo:

#### **Opción A: Exportar como JSON**
```javascript
// En consola:
const topics = AppState.currentIssues;
const projectName = AppState.currentProject.name;
BCFSimpleExporter.exportAsJSON(topics, projectName);
```
**➡️ Genera:** `projectName_bcf_export_timestamp.json`

---

#### **Opción B: Exportar como XML (sin comprimir)**
```javascript
BCFSimpleExporter.exportAsXML(topics, projectName);
```
**➡️ Genera:** `projectName_bcf_export_timestamp.xml`

---

#### **Opción C: Exportar como CSV**
```javascript
BCFSimpleExporter.exportAsCSV(topics, projectName);
```
**➡️ Genera:** `projectName_bcf_export_timestamp.csv`
**Ventaja:** Compatible con Excel, fácil de revisar

---

## 🔬 Diagnóstico Avanzado

### **Verificar Estado de la Aplicación**

```javascript
// Ver proyecto actual
console.log(AppState.currentProject);

// Ver incidencias
console.log(AppState.currentIssues);
console.log('Total incidencias:', AppState.currentIssues.length);

// Ver primera incidencia
console.log(AppState.currentIssues[0]);

// Verificar JSZip
console.log('JSZip disponible:', typeof JSZip !== 'undefined');
console.log('JSZip version:', JSZip?.version);

// Verificar BCFExporter
console.log('BCFExporter disponible:', typeof BCFExporter !== 'undefined');
```

---

### **Test Manual Completo**

```javascript
// 1. Verificar todo el sistema
BCFDebugger.testButtonClick();
BCFDebugger.testExportFunction();

// 2. Ver todos los logs
BCFDebugger.printReport();

// 3. Si todo está OK, exportar manualmente
const topics = AppState.currentIssues;
const exporter = new BCFExporter({ bcfVersion: '3.0' });
const blob = await exporter.exportTopics(topics, 'TestExport');
BCFExporter.downloadBlob(blob, 'test_export.bcfzip');
```

---

## 🆘 Soluciones a Problemas Comunes

### **Problema: "Blob is not defined"**
**Causa:** Navegador muy antiguo
**Solución:** Actualizar navegador (Chrome 90+, Firefox 88+, Safari 14+)

---

### **Problema: "Permission denied" al descargar**
**Causa:** Navegador bloqueó descarga automática
**Solución:**
1. Permitir descargas en configuración del navegador
2. Verificar que el sitio no está bloqueado
3. Desactivar temporalmente extensiones (adblocker)

---

### **Problema: "Failed to fetch" o error de red**
**Causa:** JSZip no se cargó desde CDN
**Solución:**
1. Verificar conexión a internet
2. Usar exportador alternativo (JSON/XML/CSV)
3. Descargar JSZip localmente y cambiar ruta en index.html

---

### **Problema: Modal se abre pero botón "Exportar" no funciona**
**Causa:** Event listener no registrado
**Solución:**
1. Verificar en consola:
   ```javascript
   const btn = document.getElementById('btn-start-bcf-export');
   console.log('Botón existe:', !!btn);
   ```
2. Recargar página con Ctrl+Shift+R (recarga forzada)

---

## 📝 Checklist de Verificación

Antes de reportar un bug, verifica:

- [ ] La consola del navegador está abierta (F12)
- [ ] Estás en un proyecto con incidencias
- [ ] Has hecho click en "Exportar > BCF (.bcfzip)"
- [ ] Los logs aparecen en consola con colores
- [ ] Has ejecutado `BCFDebugger.testButtonClick()`
- [ ] Has ejecutado `BCFDebugger.testExportFunction()`
- [ ] Has probado exportar con formato alternativo
- [ ] Has exportado los logs con `BCFDebugger.exportLogs()`

---

## 📧 Reportar un Bug

Si después de seguir esta guía el problema persiste:

1. **Ejecutar:**
   ```javascript
   BCFDebugger.exportLogs();
   ```

2. **Capturar:**
   - Screenshot de la consola
   - Archivo de logs descargado
   - Versión del navegador
   - Mensaje de error (si existe)

3. **Incluir:**
   - Pasos para reproducir
   - Comportamiento esperado
   - Comportamiento actual
   - Logs exportados

---

## ✅ Resumen

| Comando | Propósito |
|---------|-----------|
| `BCFDebugger.testButtonClick()` | Probar si el botón funciona |
| `BCFDebugger.testExportFunction()` | Verificar dependencias |
| `BCFDebugger.exportLogs()` | Descargar logs para análisis |
| `BCFDebugger.printReport()` | Ver resumen de logs |
| `BCFSimpleExporter.exportAsJSON(topics, name)` | Exportar como JSON |
| `BCFSimpleExporter.exportAsXML(topics, name)` | Exportar como XML |
| `BCFSimpleExporter.exportAsCSV(topics, name)` | Exportar como CSV |

---

## 🎯 Próximos Pasos

Una vez identificado el problema usando estos logs:
1. Reporta el bug con los logs exportados
2. Mientras tanto, usa el exportador alternativo (JSON/XML/CSV)
3. El equipo de desarrollo corregirá el problema basándose en tus logs

**¡Gracias por tu ayuda en el debugging!** 🚀
