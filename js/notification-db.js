/**
 * NOTIFICATION DATABASE - Sistema de notificaciones persistente
 * Base para el Centro de Notificaciones
 */

const NOTIFICATION_DB_KEY = 'bcf_notifications';

/**
 * Estructura de notificación:
 * {
 *   id: string (UUID),
 *   userId: string,
 *   type: 'info' | 'success' | 'warning' | 'error' | 'comment' | 'issue' | 'system',
 *   title: string,
 *   message: string,
 *   data: object (datos adicionales),
 *   read: boolean,
 *   archived: boolean,
 *   createdAt: timestamp,
 *   readAt: timestamp | null,
 *   link: string | null (URL para navegar al hacer clic)
 * }
 */

class NotificationDatabase {
    constructor() {
        this.initializeDB();
        this.listeners = new Set();
    }

    initializeDB() {
        if (!localStorage.getItem(NOTIFICATION_DB_KEY)) {
            localStorage.setItem(NOTIFICATION_DB_KEY, JSON.stringify([]));
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Obtener todas las notificaciones
     */
    getAllNotifications() {
        const data = localStorage.getItem(NOTIFICATION_DB_KEY);
        return JSON.parse(data) || [];
    }

    /**
     * Guardar notificaciones
     */
    saveNotifications(notifications) {
        localStorage.setItem(NOTIFICATION_DB_KEY, JSON.stringify(notifications));
        this.notifyListeners();
    }

    /**
     * Crear nueva notificación
     */
    createNotification({ userId, type = 'info', title, message, data = {}, link = null }) {
        const notifications = this.getAllNotifications();

        const newNotification = {
            id: this.generateUUID(),
            userId,
            type,
            title,
            message,
            data,
            read: false,
            archived: false,
            createdAt: Date.now(),
            readAt: null,
            link
        };

        notifications.unshift(newNotification); // Añadir al principio
        this.saveNotifications(notifications);

        return newNotification;
    }

    /**
     * Obtener notificaciones de un usuario
     */
    getUserNotifications(userId, options = {}) {
        const { includeRead = true, includeArchived = false, limit = null } = options;

        let notifications = this.getAllNotifications()
            .filter(n => n.userId === userId);

        if (!includeRead) {
            notifications = notifications.filter(n => !n.read);
        }

        if (!includeArchived) {
            notifications = notifications.filter(n => !n.archived);
        }

        if (limit) {
            notifications = notifications.slice(0, limit);
        }

        return notifications;
    }

    /**
     * Obtener notificación por ID
     */
    getNotificationById(id) {
        const notifications = this.getAllNotifications();
        return notifications.find(n => n.id === id);
    }

    /**
     * Marcar como leída
     */
    markAsRead(id) {
        const notifications = this.getAllNotifications();
        const index = notifications.findIndex(n => n.id === id);

        if (index !== -1 && !notifications[index].read) {
            notifications[index].read = true;
            notifications[index].readAt = Date.now();
            this.saveNotifications(notifications);
            return notifications[index];
        }

        return null;
    }

    /**
     * Marcar todas como leídas
     */
    markAllAsRead(userId) {
        const notifications = this.getAllNotifications();
        let updated = 0;

        notifications.forEach(n => {
            if (n.userId === userId && !n.read) {
                n.read = true;
                n.readAt = Date.now();
                updated++;
            }
        });

        if (updated > 0) {
            this.saveNotifications(notifications);
        }

        return updated;
    }

    /**
     * Archivar notificación
     */
    archiveNotification(id) {
        const notifications = this.getAllNotifications();
        const index = notifications.findIndex(n => n.id === id);

        if (index !== -1) {
            notifications[index].archived = true;
            this.saveNotifications(notifications);
            return notifications[index];
        }

        return null;
    }

    /**
     * Eliminar notificación
     */
    deleteNotification(id) {
        const notifications = this.getAllNotifications();
        const filtered = notifications.filter(n => n.id !== id);
        this.saveNotifications(filtered);
    }

    /**
     * Limpiar notificaciones antiguas leídas (más de X días)
     */
    cleanOldNotifications(userId, daysToKeep = 30) {
        const notifications = this.getAllNotifications();
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        const filtered = notifications.filter(n => {
            // Mantener las de otros usuarios
            if (n.userId !== userId) return true;

            // Mantener las no leídas
            if (!n.read) return true;

            // Eliminar leídas antiguas
            return n.readAt && n.readAt > cutoffTime;
        });

        this.saveNotifications(filtered);
        return notifications.length - filtered.length;
    }

    /**
     * Contar notificaciones no leídas
     */
    getUnreadCount(userId) {
        const notifications = this.getUserNotifications(userId, {
            includeRead: false,
            includeArchived: false
        });
        return notifications.length;
    }

    /**
     * Agrupar notificaciones por tipo
     */
    groupByType(userId) {
        const notifications = this.getUserNotifications(userId, { includeArchived: false });
        const grouped = {};

        notifications.forEach(n => {
            if (!grouped[n.type]) {
                grouped[n.type] = [];
            }
            grouped[n.type].push(n);
        });

        return grouped;
    }

    /**
     * Filtrar notificaciones
     */
    filterNotifications(userId, filters = {}) {
        const { type = null, read = null, dateFrom = null, dateTo = null } = filters;

        let notifications = this.getUserNotifications(userId, { includeArchived: false });

        if (type) {
            notifications = notifications.filter(n => n.type === type);
        }

        if (read !== null) {
            notifications = notifications.filter(n => n.read === read);
        }

        if (dateFrom) {
            notifications = notifications.filter(n => n.createdAt >= dateFrom);
        }

        if (dateTo) {
            notifications = notifications.filter(n => n.createdAt <= dateTo);
        }

        return notifications;
    }

    /**
     * Suscribirse a cambios
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notificar a listeners
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error('Error en listener de notificaciones:', e);
            }
        });
    }

    /**
     * Obtener estadísticas
     */
    getStats(userId) {
        const all = this.getUserNotifications(userId, { includeArchived: true });
        const unread = this.getUserNotifications(userId, { includeRead: false });
        const grouped = this.groupByType(userId);

        return {
            total: all.length,
            unread: unread.length,
            read: all.filter(n => n.read).length,
            archived: all.filter(n => n.archived).length,
            byType: Object.keys(grouped).reduce((acc, type) => {
                acc[type] = grouped[type].length;
                return acc;
            }, {})
        };
    }
}

// Exportar instancia única
export const NotificationDB = new NotificationDatabase();
