/**
 * EVENT BUS - Sistema de eventos global para comunicación desacoplada
 * =====================================================================
 *
 * Implementa patrón Publish/Subscribe para comunicación entre módulos.
 *
 * Características:
 * - Publicar eventos con datos (publish/emit)
 * - Suscribirse a eventos (on/subscribe)
 * - Suscripción única (once)
 * - Desuscribirse (off/unsubscribe)
 * - Wildcards y namespaces (opcional)
 * - Debugging de eventos
 * - Rate limiting para prevenir spam
 * - Historial de eventos (debug mode)
 *
 * Uso:
 * ```javascript
 * import { eventBus } from './event-bus.js';
 *
 * // Suscribirse
 * eventBus.on('project:loaded', (data) => {
 *   console.log('Proyecto cargado:', data.projectId);
 * });
 *
 * // Publicar
 * eventBus.emit('project:loaded', { projectId: '123' });
 *
 * // Suscripción única
 * eventBus.once('app:ready', () => {
 *   console.log('App lista!');
 * });
 *
 * // Desuscribirse
 * const handler = (data) => console.log(data);
 * eventBus.on('issue:updated', handler);
 * eventBus.off('issue:updated', handler);
 * ```
 */

import { logger } from '../config.js';

/**
 * Clase EventBus - Sistema de eventos global
 */
class EventBus {
    constructor() {
        // Map de eventos: eventName -> Set<listener>
        this.events = new Map();

        // Listeners únicos (once): eventName -> Set<listener>
        this.onceListeners = new Map();

        // Historial de eventos (para debugging)
        this.history = [];
        this.maxHistorySize = 100;

        // Configuración
        this.config = {
            debug: false,           // Modo debug
            logEvents: false,       // Loguear todos los eventos
            rateLimitWindow: 1000,  // Ventana de rate limit (1s)
            maxEventsPerWindow: 50  // Máximo de eventos por ventana
        };

        // Rate limiting
        this.eventCounts = new Map(); // eventName -> count
        this._setupRateLimitReset();

        // Estadísticas
        this.stats = {
            totalEmitted: 0,
            totalListeners: 0,
            eventCounts: {}
        };
    }

    /**
     * Resetea los contadores de rate limiting
     * @private
     */
    _setupRateLimitReset() {
        setInterval(() => {
            this.eventCounts.clear();
        }, this.config.rateLimitWindow);
    }

    /**
     * Verifica si un evento está siendo spammed
     * @private
     */
    _isRateLimited(eventName) {
        const count = this.eventCounts.get(eventName) || 0;

        if (count >= this.config.maxEventsPerWindow) {
            logger.warning(`EventBus: Rate limit alcanzado para evento "${eventName}"`);
            return true;
        }

        this.eventCounts.set(eventName, count + 1);
        return false;
    }

    /**
     * Suscribe un listener a un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} listener - Función callback
     * @returns {Function} Función para desuscribirse
     */
    on(eventName, listener) {
        if (typeof listener !== 'function') {
            logger.error('EventBus.on: listener debe ser una función');
            return () => {};
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        this.events.get(eventName).add(listener);
        this.stats.totalListeners++;

        if (this.config.debug) {
            logger.debug(`EventBus: Listener registrado para "${eventName}"`);
        }

        // Retornar función de desuscripción
        return () => this.off(eventName, listener);
    }

    /**
     * Alias de on() para compatibilidad
     */
    subscribe(eventName, listener) {
        return this.on(eventName, listener);
    }

    /**
     * Suscribe un listener que solo se ejecuta una vez
     * @param {string} eventName - Nombre del evento
     * @param {Function} listener - Función callback
     * @returns {Function} Función para desuscribirse
     */
    once(eventName, listener) {
        if (typeof listener !== 'function') {
            logger.error('EventBus.once: listener debe ser una función');
            return () => {};
        }

        if (!this.onceListeners.has(eventName)) {
            this.onceListeners.set(eventName, new Set());
        }

        this.onceListeners.get(eventName).add(listener);
        this.stats.totalListeners++;

        if (this.config.debug) {
            logger.debug(`EventBus: Listener único registrado para "${eventName}"`);
        }

        // Retornar función de desuscripción
        return () => {
            const listeners = this.onceListeners.get(eventName);
            if (listeners) {
                listeners.delete(listener);
                this.stats.totalListeners--;
            }
        };
    }

    /**
     * Desuscribe un listener de un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} listener - Función callback a remover
     */
    off(eventName, listener) {
        // Remover de listeners normales
        const listeners = this.events.get(eventName);
        if (listeners) {
            const deleted = listeners.delete(listener);
            if (deleted) {
                this.stats.totalListeners--;

                // Si no quedan listeners, eliminar el evento
                if (listeners.size === 0) {
                    this.events.delete(eventName);
                }

                if (this.config.debug) {
                    logger.debug(`EventBus: Listener removido de "${eventName}"`);
                }
            }
        }

        // Remover de once listeners
        const onceListeners = this.onceListeners.get(eventName);
        if (onceListeners) {
            const deleted = onceListeners.delete(listener);
            if (deleted) {
                this.stats.totalListeners--;
            }
        }
    }

    /**
     * Alias de off() para compatibilidad
     */
    unsubscribe(eventName, listener) {
        this.off(eventName, listener);
    }

    /**
     * Emite un evento con datos opcionales
     * @param {string} eventName - Nombre del evento
     * @param {*} data - Datos a pasar a los listeners
     * @param {Object} options - Opciones de emisión
     * @returns {number} Cantidad de listeners notificados
     */
    emit(eventName, data = null, options = {}) {
        // Rate limiting
        if (!options.skipRateLimit && this._isRateLimited(eventName)) {
            return 0;
        }

        // Logging
        if (this.config.logEvents || this.config.debug) {
            logger.debug(`EventBus: Emitiendo "${eventName}"`, data);
        }

        // Agregar al historial
        this._addToHistory(eventName, data);

        // Actualizar stats
        this.stats.totalEmitted++;
        this.stats.eventCounts[eventName] = (this.stats.eventCounts[eventName] || 0) + 1;

        let notifiedCount = 0;

        // Ejecutar listeners normales
        const listeners = this.events.get(eventName);
        if (listeners && listeners.size > 0) {
            // Copiar para evitar problemas si un listener se desuscribe
            const listenersArray = Array.from(listeners);

            listenersArray.forEach(listener => {
                try {
                    listener(data, eventName);
                    notifiedCount++;
                } catch (error) {
                    logger.error(`EventBus: Error en listener de "${eventName}":`, error);

                    // Si hay un error handler global, usarlo
                    if (window.__errorHandler) {
                        window.__errorHandler.handle(error, 'UNKNOWN', {
                            event: eventName,
                            listener: listener.name || 'anonymous'
                        });
                    }
                }
            });
        }

        // Ejecutar listeners únicos (once)
        const onceListeners = this.onceListeners.get(eventName);
        if (onceListeners && onceListeners.size > 0) {
            // Copiar y limpiar
            const onceListenersArray = Array.from(onceListeners);
            this.onceListeners.delete(eventName);

            onceListenersArray.forEach(listener => {
                try {
                    listener(data, eventName);
                    notifiedCount++;
                    this.stats.totalListeners--;
                } catch (error) {
                    logger.error(`EventBus: Error en once listener de "${eventName}":`, error);

                    if (window.__errorHandler) {
                        window.__errorHandler.handle(error, 'UNKNOWN', {
                            event: eventName,
                            listener: listener.name || 'anonymous',
                            once: true
                        });
                    }
                }
            });
        }

        if (this.config.debug && notifiedCount === 0) {
            logger.debug(`EventBus: No hay listeners para "${eventName}"`);
        }

        return notifiedCount;
    }

    /**
     * Alias de emit() para compatibilidad
     */
    publish(eventName, data, options) {
        return this.emit(eventName, data, options);
    }

    /**
     * Emite un evento de manera asíncrona
     * @param {string} eventName - Nombre del evento
     * @param {*} data - Datos a pasar
     * @returns {Promise<number>} Cantidad de listeners notificados
     */
    async emitAsync(eventName, data = null) {
        return new Promise(resolve => {
            setTimeout(() => {
                const count = this.emit(eventName, data);
                resolve(count);
            }, 0);
        });
    }

    /**
     * Remueve todos los listeners de un evento específico
     * @param {string} eventName - Nombre del evento
     */
    removeAllListeners(eventName) {
        if (eventName) {
            // Remover listeners de un evento específico
            const listeners = this.events.get(eventName);
            if (listeners) {
                this.stats.totalListeners -= listeners.size;
                this.events.delete(eventName);
            }

            const onceListeners = this.onceListeners.get(eventName);
            if (onceListeners) {
                this.stats.totalListeners -= onceListeners.size;
                this.onceListeners.delete(eventName);
            }

            if (this.config.debug) {
                logger.debug(`EventBus: Todos los listeners de "${eventName}" removidos`);
            }
        } else {
            // Remover TODOS los listeners
            const totalListeners = this.stats.totalListeners;
            this.events.clear();
            this.onceListeners.clear();
            this.stats.totalListeners = 0;

            if (this.config.debug) {
                logger.debug(`EventBus: Todos los listeners removidos (${totalListeners})`);
            }
        }
    }

    /**
     * Obtiene la cantidad de listeners para un evento
     * @param {string} eventName - Nombre del evento
     * @returns {number} Cantidad de listeners
     */
    listenerCount(eventName) {
        const normalListeners = this.events.get(eventName)?.size || 0;
        const onceListeners = this.onceListeners.get(eventName)?.size || 0;
        return normalListeners + onceListeners;
    }

    /**
     * Obtiene los nombres de todos los eventos registrados
     * @returns {string[]} Array de nombres de eventos
     */
    eventNames() {
        const normalEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceListeners.keys());
        return [...new Set([...normalEvents, ...onceEvents])];
    }

    /**
     * Agrega un evento al historial
     * @private
     */
    _addToHistory(eventName, data) {
        if (!this.config.debug) return;

        this.history.push({
            eventName,
            data,
            timestamp: Date.now()
        });

        // Mantener tamaño del historial
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Obtiene el historial de eventos
     * @param {number} limit - Cantidad máxima de eventos a retornar
     * @returns {Array} Historial de eventos
     */
    getHistory(limit = 20) {
        return this.history.slice(-limit);
    }

    /**
     * Limpia el historial de eventos
     */
    clearHistory() {
        this.history = [];
        if (this.config.debug) {
            logger.debug('EventBus: Historial limpiado');
        }
    }

    /**
     * Obtiene estadísticas del EventBus
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            ...this.stats,
            activeEvents: this.events.size + this.onceListeners.size,
            historySize: this.history.length,
            config: { ...this.config }
        };
    }

    /**
     * Habilita/deshabilita modo debug
     * @param {boolean} enabled - Si debug está habilitado
     */
    setDebug(enabled) {
        this.config.debug = enabled;
        logger.info(`EventBus: Modo debug ${enabled ? 'habilitado' : 'deshabilitado'}`);
    }

    /**
     * Habilita/deshabilita logging de eventos
     * @param {boolean} enabled - Si logging está habilitado
     */
    setLogging(enabled) {
        this.config.logEvents = enabled;
        logger.info(`EventBus: Logging de eventos ${enabled ? 'habilitado' : 'deshabilitado'}`);
    }

    /**
     * Muestra información de debugging en consola
     */
    debug() {
        logger.info('═══════════════════════════════════════');
        logger.info('EventBus Debug Info');
        logger.info('═══════════════════════════════════════');
        logger.info('Stats:', this.getStats());
        logger.info('Eventos activos:', this.eventNames());
        logger.info('Listeners por evento:');

        this.eventNames().forEach(eventName => {
            logger.info(`  - ${eventName}: ${this.listenerCount(eventName)} listeners`);
        });

        if (this.config.debug && this.history.length > 0) {
            logger.info('Últimos eventos:');
            this.getHistory(10).forEach(({ eventName, timestamp }) => {
                const time = new Date(timestamp).toLocaleTimeString();
                logger.info(`  - [${time}] ${eventName}`);
            });
        }

        logger.info('═══════════════════════════════════════');
    }
}

/**
 * Instancia singleton del EventBus
 */
export const eventBus = new EventBus();

// Exponer en window para debugging
if (typeof window !== 'undefined') {
    window.__eventBus = eventBus;
}

/**
 * Eventos predefinidos de la aplicación
 * Ayuda a evitar typos y proporciona documentación
 */
export const Events = {
    // Ciclo de vida de la app
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',

    // Proyectos
    PROJECT_LOADED: 'project:loaded',
    PROJECT_CREATED: 'project:created',
    PROJECT_UPDATED: 'project:updated',
    PROJECT_DELETED: 'project:deleted',
    PROJECT_SELECTED: 'project:selected',

    // Issues/Incidencias
    ISSUE_CREATED: 'issue:created',
    ISSUE_UPDATED: 'issue:updated',
    ISSUE_DELETED: 'issue:deleted',
    ISSUE_SELECTED: 'issue:selected',
    ISSUES_FILTERED: 'issues:filtered',
    ISSUES_SORTED: 'issues:sorted',
    ISSUES_REFRESHED: 'issues:refreshed',

    // UI
    VIEW_CHANGED: 'view:changed',
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    SIDEBAR_OPENED: 'sidebar:opened',
    SIDEBAR_CLOSED: 'sidebar:closed',

    // Filtros
    FILTER_APPLIED: 'filter:applied',
    FILTER_CLEARED: 'filter:cleared',

    // Storage
    STORAGE_SAVED: 'storage:saved',
    STORAGE_LOADED: 'storage:loaded',
    STORAGE_ERROR: 'storage:error',

    // Red/API
    API_REQUEST: 'api:request',
    API_SUCCESS: 'api:success',
    API_ERROR: 'api:error',

    // Notificaciones
    NOTIFY: 'notify',
    TOAST: 'toast'
};

// Exportar también la clase para testing
export { EventBus };
