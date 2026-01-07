/**
 * LOG MANAGER - Sistema centralizado de logs y auditoría
 */

const LOG_DB_KEY = 'bcf_system_logs';
const MAX_LOGS = 5000; // Máximo número de logs a mantener

export class LogManager {
    /**
     * Tipos de eventos para logs
     */
    static LogType = {
        // Autenticación
        LOGIN: 'login',
        LOGOUT: 'logout',
        AUTH_ERROR: 'auth_error',

        // Solicitudes de acceso
        REQUEST_APPROVED: 'request_approved',
        REQUEST_DENIED: 'request_denied',
        REQUEST_CREATED: 'request_created',

        // Gestión de usuarios
        USER_CREATED: 'user_created',
        USER_BLOCKED: 'user_blocked',
        USER_UNBLOCKED: 'user_unblocked',

        // Dominios
        DOMAIN_ADDED: 'domain_added',
        DOMAIN_REMOVED: 'domain_removed',

        // Invitaciones
        INVITATION_CREATED: 'invitation_created',
        INVITATION_USED: 'invitation_used',

        // Incidencias
        ISSUE_ASSIGNED: 'issue_assigned',
        ISSUE_CREATED: 'issue_created',
        ISSUE_UPDATED: 'issue_updated',
        ISSUE_DELETED: 'issue_deleted',

        // Notificaciones
        NOTIFICATION_SENT: 'notification_sent',
        EMAIL_SENT: 'email_sent',

        // Errores
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };

    /**
     * Niveles de severidad
     */
    static Severity = {
        DEBUG: 'debug',
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'error',
        CRITICAL: 'critical'
    };

    /**
     * Registrar un evento en el log
     * @param {Object} logEntry - Entrada del log
     */
    static log(logEntry) {
        const {
            type,
            severity = this.Severity.INFO,
            message,
            userId = null,
            userEmail = null,
            data = {},
            error = null
        } = logEntry;

        const entry = {
            id: this.generateUUID(),
            timestamp: Date.now(),
            type,
            severity,
            message,
            userId,
            userEmail,
            data,
            error: error ? this.serializeError(error) : null,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Guardar en localStorage
        this.saveLog(entry);

        // Log en consola según severidad
        this.consoleLog(entry);

        return entry;
    }

    /**
     * Guardar log en localStorage
     */
    static saveLog(entry) {
        try {
            const logs = this.getAllLogs();
            logs.push(entry);

            // Mantener solo los últimos MAX_LOGS
            const trimmedLogs = logs.slice(-MAX_LOGS);

            localStorage.setItem(LOG_DB_KEY, JSON.stringify(trimmedLogs));
        } catch (error) {
            console.error('Error guardando log:', error);
        }
    }

    /**
     * Obtener todos los logs
     */
    static getAllLogs() {
        try {
            const data = localStorage.getItem(LOG_DB_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error obteniendo logs:', error);
            return [];
        }
    }

    /**
     * Obtener logs filtrados
     */
    static getLogsByFilter(filter = {}) {
        const logs = this.getAllLogs();
        let filtered = logs;

        if (filter.type) {
            filtered = filtered.filter(log => log.type === filter.type);
        }

        if (filter.severity) {
            filtered = filtered.filter(log => log.severity === filter.severity);
        }

        if (filter.userId) {
            filtered = filtered.filter(log => log.userId === filter.userId);
        }

        if (filter.startDate) {
            filtered = filtered.filter(log => log.timestamp >= filter.startDate);
        }

        if (filter.endDate) {
            filtered = filtered.filter(log => log.timestamp <= filter.endDate);
        }

        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Limpiar logs antiguos
     */
    static clearOldLogs(daysToKeep = 30) {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const logs = this.getAllLogs();
        const filtered = logs.filter(log => log.timestamp > cutoffTime);

        localStorage.setItem(LOG_DB_KEY, JSON.stringify(filtered));

        return logs.length - filtered.length;
    }

    /**
     * Limpiar todos los logs
     */
    static clearAllLogs() {
        localStorage.removeItem(LOG_DB_KEY);
    }

    /**
     * Exportar logs como JSON
     */
    static exportLogs(filter = {}) {
        const logs = filter ? this.getLogsByFilter(filter) : this.getAllLogs();
        const json = JSON.stringify(logs, null, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bcf-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return logs.length;
    }

    /**
     * Generar UUID
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Serializar error para guardarlo
     */
    static serializeError(error) {
        if (!error) return null;

        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...error
        };
    }

    /**
     * Log en consola según severidad
     */
    static consoleLog(entry) {
        const prefix = `[${entry.type}] ${entry.message}`;
        const timestamp = new Date(entry.timestamp).toLocaleString('es-ES');

        switch (entry.severity) {
            case this.Severity.DEBUG:
                console.debug(`${timestamp} ${prefix}`, entry.data);
                break;
            case this.Severity.INFO:
                console.log(`${timestamp} ℹ️ ${prefix}`, entry.data);
                break;
            case this.Severity.WARNING:
                console.warn(`${timestamp} ⚠️ ${prefix}`, entry.data);
                break;
            case this.Severity.ERROR:
            case this.Severity.CRITICAL:
                console.error(`${timestamp} ❌ ${prefix}`, entry);
                break;
            default:
                console.log(`${timestamp} ${prefix}`, entry.data);
        }
    }

    /**
     * Métodos helper para tipos comunes de logs
     */
    static logError(message, error, data = {}) {
        return this.log({
            type: this.LogType.ERROR,
            severity: this.Severity.ERROR,
            message,
            error,
            data
        });
    }

    static logWarning(message, data = {}) {
        return this.log({
            type: this.LogType.WARNING,
            severity: this.Severity.WARNING,
            message,
            data
        });
    }

    static logInfo(message, data = {}) {
        return this.log({
            type: this.LogType.INFO,
            severity: this.Severity.INFO,
            message,
            data
        });
    }

    /**
     * Estadísticas de logs
     */
    static getStats() {
        const logs = this.getAllLogs();

        const stats = {
            total: logs.length,
            bySeverity: {},
            byType: {},
            last24Hours: 0,
            lastWeek: 0
        };

        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;
        const week = 7 * day;

        logs.forEach(log => {
            // Por severidad
            stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

            // Por tipo
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

            // Tiempo
            if (now - log.timestamp < day) stats.last24Hours++;
            if (now - log.timestamp < week) stats.lastWeek++;
        });

        return stats;
    }

    /**
     * Obtener un logger para un módulo específico (para módulos BCF)
     * @param {string} moduleName - Nombre del módulo
     * @returns {Logger} Instancia de logger
     */
    static getLogger(moduleName) {
        return new Logger(moduleName);
    }
}

/**
 * Clase Logger para módulos BCF
 */
class Logger {
    constructor(moduleName) {
        this.moduleName = moduleName;
    }

    debug(...args) {
        console.debug(`[${this.moduleName}]`, ...args);
    }

    info(...args) {
        console.log(`[${this.moduleName}]`, ...args);
    }

    warn(...args) {
        console.warn(`[${this.moduleName}]`, ...args);
    }

    error(...args) {
        console.error(`[${this.moduleName}]`, ...args);
    }
}
