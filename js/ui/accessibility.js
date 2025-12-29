/**
 * ACCESSIBILITY MODULE - Mejoras de accesibilidad WCAG 2.1
 * =========================================================
 *
 * Este módulo agrega atributos ARIA y mejoras de accesibilidad
 * a elementos que no los tienen definidos en el HTML.
 *
 * Implementado en FASE 3.8 para mejorar compliance con WCAG 2.1 Level AA
 */

import { $ } from '../ui-utils.js';
import { logger } from '../config.js';
import { enableKeyboardNavigation, getKeyboardShortcuts, renderKeyboardShortcutsHelp } from './keyboard-helpers.js';

/**
 * Mapeo de botones icono a sus aria-labels
 * Se usa cuando el botón no tiene aria-label pero tiene un ID o title
 */
const BUTTON_ARIA_LABELS = {
    // Header actions
    'btn-notifications': 'Mostrar notificaciones',
    'btn-keyboard-help': 'Mostrar atajos de teclado',
    'btn-theme-toggle': 'Cambiar tema oscuro/claro',
    'btn-connect-server': 'Conectar a servidor BCF',

    // Viewer navigation
    'btn-back': 'Volver al dashboard',
    'btn-toggle-filters': 'Alternar panel de filtros',
    'btn-toggle-sidebar': 'Alternar panel lateral',
    'btn-filter-favorites': 'Filtrar por favoritos',
    'btn-new-issue': 'Crear nueva incidencia',
    'btn-upload-bcf': 'Cargar archivo BCF',

    // Export buttons
    'btn-export-excel': 'Exportar a Excel',
    'btn-export-csv': 'Exportar a CSV',
    'btn-export-pdf': 'Exportar a PDF resumen',
    'btn-export-pdf-detail': 'Exportar a PDF con imágenes',
    'btn-export-json': 'Exportar a JSON',

    // Issue navigation
    'btn-prev-issue': 'Incidencia anterior',
    'btn-next-issue': 'Incidencia siguiente',
    'btn-new-project': 'Crear nuevo proyecto',
    'btn-edit-project': 'Editar proyecto actual',

    // Filters
    'btn-clear-filters-header': 'Limpiar todos los filtros',
    'btn-apply-filters': 'Aplicar filtros seleccionados',

    // View modes
    'btn-view-list': 'Vista de lista',
    'btn-view-grid': 'Vista de cuadrícula',

    // Column customizer
    'btn-customize-columns': 'Personalizar columnas',
    'btn-toggle-columns': 'Mostrar/ocultar columnas',

    // Modals
    'btn-close-notifications': 'Cerrar panel de notificaciones',

    // Quick actions
    'btn-quick-upload': 'Seleccionar archivos BCF',
    'btn-folder-upload': 'Seleccionar carpeta de archivos'
};

/**
 * Elementos que necesitan roles específicos
 */
const ELEMENT_ROLES = [
    { selector: '#issues-list', role: 'list', label: 'Lista de incidencias' },
    { selector: '.issue-row', role: 'listitem' },
    { selector: '.dropdown-menu', role: 'menu' },
    { selector: '.dropdown-item', role: 'menuitem' },
    { selector: '.stats-bar', role: 'region', label: 'Estadísticas del proyecto' },
    { selector: '.filters-sidebar', role: 'complementary', label: 'Panel de filtros' },
    { selector: '.projects-grid', role: 'grid', label: 'Proyectos disponibles' },
    { selector: '.project-card', role: 'gridcell' },
    { selector: '.modal', role: 'dialog', modal: true }
];

/**
 * Elementos dinámicos que necesitan aria-live
 */
const LIVE_REGIONS = [
    { selector: '#notification-badge', live: 'polite', atomic: true },
    { selector: '.stats-bar', live: 'polite' },
    { selector: '#issues-count', live: 'polite' },
    { selector: '.bulk-actions-bar', live: 'assertive' },
    { selector: '.toast-notification', live: 'assertive', atomic: true },
    { selector: '.loading-spinner', live: 'polite', busy: true }
];

/**
 * Inicializa todas las mejoras de accesibilidad
 *
 * Debe llamarse después de que el DOM esté cargado
 *
 * @example
 * import { initAccessibility } from './accessibility.js';
 * initAccessibility();
 */
export function initAccessibility() {
    logger.info('♿ Inicializando mejoras de accesibilidad...');

    addAriaLabelsToButtons();
    addRolesToElements();
    addLiveRegions();
    addFormAssociations();
    enhanceModalAccessibility();
    enableKeyboardNavigation();

    logger.info('✅ Accesibilidad inicializada - WCAG 2.1 Level AA');
}

/**
 * Agrega aria-label a botones que no lo tienen
 * @private
 */
function addAriaLabelsToButtons() {
    let count = 0;

    // Agregar aria-label a botones con ID definido
    Object.entries(BUTTON_ARIA_LABELS).forEach(([id, label]) => {
        const btn = $(`#${id}`);
        if (btn && !btn.hasAttribute('aria-label')) {
            btn.setAttribute('aria-label', label);
            count++;
        }
    });

    // Agregar aria-label a botones con title pero sin aria-label
    document.querySelectorAll('button[title]:not([aria-label])').forEach(btn => {
        const title = btn.getAttribute('title');
        // Limpiar el title de atajos de teclado (ej: "Anterior (K)" → "Anterior")
        const cleanTitle = title.replace(/\s*\([A-Z]\)/g, '').trim();
        btn.setAttribute('aria-label', cleanTitle);
        count++;
    });

    // Botones close especiales (×)
    document.querySelectorAll('button.modal-close:not([aria-label])').forEach(btn => {
        btn.setAttribute('aria-label', 'Cerrar');
        count++;
    });

    logger.debug(`📝 Agregados ${count} aria-label a botones`);
}

/**
 * Agrega roles ARIA a elementos que los necesitan
 * @private
 */
function addRolesToElements() {
    let count = 0;

    ELEMENT_ROLES.forEach(({ selector, role, label, modal }) => {
        document.querySelectorAll(selector).forEach(el => {
            if (!el.hasAttribute('role')) {
                el.setAttribute('role', role);

                if (label) {
                    el.setAttribute('aria-label', label);
                }

                if (modal !== undefined) {
                    el.setAttribute('aria-modal', modal.toString());
                }

                count++;
            }
        });
    });

    logger.debug(`🎭 Agregados ${count} roles ARIA`);
}

/**
 * Agrega aria-live a regiones dinámicas
 * @private
 */
function addLiveRegions() {
    let count = 0;

    LIVE_REGIONS.forEach(({ selector, live, atomic, busy }) => {
        document.querySelectorAll(selector).forEach(el => {
            if (!el.hasAttribute('aria-live')) {
                el.setAttribute('aria-live', live);

                if (atomic !== undefined) {
                    el.setAttribute('aria-atomic', atomic.toString());
                }

                if (busy !== undefined) {
                    el.setAttribute('aria-busy', busy.toString());
                }

                count++;
            }
        });
    });

    logger.debug(`📢 Agregadas ${count} regiones live`);
}

/**
 * Asocia labels con inputs usando aria-describedby
 * @private
 */
function addFormAssociations() {
    let count = 0;

    // Asociar checkboxes con sus labels
    document.querySelectorAll('input[type="checkbox"]:not([aria-label])').forEach(checkbox => {
        const wrapper = checkbox.closest('label');
        if (wrapper) {
            const text = wrapper.textContent?.trim();
            if (text && text !== '') {
                checkbox.setAttribute('aria-label', text);
                count++;
            }
        }
    });

    // Asociar inputs con labels visibles
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
        const label = input.closest('.form-group')?.querySelector('label');
        if (label) {
            const labelId = label.id || `label-${Math.random().toString(36).substr(2, 9)}`;
            label.id = labelId;
            input.setAttribute('aria-labelledby', labelId);
            count++;
        }
    });

    logger.debug(`🔗 Asociados ${count} elementos de formulario`);
}

/**
 * Mejora accesibilidad de modales con focus trap y ARIA
 * @private
 */
function enhanceModalAccessibility() {
    let count = 0;

    document.querySelectorAll('.modal').forEach(modal => {
        // Asegurar role y aria-modal
        if (!modal.hasAttribute('role')) {
            modal.setAttribute('role', 'dialog');
        }
        if (!modal.hasAttribute('aria-modal')) {
            modal.setAttribute('aria-modal', 'true');
        }

        // Agregar aria-labelledby si tiene título
        const title = modal.querySelector('.modal-title, h2, h3');
        if (title && !modal.hasAttribute('aria-labelledby')) {
            const titleId = title.id || `modal-title-${Math.random().toString(36).substr(2, 9)}`;
            title.id = titleId;
            modal.setAttribute('aria-labelledby', titleId);
        }

        // Agregar aria-describedby si tiene descripción
        const desc = modal.querySelector('.modal-description, p');
        if (desc && !modal.hasAttribute('aria-describedby')) {
            const descId = desc.id || `modal-desc-${Math.random().toString(36).substr(2, 9)}`;
            desc.id = descId;
            modal.setAttribute('aria-describedby', descId);
        }

        count++;
    });

    logger.debug(`🚪 Mejorados ${count} modales`);
}

/**
 * Actualiza aria-live cuando cambia el contenido dinámico
 *
 * @param {HTMLElement} element - Elemento a actualizar
 * @param {string} message - Mensaje a anunciar
 *
 * @example
 * announceToScreenReader(statsBar, 'Se encontraron 25 incidencias');
 */
export function announceToScreenReader(element, message) {
    if (!element) return;

    // Crear span oculto visualmente pero accesible
    const announcement = document.createElement('span');
    announcement.className = 'sr-only';
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.textContent = message;

    element.appendChild(announcement);

    // Remover después de que el screen reader lo lea
    setTimeout(() => {
        announcement.remove();
    }, 1000);
}

/**
 * Marca un elemento como ocupado durante operaciones asíncronas
 *
 * @param {HTMLElement} element - Elemento a marcar
 * @param {boolean} busy - Si está ocupado o no
 *
 * @example
 * setElementBusy(issuesList, true);
 * await loadIssues();
 * setElementBusy(issuesList, false);
 */
export function setElementBusy(element, busy) {
    if (!element) return;

    if (busy) {
        element.setAttribute('aria-busy', 'true');
        element.setAttribute('aria-live', 'polite');
    } else {
        element.setAttribute('aria-busy', 'false');
        element.removeAttribute('aria-live');
    }
}

/**
 * Maneja el focus trap en modales
 * Previene que el focus salga del modal mientras está abierto
 *
 * @param {HTMLElement} modal - Modal a aplicar focus trap
 *
 * @example
 * const modal = $('#modal-project');
 * trapFocusInModal(modal);
 */
export function trapFocusInModal(modal) {
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus al primer elemento cuando se abre
    firstElement.focus();

    // Listener para Tab
    const handleTab = (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };

    modal.addEventListener('keydown', handleTab);

    // Retornar función para remover listener
    return () => {
        modal.removeEventListener('keydown', handleTab);
    };
}

// Re-exportar funciones de keyboard-nav-helpers para API pública
export { getKeyboardShortcuts, renderKeyboardShortcutsHelp };
