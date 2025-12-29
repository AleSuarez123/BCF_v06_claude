/**
 * APP STATE - Gestión del estado global de la aplicación
 * ======================================================
 *
 * DEPRECATION NOTICE:
 * Este archivo mantiene el export de AppState para backward compatibility,
 * pero internamente usa AppStateManager (FASE 3.9).
 *
 * Para código nuevo, usar directamente:
 * import { stateManager } from './app-state-manager.js';
 *
 * El acceso directo a AppState.property seguirá funcionando pero es
 * recomendado migrar a stateManager.getProperty() / setProperty()
 */

import { stateManager } from './app-state-manager.js';
import { logger } from './config.js';

/**
 * Proxy para AppState que delega al stateManager
 * Mantiene backward compatibility con código existente
 *
 * Permite que AppState.projects = [...] funcione,
 * pero internamente usa stateManager.setProjects(...)
 */
export const AppState = new Proxy({}, {
    /**
     * Intercepta lecturas de propiedades
     */
    get(target, property) {
        // Mapear propiedades a métodos de stateManager
        switch (property) {
            case 'projects':
                return stateManager.getProjects();
            case 'currentProject':
                return stateManager.getCurrentProject();
            case 'currentIssues':
                return stateManager.getCurrentIssues();
            case 'filteredIssues':
                return stateManager.getFilteredIssues();
            case 'selectedIssues':
                return stateManager.getSelectedIssues();
            case 'focusedIndex':
                return stateManager.getFocusedIndex();
            case 'viewMode':
                return stateManager.getViewMode();
            case 'sortBy':
                return stateManager.getSortBy();
            case 'filters':
                return stateManager.getFilters();
            case 'currentIssueId':
                return stateManager.getCurrentIssueId();
            case 'theme':
                return stateManager.getTheme();
            case 'favorites':
                return stateManager.getFavorites();
            case 'notifications':
                return stateManager.getNotifications();
            case 'loading':
                return stateManager.getLoadingStates();

            // Propiedades que aún no tienen getters específicos
            // (se pueden agregar al stateManager si es necesario)
            case 'localChanges':
            case 'pendingBCFFiles':
            case 'bcfServer':
            case 'abortControllers':
                // Por ahora, retornar del snapshot
                const snapshot = stateManager.getSnapshot();
                return snapshot[property];

            default:
                logger.warn(`AppState: Propiedad no reconocida: ${String(property)}`);
                return undefined;
        }
    },

    /**
     * Intercepta escrituras de propiedades
     */
    set(target, property, value) {
        // Mapear propiedades a métodos de stateManager
        switch (property) {
            case 'projects':
                stateManager.setProjects(value);
                return true;
            case 'currentProject':
                stateManager.setCurrentProject(value);
                return true;
            case 'currentIssues':
                stateManager.setCurrentIssues(value);
                return true;
            case 'filteredIssues':
                stateManager.setFilteredIssues(value);
                return true;
            case 'selectedIssues':
                // Si es un Set, convertir; si es array, crear Set
                if (value instanceof Set) {
                    // Clear y agregar todos
                    stateManager.clearSelection();
                    value.forEach(id => stateManager.selectIssue(id));
                } else {
                    logger.warn('AppState.selectedIssues debe ser un Set');
                }
                return true;
            case 'focusedIndex':
                stateManager.setFocusedIndex(value);
                return true;
            case 'viewMode':
                stateManager.setViewMode(value);
                return true;
            case 'sortBy':
                stateManager.setSortBy(value);
                return true;
            case 'filters':
                stateManager.setFilters(value);
                return true;
            case 'currentIssueId':
                stateManager.setCurrentIssueId(value);
                return true;
            case 'theme':
                stateManager.setTheme(value);
                return true;
            case 'favorites':
                // Similar a selectedIssues
                if (value instanceof Set) {
                    // Reemplazar favorites completamente
                    const snapshot = stateManager.getSnapshot();
                    snapshot.favorites.clear();
                    value.forEach(id => stateManager.addFavorite(id));
                }
                return true;
            case 'notifications':
                if (Array.isArray(value)) {
                    stateManager.clearNotifications();
                    value.forEach(n => stateManager.addNotification(n));
                }
                return true;

            // Propiedades que aún no tienen setters
            case 'localChanges':
            case 'pendingBCFFiles':
            case 'bcfServer':
            case 'loading':
            case 'abortControllers':
                logger.warn(`AppState.${String(property)} = ... no está completamente migrado al stateManager`);
                // Por ahora, permitir pero loguear
                return true;

            default:
                logger.warn(`AppState: Intento de escribir propiedad no reconocida: ${String(property)}`);
                return false;
        }
    },

    /**
     * Soporta 'property' in AppState
     */
    has(target, property) {
        const knownProperties = [
            'projects', 'currentProject', 'currentIssues', 'filteredIssues',
            'selectedIssues', 'focusedIndex', 'viewMode', 'sortBy', 'filters',
            'currentIssueId', 'localChanges', 'theme', 'favorites', 'notifications',
            'pendingBCFFiles', 'bcfServer', 'loading', 'abortControllers'
        ];
        return knownProperties.includes(property);
    }
});

export const STATUS_COLORS = {
    'open': 'open',
    'in_progress': 'progress',
    'resolved': 'resolved',
    'closed': 'closed',
    'Open': 'open',
    'In Progress': 'progress',
    'Resolved': 'resolved',
    'Closed': 'closed'
};

export const PRIORITY_COLORS = {
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low'
};

export const STATUS_LABELS = {
    'open': 'Abierto',
    'in_progress': 'En Proceso',
    'resolved': 'Resuelto',
    'closed': 'Cerrado',
    'Open': 'Abierto',
    'In Progress': 'En Proceso',
    'Resolved': 'Resuelto',
    'Closed': 'Cerrado'
};

export const PRIORITY_LABELS = {
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja',
    'High': 'Alta',
    'Medium': 'Media',
    'Low': 'Baja'
};

export const STORAGE_KEY = 'bcf_viewer_pro_data';
