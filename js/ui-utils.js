/**
 * UI UTILS - Utilidades de interfaz y gestión de errores
 */

// Registro global de URLs de Blobs para limpieza controlada
import { AppState } from './state.js';
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
 * Cierra todos los modales abiertos en la aplicación
 */
export const closeAllModals = () => {
    $$('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // También cerrar cualquier modal dinámico creado (como el de snapshot)
    $$('.modal').forEach(modal => {
        if (modal.parentElement === document.body && !modal.id) {
            modal.remove();
        } else {
            modal.classList.remove('active');
        }
    });
};

export const escapeHtml = text => {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Sistema de notificación/error visual
 */
export const notify = (message, type = 'info', duration = 5000) => {
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
    closeBtn.onclick = () => notification.remove();

    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('notification-fade-out');
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
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
