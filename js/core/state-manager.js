/**
 * APP STATE MANAGER - Gestión centralizada y desacoplada del estado
 * ================================================================
 *
 * Este módulo proporciona un gestor de estado encapsulado que:
 * - Evita acoplamiento directo entre módulos
 * - Proporciona getters/setters con validación
 * - Soporta suscripciones a cambios (Observer pattern)
 * - Mantiene historial de cambios para debugging
 * - Garantiza inmutabilidad del estado (no se puede mutar directamente)
 *
 * Implementado en FASE 3.9 para reducir acoplamiento
 *
 * @example
 * // Uso básico
 * import { stateManager } from './core/state-manager.js';
 *
 * // Leer estado
 * const projects = stateManager.getProjects();
 * const currentProject = stateManager.getCurrentProject();
 *
 * // Modificar estado
 * stateManager.setCurrentProject(project);
 * stateManager.addIssue(issue);
 *
 * // Suscribirse a cambios
 * const unsubscribe = stateManager.subscribe('currentProject', (newValue, oldValue) => {
 *     console.log(`Project changed from ${oldValue?.name} to ${newValue?.name}`);
 * });
 */

import { logger } from '../config.js';

/**
 * Clase que gestiona el estado de la aplicación de forma encapsulada
 */
class AppStateManager {
    /**
     * Estado privado - NO accesible directamente desde fuera
     * @private
     */
    #state = {
        projects: [],
        currentProject: null,
        currentIssues: [],
        filteredIssues: [],
        selectedIssues: new Set(),
        focusedIndex: -1,
        viewMode: 'list',
        sortBy: 'date-desc',
        filters: {
            bcfFile: '',
            statuses: [],
            priorities: [],
            types: [],
            author: '',
            dateFrom: '',
            dateTo: '',
            search: ''
        },
        currentIssueId: null,
        localChanges: {},
        theme: 'dark',
        favorites: new Set(),
        notifications: [],
        pendingBCFFiles: [],
        bcfServer: {
            url: '',
            token: ''
        },
        loading: {
            project: false,
            issues: false,
            save: false,
            sync: false
        },
        abortControllers: {
            projectLoad: null,
            issueLoad: null,
            serverSync: null
        }
    };

    /**
     * Suscriptores a cambios del estado
     * @private
     */
    #subscribers = new Map();

    /**
     * Historial de cambios para debugging
     * @private
     */
    #history = [];

    /**
     * Límite de historial
     * @private
     */
    #historyLimit = 50;

    constructor() {
        logger.debug('📦 AppStateManager initialized');
    }

    // ===========================================
    // MÉTODOS DE ACCESO - PROJECTS
    // ===========================================

    /**
     * Obtiene todos los proyectos
     * @returns {Array} Array de proyectos
     */
    getProjects() {
        return [...this.#state.projects];
    }

    /**
     * Establece la lista de proyectos
     * @param {Array} projects - Array de proyectos
     */
    setProjects(projects) {
        this.#setState('projects', Array.isArray(projects) ? projects : []);
    }

    /**
     * Agrega un proyecto
     * @param {Object} project - Proyecto a agregar
     */
    addProject(project) {
        if (!project || !project.id) {
            logger.warning('Intento de agregar proyecto inválido');
            return;
        }
        const projects = [...this.#state.projects, project];
        this.#setState('projects', projects);
    }

    /**
     * Actualiza un proyecto existente
     * @param {string} projectId - ID del proyecto
     * @param {Object} updates - Cambios a aplicar
     */
    updateProject(projectId, updates) {
        const projects = this.#state.projects.map(p =>
            p.id === projectId ? { ...p, ...updates } : p
        );
        this.#setState('projects', projects);
    }

    /**
     * Elimina un proyecto
     * @param {string} projectId - ID del proyecto a eliminar
     */
    removeProject(projectId) {
        const projects = this.#state.projects.filter(p => p.id !== projectId);
        this.#setState('projects', projects);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - CURRENT PROJECT
    // ===========================================

    /**
     * Obtiene el proyecto actual
     * @returns {Object|null} Proyecto actual o null
     */
    getCurrentProject() {
        return this.#state.currentProject;
    }

    /**
     * Establece el proyecto actual
     * @param {Object|null} project - Proyecto a establecer como actual
     */
    setCurrentProject(project) {
        this.#setState('currentProject', project);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - ISSUES
    // ===========================================

    /**
     * Obtiene todas las incidencias del proyecto actual
     * @returns {Array} Array de incidencias
     */
    getCurrentIssues() {
        return [...this.#state.currentIssues];
    }

    /**
     * Establece las incidencias del proyecto actual
     * @param {Array} issues - Array de incidencias
     */
    setCurrentIssues(issues) {
        this.#setState('currentIssues', Array.isArray(issues) ? issues : []);
    }

    /**
     * Agrega una incidencia
     * @param {Object} issue - Incidencia a agregar
     */
    addIssue(issue) {
        if (!issue || !issue.guid) {
            logger.warning('Intento de agregar incidencia inválida');
            return;
        }
        const issues = [...this.#state.currentIssues, issue];
        this.#setState('currentIssues', issues);
    }

    /**
     * Actualiza una incidencia existente
     * @param {string} issueGuid - GUID de la incidencia
     * @param {Object} updates - Cambios a aplicar
     */
    updateIssue(issueGuid, updates) {
        const issues = this.#state.currentIssues.map(i =>
            i.guid === issueGuid ? { ...i, ...updates } : i
        );
        this.#setState('currentIssues', issues);
    }

    /**
     * Elimina una incidencia
     * @param {string} issueGuid - GUID de la incidencia a eliminar
     */
    removeIssue(issueGuid) {
        const issues = this.#state.currentIssues.filter(i => i.guid !== issueGuid);
        this.#setState('currentIssues', issues);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - FILTERED ISSUES
    // ===========================================

    /**
     * Obtiene las incidencias filtradas
     * @returns {Array} Array de incidencias filtradas
     */
    getFilteredIssues() {
        return [...this.#state.filteredIssues];
    }

    /**
     * Establece las incidencias filtradas
     * @param {Array} issues - Array de incidencias filtradas
     */
    setFilteredIssues(issues) {
        this.#setState('filteredIssues', Array.isArray(issues) ? issues : []);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - SELECTION
    // ===========================================

    /**
     * Obtiene las incidencias seleccionadas
     * @returns {Set} Set de GUIDs seleccionados
     */
    getSelectedIssues() {
        return new Set(this.#state.selectedIssues);
    }

    /**
     * Selecciona una incidencia
     * @param {string} issueGuid - GUID de la incidencia a seleccionar
     */
    selectIssue(issueGuid) {
        const selected = new Set(this.#state.selectedIssues);
        selected.add(issueGuid);
        this.#setState('selectedIssues', selected);
    }

    /**
     * Deselecciona una incidencia
     * @param {string} issueGuid - GUID de la incidencia a deseleccionar
     */
    deselectIssue(issueGuid) {
        const selected = new Set(this.#state.selectedIssues);
        selected.delete(issueGuid);
        this.#setState('selectedIssues', selected);
    }

    /**
     * Toggle selección de una incidencia
     * @param {string} issueGuid - GUID de la incidencia
     */
    toggleIssueSelection(issueGuid) {
        const selected = new Set(this.#state.selectedIssues);
        if (selected.has(issueGuid)) {
            selected.delete(issueGuid);
        } else {
            selected.add(issueGuid);
        }
        this.#setState('selectedIssues', selected);
    }

    /**
     * Selecciona todas las incidencias filtradas
     */
    selectAllIssues() {
        const allGuids = this.#state.filteredIssues.map(i => i.guid);
        this.#setState('selectedIssues', new Set(allGuids));
    }

    /**
     * Deselecciona todas las incidencias
     */
    clearSelection() {
        this.#setState('selectedIssues', new Set());
    }

    // ===========================================
    // MÉTODOS DE ACCESO - FILTERS
    // ===========================================

    /**
     * Obtiene los filtros actuales
     * @returns {Object} Filtros actuales
     */
    getFilters() {
        return { ...this.#state.filters };
    }

    /**
     * Actualiza los filtros
     * @param {Object} filters - Nuevos filtros
     */
    setFilters(filters) {
        this.#setState('filters', { ...this.#state.filters, ...filters });
    }

    /**
     * Limpia todos los filtros
     */
    clearFilters() {
        this.#setState('filters', {
            bcfFile: '',
            statuses: [],
            priorities: [],
            types: [],
            author: '',
            dateFrom: '',
            dateTo: '',
            search: ''
        });
    }

    // ===========================================
    // MÉTODOS DE ACCESO - VIEW MODE
    // ===========================================

    /**
     * Obtiene el modo de visualización actual
     * @returns {string} 'list' o 'grid'
     */
    getViewMode() {
        return this.#state.viewMode;
    }

    /**
     * Establece el modo de visualización
     * @param {string} mode - 'list' o 'grid'
     */
    setViewMode(mode) {
        if (mode !== 'list' && mode !== 'grid') {
            logger.warning(`Modo de vista inválido: ${mode}`);
            return;
        }
        this.#setState('viewMode', mode);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - THEME
    // ===========================================

    /**
     * Obtiene el tema actual
     * @returns {string} 'light' o 'dark'
     */
    getTheme() {
        return this.#state.theme;
    }

    /**
     * Establece el tema
     * @param {string} theme - 'light' o 'dark'
     */
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            logger.warning(`Tema inválido: ${theme}`);
            return;
        }
        this.#setState('theme', theme);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - FAVORITES
    // ===========================================

    /**
     * Obtiene los favoritos
     * @returns {Set} Set de GUIDs favoritos
     */
    getFavorites() {
        return new Set(this.#state.favorites);
    }

    /**
     * Agrega a favoritos
     * @param {string} issueGuid - GUID de la incidencia
     */
    addFavorite(issueGuid) {
        const favorites = new Set(this.#state.favorites);
        favorites.add(issueGuid);
        this.#setState('favorites', favorites);
    }

    /**
     * Remueve de favoritos
     * @param {string} issueGuid - GUID de la incidencia
     */
    removeFavorite(issueGuid) {
        const favorites = new Set(this.#state.favorites);
        favorites.delete(issueGuid);
        this.#setState('favorites', favorites);
    }

    /**
     * Toggle favorito
     * @param {string} issueGuid - GUID de la incidencia
     */
    toggleFavorite(issueGuid) {
        const favorites = new Set(this.#state.favorites);
        if (favorites.has(issueGuid)) {
            favorites.delete(issueGuid);
        } else {
            favorites.add(issueGuid);
        }
        this.#setState('favorites', favorites);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - LOADING STATES
    // ===========================================

    /**
     * Obtiene el estado de carga
     * @returns {Object} Estados de carga
     */
    getLoadingStates() {
        return { ...this.#state.loading };
    }

    /**
     * Establece un estado de carga
     * @param {string} key - Clave del estado (project, issues, save, sync)
     * @param {boolean} value - Valor del estado
     */
    setLoadingState(key, value) {
        if (!this.#state.loading.hasOwnProperty(key)) {
            logger.warning(`Estado de carga inválido: ${key}`);
            return;
        }
        this.#setState('loading', { ...this.#state.loading, [key]: value });
    }

    // ===========================================
    // MÉTODOS DE ACCESO - NOTIFICATIONS
    // ===========================================

    /**
     * Obtiene las notificaciones
     * @returns {Array} Array de notificaciones
     */
    getNotifications() {
        return [...this.#state.notifications];
    }

    /**
     * Agrega una notificación
     * @param {Object} notification - Notificación a agregar
     */
    addNotification(notification) {
        const notifications = [...this.#state.notifications, notification];
        this.#setState('notifications', notifications);
    }

    /**
     * Elimina una notificación
     * @param {string} notificationId - ID de la notificación
     */
    removeNotification(notificationId) {
        const notifications = this.#state.notifications.filter(n => n.id !== notificationId);
        this.#setState('notifications', notifications);
    }

    /**
     * Limpia todas las notificaciones
     */
    clearNotifications() {
        this.#setState('notifications', []);
    }

    // ===========================================
    // MÉTODOS DE ACCESO - GENERAL
    // ===========================================

    /**
     * Obtiene el ID de la incidencia actual
     * @returns {string|null} ID de la incidencia actual
     */
    getCurrentIssueId() {
        return this.#state.currentIssueId;
    }

    /**
     * Establece el ID de la incidencia actual
     * @param {string|null} issueId - ID de la incidencia
     */
    setCurrentIssueId(issueId) {
        this.#setState('currentIssueId', issueId);
    }

    /**
     * Obtiene el índice enfocado
     * @returns {number} Índice enfocado
     */
    getFocusedIndex() {
        return this.#state.focusedIndex;
    }

    /**
     * Establece el índice enfocado
     * @param {number} index - Índice a enfocar
     */
    setFocusedIndex(index) {
        this.#setState('focusedIndex', index);
    }

    /**
     * Obtiene el criterio de ordenamiento
     * @returns {string} Criterio de ordenamiento
     */
    getSortBy() {
        return this.#state.sortBy;
    }

    /**
     * Establece el criterio de ordenamiento
     * @param {string} sortBy - Criterio de ordenamiento
     */
    setSortBy(sortBy) {
        this.#setState('sortBy', sortBy);
    }

    // ===========================================
    // SUSCRIPCIONES (OBSERVER PATTERN)
    // ===========================================

    /**
     * Suscribe a cambios en una propiedad del estado
     *
     * @param {string} property - Propiedad a observar
     * @param {Function} callback - Función a llamar cuando cambie (newValue, oldValue) => void
     * @returns {Function} Función para cancelar la suscripción
     *
     * @example
     * const unsubscribe = stateManager.subscribe('currentProject', (newProject, oldProject) => {
     *     console.log('Project changed!', newProject);
     * });
     *
     * // Más tarde...
     * unsubscribe();
     */
    subscribe(property, callback) {
        if (!this.#subscribers.has(property)) {
            this.#subscribers.set(property, new Set());
        }

        this.#subscribers.get(property).add(callback);

        // Retornar función de cancelación
        return () => {
            const subs = this.#subscribers.get(property);
            if (subs) {
                subs.delete(callback);
            }
        };
    }

    /**
     * Notifica a los suscriptores de un cambio
     * @private
     */
    #notifySubscribers(property, newValue, oldValue) {
        const subscribers = this.#subscribers.get(property);
        if (!subscribers) return;

        subscribers.forEach(callback => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                logger.error(`Error en subscriber de '${property}':`, error);
            }
        });
    }

    // ===========================================
    // MÉTODOS INTERNOS
    // ===========================================

    /**
     * Establece un valor en el estado
     * @private
     */
    #setState(property, value) {
        const oldValue = this.#state[property];

        // No actualizar si el valor es el mismo (para primitivos)
        if (oldValue === value) return;

        // Actualizar estado
        this.#state[property] = value;

        // Agregar al historial
        this.#addToHistory(property, oldValue, value);

        // Notificar a suscriptores
        this.#notifySubscribers(property, value, oldValue);

        logger.debug(`📦 State updated: ${property}`);
    }

    /**
     * Agrega un cambio al historial
     * @private
     */
    #addToHistory(property, oldValue, newValue) {
        this.#history.push({
            timestamp: new Date().toISOString(),
            property,
            oldValue: this.#cloneValue(oldValue),
            newValue: this.#cloneValue(newValue)
        });

        // Limitar historial
        if (this.#history.length > this.#historyLimit) {
            this.#history.shift();
        }
    }

    /**
     * Clona un valor para el historial (evita referencias)
     * @private
     */
    #cloneValue(value) {
        if (value instanceof Set) {
            return new Set(value);
        }
        if (Array.isArray(value)) {
            return [...value];
        }
        if (value && typeof value === 'object') {
            return { ...value };
        }
        return value;
    }

    // ===========================================
    // DEBUGGING Y UTILIDADES
    // ===========================================

    /**
     * Obtiene el historial de cambios
     * @returns {Array} Historial de cambios
     */
    getHistory() {
        return [...this.#history];
    }

    /**
     * Obtiene una snapshot del estado completo (solo para debugging)
     * ⚠️ NO usar esto para acceso normal al estado
     * @returns {Object} Snapshot del estado
     */
    getSnapshot() {
        return {
            projects: [...this.#state.projects],
            currentProject: this.#state.currentProject ? { ...this.#state.currentProject } : null,
            currentIssues: [...this.#state.currentIssues],
            filteredIssues: [...this.#state.filteredIssues],
            selectedIssues: new Set(this.#state.selectedIssues),
            focusedIndex: this.#state.focusedIndex,
            viewMode: this.#state.viewMode,
            sortBy: this.#state.sortBy,
            filters: { ...this.#state.filters },
            currentIssueId: this.#state.currentIssueId,
            localChanges: { ...this.#state.localChanges },
            theme: this.#state.theme,
            favorites: new Set(this.#state.favorites),
            notifications: [...this.#state.notifications],
            pendingBCFFiles: [...this.#state.pendingBCFFiles],
            bcfServer: { ...this.#state.bcfServer },
            loading: { ...this.#state.loading },
            abortControllers: { ...this.#state.abortControllers }
        };
    }

    /**
     * Resetea el estado a valores iniciales
     */
    reset() {
        logger.info('🔄 Resetting AppState...');

        this.#state = {
            projects: [],
            currentProject: null,
            currentIssues: [],
            filteredIssues: [],
            selectedIssues: new Set(),
            focusedIndex: -1,
            viewMode: 'list',
            sortBy: 'date-desc',
            filters: {
                bcfFile: '',
                statuses: [],
                priorities: [],
                types: [],
                author: '',
                dateFrom: '',
                dateTo: '',
                search: ''
            },
            currentIssueId: null,
            localChanges: {},
            theme: 'dark',
            favorites: new Set(),
            notifications: [],
            pendingBCFFiles: [],
            bcfServer: {
                url: '',
                token: ''
            },
            loading: {
                project: false,
                issues: false,
                save: false,
                sync: false
            },
            abortControllers: {
                projectLoad: null,
                issueLoad: null,
                serverSync: null
            }
        };

        this.#history = [];
    }
}

// Exportar instancia singleton
export const stateManager = new AppStateManager();

// Exportar también la clase para testing
export { AppStateManager };
