/**
 * KEYBOARD SHORTCUTS - Gestión de atajos de teclado globales
 */

import { AppState } from './state.js';
import { $, $$ } from './ui-utils.js';

export function initKeyboardShortcuts(actions) {
    document.addEventListener('keydown', e => {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        const isModalOpen = $$('.modal.active').length > 0;
        const isSpotlightOpen = $('#spotlight')?.classList.contains('active');

        // Spotlight abierto
        if (isSpotlightOpen) {
            if (e.key === 'Escape') {
                actions.closeSpotlight();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                actions.navigateSpotlight(1);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                actions.navigateSpotlight(-1);
                return;
            }
            if (e.key === 'Enter') {
                const selected = $('.spotlight-result.selected');
                if (selected && actions.selectSpotlightResult) {
                    actions.selectSpotlightResult(selected);
                }
                return;
            }
            return;
        }

        // Ctrl+K: Spotlight
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            actions.openSpotlight();
            return;
        }

        // Ctrl+E: Exportar Excel
        if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !isInput) {
            e.preventDefault();
            if ($('#viewer-page').classList.contains('active')) {
                actions.exportToExcel();
            }
            return;
        }

        // Ctrl+B: Exportar BCF
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !isInput) {
            e.preventDefault();
            if ($('#viewer-page').classList.contains('active') && actions.openBCFExportModal) {
                actions.openBCFExportModal();
            }
            return;
        }

        // Ctrl+P: Exportar PDF
        if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !isInput) {
            e.preventDefault();
            if ($('#viewer-page').classList.contains('active')) {
                actions.exportToPDF(false);
            }
            return;
        }

        // Escape: Cerrar modales o volver
        if (e.key === 'Escape') {
            if (isModalOpen) {
                actions.closeAllModals();
                return;
            }
            if ($('#keyboard-help')?.classList.contains('active')) {
                $('#keyboard-help').classList.remove('active');
                return;
            }
            if ($('#viewer-page').classList.contains('active')) {
                actions.goToDashboard();
                return;
            }
        }

        // Si hay input activo, no procesar atajos de una tecla
        if (isInput) return;

        // ?: Ayuda de teclado
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
            e.preventDefault();
            actions.toggleKeyboardHelp();
            return;
        }

        // V: Cambiar vista
        if (e.key === 'v' && !isModalOpen) {
            e.preventDefault();
            actions.toggleViewMode();
            return;
        }

        // F: Enfocar búsqueda
        if (e.key === 'f' && !isModalOpen) {
            e.preventDefault();
            $('#filter-search')?.focus();
            return;
        }

        // R: Resetear filtros
        if (e.key === 'r' && !isModalOpen) {
            e.preventDefault();
            actions.resetFilters();
            return;
        }

        // J/K: Navegación de incidencias
        if (e.key === 'j') {
            e.preventDefault();
            actions.navigateIssue(1);
            return;
        }
        if (e.key === 'k') {
            e.preventDefault();
            actions.navigateIssue(-1);
            return;
        }

        // E: Editar (abrir detalle)
        if (e.key === 'e' && AppState.focusedIndex >= 0 && !isModalOpen) {
            e.preventDefault();
            const issue = AppState.filteredIssues[AppState.focusedIndex];
            if (issue) actions.openIssueDetail(issue.guid);
            return;
        }

        // Space: Seleccionar/deseleccionar
        if (e.key === ' ' && AppState.focusedIndex >= 0 && !isModalOpen) {
            e.preventDefault();
            const issue = AppState.filteredIssues[AppState.focusedIndex];
            if (issue) actions.toggleSelection(issue.guid);
            return;
        }

        // Ctrl+A: Seleccionar todas
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isModalOpen) {
            e.preventDefault();
            actions.selectAll();
            return;
        }
    });
}
