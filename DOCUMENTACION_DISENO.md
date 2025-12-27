# Documentación de Diseño y Cambios - BCF Viewer Pro

Este documento resume los cambios realizados y las decisiones de diseño tomadas para mejorar la interfaz y funcionalidad de la aplicación.

## 1. Limpieza y Optimización de Carga
- **Eliminación de IFC:** Se ha eliminado todo el código, estilos y recursos relacionados con el visor IFC/3D para simplificar la aplicación y resolver errores de carga.
- **Corrección de la Pestaña Principal:** Se ha corregido el error que impedía visualizar los proyectos en la pestaña principal, asegurando que el contenedor `projects-grid` se renderice correctamente.
- **Reducción de Errores de Consola:** Se eliminaron referencias a archivos inexistentes y dependencias no utilizadas.

## 2. Sistema de Diseño (CSS Variables)
Se ha implementado un sistema de diseño basado en variables CSS para garantizar la consistencia en toda la aplicación:

### Tipografía
- **Fuentes:** 'DM Sans' para la interfaz principal y 'Space Mono' para datos técnicos/código.
- **Escala:** Se ha definido una escala tipográfica completa desde `xs` (12px) hasta `4xl` (36px).
- **Pesos:** `normal` (400), `medium` (500), `semibold` (600), `bold` (700).

### Espaciado
- Se ha implementado una escala de espaciado granular (`--spacing-1` a `--spacing-16`) para márgenes y paddings consistentes.

### Colores
- **Primario:** Azul moderno (`#3b82f6`) con variantes para estados hover y claros.
- **Estados:** Colores específicos para estados de incidencias (Abierto, En Progreso, Resuelto, Cerrado) con fondos suaves y texto contrastado.
- **Prioridades:** Colores consistentes para prioridades Alta, Media y Baja.

## 3. Mejoras en la Interfaz de Usuario (UI)
- **Dashboard:** Se ha rediseñado el panel de estadísticas con iconos, mejor jerarquía visual y efectos hover.
- **Tarjetas de Proyecto:** Mejor espaciado, tipografía refinada y meta-datos claramente organizados.
- **Filtros:** Sidebar de filtros con diseño limpio, secciones bordeadas y toggle responsivo.
- **Lista de Incidencias:** Filas de incidencias optimizadas con mejores estados de selección y acciones en bloque (`bulk-actions-bar`) consistentes.

## 4. Diseño Responsivo
- **Adaptabilidad:** La interfaz se ajusta automáticamente desde monitores grandes hasta dispositivos móviles.
- **Navegación Móvil:** El sidebar de filtros se convierte en un panel flotante en pantallas pequeñas.
- **Optimización de Espacio:** Se reducen márgenes y tamaños de fuente en móviles para maximizar el contenido visible.

## 5. Decisiones Técnicas
- **Consistencia de Variables:** Se reemplazó `var(--primary-color)` por `var(--color-primary)` para seguir una convención de nombres más estándar.
- **Accesibilidad:** Se mejoró el contraste de texto y se añadieron estados focus visibles en los formularios.
- **Rendimiento:** Se optimizaron las animaciones y transiciones usando propiedades que no activan reflows (transform, opacity).

---
*Fecha de actualización: 22 de diciembre de 2025*
