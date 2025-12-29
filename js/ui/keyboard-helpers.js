/**
 * KEYBOARD NAVIGATION HELPERS
 * ============================
 *
 * Funciones auxiliares para navegación por teclado completa
 * Complemento del módulo de accesibilidad (FASE 3.7)
 */

import { logger } from '../config.js';

/**
 * Habilita navegación por teclado en todos los componentes interactivos
 */
export function enableKeyboardNavigation() {
    let count = 0;

    // Navegación en dropdowns
    count += setupDropdownKeyboardNavigation();

    // Navegación en column customizer
    count += setupColumnCustomizerKeyboard();

    // Mejoras en tabs
    count += setupTabKeyboardNavigation();

    logger.debug(`⌨️  ${count} componentes con navegación por teclado mejorada`);
}

/**
 * Configura navegación por teclado en dropdowns
 * @returns {number} Número de dropdowns configurados
 */
function setupDropdownKeyboardNavigation() {
    let count = 0;

    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        const dropdown = trigger.nextElementSibling;
        if (!dropdown || !dropdown.classList.contains('dropdown-menu')) return;

        const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
        if (items.length === 0) return;

        let currentIndex = -1;

        // Abrir/cerrar con Enter/Space
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const isOpen = dropdown.classList.contains('active');

                if (isOpen) {
                    closeDropdown(dropdown);
                } else {
                    openDropdown(dropdown, items);
                    currentIndex = 0;
                }
            }

            // ArrowDown abre el dropdown
            if (e.key === 'ArrowDown' && !dropdown.classList.contains('active')) {
                e.preventDefault();
                openDropdown(dropdown, items);
                currentIndex = 0;
            }
        });

        // Navegación dentro del dropdown
        dropdown.addEventListener('keydown', (e) => {
            if (!dropdown.classList.contains('active')) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentIndex = (currentIndex + 1) % items.length;
                    items[currentIndex].focus();
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    currentIndex = (currentIndex - 1 + items.length) % items.length;
                    items[currentIndex].focus();
                    break;

                case 'Home':
                    e.preventDefault();
                    currentIndex = 0;
                    items[currentIndex].focus();
                    break;

                case 'End':
                    e.preventDefault();
                    currentIndex = items.length - 1;
                    items[currentIndex].focus();
                    break;

                case 'Escape':
                    e.preventDefault();
                    closeDropdown(dropdown);
                    trigger.focus();
                    currentIndex = -1;
                    break;

                case 'Tab':
                    // Cerrar al salir con Tab
                    closeDropdown(dropdown);
                    currentIndex = -1;
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    const focusedItem = document.activeElement;
                    if (focusedItem && items.includes(focusedItem)) {
                        focusedItem.click();
                        closeDropdown(dropdown);
                        trigger.focus();
                        currentIndex = -1;
                    }
                    break;
            }
        });

        // Cerrar al perder foco
        dropdown.addEventListener('focusout', (e) => {
            // Esperar un tick para verificar si el nuevo foco está dentro
            setTimeout(() => {
                if (!dropdown.contains(document.activeElement) &&
                    document.activeElement !== trigger) {
                    closeDropdown(dropdown);
                    currentIndex = -1;
                }
            }, 0);
        });

        count++;
    });

    return count;
}

/**
 * Abre un dropdown y enfoca el primer item
 */
function openDropdown(dropdown, items) {
    dropdown.classList.add('active');
    dropdown.setAttribute('aria-hidden', 'false');
    if (items.length > 0) {
        setTimeout(() => items[0].focus(), 10);
    }
}

/**
 * Cierra un dropdown
 */
function closeDropdown(dropdown) {
    dropdown.classList.remove('active');
    dropdown.setAttribute('aria-hidden', 'true');
}

/**
 * Configura navegación por teclado en column customizer
 * @returns {number} Número de customizers configurados
 */
function setupColumnCustomizerKeyboard() {
    let count = 0;

    document.querySelectorAll('.column-item').forEach((item, index) => {
        // Hacer focusable
        if (!item.hasAttribute('tabindex')) {
            item.setAttribute('tabindex', '0');
        }

        item.addEventListener('keydown', (e) => {
            const parent = item.parentElement;
            const items = Array.from(parent.querySelectorAll('.column-item'));
            const currentIndex = items.indexOf(item);

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    // Mover item hacia arriba
                    if (currentIndex > 0) {
                        parent.insertBefore(item, items[currentIndex - 1]);
                        item.focus();
                        announceChange(item, `Columna movida a posición ${currentIndex}`);
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    // Mover item hacia abajo
                    if (currentIndex < items.length - 1) {
                        parent.insertBefore(items[currentIndex + 1], item);
                        item.focus();
                        announceChange(item, `Columna movida a posición ${currentIndex + 2}`);
                    }
                    break;

                case 'Home':
                    e.preventDefault();
                    // Mover al inicio
                    if (currentIndex > 0) {
                        parent.insertBefore(item, items[0]);
                        item.focus();
                        announceChange(item, 'Columna movida al inicio');
                    }
                    break;

                case 'End':
                    e.preventDefault();
                    // Mover al final
                    if (currentIndex < items.length - 1) {
                        parent.appendChild(item);
                        item.focus();
                        announceChange(item, 'Columna movida al final');
                    }
                    break;

                case ' ':
                case 'Enter':
                    e.preventDefault();
                    // Toggle visibility (si tiene checkbox)
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        announceChange(item,
                            checkbox.checked ? 'Columna visible' : 'Columna oculta'
                        );
                    }
                    break;
            }
        });

        count++;
    });

    return count;
}

/**
 * Anuncia cambio a screen readers
 */
function announceChange(element, message) {
    const announcement = document.createElement('span');
    announcement.className = 'sr-only';
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.textContent = message;

    element.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

/**
 * Configura navegación por teclado en tabs
 * @returns {number} Número de tab groups configurados
 */
function setupTabKeyboardNavigation() {
    let count = 0;

    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        if (tabs.length === 0) return;

        let currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
        if (currentIndex === -1) currentIndex = 0;

        tablist.addEventListener('keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;

            e.preventDefault();

            switch (e.key) {
                case 'ArrowLeft':
                    currentIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    break;
                case 'ArrowRight':
                    currentIndex = (currentIndex + 1) % tabs.length;
                    break;
                case 'Home':
                    currentIndex = 0;
                    break;
                case 'End':
                    currentIndex = tabs.length - 1;
                    break;
            }

            // Activar el tab y enfocarlo
            tabs.forEach((tab, idx) => {
                if (idx === currentIndex) {
                    tab.setAttribute('aria-selected', 'true');
                    tab.setAttribute('tabindex', '0');
                    tab.focus();

                    // Trigger click para cambiar contenido
                    tab.click();
                } else {
                    tab.setAttribute('aria-selected', 'false');
                    tab.setAttribute('tabindex', '-1');
                }
            });
        });

        count++;
    });

    return count;
}

/**
 * Documenta todos los keyboard shortcuts disponibles
 * @returns {Object} Mapa de shortcuts documentados
 */
export function getKeyboardShortcuts() {
    return {
        global: {
            'Ctrl/Cmd + K': 'Abrir búsqueda spotlight',
            '?': 'Mostrar ayuda de atajos',
            'Escape': 'Cerrar modal/panel actual',
            'Ctrl/Cmd + E': 'Exportar a Excel',
            'Ctrl/Cmd + P': 'Exportar a PDF'
        },
        navigation: {
            'J / ArrowDown': 'Siguiente incidencia',
            'K / ArrowUp': 'Incidencia anterior',
            'G + D': 'Ir a Dashboard',
            'G + V': 'Ir a Viewer'
        },
        viewer: {
            'L': 'Vista de lista',
            'G': 'Vista de cuadrícula',
            'F': 'Toggle filtros',
            'S': 'Toggle sidebar',
            'N': 'Nueva incidencia',
            '/': 'Enfocar búsqueda'
        },
        selection: {
            'Space': 'Toggle selección',
            'Ctrl/Cmd + A': 'Seleccionar todo',
            'Ctrl/Cmd + D': 'Deseleccionar todo'
        },
        dropdown: {
            'ArrowDown': 'Siguiente opción',
            'ArrowUp': 'Opción anterior',
            'Home': 'Primera opción',
            'End': 'Última opción',
            'Enter / Space': 'Seleccionar opción',
            'Escape': 'Cerrar menú'
        },
        columnCustomizer: {
            'ArrowUp': 'Mover columna arriba',
            'ArrowDown': 'Mover columna abajo',
            'Home': 'Mover al inicio',
            'End': 'Mover al final',
            'Space / Enter': 'Toggle visibilidad'
        },
        modal: {
            'Tab': 'Siguiente elemento (con trap)',
            'Shift + Tab': 'Elemento anterior (con trap)',
            'Escape': 'Cerrar modal'
        }
    };
}

/**
 * Renderiza la ayuda de keyboard shortcuts en HTML
 * @returns {string} HTML de la ayuda
 */
export function renderKeyboardShortcutsHelp() {
    const shortcuts = getKeyboardShortcuts();

    const sections = Object.entries(shortcuts).map(([category, items]) => {
        const categoryTitle = {
            global: '🌐 Global',
            navigation: '🧭 Navegación',
            viewer: '👁️ Visor',
            selection: '✓ Selección',
            dropdown: '▼ Menús Desplegables',
            columnCustomizer: '⚙️ Personalización de Columnas',
            modal: '🪟 Modales'
        }[category] || category;

        const itemsHtml = Object.entries(items).map(([keys, description]) => `
            <tr>
                <td><kbd>${keys.replace(/\//g, '</kbd> / <kbd>')}</kbd></td>
                <td>${description}</td>
            </tr>
        `).join('');

        return `
            <div class="shortcuts-section">
                <h3>${categoryTitle}</h3>
                <table class="shortcuts-table">
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    return `
        <div class="keyboard-shortcuts-help">
            <h2>⌨️ Atajos de Teclado</h2>
            <p class="help-description">Usa estos atajos para navegar más rápido por la aplicación.</p>
            ${sections}
            <div class="help-footer">
                <p><strong>Tip:</strong> Los atajos Ctrl también funcionan con Cmd en Mac.</p>
            </div>
        </div>
    `;
}
