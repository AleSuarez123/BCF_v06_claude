/**
 * ERROR HANDLER GLOBAL - Manejo centralizado de errores
 * =======================================================
 *
 * Sistema unificado para capturar, registrar y reportar errores:
 * - Errores JavaScript no capturados
 * - Promesas rechazadas sin catch
 * - Errores de red y APIs
 * - Errores de usuario (validación, etc.)
 *
 * Características:
 * - Notificaciones amigables al usuario
 * - Logging detallado para debugging
 * - Estrategias de recuperación
 * - Prevención de reportes duplicados
 * - Rate limiting para evitar spam
 *
 * Uso:
 * ```javascript
 * import { errorHandler, ErrorTypes } from './error-handler.js';
 *
 * // Manejo manual de errores
 * try {
 *   // código riesgoso
 * } catch (error) {
 *   errorHandler.handle(error, ErrorTypes.VALIDATION);
 * }
 *
 * // Wrapper seguro para funciones async
 * const safeLoadData = errorHandler.wrap(loadData, ErrorTypes.NETWORK);
 * await safeLoadData();
 * ```
 */

import { logger } from './config.js';

/**
 * Tipos de error para clasificación
 */
export const ErrorTypes = {
    NETWORK: 'network',           // Errores de red/API
    VALIDATION: 'validation',     // Errores de validación de usuario
    STORAGE: 'storage',           // Errores de IndexedDB/localStorage
    PARSE: 'parse',               // Errores de parsing (JSON, XML, BCF)
    RENDER: 'render',             // Errores de renderizado DOM
    PERMISSION: 'permission',     // Errores de permisos
    UNKNOWN: 'unknown'            // Errores desconocidos
};

/**
 * Severidad del error
 */
export const ErrorSeverity = {
    CRITICAL: 'critical',  // App no puede continuar
    HIGH: 'high',          // Funcionalidad importante afectada
    MEDIUM: 'medium',      // Funcionalidad menor afectada
    LOW: 'low'             // Inconveniente menor
};

/**
 * Clase principal de manejo de errores
 */
class ErrorHandler {
    constructor() {
        // Estado
        this.errors = [];              // Historial de errores
        this.lastError = null;         // Último error para detectar duplicados
        this.errorCount = 0;           // Contador total
        this.rateLimitCount = 0;       // Contador para rate limiting
        this.rateLimitWindow = 5000;   // Ventana de 5 segundos
        this.maxErrorsPerWindow = 3;   // Máximo 3 errores cada 5s

        // Configuración
        this.config = {
            showUserNotifications: true,
            logToConsole: true,
            logToServer: false,  // Para futuro: enviar a servidor de logs
            maxStoredErrors: 50
        };

        // Callbacks de recuperación por tipo de error
        this.recoveryStrategies = new Map();

        // Inicializar
        this._setupGlobalHandlers();
        this._setupRateLimitReset();
    }

    /**
     * Configura los manejadores globales de errores
     * @private
     */
    _setupGlobalHandlers() {
        // Capturar errores JavaScript no manejados
        window.addEventListener('error', (event) => {
            this._handleGlobalError(event.error || event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });

            // Prevenir el comportamiento por defecto del navegador
            event.preventDefault();
        });

        // Capturar promesas rechazadas sin catch
        window.addEventListener('unhandledrejection', (event) => {
            this._handleGlobalError(event.reason, {
                promise: event.promise,
                isPromise: true
            });

            // Prevenir logging en consola
            event.preventDefault();
        });

        logger.info('✅ ErrorHandler: Manejadores globales configurados');
    }

    /**
     * Resetea el contador de rate limiting
     * @private
     */
    _setupRateLimitReset() {
        setInterval(() => {
            this.rateLimitCount = 0;
        }, this.rateLimitWindow);
    }

    /**
     * Maneja un error global (window.onerror, unhandledrejection)
     * @private
     */
    _handleGlobalError(error, context = {}) {
        // Determinar tipo de error
        let type = ErrorTypes.UNKNOWN;

        if (context.isPromise) {
            type = this._inferErrorType(error);
        }

        // Manejar con el sistema estándar
        this.handle(error, type, {
            ...context,
            isGlobal: true
        });
    }

    /**
     * Infiere el tipo de error basándose en el mensaje/contenido
     * @private
     */
    _inferErrorType(error) {
        const message = this._getErrorMessage(error).toLowerCase();

        if (message.includes('fetch') || message.includes('network') || message.includes('ajax')) {
            return ErrorTypes.NETWORK;
        }

        if (message.includes('json') || message.includes('parse') || message.includes('xml')) {
            return ErrorTypes.PARSE;
        }

        if (message.includes('indexeddb') || message.includes('localstorage') || message.includes('quota')) {
            return ErrorTypes.STORAGE;
        }

        if (message.includes('permission') || message.includes('denied')) {
            return ErrorTypes.PERMISSION;
        }

        if (message.includes('element') || message.includes('dom') || message.includes('null')) {
            return ErrorTypes.RENDER;
        }

        return ErrorTypes.UNKNOWN;
    }

    /**
     * Maneja un error de manera centralizada
     * @param {Error|string} error - El error a manejar
     * @param {string} type - Tipo de error (ErrorTypes)
     * @param {Object} context - Contexto adicional
     * @param {string} severity - Severidad del error (ErrorSeverity)
     */
    handle(error, type = ErrorTypes.UNKNOWN, context = {}, severity = null) {
        // Crear objeto de error normalizado
        const errorObj = this._normalizeError(error, type, context);

        // Determinar severidad si no se proporciona
        if (!severity) {
            severity = this._inferSeverity(errorObj);
        }
        errorObj.severity = severity;

        // Verificar si es duplicado reciente
        if (this._isDuplicate(errorObj)) {
            logger.debug('ErrorHandler: Error duplicado ignorado', errorObj.message);
            return;
        }

        // Rate limiting - evitar spam de errores
        if (this._isRateLimited()) {
            logger.warn('ErrorHandler: Rate limit alcanzado, error no mostrado');
            return;
        }

        // Registrar error
        this._logError(errorObj);

        // Almacenar en historial
        this._storeError(errorObj);

        // Mostrar al usuario (si está configurado)
        if (this.config.showUserNotifications) {
            this._showUserNotification(errorObj);
        }

        // Ejecutar estrategia de recuperación si existe
        this._executeRecovery(errorObj);

        // Actualizar estado
        this.lastError = errorObj;
        this.errorCount++;
        this.rateLimitCount++;
    }

    /**
     * Normaliza diferentes tipos de errores a un formato consistente
     * @private
     */
    _normalizeError(error, type, context) {
        const timestamp = new Date();

        // Si es un objeto Error nativo
        if (error instanceof Error) {
            return {
                message: error.message,
                type,
                stack: error.stack,
                name: error.name,
                context,
                timestamp
            };
        }

        // Si es un string
        if (typeof error === 'string') {
            return {
                message: error,
                type,
                stack: null,
                name: 'Error',
                context,
                timestamp
            };
        }

        // Si es un objeto con estructura de error
        if (error && typeof error === 'object') {
            return {
                message: error.message || error.error || JSON.stringify(error),
                type,
                stack: error.stack || null,
                name: error.name || 'Error',
                context: { ...error, ...context },
                timestamp
            };
        }

        // Fallback
        return {
            message: 'Error desconocido',
            type,
            stack: null,
            name: 'UnknownError',
            context: { originalError: error, ...context },
            timestamp
        };
    }

    /**
     * Obtiene el mensaje de un error
     * @private
     */
    _getErrorMessage(error) {
        if (error instanceof Error) return error.message;
        if (typeof error === 'string') return error;
        if (error && error.message) return error.message;
        return 'Error desconocido';
    }

    /**
     * Infiere la severidad basándose en el tipo y contenido
     * @private
     */
    _inferSeverity(errorObj) {
        // Errores críticos
        if (errorObj.type === ErrorTypes.STORAGE && errorObj.message.includes('quota')) {
            return ErrorSeverity.CRITICAL;
        }

        // Errores altos
        if (errorObj.type === ErrorTypes.NETWORK || errorObj.type === ErrorTypes.PARSE) {
            return ErrorSeverity.HIGH;
        }

        // Errores de validación son generalmente bajos
        if (errorObj.type === ErrorTypes.VALIDATION) {
            return ErrorSeverity.LOW;
        }

        // Por defecto: medium
        return ErrorSeverity.MEDIUM;
    }

    /**
     * Verifica si un error es duplicado del anterior
     * @private
     */
    _isDuplicate(errorObj) {
        if (!this.lastError) return false;

        const timeDiff = errorObj.timestamp - this.lastError.timestamp;

        // Si el mensaje es igual y fue hace menos de 1 segundo, es duplicado
        return (
            this.lastError.message === errorObj.message &&
            this.lastError.type === errorObj.type &&
            timeDiff < 1000
        );
    }

    /**
     * Verifica si se alcanzó el rate limit
     * @private
     */
    _isRateLimited() {
        return this.rateLimitCount >= this.maxErrorsPerWindow;
    }

    /**
     * Registra el error en los sistemas de logging
     * @private
     */
    _logError(errorObj) {
        if (!this.config.logToConsole) return;

        const { severity, type, message, stack, context } = errorObj;

        // Formatear para consola
        const prefix = `[${type.toUpperCase()}]`;
        const contextStr = Object.keys(context).length > 0
            ? `\nContexto: ${JSON.stringify(context, null, 2)}`
            : '';

        // Loguear según severidad
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                logger.error(`🔴 CRÍTICO ${prefix} ${message}${contextStr}`);
                if (stack) logger.error(stack);
                break;

            case ErrorSeverity.HIGH:
                logger.error(`🟠 ALTO ${prefix} ${message}${contextStr}`);
                if (stack) logger.debug(stack);
                break;

            case ErrorSeverity.MEDIUM:
                logger.warn(`🟡 MEDIO ${prefix} ${message}${contextStr}`);
                break;

            case ErrorSeverity.LOW:
                logger.debug(`🟢 BAJO ${prefix} ${message}${contextStr}`);
                break;
        }
    }

    /**
     * Almacena el error en el historial
     * @private
     */
    _storeError(errorObj) {
        this.errors.push(errorObj);

        // Mantener solo los últimos N errores
        if (this.errors.length > this.config.maxStoredErrors) {
            this.errors.shift();
        }
    }

    /**
     * Muestra notificación al usuario
     * @private
     */
    _showUserNotification(errorObj) {
        const { severity, type, message } = errorObj;

        // Mensaje amigable según tipo
        const userMessage = this._getUserFriendlyMessage(type, message);

        // Determinar estilo de notificación
        let notificationClass = 'error-notification';
        let icon = '❌';

        switch (severity) {
            case ErrorSeverity.CRITICAL:
                notificationClass += ' critical';
                icon = '🔴';
                break;
            case ErrorSeverity.HIGH:
                notificationClass += ' high';
                icon = '⚠️';
                break;
            case ErrorSeverity.MEDIUM:
                notificationClass += ' medium';
                icon = '⚡';
                break;
            case ErrorSeverity.LOW:
                notificationClass += ' low';
                icon = 'ℹ️';
                break;
        }

        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = notificationClass;
        notification.innerHTML = `
            <span class="error-icon">${icon}</span>
            <span class="error-message">${userMessage}</span>
            <button class="error-close" aria-label="Cerrar">×</button>
        `;

        // Insertar en el DOM
        const container = this._getOrCreateNotificationContainer();
        container.appendChild(notification);

        // Auto-cerrar después de un tiempo (según severidad)
        const autoCloseTime = severity === ErrorSeverity.CRITICAL ? 10000 :
                            severity === ErrorSeverity.HIGH ? 7000 :
                            severity === ErrorSeverity.MEDIUM ? 5000 : 3000;

        const closeTimeout = setTimeout(() => {
            this._removeNotification(notification);
        }, autoCloseTime);

        // Botón de cerrar
        notification.querySelector('.error-close').addEventListener('click', () => {
            clearTimeout(closeTimeout);
            this._removeNotification(notification);
        });
    }

    /**
     * Convierte error técnico a mensaje amigable
     * @private
     */
    _getUserFriendlyMessage(type, technicalMessage) {
        const messages = {
            [ErrorTypes.NETWORK]: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
            [ErrorTypes.VALIDATION]: technicalMessage, // Mostrar el mensaje tal cual
            [ErrorTypes.STORAGE]: 'No se pudo guardar la información. El almacenamiento podría estar lleno.',
            [ErrorTypes.PARSE]: 'El archivo no se pudo procesar correctamente. Verifica el formato.',
            [ErrorTypes.RENDER]: 'Error al mostrar la información. Intenta recargar la página.',
            [ErrorTypes.PERMISSION]: 'No tienes permisos para realizar esta acción.',
            [ErrorTypes.UNKNOWN]: 'Ha ocurrido un error inesperado.'
        };

        return messages[type] || technicalMessage;
    }

    /**
     * Obtiene o crea el contenedor de notificaciones
     * @private
     */
    _getOrCreateNotificationContainer() {
        let container = document.getElementById('error-notifications');

        if (!container) {
            container = document.createElement('div');
            container.id = 'error-notifications';
            container.className = 'error-notifications-container';
            document.body.appendChild(container);
        }

        return container;
    }

    /**
     * Remueve una notificación con animación
     * @private
     */
    _removeNotification(notification) {
        notification.classList.add('removing');

        setTimeout(() => {
            notification.remove();
        }, 300);
    }

    /**
     * Ejecuta estrategia de recuperación si existe
     * @private
     */
    _executeRecovery(errorObj) {
        const strategy = this.recoveryStrategies.get(errorObj.type);

        if (strategy && typeof strategy === 'function') {
            try {
                logger.debug(`ErrorHandler: Ejecutando estrategia de recuperación para ${errorObj.type}`);
                strategy(errorObj);
            } catch (recoveryError) {
                logger.error('Error al ejecutar estrategia de recuperación:', recoveryError);
            }
        }
    }

    /**
     * Registra una estrategia de recuperación para un tipo de error
     * @param {string} type - Tipo de error
     * @param {Function} callback - Función a ejecutar para recuperar
     */
    registerRecovery(type, callback) {
        if (typeof callback !== 'function') {
            logger.warn('ErrorHandler: Recovery callback debe ser una función');
            return;
        }

        this.recoveryStrategies.set(type, callback);
        logger.debug(`ErrorHandler: Estrategia de recuperación registrada para ${type}`);
    }

    /**
     * Wrapper para funciones que pueden lanzar errores
     * @param {Function} fn - Función a envolver
     * @param {string} type - Tipo de error esperado
     * @param {Object} context - Contexto adicional
     * @returns {Function} Función envuelta con manejo de errores
     */
    wrap(fn, type = ErrorTypes.UNKNOWN, context = {}) {
        const self = this;

        // Función síncrona
        if (fn.constructor.name !== 'AsyncFunction') {
            return function wrappedSync(...args) {
                try {
                    return fn.apply(this, args);
                } catch (error) {
                    self.handle(error, type, context);
                    return null;
                }
            };
        }

        // Función asíncrona
        return async function wrappedAsync(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                self.handle(error, type, context);
                return null;
            }
        };
    }

    /**
     * Limpia el historial de errores
     */
    clearHistory() {
        this.errors = [];
        this.errorCount = 0;
        logger.debug('ErrorHandler: Historial limpiado');
    }

    /**
     * Obtiene estadísticas de errores
     */
    getStats() {
        const byType = {};
        const bySeverity = {};

        this.errors.forEach(error => {
            byType[error.type] = (byType[error.type] || 0) + 1;
            bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
        });

        return {
            total: this.errorCount,
            stored: this.errors.length,
            byType,
            bySeverity,
            lastError: this.lastError
        };
    }

    /**
     * Exporta errores para debugging
     */
    exportErrors() {
        return JSON.stringify(this.errors, null, 2);
    }
}

// Instancia singleton
export const errorHandler = new ErrorHandler();

// Exportar también la clase para testing
export { ErrorHandler };
