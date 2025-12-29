/**
 * Error Codes - Códigos de error estandarizados
 *
 * Sistema de códigos de error para identificación única y
 * categorización de errores en la aplicación.
 *
 * Formato: [CATEGORIA]-[SUBCATEGORIA]-[NUMERO]
 *
 * @module error-codes
 */

/**
 * Códigos de error de red y API
 */
export const NETWORK_ERRORS = {
    // Conexión
    CONNECTION_FAILED: 'NET-CONN-001',
    CONNECTION_TIMEOUT: 'NET-CONN-002',
    CONNECTION_REFUSED: 'NET-CONN-003',

    // HTTP
    HTTP_400: 'NET-HTTP-400',
    HTTP_401: 'NET-HTTP-401',
    HTTP_403: 'NET-HTTP-403',
    HTTP_404: 'NET-HTTP-404',
    HTTP_500: 'NET-HTTP-500',
    HTTP_503: 'NET-HTTP-503',

    // BCF API
    BCF_API_UNAVAILABLE: 'NET-BCF-001',
    BCF_API_UNAUTHORIZED: 'NET-BCF-002',
    BCF_API_INVALID_RESPONSE: 'NET-BCF-003',
    BCF_API_RATE_LIMIT: 'NET-BCF-004',
};

/**
 * Códigos de error de validación
 */
export const VALIDATION_ERRORS = {
    // Campos requeridos
    REQUIRED_FIELD: 'VAL-REQ-001',
    EMPTY_VALUE: 'VAL-REQ-002',

    // Formato
    INVALID_EMAIL: 'VAL-FMT-001',
    INVALID_URL: 'VAL-FMT-002',
    INVALID_GUID: 'VAL-FMT-003',
    INVALID_DATE: 'VAL-FMT-004',
    INVALID_NUMBER: 'VAL-FMT-005',

    // Longitud
    TOO_SHORT: 'VAL-LEN-001',
    TOO_LONG: 'VAL-LEN-002',

    // Rango
    OUT_OF_RANGE: 'VAL-RNG-001',
    BELOW_MINIMUM: 'VAL-RNG-002',
    ABOVE_MAXIMUM: 'VAL-RNG-003',
};

/**
 * Códigos de error de almacenamiento
 */
export const STORAGE_ERRORS = {
    // Quota
    QUOTA_EXCEEDED: 'STR-QTA-001',
    STORAGE_FULL: 'STR-QTA-002',

    // IndexedDB
    IDB_NOT_AVAILABLE: 'STR-IDB-001',
    IDB_OPEN_FAILED: 'STR-IDB-002',
    IDB_TRANSACTION_FAILED: 'STR-IDB-003',
    IDB_READ_FAILED: 'STR-IDB-004',
    IDB_WRITE_FAILED: 'STR-IDB-005',
    IDB_DELETE_FAILED: 'STR-IDB-006',

    // LocalStorage
    LS_NOT_AVAILABLE: 'STR-LS-001',
    LS_READ_FAILED: 'STR-LS-002',
    LS_WRITE_FAILED: 'STR-LS-003',

    // Datos
    DATA_CORRUPTED: 'STR-DATA-001',
    DATA_NOT_FOUND: 'STR-DATA-002',
    DATA_VERSION_MISMATCH: 'STR-DATA-003',
};

/**
 * Códigos de error de parsing
 */
export const PARSE_ERRORS = {
    // JSON
    JSON_PARSE_ERROR: 'PRS-JSON-001',
    JSON_INVALID_STRUCTURE: 'PRS-JSON-002',

    // XML
    XML_PARSE_ERROR: 'PRS-XML-001',
    XML_INVALID_STRUCTURE: 'PRS-XML-002',
    XML_MISSING_REQUIRED_ELEMENT: 'PRS-XML-003',

    // BCF
    BCF_INVALID_FORMAT: 'PRS-BCF-001',
    BCF_MISSING_MARKUP: 'PRS-BCF-002',
    BCF_INVALID_VERSION: 'PRS-BCF-003',
    BCF_CORRUPTED_FILE: 'PRS-BCF-004',
    BCF_ZIP_ERROR: 'PRS-BCF-005',

    // CSV
    CSV_PARSE_ERROR: 'PRS-CSV-001',
    CSV_INVALID_DELIMITER: 'PRS-CSV-002',
};

/**
 * Códigos de error de renderizado
 */
export const RENDER_ERRORS = {
    // DOM
    ELEMENT_NOT_FOUND: 'RND-DOM-001',
    ELEMENT_NULL: 'RND-DOM-002',
    INVALID_SELECTOR: 'RND-DOM-003',

    // Virtual Scrolling
    VIRTUAL_SCROLL_INIT_FAILED: 'RND-VS-001',
    VIRTUAL_SCROLL_RENDER_FAILED: 'RND-VS-002',

    // Templates
    TEMPLATE_NOT_FOUND: 'RND-TPL-001',
    TEMPLATE_INVALID: 'RND-TPL-002',
};

/**
 * Códigos de error de permisos
 */
export const PERMISSION_ERRORS = {
    // File System
    FILE_READ_DENIED: 'PRM-FILE-001',
    FILE_WRITE_DENIED: 'PRM-FILE-002',
    FILE_DELETE_DENIED: 'PRM-FILE-003',

    // Clipboard
    CLIPBOARD_READ_DENIED: 'PRM-CLIP-001',
    CLIPBOARD_WRITE_DENIED: 'PRM-CLIP-002',

    // Camera/Media
    CAMERA_DENIED: 'PRM-CAM-001',
    MICROPHONE_DENIED: 'PRM-MIC-001',

    // Geolocation
    GEOLOCATION_DENIED: 'PRM-GEO-001',
};

/**
 * Códigos de error de exportación
 */
export const EXPORT_ERRORS = {
    // General
    EXPORT_FAILED: 'EXP-GEN-001',
    NO_DATA_TO_EXPORT: 'EXP-GEN-002',

    // Excel
    EXCEL_GENERATION_FAILED: 'EXP-XLS-001',
    EXCEL_LIBRARY_NOT_LOADED: 'EXP-XLS-002',

    // PDF
    PDF_GENERATION_FAILED: 'EXP-PDF-001',
    PDF_LIBRARY_NOT_LOADED: 'EXP-PDF-002',
    PDF_IMAGE_LOAD_FAILED: 'EXP-PDF-003',

    // CSV
    CSV_GENERATION_FAILED: 'EXP-CSV-001',

    // JSON
    JSON_EXPORT_FAILED: 'EXP-JSON-001',
};

/**
 * Códigos de error de imagen
 */
export const IMAGE_ERRORS = {
    // Carga
    IMAGE_LOAD_FAILED: 'IMG-LOAD-001',
    IMAGE_NOT_FOUND: 'IMG-LOAD-002',
    IMAGE_CORRUPTED: 'IMG-LOAD-003',

    // Formato
    UNSUPPORTED_FORMAT: 'IMG-FMT-001',
    INVALID_IMAGE_DATA: 'IMG-FMT-002',

    // Procesamiento
    IMAGE_RESIZE_FAILED: 'IMG-PROC-001',
    IMAGE_CROP_FAILED: 'IMG-PROC-002',
    IMAGE_CONVERT_FAILED: 'IMG-PROC-003',

    // Canvas
    CANVAS_CREATION_FAILED: 'IMG-CVS-001',
    CANVAS_RENDER_FAILED: 'IMG-CVS-002',
};

/**
 * Códigos de error de usuario
 */
export const USER_ERRORS = {
    // Sesión
    SESSION_EXPIRED: 'USR-SES-001',
    SESSION_INVALID: 'USR-SES-002',

    // Autenticación
    AUTH_FAILED: 'USR-AUTH-001',
    TOKEN_INVALID: 'USR-AUTH-002',
    TOKEN_EXPIRED: 'USR-AUTH-003',

    // Permisos
    INSUFFICIENT_PERMISSIONS: 'USR-PERM-001',
    UNAUTHORIZED_ACTION: 'USR-PERM-002',
};

/**
 * Agrupa todos los códigos de error
 */
export const ALL_ERROR_CODES = {
    ...NETWORK_ERRORS,
    ...VALIDATION_ERRORS,
    ...STORAGE_ERRORS,
    ...PARSE_ERRORS,
    ...RENDER_ERRORS,
    ...PERMISSION_ERRORS,
    ...EXPORT_ERRORS,
    ...IMAGE_ERRORS,
    ...USER_ERRORS,
};

/**
 * Crea un error con código estandarizado
 *
 * @param {string} code - Código de error (de las constantes arriba)
 * @param {string} message - Mensaje descriptivo del error
 * @param {Object} [details={}] - Detalles adicionales del error
 * @returns {Error} Error con propiedades extendidas
 *
 * @example
 * throw createError(
 *   STORAGE_ERRORS.QUOTA_EXCEEDED,
 *   'No hay espacio suficiente en el almacenamiento',
 *   { required: '10MB', available: '2MB' }
 * );
 */
export function createError(code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    error.timestamp = new Date().toISOString();

    return error;
}

/**
 * Verifica si un error tiene un código específico
 *
 * @param {Error} error - Error a verificar
 * @param {string} code - Código a buscar
 * @returns {boolean} true si el error tiene ese código
 *
 * @example
 * try {
 *   // ...
 * } catch (error) {
 *   if (isErrorCode(error, STORAGE_ERRORS.QUOTA_EXCEEDED)) {
 *     // Manejar quota exceeded
 *   }
 * }
 */
export function isErrorCode(error, code) {
    return error && error.code === code;
}

/**
 * Obtiene la categoría de un código de error
 *
 * @param {string} code - Código de error
 * @returns {string} Categoría (NET, VAL, STR, etc.)
 *
 * @example
 * getErrorCategory('NET-CONN-001'); // 'NET'
 * getErrorCategory('VAL-REQ-001'); // 'VAL'
 */
export function getErrorCategory(code) {
    if (!code || typeof code !== 'string') return 'UNKNOWN';
    return code.split('-')[0] || 'UNKNOWN';
}

/**
 * Verifica si un error es recuperable
 *
 * Algunos errores son recuperables (red temporal, quota temporal)
 * y otros son fatales (formato inválido, permiso denegado).
 *
 * @param {Error} error - Error a verificar
 * @returns {boolean} true si es recuperable
 *
 * @example
 * if (isRecoverableError(error)) {
 *   // Intentar reintentar la operación
 * } else {
 *   // Fallar definitivamente
 * }
 */
export function isRecoverableError(error) {
    if (!error || !error.code) return false;

    const category = getErrorCategory(error.code);

    // Errores de red son generalmente recuperables (reintentos)
    if (category === 'NET') return true;

    // Algunos errores de storage son recuperables
    const recoverableStorageCodes = [
        STORAGE_ERRORS.IDB_TRANSACTION_FAILED,
        STORAGE_ERRORS.IDB_READ_FAILED,
        STORAGE_ERRORS.IDB_WRITE_FAILED,
    ];
    if (recoverableStorageCodes.includes(error.code)) return true;

    // La mayoría de otros errores no son recuperables
    return false;
}

/**
 * Mapeo de códigos de error a mensajes user-friendly
 */
export const ERROR_MESSAGES = {
    // Network
    [NETWORK_ERRORS.CONNECTION_FAILED]: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
    [NETWORK_ERRORS.CONNECTION_TIMEOUT]: 'La conexión tardó demasiado tiempo. Inténtalo de nuevo.',
    [NETWORK_ERRORS.BCF_API_UNAVAILABLE]: 'El servidor BCF no está disponible en este momento.',
    [NETWORK_ERRORS.BCF_API_UNAUTHORIZED]: 'No tienes autorización para acceder al servidor BCF.',
    [NETWORK_ERRORS.HTTP_404]: 'El recurso solicitado no fue encontrado.',
    [NETWORK_ERRORS.HTTP_500]: 'Error del servidor. Por favor intenta más tarde.',

    // Validation
    [VALIDATION_ERRORS.REQUIRED_FIELD]: 'Este campo es obligatorio.',
    [VALIDATION_ERRORS.INVALID_EMAIL]: 'Ingresa un email válido.',
    [VALIDATION_ERRORS.INVALID_URL]: 'Ingresa una URL válida.',
    [VALIDATION_ERRORS.TOO_SHORT]: 'El valor es demasiado corto.',
    [VALIDATION_ERRORS.TOO_LONG]: 'El valor es demasiado largo.',

    // Storage
    [STORAGE_ERRORS.QUOTA_EXCEEDED]: 'No hay suficiente espacio de almacenamiento. Libera espacio e intenta de nuevo.',
    [STORAGE_ERRORS.IDB_NOT_AVAILABLE]: 'El almacenamiento local no está disponible. Verifica la configuración del navegador.',
    [STORAGE_ERRORS.DATA_CORRUPTED]: 'Los datos están corruptos y no pueden ser leídos.',
    [STORAGE_ERRORS.DATA_NOT_FOUND]: 'Los datos solicitados no fueron encontrados.',

    // Parse
    [PARSE_ERRORS.BCF_INVALID_FORMAT]: 'El archivo BCF no tiene un formato válido.',
    [PARSE_ERRORS.BCF_CORRUPTED_FILE]: 'El archivo BCF está corrupto y no puede ser leído.',
    [PARSE_ERRORS.JSON_PARSE_ERROR]: 'Error al procesar datos JSON.',
    [PARSE_ERRORS.XML_PARSE_ERROR]: 'Error al procesar datos XML.',

    // Render
    [RENDER_ERRORS.ELEMENT_NOT_FOUND]: 'No se encontró el elemento de interfaz.',
    [RENDER_ERRORS.VIRTUAL_SCROLL_INIT_FAILED]: 'Error al inicializar el scroll virtual.',

    // Export
    [EXPORT_ERRORS.NO_DATA_TO_EXPORT]: 'No hay datos para exportar.',
    [EXPORT_ERRORS.EXCEL_GENERATION_FAILED]: 'Error al generar el archivo Excel.',
    [EXPORT_ERRORS.PDF_GENERATION_FAILED]: 'Error al generar el PDF.',

    // Image
    [IMAGE_ERRORS.IMAGE_LOAD_FAILED]: 'Error al cargar la imagen.',
    [IMAGE_ERRORS.UNSUPPORTED_FORMAT]: 'Formato de imagen no soportado.',

    // Permissions
    [PERMISSION_ERRORS.FILE_READ_DENIED]: 'Permiso de lectura de archivos denegado.',
    [PERMISSION_ERRORS.CLIPBOARD_WRITE_DENIED]: 'Permiso de escritura al portapapeles denegado.',
};

/**
 * Obtiene el mensaje user-friendly para un código de error
 *
 * @param {string} code - Código de error
 * @param {string} [fallback='Ha ocurrido un error'] - Mensaje por defecto
 * @returns {string} Mensaje amigable
 */
export function getErrorMessage(code, fallback = 'Ha ocurrido un error') {
    return ERROR_MESSAGES[code] || fallback;
}
