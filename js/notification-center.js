/**
 * NOTIFICATION CENTER - Centro de notificaciones con UI
 * Componente integrable en la aplicación principal
 */

import { NotificationDB } from './notification-db.js';
import { AuthMgr } from './auth-manager.js';

class NotificationCenter {
    constructor() {
        this.isOpen = false;
        this.unsubscribe = null;
        this.container = null;
    }

    /**
     * Inicializar el centro de notificaciones
     */
    initialize() {
        this.createNotificationButton();
        this.createNotificationPanel();
        this.updateBadge();

        // Suscribirse a cambios
        this.unsubscribe = NotificationDB.subscribe(() => {
            this.updateBadge();
            if (this.isOpen) {
                this.renderNotifications();
            }
        });

        return this;
    }

    /**
     * Crear botón de notificaciones en el header
     */
    createNotificationButton() {
        // Verificar si el botón ya existe (evitar duplicados)
        // Usar 'btn-notifications' para compatibilidad con ui-panels.js
        if (document.getElementById('btn-notifications')) {
            return;
        }

        const header = document.querySelector('.header, header, .app-header');
        if (!header) return;

        const button = document.createElement('button');
        button.id = 'btn-notifications';
        button.className = 'btn btn-icon btn-ghost notification-btn';
        button.title = 'Notificaciones';
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span id="notification-badge" class="notification-badge" style="display: none;">0</span>
        `;

        button.onclick = () => this.toggle();

        // Insertar en header-actions, antes del primer botón (keyboard shortcuts)
        const headerActions = header.querySelector('.header-actions');
        if (headerActions) {
            const firstButton = headerActions.querySelector('button');
            if (firstButton) {
                headerActions.insertBefore(button, firstButton);
            } else {
                headerActions.appendChild(button);
            }
        } else {
            // Fallback: buscar nav o añadir directamente al header
            const nav = header.querySelector('nav, .header-nav, .nav');
            if (nav) {
                nav.appendChild(button);
            } else {
                header.appendChild(button);
            }
        }

        // Añadir estilos
        this.addStyles();
    }

    /**
     * Crear panel de notificaciones
     */
    createNotificationPanel() {
        const panel = document.createElement('div');
        panel.id = 'notification-panel';
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div class="notification-header">
                <h3>Notificaciones</h3>
                <div class="notification-actions">
                    <button class="btn-icon-sm" onclick="window.notificationCenter.markAllAsRead()" title="Marcar todas como leídas">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <button class="btn-icon-sm" onclick="window.notificationCenter.close()" title="Cerrar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="notification-filters">
                <button class="filter-btn active" data-filter="all" onclick="window.notificationCenter.filterBy('all')">Todas</button>
                <button class="filter-btn" data-filter="unread" onclick="window.notificationCenter.filterBy('unread')">Sin leer</button>
            </div>
            <div class="notification-list" id="notification-list"></div>
        `;

        document.body.appendChild(panel);
        this.container = panel;

        // Click fuera para cerrar
        document.addEventListener('click', (e) => {
            if (this.isOpen && !panel.contains(e.target) && !e.target.closest('#btn-notifications')) {
                this.close();
            }
        });
    }

    /**
     * Añadir estilos CSS
     */
    addStyles() {
        if (document.getElementById('notification-center-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-center-styles';
        style.textContent = `
            .notification-btn {
                position: relative;
                padding: 8px;
            }

            .notification-badge {
                position: absolute;
                top: 2px;
                right: 2px;
                background: #ef4444;
                color: white;
                border-radius: 10px;
                padding: 2px 6px;
                font-size: 11px;
                font-weight: 700;
                min-width: 18px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                border: 2px solid white;
            }

            /* Ocultar panel lateral viejo del sistema antiguo */
            #notifications-panel {
                display: none !important;
            }

            .notification-panel {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 450px;
                max-width: calc(100vw - 40px);
                max-height: 600px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                z-index: 1000;
            }

            .notification-panel.open {
                display: flex;
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .notification-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .notification-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 700;
            }

            .notification-actions {
                display: flex;
                gap: 8px;
            }

            .btn-icon-sm {
                padding: 4px;
                background: none;
                border: none;
                cursor: pointer;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .btn-icon-sm:hover {
                background: #f7fafc;
            }

            .notification-filters {
                display: flex;
                gap: 8px;
                padding: 12px 20px;
                border-bottom: 1px solid #e2e8f0;
            }

            .filter-btn {
                padding: 6px 12px;
                background: none;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                color: #718096;
                transition: all 0.2s;
            }

            .filter-btn.active {
                background: #667eea;
                color: white;
            }

            .notification-list {
                flex: 1;
                overflow-y: auto;
                max-height: 500px;
            }

            .notification-item {
                padding: 20px 24px;
                border-bottom: 1px solid #e2e8f0;
                cursor: pointer;
                transition: background 0.2s;
                position: relative;
                margin-bottom: 4px;
            }

            .notification-item:hover {
                background: #f7fafc;
            }

            .notification-item.unread {
                background: #eef2ff;
            }

            .notification-item.unread::before {
                content: '';
                position: absolute;
                left: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 8px;
                height: 8px;
                background: #667eea;
                border-radius: 50%;
            }

            .notification-type-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }

            .notification-type-info { background: #dbeafe; }
            .notification-type-success { background: #d1fae5; }
            .notification-type-warning { background: #fef3c7; }
            .notification-type-error { background: #fee2e2; }
            .notification-type-comment { background: #e0e7ff; }
            .notification-type-issue { background: #fce7f3; }
            .notification-type-system { background: #f3e8ff; }

            .notification-content {
                flex: 1;
                min-width: 0;
                word-break: break-word;
                overflow-wrap: break-word;
            }

            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #1a202c;
                margin-bottom: 8px;
                line-height: 1.5;
                word-break: break-word;
            }

            .notification-message {
                font-size: 13px;
                color: #718096;
                line-height: 1.6;
                word-break: break-word;
                margin-bottom: 6px;
            }

            .notification-time {
                font-size: 11px;
                color: #a0aec0;
                margin-top: 4px;
            }

            .notification-empty {
                padding: 48px 20px;
                text-align: center;
                color: #718096;
            }

            .notification-empty-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }

            @media (max-width: 480px) {
                .notification-panel {
                    right: 10px;
                    left: 10px;
                    width: auto;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Actualizar badge de notificaciones no leídas
     */
    updateBadge() {
        const user = AuthMgr.getCurrentUser();
        if (!user) return;

        const count = NotificationDB.getUnreadCount(user.id);
        const badge = document.getElementById('notification-badge');

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Renderizar notificaciones
     */
    renderNotifications(filter = 'all') {
        const user = AuthMgr.getCurrentUser();
        if (!user) return;

        const list = document.getElementById('notification-list');
        if (!list) return;

        const options = {
            includeRead: filter === 'all',
            includeArchived: false,
            limit: 50
        };

        const notifications = NotificationDB.getUserNotifications(user.id, options);

        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-empty">
                    <div class="notification-empty-icon">🔔</div>
                    <p>No tienes notificaciones</p>
                </div>
            `;
            return;
        }

        const typeIcons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            comment: '💬',
            issue: '🔧',
            system: '⚙️'
        };

        list.innerHTML = notifications.map(n => `
            <div class="notification-item ${n.read ? '' : 'unread'}"
                 onclick="window.notificationCenter.handleNotificationClick('${n.id}')">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <div class="notification-type-icon notification-type-${n.type}">
                        ${typeIcons[n.type] || '📌'}
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(n.title)}</div>
                        <div class="notification-message">${this.escapeHtml(n.message)}</div>
                        <div class="notification-time">${this.formatTime(n.createdAt)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Manejar click en notificación
     */
    handleNotificationClick(id) {
        const notification = NotificationDB.getNotificationById(id);
        if (!notification) return;

        // Marcar como leída
        if (!notification.read) {
            NotificationDB.markAsRead(id);
            this.updateBadge();
        }

        // Navegar si tiene link
        if (notification.link) {
            window.location.href = notification.link;
        }
    }

    /**
     * Marcar todas como leídas
     */
    markAllAsRead() {
        const user = AuthMgr.getCurrentUser();
        if (!user) return;

        NotificationDB.markAllAsRead(user.id);
        this.renderNotifications();
        this.updateBadge();
    }

    /**
     * Filtrar notificaciones
     */
    filterBy(filter) {
        // Actualizar botones
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.renderNotifications(filter);
    }

    /**
     * Abrir panel
     */
    open() {
        this.isOpen = true;
        this.container.classList.add('open');
        this.renderNotifications();
    }

    /**
     * Cerrar panel
     */
    close() {
        this.isOpen = false;
        this.container.classList.remove('open');
    }

    /**
     * Toggle panel
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Crear notificación programáticamente
     */
    createNotification(options) {
        const user = AuthMgr.getCurrentUser();
        if (!user) return null;

        return NotificationDB.createNotification({
            userId: user.id,
            ...options
        });
    }

    /**
     * Escapar HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Formatear tiempo relativo
     */
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours}h`;
        if (days < 7) return `Hace ${days}d`;

        return new Date(timestamp).toLocaleDateString('es-ES');
    }

    /**
     * Destruir componente
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const btn = document.getElementById('btn-notifications');
        if (btn) btn.remove();

        if (this.container) {
            this.container.remove();
        }

        const styles = document.getElementById('notification-center-styles');
        if (styles) styles.remove();
    }
}

// Exportar clase
export { NotificationCenter };

// Crear instancia global si hay usuario autenticado
if (typeof window !== 'undefined' && AuthMgr.isAuthenticated()) {
    window.notificationCenter = new NotificationCenter().initialize();
}
