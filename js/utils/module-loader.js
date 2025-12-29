/**
 * MODULE LOADER - Carga dinámica de módulos con error handling
 * ============================================================
 *
 * Este módulo proporciona funciones seguras para cargar módulos dinámicamente
 * con manejo robusto de errores, reintentos, y cache.
 *
 * Implementado en FASE 3.9 para reducir acoplamiento y mejorar confiabilidad
 *
 * @example
 * // En lugar de:
 * const { functionName } = await import('./module.js'); // ❌ Sin error handling
 *
 * // Usar:
 * const module = await loadModule('./module.js'); // ✅ Con error handling
 * if (module) {
 *     module.functionName();
 * }
 *
 * @example
 * // Cargar con reintentos:
 * const module = await loadModule('./critical-module.js', { retries: 3 });
 *
 * @example
 * // Precargar módulos:
 * await preloadModules(['./export-utils.js', './pdf-generator.js']);
 */

import { logger } from '../config.js';
import { errorHandler, ErrorTypes } from './error-handler.js';

/**
 * Cache de módulos cargados
 * Evita cargar el mismo módulo múltiples veces
 * @private
 */
const moduleCache = new Map();

/**
 * Módulos en proceso de carga
 * Evita cargas duplicadas simultáneas
 * @private
 */
const loadingPromises = new Map();

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG = {
    retries: 0,              // Número de reintentos en caso de fallo
    timeout: 10000,          // Timeout en ms (10 segundos)
    cache: true,             // Usar cache de módulos
    retryDelay: 1000,        // Delay entre reintentos (ms)
    throwOnError: false      // Si debe lanzar error o retornar null
};

/**
 * Carga un módulo dinámicamente con error handling robusto
 *
 * @param {string} modulePath - Ruta del módulo a cargar (ej: './export-utils.js')
 * @param {Object} options - Opciones de carga
 * @param {number} options.retries - Número de reintentos (default: 0)
 * @param {number} options.timeout - Timeout en ms (default: 10000)
 * @param {boolean} options.cache - Usar cache (default: true)
 * @param {number} options.retryDelay - Delay entre reintentos en ms (default: 1000)
 * @param {boolean} options.throwOnError - Lanzar error en caso de fallo (default: false)
 * @returns {Promise<Object|null>} Módulo cargado o null si falla
 *
 * @example
 * const exportUtils = await loadModule('./export-utils.js');
 * if (exportUtils) {
 *     await exportUtils.exportToExcel(data);
 * }
 *
 * @example
 * // Con reintentos para módulos críticos
 * const storage = await loadModule('./storage.js', { retries: 3, retryDelay: 2000 });
 */
export async function loadModule(modulePath, options = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };

    // Validar que modulePath es una string
    if (typeof modulePath !== 'string' || !modulePath) {
        logger.error('loadModule: modulePath debe ser una string válida');
        return null;
    }

    // Verificar cache
    if (config.cache && moduleCache.has(modulePath)) {
        logger.debug(`📦 Module loaded from cache: ${modulePath}`);
        return moduleCache.get(modulePath);
    }

    // Si ya se está cargando, retornar la promesa existente
    if (loadingPromises.has(modulePath)) {
        logger.debug(`⏳ Waiting for module already loading: ${modulePath}`);
        return loadingPromises.get(modulePath);
    }

    // Crear promesa de carga
    const loadPromise = _loadModuleWithRetries(modulePath, config);

    // Guardar promesa en loading
    loadingPromises.set(modulePath, loadPromise);

    try {
        const module = await loadPromise;

        // Guardar en cache si está habilitado
        if (config.cache && module) {
            moduleCache.set(modulePath, module);
        }

        return module;
    } finally {
        // Limpiar promesa de loading
        loadingPromises.delete(modulePath);
    }
}

/**
 * Carga un módulo con lógica de reintentos
 * @private
 */
async function _loadModuleWithRetries(modulePath, config) {
    let lastError = null;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
            // Log del intento
            if (attempt > 0) {
                logger.info(`🔄 Retry ${attempt}/${config.retries} loading: ${modulePath}`);
            }

            // Cargar módulo con timeout
            const module = await _loadModuleWithTimeout(modulePath, config.timeout);

            // Log de éxito
            if (attempt === 0) {
                logger.debug(`✅ Module loaded: ${modulePath}`);
            } else {
                logger.info(`✅ Module loaded after ${attempt} retries: ${modulePath}`);
            }

            return module;

        } catch (error) {
            lastError = error;

            // Si no quedan más reintentos, salir del loop
            if (attempt >= config.retries) {
                break;
            }

            // Esperar antes del próximo reintento
            await _delay(config.retryDelay);
        }
    }

    // Si llegamos aquí, todos los intentos fallaron
    errorHandler.handle(lastError, ErrorTypes.UNKNOWN, {
        modulePath,
        attempts: config.retries + 1,
        message: `Failed to load module: ${modulePath}`
    });

    // Lanzar error o retornar null según configuración
    if (config.throwOnError) {
        throw lastError;
    }

    return null;
}

/**
 * Carga un módulo con timeout
 * @private
 */
async function _loadModuleWithTimeout(modulePath, timeout) {
    return Promise.race([
        import(modulePath),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Module load timeout: ${modulePath}`)), timeout)
        )
    ]);
}

/**
 * Delay helper
 * @private
 */
function _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Precarga múltiples módulos en paralelo
 *
 * Útil para cargar módulos que se usarán pronto en background
 *
 * @param {string[]} modulePaths - Array de rutas de módulos
 * @param {Object} options - Opciones de carga (mismas que loadModule)
 * @returns {Promise<Object>} Objeto con módulos cargados (key: path, value: module)
 *
 * @example
 * // Precargar módulos de exportación al inicio
 * await preloadModules([
 *     './export-utils.js',
 *     './pdf-generator.js',
 *     './excel-generator.js'
 * ]);
 */
export async function preloadModules(modulePaths, options = {}) {
    if (!Array.isArray(modulePaths)) {
        logger.error('preloadModules: modulePaths debe ser un array');
        return {};
    }

    logger.info(`🚀 Preloading ${modulePaths.length} modules...`);

    const loadPromises = modulePaths.map(async (path) => {
        const module = await loadModule(path, options);
        return [path, module];
    });

    const results = await Promise.allSettled(loadPromises);

    const modules = {};
    let successCount = 0;

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const [path, module] = result.value;
            if (module) {
                modules[path] = module;
                successCount++;
            }
        } else {
            logger.warn(`Failed to preload: ${modulePaths[index]}`, result.reason);
        }
    });

    logger.info(`✅ Preloaded ${successCount}/${modulePaths.length} modules`);

    return modules;
}

/**
 * Limpia la cache de módulos
 *
 * Útil para desarrollo o cuando se necesita recargar módulos
 *
 * @param {string} [modulePath] - Ruta específica a limpiar (opcional)
 *
 * @example
 * // Limpiar cache completa
 * clearModuleCache();
 *
 * @example
 * // Limpiar módulo específico
 * clearModuleCache('./export-utils.js');
 */
export function clearModuleCache(modulePath = null) {
    if (modulePath) {
        if (moduleCache.has(modulePath)) {
            moduleCache.delete(modulePath);
            logger.debug(`🗑️  Cleared cache for: ${modulePath}`);
        }
    } else {
        const count = moduleCache.size;
        moduleCache.clear();
        logger.debug(`🗑️  Cleared ${count} modules from cache`);
    }
}

/**
 * Obtiene estadísticas de la cache
 *
 * @returns {Object} Estadísticas de cache
 *
 * @example
 * const stats = getModuleCacheStats();
 * console.log(`Cached modules: ${stats.count}`);
 */
export function getModuleCacheStats() {
    return {
        count: moduleCache.size,
        modules: Array.from(moduleCache.keys()),
        loadingCount: loadingPromises.size,
        loading: Array.from(loadingPromises.keys())
    };
}

/**
 * Wrapper seguro para importar funciones específicas de un módulo
 *
 * @param {string} modulePath - Ruta del módulo
 * @param {string[]} functionNames - Nombres de funciones a importar
 * @param {Object} options - Opciones de carga
 * @returns {Promise<Object|null>} Objeto con funciones o null
 *
 * @example
 * const { exportToExcel, exportToPDF } = await importFunctions(
 *     './export-utils.js',
 *     ['exportToExcel', 'exportToPDF']
 * );
 *
 * if (exportToExcel) {
 *     await exportToExcel(data);
 * }
 */
export async function importFunctions(modulePath, functionNames, options = {}) {
    if (!Array.isArray(functionNames) || functionNames.length === 0) {
        logger.error('importFunctions: functionNames debe ser un array no vacío');
        return null;
    }

    const module = await loadModule(modulePath, options);

    if (!module) {
        return null;
    }

    const functions = {};
    const missing = [];

    functionNames.forEach(name => {
        if (typeof module[name] === 'function') {
            functions[name] = module[name];
        } else {
            missing.push(name);
        }
    });

    if (missing.length > 0) {
        logger.warn(`Functions not found in ${modulePath}: ${missing.join(', ')}`);
    }

    return functions;
}

/**
 * Verifica si un módulo está en cache
 *
 * @param {string} modulePath - Ruta del módulo
 * @returns {boolean} True si está en cache
 *
 * @example
 * if (isModuleCached('./export-utils.js')) {
 *     console.log('Module already loaded');
 * }
 */
export function isModuleCached(modulePath) {
    return moduleCache.has(modulePath);
}

/**
 * Verifica si un módulo se está cargando actualmente
 *
 * @param {string} modulePath - Ruta del módulo
 * @returns {boolean} True si se está cargando
 *
 * @example
 * if (isModuleLoading('./export-utils.js')) {
 *     console.log('Module is loading...');
 * }
 */
export function isModuleLoading(modulePath) {
    return loadingPromises.has(modulePath);
}
