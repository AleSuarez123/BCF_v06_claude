# 📋 RESUMEN DE CAMBIOS - BCF Viewer Pro

## v3.2.0 - Personalización de Columnas y Correcciones

### ✨ Nuevas Funcionalidades
* **Personalización de Columnas**:
  * Nuevo modal para mostrar/ocultar y reordenar columnas.
  * Persistencia de preferencias en LocalStorage.
  * Soporte para Drag & Drop y botones de reordenamiento accesibles (Arriba/Abajo).
  * Soporte para nuevas columnas: GUID y Comentarios.

### 🐛 Correcciones
* **Gestor de Incidencias**:
  * Corregido error `TypeError: onFavoriteClick is not a function` al renderizar listas.
  * Eliminada duplicidad de listeners en botones de favoritos que causaba conflictos.
  * Mejorada la robustez en la asignación de callbacks de eventos.

### ♿ Accesibilidad
* **Mejoras WCAG 2.1 AA**:
  * Añadidos botones de reordenamiento accesibles por teclado en el personalizador de columnas.
  * Añadido soporte para cerrar modales con la tecla `Escape`.
  * Etiquetas ARIA y roles mejorados en el modal de personalización.

### 🧪 Calidad
* Añadidos tests unitarios para el módulo de personalización (`js/column-customizer.test.js`).
