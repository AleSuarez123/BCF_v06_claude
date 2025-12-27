/**
 * SELECTION UTILS - Gestión de selección de incidencias y acciones en bloque
 */

import { AppState } from './state.js';
import { $, $$ } from './ui-utils.js';
import { notify } from './ui-utils.js';
import { Storage } from './storage.js';

/**
 * Alterna la selección de una incidencia por su GUID
 */
export function toggleIssueSelection(guid) {
    if (AppState.selectedIssues.has(guid)) {
        AppState.selectedIssues.delete(guid);
    } else {
        AppState.selectedIssues.add(guid);
    }
    updateBulkActionsBar();
}

/**
 * Selecciona todas las incidencias filtradas
 */
export function selectAllIssues() {
    AppState.filteredIssues.forEach(issue => {
        AppState.selectedIssues.add(issue.guid);
    });
    updateBulkActionsBar();
}

/**
 * Deselecciona todas las incidencias
 */
export function deselectAllIssues() {
    AppState.selectedIssues.clear();
    const selectAllCheckbox = $('#select-all-checkbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBulkActionsBar();
}

/**
 * Actualiza la visibilidad y contador de la barra de acciones en bloque
 */
export function updateBulkActionsBar() {
    const count = AppState.selectedIssues.size;
    const bulkBar = $('#bulk-actions-bar');
    const countBadge = $('#selected-count');
    
    if (!bulkBar) return;

    if (count > 0) {
        bulkBar.classList.remove('hidden');
        if (countBadge) countBadge.textContent = count;
    } else {
        bulkBar.classList.add('hidden');
    }

    // Actualizar checkboxes individuales si están renderizados
    $$('.issue-checkbox').forEach(cb => {
        cb.checked = AppState.selectedIssues.has(cb.dataset.guid);
    });

    // Actualizar checkbox de "seleccionar todo"
    const selectAllCheckbox = $('#select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = count > 0 && count === AppState.filteredIssues.length;
        selectAllCheckbox.indeterminate = count > 0 && count < AppState.filteredIssues.length;
    }
}

/**
 * Aplica un estado en bloque a todas las incidencias seleccionadas
 * @deprecated Use applyBulkUpdate instead
 */
export async function applyBulkStatus(status, onUpdate) {
    return applyBulkUpdate('topicStatus', status, onUpdate);
}

/**
 * Aplica una actualización genérica en bloque
 * @param {string} field - Campo a actualizar (topicStatus, priority, assignedTo, labels)
 * @param {any} value - Nuevo valor
 * @param {Function} onUpdate - Callback al finalizar
 */
export async function applyBulkUpdate(field, value, onUpdate) {
    if (AppState.selectedIssues.size === 0) return;
    
    // Si value es null/undefined, intentar leer del input correspondiente si es status
    if (value === undefined || value === null) {
        if (field === 'topicStatus') value = $('#bulk-status')?.value;
        if (field === 'priority') value = $('#bulk-priority')?.value;
        if (field === 'assignedTo') value = $('#bulk-assigned')?.value;
    }
    
    if (value === undefined || value === null || value === '') {
        notify('Selecciona un valor válido', 'warning');
        return;
    }

    try {
        let updatedCount = 0;
        AppState.selectedIssues.forEach(guid => {
            if (!AppState.localChanges[guid]) {
                AppState.localChanges[guid] = {};
            }
            
            // Manejo especial para etiquetas (añadir, no reemplazar)
            if (field === 'labels') {
                const issue = AppState.currentIssues.find(i => i.guid === guid);
                if (issue) {
                    const currentLabels = issue.labels || [];
                    if (!currentLabels.includes(value)) {
                        const newLabels = [...currentLabels, value];
                        AppState.localChanges[guid].labels = newLabels;
                        issue.labels = newLabels;
                        updatedCount++;
                    }
                }
            } else {
                AppState.localChanges[guid][field] = value;
                
                // Actualizar en el array actual para feedback inmediato
                const issue = AppState.currentIssues.find(i => i.guid === guid);
                if (issue) {
                    issue[field] = value;
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            await Storage.saveAll();
            notify(`${updatedCount} incidencias actualizadas`, 'success');
        } else {
            notify('No se requirieron cambios', 'info');
        }
        
        if (typeof onUpdate === 'function') {
            onUpdate();
        }
        
        deselectAllIssues();
    } catch (error) {
        console.error('Error en actualización en bloque:', error);
        notify('Error al actualizar incidencias', 'error');
    }
}

/**
 * Elimina las incidencias seleccionadas
 */
export async function applyBulkDelete(onUpdate) {
    if (AppState.selectedIssues.size === 0) return;
    
    if (!confirm(`¿Estás seguro de eliminar ${AppState.selectedIssues.size} incidencias? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        // Eliminar del proyecto actual
        if (AppState.currentProject) {
            AppState.currentProject.bcfFiles.forEach(bcf => {
                if (bcf.topics) {
                    bcf.topics = bcf.topics.filter(t => !AppState.selectedIssues.has(t.guid));
                }
            });
        }

        // Eliminar de la lista actual en memoria
        AppState.currentIssues = AppState.currentIssues.filter(i => !AppState.selectedIssues.has(i.guid));
        
        // Limpiar selección
        AppState.selectedIssues.clear();
        
        await Storage.saveAll();
        notify('Incidencias eliminadas', 'success');
        
        if (typeof onUpdate === 'function') {
            onUpdate();
        }
        
        updateBulkActionsBar();
    } catch (error) {
        console.error('Error al eliminar incidencias:', error);
        notify('Error al eliminar incidencias', 'error');
    }
}

export function setupSelectionHandlers() {
    // Implementación básica
    console.log('Selection handlers initialized');
}