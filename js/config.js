/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIG.JS - CONFIGURACIÓN GLOBAL DE LA APLICACIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Versión: 3.1.0
 * Última actualización: 2024-12-22
 * 
 * Este archivo centraliza toda la configuración de la aplicación,
 * facilitando el mantenimiento y despliegue en diferentes entornos.
 */

/**
 * Configuración del entorno
 * Cambiar según el entorno de ejecución
 */
const ENVIRONMENT = {
    MODE: 'production', // 'development' | 'production' | 'staging'
    
    get isDevelopment() {
        return this.MODE === 'development';
    },
    
    get isProduction() {
        return this.MODE === 'production';
    },
    
    get isStaging() {
        return this.MODE === 'staging';
    }
};

/**
 * Configuración principal de la aplicación
 */
export const CONFIG = {
    // ═══════════════════════════════════════════════════════════════════════
    // INFORMACIÓN DE LA APLICACIÓN
    // ═══════════════════════════════════════════════════════════════════════
    APP_NAME: 'BCF Viewer Pro',
    VERSION: '3.1.0',
    BUILD_DATE: '2024-12-22',
    AUTHOR: 'BIM Development Team',
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE ENTORNO
    // ═══════════════════════════════════════════════════════════════════════
    ENVIRONMENT,
    
    // ═══════════════════════════════════════════════════════════════════════
    // LOGS Y DEBUG
    // ═══════════════════════════════════════════════════════════════════════
    DEBUG: ENVIRONMENT.isDevelopment,
    ENABLE_CONSOLE_LOGS: ENVIRONMENT.isDevelopment,
    LOG_LEVEL: ENVIRONMENT.isProduction ? 'error' : 'debug', // 'debug' | 'info' | 'warning' | 'error'
    ENABLE_PERFORMANCE_MONITORING: true,
    
    // ═══════════════════════════════════════════════════════════════════════
    // API Y NETWORKING
    // ═══════════════════════════════════════════════════════════════════════
    API: {
        TIMEOUT: 30000, // 30 segundos
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000, // 1 segundo
        MAX_CONCURRENT_REQUESTS: 5,
        
        // Endpoints por defecto (pueden ser sobrescritos en runtime)
        DEFAULT_SERVER_URL: '',
        
        // Headers por defecto
        DEFAULT_HEADERS: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // ARCHIVOS Y FORMATOS
    // ═══════════════════════════════════════════════════════════════════════
    FILES: {
        MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
        MAX_FILES_PER_UPLOAD: 10,
        
        // Formatos BCF soportados
        SUPPORTED_BCF_VERSIONS: ['2.1', '3.0'],
        SUPPORTED_FILE_EXTENSIONS: ['.bcf', '.bcfzip'],
        
        // Formatos de exportación
        EXPORT_FORMATS: {
            PDF: { enabled: true, maxPageSize: 'A4' },
            EXCEL: { enabled: true, maxRows: 100000 },
            JSON: { enabled: true, pretty: true },
            CSV: { enabled: true, delimiter: ';', encoding: 'UTF-8' }
        },
        
        // Configuración de imágenes/snapshots
        IMAGE: {
            MAX_SIZE: 10 * 1024 * 1024, // 10MB
            SUPPORTED_FORMATS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            THUMBNAIL_SIZE: 200, // píxeles
            COMPRESSION_QUALITY: 0.8 // 0-1
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // UI Y EXPERIENCIA DE USUARIO
    // ═══════════════════════════════════════════════════════════════════════
    UI: {
        NOTIFICATION_DURATION: 3000, // 3 segundos
        NOTIFICATION_MAX_QUEUE: 5,
        
        ANIMATION_DURATION: 300, // 0.3 segundos
        ANIMATION_EASING: 'ease-in-out',
        
        DEBOUNCE_DELAY: 300, // 0.3 segundos para búsquedas
        THROTTLE_DELAY: 100, // 0.1 segundos para scroll/resize
        
        // Paginación
        ITEMS_PER_PAGE: 50,
        MAX_ITEMS_PER_PAGE: 200,
        
        // Spotlight/Búsqueda
        SPOTLIGHT_MAX_RESULTS: 20,
        SPOTLIGHT_MIN_QUERY_LENGTH: 2,
        
        // Temas
        DEFAULT_THEME: 'dark',
        AVAILABLE_THEMES: ['light', 'dark', 'auto']
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // ALMACENAMIENTO Y PERSISTENCIA
    // ═══════════════════════════════════════════════════════════════════════
    STORAGE: {
        // IndexedDB
        INDEXEDDB_NAME: 'bcf_viewer_pro_db',
        INDEXEDDB_VERSION: 2, // Incrementar cuando cambien esquemas
        
        // localStorage
        LOCALSTORAGE_KEY: 'bcf_viewer_pro_data',
        LOCALSTORAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB (límite del navegador)
        
        // Cache
        ENABLE_CACHE: true,
        CACHE_DURATION: 3600000, // 1 hora en millisegundos
        
        // Auto-guardado
        AUTO_SAVE_ENABLED: true,
        AUTO_SAVE_INTERVAL: 30000 // 30 segundos
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // LÍMITES Y RESTRICCIONES
    // ═══════════════════════════════════════════════════════════════════════
    LIMITS: {
        MAX_PROJECTS: 100,
        MAX_ISSUES_PER_PROJECT: 10000,
        MAX_COMMENTS_PER_ISSUE: 1000,
        MAX_SNAPSHOTS_PER_ISSUE: 50,
        MAX_ATTACHMENTS_PER_ISSUE: 20,
        
        // Búsqueda
        MAX_SEARCH_RESULTS: 500,
        
        // Selección múltiple
        MAX_BULK_SELECTION: 1000,
        
        // Historial
        MAX_HISTORY_ITEMS: 100
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // FUNCIONALIDADES (FEATURE FLAGS)
    // ═══════════════════════════════════════════════════════════════════════
    FEATURES: {
        // Módulos principales
        ENABLE_API_SYNC: true,
        ENABLE_OFFLINE_MODE: true,
        
        // Exportación
        ENABLE_EXPORT_PDF: true,
        ENABLE_EXPORT_EXCEL: true,
        ENABLE_EXPORT_JSON: true,
        ENABLE_EXPORT_CSV: true,
        
        // UI
        ENABLE_BULK_EDIT: true,
        ENABLE_KEYBOARD_SHORTCUTS: true,
        ENABLE_SPOTLIGHT: true,
        ENABLE_DRAG_DROP: true,
        
        // Avanzado
        ENABLE_ADVANCED_FILTERS: true,
        ENABLE_CUSTOM_FIELDS: false, // Para futuro
        ENABLE_PLUGINS: false, // Para futuro
        ENABLE_WEBHOOKS: false, // Para futuro
        
        // Administración
        ENABLE_ADMIN_PANEL: false, // Para futuro
        ENABLE_USER_MANAGEMENT: false, // Para futuro
        ENABLE_AUDIT_LOG: false // Para futuro
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // VALIDACIÓN Y REGEX
    // ═══════════════════════════════════════════════════════════════════════
    VALIDATION: {
        GUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        URL_PATTERN: /^https?:\/\/.+/,
        BCF_VERSION_PATTERN: /^[2-3]\.[0-9]$/,
        
        // Strings
        MIN_TITLE_LENGTH: 3,
        MAX_TITLE_LENGTH: 255,
        MAX_DESCRIPTION_LENGTH: 10000,
        MAX_COMMENT_LENGTH: 5000
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // SEGURIDAD
    // ═══════════════════════════════════════════════════════════════════════
    SECURITY: {
        ENABLE_XSS_PROTECTION: true,
        SANITIZE_HTML_INPUT: true,
        
        // Sesión
        SESSION_TIMEOUT: 3600000, // 1 hora
        
        // API Keys (no almacenar en producción)
        ENABLE_API_KEY_ROTATION: false
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // INTEGRACIÓN CON REVIT (para tu caso específico)
    // ═══════════════════════════════════════════════════════════════════════
    REVIT_INTEGRATION: {
        ENABLED: true,
        AUTO_SYNC: false,
        SYNC_INTERVAL: 60000, // 1 minuto
        
        // Bridge configuration
        BRIDGE_URL: 'http://localhost:8080', // Ajustar según tu setup
        BRIDGE_TIMEOUT: 10000,
        
        // Comandos soportados
        SUPPORTED_COMMANDS: [
            'get_model_info',
            'get_selection',
            'highlight_elements',
            'create_bcf',
            'update_parameters'
        ]
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDADORES DE DATOS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const validators = {
    /**
     * Valida versión BCF
     */
    bcfVersion: (version) => {
        return CONFIG.FILES.SUPPORTED_BCF_VERSIONS.includes(version) ||
               CONFIG.VALIDATION.BCF_VERSION_PATTERN.test(version);
    },
    
    /**
     * Valida GUID
     */
    guid: (guid) => {
        if (!guid) return false;
        return CONFIG.VALIDATION.GUID_PATTERN.test(guid);
    },
    
    /**
     * Valida email
     */
    email: (email) => {
        if (!email) return false;
        return CONFIG.VALIDATION.EMAIL_PATTERN.test(email);
    },
    
    /**
     * Valida URL
     */
    url: (url) => {
        if (!url) return false;
        return CONFIG.VALIDATION.URL_PATTERN.test(url);
    },
    
    /**
     * Valida tamaño de archivo
     */
    fileSize: (size) => {
        return size > 0 && size <= CONFIG.FILES.MAX_FILE_SIZE;
    },
    
    /**
     * Valida extensión de archivo
     */
    fileExtension: (filename, validExtensions = CONFIG.FILES.SUPPORTED_FILE_EXTENSIONS) => {
        if (!filename) return false;
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return validExtensions.includes(ext);
    },
    
    /**
     * Valida longitud de título
     */
    titleLength: (title) => {
        if (!title) return false;
        const len = title.trim().length;
        return len >= CONFIG.VALIDATION.MIN_TITLE_LENGTH && 
               len <= CONFIG.VALIDATION.MAX_TITLE_LENGTH;
    },
    
    /**
     * Valida longitud de descripción
     */
    descriptionLength: (description) => {
        if (!description) return true; // Opcional
        return description.length <= CONFIG.VALIDATION.MAX_DESCRIPTION_LENGTH;
    },
    
    /**
     * Valida objeto issue básico
     */
    issue: (issue) => {
        if (!issue) return false;
        return validators.guid(issue.guid) && 
               validators.titleLength(issue.title);
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA DE LOGGING PROFESIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const logger = {
    /**
     * Niveles de log
     */
    levels: {
        DEBUG: 0,
        INFO: 1,
        WARNING: 2,
        ERROR: 3,
        CRITICAL: 4
    },
    
    /**
     * Obtiene el nivel configurado
     */
    get currentLevel() {
        const levelMap = {
            'debug': this.levels.DEBUG,
            'info': this.levels.INFO,
            'warning': this.levels.WARNING,
            'error': this.levels.ERROR,
            'critical': this.levels.CRITICAL
        };
        return levelMap[CONFIG.LOG_LEVEL] || this.levels.ERROR;
    },
    
    /**
     * Log de debug (solo en desarrollo)
     */
    debug: (...args) => {
        if (CONFIG.DEBUG && 
            CONFIG.ENABLE_CONSOLE_LOGS && 
            logger.currentLevel <= logger.levels.DEBUG) {
            console.log('%c[DEBUG]', 'color: #888; font-weight: bold', ...args);
        }
    },
    
    /**
     * Log de información
     */
    info: (...args) => {
        if (CONFIG.ENABLE_CONSOLE_LOGS && 
            logger.currentLevel <= logger.levels.INFO) {
            console.log('%c[INFO]', 'color: #2196F3; font-weight: bold', ...args);
        }
    },
    
    /**
     * Log de advertencia
     */
    warning: (...args) => {
        if (CONFIG.ENABLE_CONSOLE_LOGS && 
            logger.currentLevel <= logger.levels.WARNING) {
            console.warn('%c[WARNING]', 'color: #FF9800; font-weight: bold', ...args);
        }
    },
    
    /**
     * Log de error
     */
    error: (...args) => {
        // Los errores SIEMPRE se muestran
        console.error('%c[ERROR]', 'color: #F44336; font-weight: bold', ...args);
    },
    
    /**
     * Log crítico (errores fatales)
     */
    critical: (...args) => {
        console.error('%c[CRITICAL]', 'color: #D32F2F; font-weight: bold; font-size: 14px', ...args);
    },
    
    /**
     * Log de performance
     */
    performance: (label, duration) => {
        if (CONFIG.ENABLE_PERFORMANCE_MONITORING && CONFIG.DEBUG) {
            console.log(
                `%c[PERF] ${label}`,
                'color: #9C27B0; font-weight: bold',
                `${duration.toFixed(2)}ms`
            );
        }
    },
    
    /**
     * Agrupa logs relacionados
     */
    group: (label) => {
        if (CONFIG.ENABLE_CONSOLE_LOGS && CONFIG.DEBUG) {
            console.group(`%c${label}`, 'color: #00BCD4; font-weight: bold');
        }
    },
    
    /**
     * Termina el grupo de logs
     */
    groupEnd: () => {
        if (CONFIG.ENABLE_CONSOLE_LOGS && CONFIG.DEBUG) {
            console.groupEnd();
        }
    },
    
    /**
     * Log de tabla (útil para arrays)
     */
    table: (data) => {
        if (CONFIG.ENABLE_CONSOLE_LOGS && CONFIG.DEBUG) {
            console.table(data);
        }
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILIDADES DE CONFIGURACIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const configUtils = {
    /**
     * Verifica si una feature está habilitada
     */
    isFeatureEnabled: (featureName) => {
        return CONFIG.FEATURES[featureName] === true;
    },
    
    /**
     * Obtiene información de la versión
     */
    getVersionInfo: () => {
        return {
            name: CONFIG.APP_NAME,
            version: CONFIG.VERSION,
            buildDate: CONFIG.BUILD_DATE,
            environment: CONFIG.ENVIRONMENT.MODE
        };
    },
    
    /**
     * Exporta configuración (sin datos sensibles)
     */
    exportConfig: () => {
        const safe = { ...CONFIG };
        delete safe.SECURITY; // No exportar config de seguridad
        return safe;
    },
    
    /**
     * Valida configuración al inicio
     */
    validateConfig: () => {
        const errors = [];
        
        // Validar límites
        if (CONFIG.LIMITS.MAX_ISSUES_PER_PROJECT < 1) {
            errors.push('MAX_ISSUES_PER_PROJECT debe ser mayor a 0');
        }
        
        // Validar timeouts
        if (CONFIG.API.TIMEOUT < 1000) {
            errors.push('API.TIMEOUT debe ser al menos 1000ms');
        }
        
        if (errors.length > 0) {
            logger.error('Errores en configuración:', errors);
            return false;
        }
        
        logger.debug('Configuración validada correctamente');
        return true;
    }
};

// Validar configuración al cargar
configUtils.validateConfig();

// Exportar para uso en consola de desarrollo
if (CONFIG.DEBUG) {
    window.BCF_CONFIG = CONFIG;
    window.BCF_LOGGER = logger;
    logger.info(`${CONFIG.APP_NAME} v${CONFIG.VERSION} - Modo: ${CONFIG.ENVIRONMENT.MODE}`);
}
