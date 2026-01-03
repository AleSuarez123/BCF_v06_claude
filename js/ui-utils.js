/**
 * UI UTILS - Utilidades de interfaz y gestión de errores
 */

// Registro global de URLs de Blobs para limpieza controlada
import { AppState } from './state.js';
import { TIMEOUTS, CSS_CLASSES, COLORS } from './utils/constants.js';

const blobRegistry = new Set();

/**
 * Crea una URL de objeto y la registra para limpieza posterior
 * @param {Blob|File} blob 
 * @returns {string}
 */
export const createSafeObjectURL = (blob) => {
    const url = URL.createObjectURL(blob);
    blobRegistry.add(url);
    return url;
};

/**
 * Revoca todas las URLs de Blobs registradas
 */
export const revokeAllObjectURLs = () => {
    blobRegistry.forEach(url => {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn('Error revocando URL:', url, e);
        }
    });
    blobRegistry.clear();
};

export const $ = selector => document.querySelector(selector);
export const $$ = selector => document.querySelectorAll(selector);

/**
 * DOM QUERY CACHE - Sistema de cacheo para selectores frecuentes
 * =================================================================
 * Evita llamadas repetidas a querySelector() cacheando resultados
 */

class DOMCache {
    constructor() {
        this.cache = new Map();
        this.stats = { hits: 0, misses: 0, size: 0 };

        // Auto-limpiar cache cuando DOM cambia significativamente
        this._setupInvalidation();
    }

    /**
     * Get con cacheo - igual que $ pero con cache
     * @param {string} selector - Selector CSS
     * @returns {Element|null}
     */
    get(selector) {
        if (this.cache.has(selector)) {
            const cached = this.cache.get(selector);
            // Verificar que el elemento sigue en el DOM
            if (cached && document.contains(cached)) {
                this.stats.hits++;
                return cached;
            } else {
                // Elemento fue removido del DOM, limpiar cache
                this.cache.delete(selector);
            }
        }

        // Cache miss - buscar y cachear
        this.stats.misses++;
        const element = document.querySelector(selector);

        if (element) {
            this.cache.set(selector, element);
            this.stats.size = this.cache.size;
        }

        return element;
    }

    /**
     * GetAll con cacheo - igual que $$ pero con cache
     * @param {string} selector - Selector CSS
     * @returns {NodeList}
     */
    getAll(selector) {
        // NodeList es estático, siempre refrescar
        return document.querySelectorAll(selector);
    }

    /**
     * Invalida el cache de un selector específico
     * @param {string} selector
     */
    invalidate(selector) {
        if (selector) {
            this.cache.delete(selector);
        } else {
            // Invalidar todo
            this.cache.clear();
        }
        this.stats.size = this.cache.size;
    }

    /**
     * Invalida todo el cache
     */
    clear() {
        this.cache.clear();
        this.stats.size = 0;
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            total
        };
    }

    /**
     * Configura invalidación automática del cache
     * @private
     */
    _setupInvalidation() {
        // Invalidar cache cuando se modifica el DOM significativamente
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                // Solo invalidar en cambios estructurales significativos
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                        // Nodos removidos - puede afectar cache
                        this.clear();
                        break;
                    }
                }
            });

            // Observar cambios en el body
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: false // Solo nivel raíz para performance
                });
            } else {
                // Si body no existe aún, observar cuando esté listo
                document.addEventListener('DOMContentLoaded', () => {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: false
                    });
                });
            }
        }
    }
}

// Instancia singleton del cache
const domCache = new DOMCache();

/**
 * $ con cache - usar para elementos que se buscan frecuentemente
 * Ejemplo: $cached('#btn-new-issue')
 */
export const $cached = (selector) => domCache.get(selector);

/**
 * $$ con cache (siempre retorna NodeList actual)
 */
export const $$cached = (selector) => domCache.getAll(selector);

/**
 * Limpiar cache manualmente (útil después de renderizados grandes)
 */
export const clearDOMCache = () => domCache.clear();

/**
 * Obtener stats del cache (para debugging)
 */
export const getDOMCacheStats = () => domCache.getStats();

// Exponer en window para debugging
if (typeof window !== 'undefined') {
    window.__domCache = domCache;
}

/**
 * SAFE DOM ACCESS - Helpers que previenen crashes por elementos null
 */

/**
 * Query selector seguro que retorna un objeto con métodos chainables
 * @param {string} selector - Selector CSS
 * @param {Element} parent - Elemento padre (default: document)
 * @returns {Object} Objeto con métodos seguros
 */
export const $safe = (selector, parent = document) => {
    const element = parent.querySelector(selector);

    const safeObj = {
        element,
        exists: element !== null,

        // Métodos de clase
        addClass(...classes) {
            if (element) element.classList.add(...classes);
            return safeObj;
        },

        removeClass(...classes) {
            if (element) element.classList.remove(...classes);
            return safeObj;
        },

        toggleClass(className, force) {
            if (element) element.classList.toggle(className, force);
            return safeObj;
        },

        hasClass(className) {
            return element ? element.classList.contains(className) : false;
        },

        // Atributos
        attr(name, value) {
            if (!element) return safeObj;
            if (value === undefined) {
                return element.getAttribute(name);
            }
            element.setAttribute(name, value);
            return safeObj;
        },

        removeAttr(name) {
            if (element) element.removeAttribute(name);
            return safeObj;
        },

        // Contenido
        text(value) {
            if (!element) return value === undefined ? '' : safeObj;
            if (value === undefined) {
                return element.textContent;
            }
            element.textContent = value;
            return safeObj;
        },

        html(value) {
            if (!element) return value === undefined ? '' : safeObj;
            if (value === undefined) {
                return element.innerHTML;
            }
            element.innerHTML = value;
            return safeObj;
        },

        val(value) {
            if (!element) return value === undefined ? '' : safeObj;
            if (value === undefined) {
                return element.value;
            }
            element.value = value;
            return safeObj;
        },

        // Estilos
        css(prop, value) {
            if (!element) return safeObj;
            if (typeof prop === 'object') {
                Object.entries(prop).forEach(([k, v]) => {
                    element.style[k] = v;
                });
            } else if (value !== undefined) {
                element.style[prop] = value;
            } else {
                return getComputedStyle(element)[prop];
            }
            return safeObj;
        },

        show() {
            if (element) element.style.display = '';
            return safeObj;
        },

        hide() {
            if (element) element.style.display = 'none';
            return safeObj;
        },

        // Eventos
        on(event, handler, options) {
            if (element) element.addEventListener(event, handler, options);
            return safeObj;
        },

        off(event, handler, options) {
            if (element) element.removeEventListener(event, handler, options);
            return safeObj;
        },

        // Otros
        focus() {
            if (element) element.focus();
            return safeObj;
        },

        click() {
            if (element) element.click();
            return safeObj;
        },

        remove() {
            if (element && element.parentElement) {
                element.parentElement.removeChild(element);
            }
            return safeObj;
        },

        append(...nodes) {
            if (element) element.append(...nodes);
            return safeObj;
        },

        prepend(...nodes) {
            if (element) element.prepend(...nodes);
            return safeObj;
        },

        // Callback condicional
        if(callback) {
            if (element) callback(element);
            return safeObj;
        },

        // Fallback si no existe
        else(callback) {
            if (!element) callback();
            return safeObj;
        },

        // Log de warning si no existe
        warnIfMissing(message) {
            if (!element) {
                console.warn(message || `Element not found: ${selector}`);
            }
            return safeObj;
        }
    };

    return safeObj;
};

/**
 * Versión múltiple del selector seguro
 * @param {string} selector - Selector CSS
 * @param {Element} parent - Elemento padre (default: document)
 * @returns {Object} Objeto con métodos para operar sobre múltiples elementos
 */
export const $$safe = (selector, parent = document) => {
    const elements = Array.from(parent.querySelectorAll(selector));

    return {
        elements,
        length: elements.length,
        exists: elements.length > 0,

        forEach(callback) {
            elements.forEach(callback);
            return this;
        },

        map(callback) {
            return elements.map(callback);
        },

        filter(callback) {
            return elements.filter(callback);
        },

        addClass(...classes) {
            elements.forEach(el => el.classList.add(...classes));
            return this;
        },

        removeClass(...classes) {
            elements.forEach(el => el.classList.remove(...classes));
            return this;
        },

        toggleClass(className, force) {
            elements.forEach(el => el.classList.toggle(className, force));
            return this;
        },

        on(event, handler, options) {
            elements.forEach(el => el.addEventListener(event, handler, options));
            return this;
        },

        off(event, handler, options) {
            elements.forEach(el => el.removeEventListener(event, handler, options));
            return this;
        },

        remove() {
            elements.forEach(el => {
                if (el.parentElement) el.parentElement.removeChild(el);
            });
            return this;
        },

        css(prop, value) {
            if (typeof prop === 'object') {
                elements.forEach(el => {
                    Object.entries(prop).forEach(([k, v]) => {
                        el.style[k] = v;
                    });
                });
            } else {
                elements.forEach(el => {
                    el.style[prop] = value;
                });
            }
            return this;
        },

        warnIfMissing(message) {
            if (elements.length === 0) {
                console.warn(message || `No elements found: ${selector}`);
            }
            return this;
        }
    };
};

/**
 * Cierra todos los modales abiertos en la aplicación
 */
export const closeAllModals = () => {
    $$(`.modal.${CSS_CLASSES.ACTIVE}`).forEach(modal => {
        modal.classList.remove(CSS_CLASSES.ACTIVE);
    });

    // También cerrar cualquier modal dinámico creado (como el de snapshot)
    $$('.modal').forEach(modal => {
        if (modal.parentElement === document.body && !modal.id) {
            modal.remove();
        } else {
            modal.classList.remove(CSS_CLASSES.ACTIVE);
        }
    });
};

export const escapeHtml = text => {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
};

/**
 * PERFORMANCE UTILITIES
 * Funciones para optimizar eventos y renderizado
 */

/**
 * Debounce - Retrasa la ejecución hasta que pasen X ms sin llamadas
 * Útil para: inputs de búsqueda, validación, auto-save
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Milisegundos de espera
 * @param {boolean} immediate - Ejecutar inmediatamente la primera vez
 * @returns {Function} Función debounced
 */
export const debounce = (func, wait = TIMEOUTS.DEBOUNCE_DEFAULT, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

/**
 * Throttle - Limita ejecuciones a máximo una cada X ms
 * Útil para: scroll, resize, mousemove
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Milisegundos mínimos entre ejecuciones
 * @returns {Function} Función throttled
 */
export const throttle = (func, limit = TIMEOUTS.THROTTLE_DEFAULT) => {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Sistema de notificación/error visual
 */
export const notify = (message, type = 'info', duration = TIMEOUTS.NOTIFICATION_DURATION) => {
    const container = $('#notifications-container') || createNotificationsContainer();
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getIconForType(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;

    container.appendChild(notification);

    const closeBtn = notification.querySelector('.notification-close');
    const remove = () => {
        if (notification.parentElement) {
            notification.classList.add('notification-fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    };
    closeBtn.onclick = remove;

    if (duration > 0) {
        setTimeout(remove, duration);
    }

    // Retornar objeto con método remove para poder cerrar manualmente
    return { remove };
};

function createNotificationsContainer() {
    const container = document.createElement('div');
    container.id = 'notifications-container';
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 350px;
    `;
    document.body.appendChild(container);
    return container;
}

function getIconForType(type) {
    switch (type) {
        case 'error': return '❌';
        case 'success': return '✅';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}

/**
 * Decorador para manejo de errores en funciones asíncronas
 */
export const withErrorHandling = (fn, customMessage = 'Ha ocurrido un error inesperado') => {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error('Error capturado:', error);
            notify(`${customMessage}: ${error.message}`, 'error');
            throw error;
        }
    };
};

export function updateGlobalStats() {
    // 1. Dashboard Stats (Global)
    if (AppState.projects) {
        const totalProjects = AppState.projects.length;
        
        let totalBCFFiles = 0;
        let totalIssues = 0;
        let highPriorityCount = 0;
        let dueSoonCount = 0;
        let unassignedCount = 0;

        for (const project of AppState.projects) {
            if (project.bcfFiles) {
                totalBCFFiles += project.bcfFiles.length;
                for (const bcf of project.bcfFiles) {
                    if (bcf.topics) {
                        totalIssues += bcf.topics.length;
                        for (const topic of bcf.topics) {
                            const status = (topic.topicStatus || '').toLowerCase();
                            const isClosed = ['closed', 'resolved', 'cerrada', 'resuelta'].includes(status);
                            
                            if (!isClosed) {
                                // Prioridad Alta
                                const priority = (topic.priority || '').trim().toLowerCase();
                                if (['high', 'critical', 'alta', 'critica', 'crítica', 'urgent', 'urgente'].includes(priority)) {
                                    highPriorityCount++;
                                }

                                // Vencen Pronto (7 días)
                                if (topic.dueDate) {
                                    const dueDate = new Date(topic.dueDate);
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    const diffTime = dueDate - today;
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                    if (diffDays >= 0 && diffDays <= 7) {
                                        dueSoonCount++;
                                    }
                                }

                                // Sin Asignar
                                if (!topic.assignedTo) {
                                    unassignedCount++;
                                }
                            }
                        }
                    }
                }
            }
        }

        const setContent = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setContent('total-projects', totalProjects);
        setContent('total-bcf-files', totalBCFFiles);
        setContent('total-issues', totalIssues);
        const viewerActive = document.getElementById('viewer-page')?.classList.contains('active');
        const highFilterActive = Array.isArray(AppState.filters?.priorities) && AppState.filters.priorities.includes('High');
        const viewerHighCount = viewerActive && highFilterActive
            ? (AppState.filteredIssues || []).filter(i => (i.priority || '').toLowerCase() === 'high' && !['closed','resolved'].includes((i.topicStatus || '').toLowerCase())).length
            : null;
        setContent('high-priority-issues', viewerHighCount != null ? viewerHighCount : highPriorityCount);
        setContent('due-soon-issues', dueSoonCount);
        setContent('unassigned-issues', unassignedCount);
    }

    // 2. Viewer Stats (Current Project Context)
    const viewerTotalCount = document.getElementById('total-count');
    const viewerFilteredCount = document.getElementById('filtered-count');
    const viewerProjectStats = document.getElementById('current-project-stats');
    
    const total = AppState.currentIssues?.length || 0;
    const filtered = typeof AppState.filteredIssues?.length === 'number' ? AppState.filteredIssues.length : total;
    
    if (viewerTotalCount) viewerTotalCount.textContent = total;
    if (viewerFilteredCount) viewerFilteredCount.textContent = filtered;
    if (viewerProjectStats) {
        if (total === filtered) {
            viewerProjectStats.textContent = `Total: ${total} incidencias`;
        } else {
            viewerProjectStats.textContent = `Mostrando ${filtered} de ${total} incidencias`;
        }
    }
}
