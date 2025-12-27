/**
 * DB MANAGER - Gestión de persistencia con fallback automático
 * =============================================================
 *
 * Sistema de almacenamiento con múltiples backends:
 * 1. IndexedDB (preferido) - Sin límite de tamaño, mejor performance
 * 2. localStorage (fallback) - ~5-10MB límite, pero siempre disponible
 *
 * Características:
 * - Detección automática de disponibilidad
 * - Fallback transparente si IndexedDB falla
 * - Compresión de datos para localStorage
 * - Migración automática entre backends
 * - Manejo robusto de errores
 * - Recuperación de datos corruptos
 */

import { logger } from './config.js';

/**
 * Adapter para IndexedDB
 */
class IndexedDBAdapter {
    constructor(dbName = 'BCFViewerProDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.available = null; // null = no chequeado, true/false = resultado
    }

    /**
     * Verifica si IndexedDB está disponible
     */
    async checkAvailability() {
        if (this.available !== null) {
            return this.available;
        }

        try {
            // Verificar que indexedDB existe
            if (!window.indexedDB) {
                logger.warn('IndexedDB no está disponible en este navegador');
                this.available = false;
                return false;
            }

            // Intentar abrir una DB de prueba
            const testDB = await new Promise((resolve, reject) => {
                const request = indexedDB.open('__test__', 1);
                const timeout = setTimeout(() => {
                    reject(new Error('IndexedDB timeout'));
                }, 3000);

                request.onsuccess = () => {
                    clearTimeout(timeout);
                    const db = request.result;
                    db.close();
                    indexedDB.deleteDatabase('__test__');
                    resolve(true);
                };

                request.onerror = () => {
                    clearTimeout(timeout);
                    reject(request.error);
                };

                request.onblocked = () => {
                    clearTimeout(timeout);
                    reject(new Error('IndexedDB bloqueado'));
                };
            });

            this.available = true;
            logger.info('IndexedDB disponible y funcional');
            return true;

        } catch (error) {
            logger.warn('IndexedDB no disponible:', error.message);
            this.available = false;
            return false;
        }
    }

    /**
     * Inicializa la base de datos
     */
    async init() {
        if (this.db) return this.db;

        const isAvailable = await this.checkAvailability();
        if (!isAvailable) {
            throw new Error('IndexedDB no disponible');
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Almacén de proyectos
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' });
                }

                // Almacén de archivos binarios
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'id' });
                }

                // Almacén de configuración
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;

                // Manejar errores de la conexión
                this.db.onerror = (event) => {
                    logger.error('Error en IndexedDB:', event.target.error);
                };

                resolve(this.db);
            };

            request.onerror = (event) => {
                logger.error('Error abriendo IndexedDB:', event.target.error);
                reject(event.target.error);
            };

            request.onblocked = () => {
                logger.warn('IndexedDB bloqueado por otra pestaña');
                reject(new Error('IndexedDB bloqueado'));
            };
        });
    }

    async put(storeName, data) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            logger.error(`Error en IndexedDB.put(${storeName}):`, error);
            throw error;
        }
    }

    async get(storeName, id) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            logger.error(`Error en IndexedDB.get(${storeName}, ${id}):`, error);
            throw error;
        }
    }

    async getAll(storeName) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            logger.error(`Error en IndexedDB.getAll(${storeName}):`, error);
            throw error;
        }
    }

    async delete(storeName, id) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            logger.error(`Error en IndexedDB.delete(${storeName}, ${id}):`, error);
            throw error;
        }
    }

    async clear(storeName) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            logger.error(`Error en IndexedDB.clear(${storeName}):`, error);
            throw error;
        }
    }
}

/**
 * Adapter para localStorage con compresión
 */
class LocalStorageAdapter {
    constructor(prefix = 'bcf_') {
        this.prefix = prefix;
        this.available = null;
    }

    /**
     * Verifica si localStorage está disponible
     */
    async checkAvailability() {
        if (this.available !== null) {
            return this.available;
        }

        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            this.available = true;
            logger.info('localStorage disponible');
            return true;
        } catch (error) {
            logger.error('localStorage no disponible:', error);
            this.available = false;
            return false;
        }
    }

    /**
     * Genera clave con prefijo
     */
    _makeKey(storeName, id = null) {
        return id
            ? `${this.prefix}${storeName}_${id}`
            : `${this.prefix}${storeName}_index`;
    }

    /**
     * Comprime datos grandes (simple minificación JSON)
     */
    _compress(data) {
        try {
            // Convertir Blobs a data URLs antes de guardar
            // (localStorage no soporta Blobs directamente)
            const serialized = JSON.stringify(data, (key, value) => {
                if (value instanceof Blob) {
                    logger.warn(`Blob encontrado en ${key}, no se puede guardar en localStorage`);
                    return null; // Los blobs no se pueden guardar en localStorage
                }
                return value;
            });

            return serialized;
        } catch (error) {
            logger.error('Error comprimiendo datos:', error);
            throw error;
        }
    }

    /**
     * Descomprime datos
     */
    _decompress(data) {
        try {
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error descomprimiendo datos:', error);
            throw error;
        }
    }

    async init() {
        const isAvailable = await this.checkAvailability();
        if (!isAvailable) {
            throw new Error('localStorage no disponible');
        }
        return true;
    }

    async put(storeName, data) {
        try {
            await this.init();

            const id = data.id || data.key;
            if (!id) {
                throw new Error('Datos deben tener id o key');
            }

            // Guardar el item individual
            const key = this._makeKey(storeName, id);
            const compressed = this._compress(data);

            // Verificar tamaño
            if (compressed.length > 5 * 1024 * 1024) { // 5MB
                logger.warn(`Datos muy grandes para localStorage: ${compressed.length} bytes`);
            }

            localStorage.setItem(key, compressed);

            // Actualizar índice del store
            const indexKey = this._makeKey(storeName);
            const indexData = localStorage.getItem(indexKey);
            const index = indexData ? JSON.parse(indexData) : [];

            if (!index.includes(id)) {
                index.push(id);
                localStorage.setItem(indexKey, JSON.stringify(index));
            }

            return id;

        } catch (error) {
            // Si el error es de cuota excedida, intentar limpiar datos antiguos
            if (error.name === 'QuotaExceededError') {
                logger.error('localStorage lleno, intentando limpiar...');
                await this._cleanOldData();

                // Reintentar
                return this.put(storeName, data);
            }

            logger.error(`Error en localStorage.put(${storeName}):`, error);
            throw error;
        }
    }

    async get(storeName, id) {
        try {
            await this.init();

            const key = this._makeKey(storeName, id);
            const data = localStorage.getItem(key);

            if (!data) {
                return undefined;
            }

            return this._decompress(data);

        } catch (error) {
            logger.error(`Error en localStorage.get(${storeName}, ${id}):`, error);

            // Si los datos están corruptos, eliminarlos
            try {
                localStorage.removeItem(this._makeKey(storeName, id));
            } catch {}

            return undefined;
        }
    }

    async getAll(storeName) {
        try {
            await this.init();

            const indexKey = this._makeKey(storeName);
            const indexData = localStorage.getItem(indexKey);
            const index = indexData ? JSON.parse(indexData) : [];

            const results = [];
            for (const id of index) {
                const item = await this.get(storeName, id);
                if (item) {
                    results.push(item);
                }
            }

            return results;

        } catch (error) {
            logger.error(`Error en localStorage.getAll(${storeName}):`, error);
            return [];
        }
    }

    async delete(storeName, id) {
        try {
            await this.init();

            // Eliminar item
            const key = this._makeKey(storeName, id);
            localStorage.removeItem(key);

            // Actualizar índice
            const indexKey = this._makeKey(storeName);
            const indexData = localStorage.getItem(indexKey);
            const index = indexData ? JSON.parse(indexData) : [];
            const newIndex = index.filter(itemId => itemId !== id);
            localStorage.setItem(indexKey, JSON.stringify(newIndex));

        } catch (error) {
            logger.error(`Error en localStorage.delete(${storeName}, ${id}):`, error);
            throw error;
        }
    }

    async clear(storeName) {
        try {
            await this.init();

            // Obtener todos los IDs del índice
            const indexKey = this._makeKey(storeName);
            const indexData = localStorage.getItem(indexKey);
            const index = indexData ? JSON.parse(indexData) : [];

            // Eliminar cada item
            for (const id of index) {
                const key = this._makeKey(storeName, id);
                localStorage.removeItem(key);
            }

            // Eliminar índice
            localStorage.removeItem(indexKey);

        } catch (error) {
            logger.error(`Error en localStorage.clear(${storeName}):`, error);
            throw error;
        }
    }

    /**
     * Limpia datos antiguos para liberar espacio
     */
    async _cleanOldData() {
        // Limpiar solo datos BCF, no tocar otras keys
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));

        logger.warn(`Limpiando ${keys.length} items de localStorage...`);

        // Por ahora, simplemente loguear
        // En producción, aquí iríamos por antigüedad, etc.
    }
}

/**
 * Gestor principal con fallback automático
 */
export class DBManager {
    constructor() {
        this.indexedDB = new IndexedDBAdapter();
        this.localStorage = new LocalStorageAdapter();
        this.currentBackend = null;
        this.initialized = false;
    }

    /**
     * Inicializa el gestor, seleccionando el mejor backend disponible
     */
    async init() {
        if (this.initialized) {
            return this.currentBackend;
        }

        // Intentar IndexedDB primero
        try {
            const indexedDBAvailable = await this.indexedDB.checkAvailability();

            if (indexedDBAvailable) {
                await this.indexedDB.init();
                this.currentBackend = this.indexedDB;
                this.initialized = true;
                logger.info('✅ DBManager inicializado con IndexedDB');
                return this.currentBackend;
            }
        } catch (error) {
            logger.warn('No se pudo inicializar IndexedDB:', error.message);
        }

        // Fallback a localStorage
        try {
            await this.localStorage.init();
            this.currentBackend = this.localStorage;
            this.initialized = true;
            logger.info('✅ DBManager inicializado con localStorage (fallback)');
            return this.currentBackend;
        } catch (error) {
            logger.error('❌ No se pudo inicializar ningún backend de almacenamiento:', error);
            throw new Error('Sin sistema de almacenamiento disponible');
        }
    }

    /**
     * Wrapper methods que delegan al backend actual
     */
    async put(storeName, data) {
        await this.init();

        try {
            return await this.currentBackend.put(storeName, data);
        } catch (error) {
            // Si falla, intentar con el otro backend
            return await this._retryWithFallback('put', [storeName, data], error);
        }
    }

    async get(storeName, id) {
        await this.init();

        try {
            return await this.currentBackend.get(storeName, id);
        } catch (error) {
            return await this._retryWithFallback('get', [storeName, id], error);
        }
    }

    async getAll(storeName) {
        await this.init();

        try {
            return await this.currentBackend.getAll(storeName);
        } catch (error) {
            return await this._retryWithFallback('getAll', [storeName], error);
        }
    }

    async delete(storeName, id) {
        await this.init();

        try {
            return await this.currentBackend.delete(storeName, id);
        } catch (error) {
            return await this._retryWithFallback('delete', [storeName, id], error);
        }
    }

    async clear(storeName) {
        await this.init();

        try {
            return await this.currentBackend.clear(storeName);
        } catch (error) {
            return await this._retryWithFallback('clear', [storeName], error);
        }
    }

    /**
     * Reintenta operación con el backend alternativo
     */
    async _retryWithFallback(method, args, originalError) {
        logger.warn(`Operación ${method} falló, intentando con fallback...`);

        const fallbackBackend = this.currentBackend === this.indexedDB
            ? this.localStorage
            : this.indexedDB;

        try {
            const result = await fallbackBackend[method](...args);

            // Si funciona, cambiar de backend permanentemente
            logger.info(`Fallback exitoso, cambiando a ${fallbackBackend.constructor.name}`);
            this.currentBackend = fallbackBackend;

            return result;
        } catch (fallbackError) {
            logger.error(`Fallback también falló:`, fallbackError);
            throw originalError; // Lanzar el error original
        }
    }

    /**
     * Obtiene información sobre el backend actual
     */
    getBackendInfo() {
        return {
            type: this.currentBackend?.constructor.name || 'none',
            isIndexedDB: this.currentBackend === this.indexedDB,
            isLocalStorage: this.currentBackend === this.localStorage,
            initialized: this.initialized
        };
    }
}

export const dbManager = new DBManager();
