/**
 * LOG MANAGER - Sistema de logging centralizado
 * Proporciona loggers individuales por módulo con niveles configurables
 */

/**
 * Niveles de log disponibles
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

/**
 * Configuración global de logging
 */
const LOG_CONFIG = {
    enabled: true,
    currentLevel: LOG_LEVELS.INFO,
    showTimestamp: false,
    showModule: true
};

/**
 * Clase Logger individual por módulo
 */
class Logger {
    constructor(moduleName) {
        this.moduleName = moduleName;
    }

    _log(level, color, ...args) {
        if (!LOG_CONFIG.enabled || LOG_CONFIG.currentLevel > level) {
            return;
        }

        const timestamp = LOG_CONFIG.showTimestamp ? `[${new Date().toISOString()}] ` : '';
        const module = LOG_CONFIG.showModule ? `[${this.moduleName}] ` : '';
        const prefix = `${timestamp}${module}`;

        console.log(`%c${prefix}`, `color: ${color}; font-weight: bold`, ...args);
    }

    debug(...args) {
        this._log(LOG_LEVELS.DEBUG, '#888', ...args);
    }

    info(...args) {
        this._log(LOG_LEVELS.INFO, '#2196F3', ...args);
    }

    warn(...args) {
        if (LOG_CONFIG.currentLevel <= LOG_LEVELS.WARN) {
            console.warn(`%c[${this.moduleName}]`, 'color: #FF9800; font-weight: bold', ...args);
        }
    }

    error(...args) {
        if (LOG_CONFIG.currentLevel <= LOG_LEVELS.ERROR) {
            console.error(`%c[${this.moduleName}]`, 'color: #f44336; font-weight: bold', ...args);
        }
    }

    log(...args) {
        this.info(...args);
    }
}

/**
 * Clase LogManager - Fábrica de loggers
 */
export class LogManager {
    static loggers = new Map();

    /**
     * Obtiene o crea un logger para un módulo específico
     * @param {string} moduleName - Nombre del módulo
     * @returns {Logger} Instancia de logger
     */
    static getLogger(moduleName) {
        if (!this.loggers.has(moduleName)) {
            this.loggers.set(moduleName, new Logger(moduleName));
        }
        return this.loggers.get(moduleName);
    }

    /**
     * Configura el nivel de log global
     * @param {string} level - 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'
     */
    static setLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            LOG_CONFIG.currentLevel = LOG_LEVELS[level];
        }
    }

    /**
     * Habilita o deshabilita logging
     * @param {boolean} enabled
     */
    static setEnabled(enabled) {
        LOG_CONFIG.enabled = enabled;
    }

    /**
     * Configura opciones de visualización
     * @param {object} options
     */
    static configure(options) {
        Object.assign(LOG_CONFIG, options);
    }
}

// Exportar también LOG_LEVELS para uso externo
export { LOG_LEVELS };

// Logger por defecto para uso global
export const logger = LogManager.getLogger('App');
