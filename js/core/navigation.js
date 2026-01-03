/**
 * NAVIGATION SETUP - Funciones modulares para configuración de navegación
 * ========================================================================
 *
 * Este módulo contiene funciones especializadas para configurar diferentes
 * aspectos del sistema de navegación de la aplicación.
 *
 * Refactorizado desde setupNavigation() monolítica (FASE 3.6)
 */

import { $, $cached, notify, updateGlobalStats } from '../ui-utils.js';
import { AppState } from '../state.js';
import { renderProjects, renderIssues, openEditIssueModal } from '../issue-manager.js';
import { openSpotlight } from '../ui-panels.js';
import { CSS_CLASSES } from '../utils/constants.js';

/**
 * Helper function: Navigate between pages
 */
function navigateTo(pageId) {
    const $$ = (selector) => document.querySelectorAll(selector);
    $$('.page').forEach(p => p.classList.remove(CSS_CLASSES.ACTIVE));

    if (pageId === 'viewer') {
        $cached('#viewer-page')?.classList.add(CSS_CLASSES.ACTIVE);
        $cached('#dashboard-page')?.classList.remove(CSS_CLASSES.ACTIVE);
    } else {
        $cached('#dashboard-page')?.classList.add(CSS_CLASSES.ACTIVE);
        $cached('#viewer-page')?.classList.remove(CSS_CLASSES.ACTIVE);
    }
}

/**
 * Configura los botones de gestión de proyectos (Nuevo y Editar)
 */
export function setupProjectButtons() {
    const btnNewProject = $('#btn-new-project');
    if (btnNewProject) {
        btnNewProject.addEventListener('click', () => {
            // Limpiar formulario y mostrar modal
            const form = $('#form-project');
            if (form) form.reset();
            if (window.projectValidator) window.projectValidator.clearErrors();
            $('#modal-project-title').textContent = 'Nuevo Proyecto';
            $('#project-id').value = '';
            $('#modal-project').classList.add(CSS_CLASSES.ACTIVE);
            $('#project-name').focus();
        });
    }

    const btnEditProject = $('#btn-edit-project');
    if (btnEditProject) {
        btnEditProject.addEventListener('click', () => {
            if (!AppState.currentProject) return;
            const form = $('#form-project');
            if (form) {
                form.reset();
                if (window.projectValidator) window.projectValidator.clearErrors();
                $('#project-id').value = AppState.currentProject.id;
                $('#project-name').value = AppState.currentProject.name;
                $('#project-description').value = AppState.currentProject.description || '';
                $('#modal-project-title').textContent = 'Editar Proyecto';
                $('#modal-project').classList.add(CSS_CLASSES.ACTIVE);
            }
        });
    }
}

/**
 * Configura el trigger de búsqueda spotlight
 */
export function setupSearchTrigger() {
    const searchTrigger = $('#search-trigger');
    if (searchTrigger) {
        searchTrigger.addEventListener('click', openSpotlight);
    }
}

/**
 * Configura el panel lateral de filtros con animaciones y accesibilidad
 *
 * Incluye:
 * - Toggle button con ARIA attributes
 * - Animaciones de apertura/cierre
 * - Soporte para teclado (Escape)
 * - Backdrop para móvil
 * - Close on outside click
 */
export function setupFiltersPanel() {
    const btnToggleFilters = $('#btn-toggle-filters');
    const filtersSidebar = document.querySelector('.filters-sidebar');
    const btnCloseFilters = $('#btn-close-filters');
    const viewerLayout = document.querySelector('.viewer-content-layout');
    const filtersBackdrop = $('#filters-backdrop');

    if (!filtersSidebar) return; // Salir si no existe el elemento

    // Initialize ARIA attributes
    filtersSidebar.setAttribute('role', 'complementary');
    filtersSidebar.setAttribute('aria-label', 'Panel de filtros');
    filtersSidebar.setAttribute('aria-hidden', 'true');

    if (btnToggleFilters) {
        btnToggleFilters.setAttribute('aria-label', 'Abrir panel de filtros');
        btnToggleFilters.setAttribute('aria-expanded', 'false');
        btnToggleFilters.setAttribute('aria-controls', 'filters-sidebar');
    }

    if (btnCloseFilters) {
        btnCloseFilters.setAttribute('aria-label', 'Cerrar panel de filtros');
        btnCloseFilters.setAttribute('aria-expanded', 'false');
        btnCloseFilters.setAttribute('aria-controls', 'filters-sidebar');
    }

    // Initialize layout classes
    if (viewerLayout) {
        viewerLayout.classList.add('filters-closed');
    }

    // Helper function to close filters panel
    const closeFiltersPanel = () => {
        const viewerLayout = document.querySelector('.viewer-content-layout');
        const isMobile = window.innerWidth <= 768;

        console.log('Closing filters panel...'); // Debug log

        // Add closing class for animation
        filtersSidebar.classList.add('closing');
        filtersSidebar.classList.remove(CSS_CLASSES.ACTIVE);

        // Update ARIA attributes
        filtersSidebar.setAttribute('aria-hidden', 'true');
        if (btnCloseFilters) {
            btnCloseFilters.setAttribute('aria-expanded', 'false');
        }
        if (btnToggleFilters) {
            btnToggleFilters.setAttribute('aria-expanded', 'false');
            btnToggleFilters.setAttribute('aria-label', 'Abrir panel de filtros');
        }

        // Update main layout class
        if (viewerLayout) {
            viewerLayout.classList.remove('filters-open');
            viewerLayout.classList.add('filters-closed');
        }

        // Hide backdrop on mobile
        if (filtersBackdrop) {
            filtersBackdrop.classList.remove(CSS_CLASSES.ACTIVE);
        }

        // Remove classes after animation completes
        setTimeout(() => {
            filtersSidebar.classList.remove('closing');
            filtersSidebar.classList.add('collapsed');

            // Move focus to toggle button for accessibility
            if (btnToggleFilters) {
                btnToggleFilters.focus();
            }
            console.log('Filters panel closed successfully'); // Debug log
        }, 300); // Match CSS transition duration
    };

    // Helper function to open filters panel
    const openFiltersPanel = () => {
        const viewerLayout = document.querySelector('.viewer-content-layout');
        const isMobile = window.innerWidth <= 768;

        console.log('Opening filters panel...'); // Debug log

        // Remove collapsed state
        filtersSidebar.classList.remove('collapsed', 'closing');
        filtersSidebar.classList.add(CSS_CLASSES.ACTIVE);

        // Update ARIA attributes
        filtersSidebar.setAttribute('aria-hidden', 'false');
        if (btnCloseFilters) {
            btnCloseFilters.setAttribute('aria-expanded', 'true');
        }
        if (btnToggleFilters) {
            btnToggleFilters.setAttribute('aria-expanded', 'true');
            btnToggleFilters.setAttribute('aria-label', 'Cerrar panel de filtros');
        }

        // Update main layout class
        if (viewerLayout) {
            viewerLayout.classList.remove('filters-closed');
            viewerLayout.classList.add('filters-open');
        }

        // Show backdrop on mobile
        if (filtersBackdrop && window.innerWidth <= 768) {
            filtersBackdrop.classList.add(CSS_CLASSES.ACTIVE);
        }

        // Move focus to panel for accessibility
        setTimeout(() => {
            const firstFocusable = filtersSidebar.querySelector('button, input, select, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
            console.log('Filters panel opened successfully'); // Debug log
        }, 300); // After animation completes
    };

    // Toggle button click
    if (btnToggleFilters) {
        btnToggleFilters.addEventListener('click', () => {
            const isOpen = filtersSidebar.classList.contains('active') && !filtersSidebar.classList.contains('collapsed');

            if (isOpen) {
                closeFiltersPanel();
            } else {
                openFiltersPanel();
            }
        });
    }

    // Close button click
    if (btnCloseFilters) {
        btnCloseFilters.addEventListener('click', (e) => {
             e.preventDefault();
             closeFiltersPanel();
        });
    }

    // Keyboard navigation support
    if (btnCloseFilters) {
        btnCloseFilters.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeFiltersPanel();
            }
        });
    }

    // Close panel when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const isMobile = window.innerWidth <= 768;
        const isPanelOpen = filtersSidebar.classList.contains('active') && !filtersSidebar.classList.contains('collapsed');

        if (isMobile && isPanelOpen && !filtersSidebar.contains(e.target) && btnToggleFilters && !btnToggleFilters.contains(e.target)) {
            closeFiltersPanel();
        }
    });

    // Close panel when clicking backdrop
    if (filtersBackdrop) {
        filtersBackdrop.addEventListener('click', () => {
            closeFiltersPanel();
        });
    }
}

/**
 * Configura el toggle del sidebar de edición
 */
export function setupEditSidebarToggle() {
    const btnToggleSidebar = $('#btn-toggle-sidebar');
    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            const sidebar = document.querySelector('.edit-sidebar');
            const isActive = sidebar && sidebar.classList.contains('active');

            if (isActive) {
                if (window.closeEditSidebar) window.closeEditSidebar();
            } else {
                if (AppState.currentIssueId) {
                    if (window.openEditSidebar) window.openEditSidebar(AppState.currentIssueId);
                } else {
                    notify('Selecciona una incidencia primero', 'info');
                }
            }
        });
    }
}

/**
 * Configura el botón de retroceso al dashboard
 */
export function setupBackButton() {
    const btnBack = $('#btn-back');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            navigateTo('dashboard');
            AppState.currentProject = null;
            AppState.currentIssues = [];
            AppState.filteredIssues = [];
            renderProjects();
            updateGlobalStats();
        });
    }
}

/**
 * Configura el botón para crear nueva incidencia
 */
export function setupNewIssueButton() {
    const btnNewIssue = $('#btn-new-issue');
    console.log('🟡 [setupNewIssueButton] Botón encontrado:', !!btnNewIssue);
    if (btnNewIssue) {
        btnNewIssue.addEventListener('click', () => {
            console.log('🟡 [setupNewIssueButton] Click detectado en botón Nueva Incidencia');
            console.log('🟡 [setupNewIssueButton] Llamando openEditIssueModal');
            openEditIssueModal();
        });
    }
}

/**
 * Configura los toggles de modo de visualización (lista/grid)
 */
export function setupViewModeToggles() {
    const btnViewList = $('#btn-view-list');
    const btnViewGrid = $('#btn-view-grid');

    if (btnViewList) {
        btnViewList.addEventListener('click', () => {
            AppState.viewMode = 'list';
            btnViewList.classList.add(CSS_CLASSES.ACTIVE);
            if (btnViewGrid) btnViewGrid.classList.remove(CSS_CLASSES.ACTIVE);
            renderIssues();
        });
    }

    if (btnViewGrid) {
        btnViewGrid.addEventListener('click', () => {
            AppState.viewMode = 'grid';
            btnViewGrid.classList.add(CSS_CLASSES.ACTIVE);
            if (btnViewList) btnViewList.classList.remove(CSS_CLASSES.ACTIVE);
            renderIssues();
        });
    }
}

/**
 * Configura todo el sistema de navegación llamando a todas las funciones especializadas
 *
 * Esta función orquesta la configuración dividida en módulos:
 * - Gestión de proyectos (nuevo, editar)
 * - Búsqueda spotlight
 * - Panel de filtros
 * - Sidebar de edición
 * - Navegación al dashboard
 * - Creación de incidencias
 * - Cambio de vista (lista/grid)
 *
 * @example
 * import { setupAllNavigation } from './navigation-setup.js';
 * setupAllNavigation();
 */
export function setupAllNavigation() {
    setupProjectButtons();
    setupSearchTrigger();
    setupFiltersPanel();
    setupEditSidebarToggle();
    setupBackButton();
    setupNewIssueButton();
    setupViewModeToggles();
}
