/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONSTANTS.JS - Constantes centralizadas de la aplicación
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FASE 3 Code Quality (3.1): Eliminar Magic Numbers y Magic Strings
 *
 * Este módulo centraliza todas las constantes utilizadas en la aplicación,
 * eliminando "magic numbers" y "magic strings" dispersos en el código.
 *
 * Beneficios:
 * - Single source of truth para valores constantes
 * - Más fácil cambiar configuración
 * - Reduce bugs por typos
 * - Mejora mantenibilidad
 */

// ============================================================================
// TIMEOUTS Y DELAYS
// ============================================================================

/**
 * Timeouts y delays utilizados en la aplicación (en milisegundos)
 */
export const TIMEOUTS = {
    /** Timeout para limpieza de blob URLs (30 minutos) */
    BLOB_CLEANUP: 30 * 60 * 1000,

    /** Delay antes de cargar proyecto (previene doble carga) */
    PROJECT_LOAD_DELAY: 50,

    /** Duración de animaciones de modales */
    MODAL_ANIMATION: 300,

    /** Timeout por defecto para debounce en inputs de texto */
    DEBOUNCE_DEFAULT: 300,

    /** Timeout por defecto para throttle en eventos de scroll/resize */
    THROTTLE_DEFAULT: 300,

    /** Duración de notificaciones (5 segundos) */
    NOTIFICATION_DURATION: 5000,

    /** Timeout para auto-cerrar mensajes de éxito */
    SUCCESS_MESSAGE_DURATION: 3000,

    /** Timeout para requests de red (30 segundos) */
    NETWORK_REQUEST_TIMEOUT: 30000,

    /** Delay para tooltip hover */
    TOOLTIP_DELAY: 500,

    /** Duración de fade animations */
    FADE_DURATION: 200,

    /** Delay para auto-save */
    AUTOSAVE_DELAY: 2000
};

// ============================================================================
// CSS CLASS NAMES
// ============================================================================

/**
 * Nombres de clases CSS utilizadas en JavaScript
 * (Evita typos y facilita refactorización)
 */
export const CSS_CLASSES = {
    // Estados
    ACTIVE: 'active',
    HIDDEN: 'hidden',
    VISIBLE: 'visible',
    DISABLED: 'disabled',
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
    WARNING: 'warning',

    // Componentes
    MODAL: 'modal',
    MODAL_OPEN: 'modal-open',
    DROPDOWN: 'dropdown',
    DROPDOWN_OPEN: 'dropdown-open',
    TOOLTIP: 'tooltip',
    NOTIFICATION: 'notification',

    // Layout
    SIDEBAR: 'sidebar',
    SIDEBAR_OPEN: 'sidebar-open',
    PANEL: 'panel',
    PANEL_COLLAPSED: 'panel-collapsed',

    // Listas
    SELECTED: 'selected',
    FOCUSED: 'focused',
    FAVORITE: 'favorite',
    HIGHLIGHTED: 'highlighted',

    // Botones
    BTN_PRIMARY: 'btn-primary',
    BTN_SECONDARY: 'btn-secondary',
    BTN_GHOST: 'btn-ghost',
    BTN_ICON: 'btn-icon',

    // Utilidades
    DRAGGING: 'dragging',
    RESIZING: 'resizing',
    ANIMATING: 'animating'
};

// ============================================================================
// COLORES
// ============================================================================

/**
 * Paleta de colores de la aplicación
 */
export const COLORS = {
    // Colores primarios
    PRIMARY: '#2196F3',
    SECONDARY: '#757575',
    ACCENT: '#FF4081',

    // Estados
    SUCCESS: '#4CAF50',
    ERROR: '#F44336',
    WARNING: '#FF9800',
    INFO: '#2196F3',

    // Prioridades
    PRIORITY_HIGH: '#F44336',
    PRIORITY_MEDIUM: '#FF9800',
    PRIORITY_LOW: '#4CAF50',

    // Status
    STATUS_OPEN: '#2196F3',
    STATUS_IN_PROGRESS: '#FF9800',
    STATUS_RESOLVED: '#4CAF50',
    STATUS_CLOSED: '#757575',

    // Neutrales
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    GRAY_LIGHT: '#F5F5F5',
    GRAY: '#9E9E9E',
    GRAY_DARK: '#424242',

    // Transparencias
    OVERLAY: 'rgba(0, 0, 0, 0.5)',
    OVERLAY_LIGHT: 'rgba(0, 0, 0, 0.3)',
    SHADOW: 'rgba(0, 0, 0, 0.1)'
};

// ============================================================================
// FILE PATHS Y EXTENSIONES
// ============================================================================

/**
 * Rutas de archivos BCF estándar
 */
export const BCF_PATHS = {
    MARKUP: 'markup.bcf',
    VIEWPOINT: 'viewpoint.bcfv',
    SNAPSHOT: 'snapshot.png',
    SNAPSHOT_ALT: 'Snapshot.jpg', // Variante en mayúscula
    VERSION: 'bcf.version',
    PROJECT: 'project.bcfp',
    EXTENSIONS: 'extensions.xml'
};

/**
 * Extensiones de archivos soportadas
 */
export const FILE_EXTENSIONS = {
    BCF: '.bcf',
    BCFZIP: '.bcfzip',
    PNG: '.png',
    JPG: '.jpg',
    JPEG: '.jpeg',
    PDF: '.pdf',
    XLSX: '.xlsx',
    CSV: '.csv',
    JSON: '.json',
    XML: '.xml'
};

// ============================================================================
// LÍMITES Y RESTRICCIONES
// ============================================================================

/**
 * Límites de tamaño, cantidad, etc.
 */
export const LIMITS = {
    /** Máximo de items para activar virtual scrolling */
    VIRTUAL_SCROLL_THRESHOLD: 100,

    /** Máximo de issues por página */
    MAX_ISSUES_PER_PAGE: 1000,

    /** Máximo de comentarios por issue */
    MAX_COMMENTS_PER_ISSUE: 100,

    /** Tamaño máximo de archivo (100 MB) */
    MAX_FILE_SIZE: 100 * 1024 * 1024,

    /** Máximo de caracteres en título de proyecto */
    MAX_PROJECT_NAME_LENGTH: 100,

    /** Mínimo de caracteres en título de proyecto */
    MIN_PROJECT_NAME_LENGTH: 3,

    /** Máximo de caracteres en descripción */
    MAX_DESCRIPTION_LENGTH: 500,

    /** Máximo de archivos en drag & drop */
    MAX_FILES_UPLOAD: 10,

    /** Máximo de resultados en búsqueda de spotlight */
    MAX_SPOTLIGHT_RESULTS: 20,

    /** Máximo de columnas personalizables */
    MAX_CUSTOM_COLUMNS: 15
};

// ============================================================================
// MENSAJES DE USUARIO
// ============================================================================

/**
 * Mensajes de usuario comunes
 * (Útil para futura internacionalización i18n)
 */
export const MESSAGES = {
    // Errores
    ERROR_GENERIC: 'Ocurrió un error inesperado',
    ERROR_NETWORK: 'Error de conexión. Verifica tu internet.',
    ERROR_FILE_TOO_LARGE: 'El archivo es demasiado grande',
    ERROR_INVALID_FILE: 'Archivo inválido o corrupto',
    ERROR_PERMISSION_DENIED: 'Permiso denegado',

    // Éxito
    SUCCESS_SAVED: 'Guardado correctamente',
    SUCCESS_DELETED: 'Eliminado correctamente',
    SUCCESS_UPLOADED: 'Archivo cargado exitosamente',
    SUCCESS_EXPORTED: 'Exportación completada',

    // Confirmaciones
    CONFIRM_DELETE: '¿Estás seguro de eliminar?',
    CONFIRM_DELETE_MULTIPLE: '¿Eliminar {count} elementos?',
    CONFIRM_DISCARD_CHANGES: '¿Descartar cambios sin guardar?',

    // Validación
    VALIDATION_REQUIRED: 'Este campo es obligatorio',
    VALIDATION_MIN_LENGTH: 'Mínimo {min} caracteres',
    VALIDATION_MAX_LENGTH: 'Máximo {max} caracteres',
    VALIDATION_INVALID_EMAIL: 'Email inválido',
    VALIDATION_INVALID_URL: 'URL inválida',

    // Loading
    LOADING: 'Cargando...',
    LOADING_PROJECT: 'Cargando proyecto...',
    LOADING_ISSUES: 'Cargando incidencias...',
    PROCESSING: 'Procesando...'
};

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Códigos de teclado
 */
export const KEY_CODES = {
    ENTER: 'Enter',
    ESCAPE: 'Escape',
    SPACE: ' ',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    DELETE: 'Delete',
    BACKSPACE: 'Backspace',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown'
};

/**
 * Modificadores de teclado
 */
export const KEY_MODIFIERS = {
    CTRL: 'ctrlKey',
    ALT: 'altKey',
    SHIFT: 'shiftKey',
    META: 'metaKey' // Cmd en Mac, Win en Windows
};

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

/**
 * Keys de localStorage
 */
export const STORAGE_KEYS = {
    PROJECTS: 'bcf_projects',
    CURRENT_PROJECT: 'bcf_current_project',
    FAVORITES: 'bcf_favorites',
    FILTERS: 'bcf_filters',
    VIEW_MODE: 'bcf_view_mode',
    THEME: 'bcf_theme',
    COLUMN_CONFIG: 'bcf_column_config',
    USER_PREFERENCES: 'bcf_user_preferences',
    LAST_OPENED: 'bcf_last_opened'
};

// ============================================================================
// EVENTOS CUSTOM
// ============================================================================

/**
 * Nombres de eventos custom
 */
export const CUSTOM_EVENTS = {
    PROJECT_LOADED: 'project:loaded',
    PROJECT_CHANGED: 'project:changed',
    ISSUE_CREATED: 'issue:created',
    ISSUE_UPDATED: 'issue:updated',
    ISSUE_DELETED: 'issue:deleted',
    ISSUES_REFRESH: 'issues:refresh',
    FILTER_CHANGED: 'filter:changed',
    VIEW_CHANGED: 'view:changed',
    THEME_CHANGED: 'theme:changed',
    FAVORITES_UPDATED: 'favorites:updated'
};

// ============================================================================
// VIEW MODES
// ============================================================================

/**
 * Modos de vista
 */
export const VIEW_MODES = {
    LIST: 'list',
    GRID: 'grid',
    KANBAN: 'kanban'
};

/**
 * Páginas de la aplicación
 */
export const PAGES = {
    DASHBOARD: 'dashboard',
    VIEWER: 'viewer'
};

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

/**
 * Códigos HTTP comunes
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// ============================================================================
// MIME TYPES
// ============================================================================

/**
 * MIME types soportados
 */
export const MIME_TYPES = {
    BCF: 'application/zip',
    PDF: 'application/pdf',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV: 'text/csv',
    JSON: 'application/json',
    PNG: 'image/png',
    JPEG: 'image/jpeg',
    XML: 'application/xml'
};

// ============================================================================
// EXPORT
// ============================================================================

// Exportar todo como default también para conveniencia
export default {
    TIMEOUTS,
    CSS_CLASSES,
    COLORS,
    BCF_PATHS,
    FILE_EXTENSIONS,
    LIMITS,
    MESSAGES,
    KEY_CODES,
    KEY_MODIFIERS,
    STORAGE_KEYS,
    CUSTOM_EVENTS,
    VIEW_MODES,
    PAGES,
    HTTP_STATUS,
    MIME_TYPES
};
