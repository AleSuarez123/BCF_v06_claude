/**
 * BLOB URL MANAGER - Gestión centralizada de URLs de Blob
 * ========================================================
 *
 * Previene memory leaks al mantener un registro de todas las URLs de blob
 * creadas y permite revocarlas de manera controlada.
 *
 * Uso:
 * ```javascript
 * import { blobManager } from './blob-url-manager.js';
 *
 * // Crear URL
 * const url = blobManager.create(blob, 'unique-id');
 *
 * // Revocar URL específica
 * blobManager.revoke('unique-id');
 *
 * // Revocar todas las URLs de un contexto
 * blobManager.revokeContext('project-123');
 *
 * // Limpiar todo
 * blobManager.revokeAll();
 * ```
 */

import { logger } from './config.js';

class BlobURLManager {
    constructor() {
        // Map: id → { url, blob, context, createdAt }
        this.urls = new Map();

        // Map: context → Set<id>
        this.contexts = new Map();

        // Estadísticas
        this.stats = {
            created: 0,
            revoked: 0,
            active: 0
        };
    }

    /**
     * Crea una URL de blob y la registra
     * @param {Blob} blob - El blob a convertir en URL
     * @param {string} id - Identificador único (ej: GUID de incidencia)
     * @param {string} context - Contexto opcional (ej: 'project-123')
     * @returns {string} La URL creada
     */
    create(blob, id, context = 'default') {
        if (!blob || !(blob instanceof Blob)) {
            logger.warn('BlobURLManager: Intento de crear URL con blob inválido', { id, context });
            return null;
        }

        // Si ya existe una URL para este ID, revocarla primero
        if (this.urls.has(id)) {
            logger.debug(`BlobURLManager: Revocando URL existente para ID: ${id}`);
            this.revoke(id);
        }

        // Crear nueva URL
        const url = URL.createObjectURL(blob);

        // Registrar
        this.urls.set(id, {
            url,
            blob,
            context,
            createdAt: Date.now()
        });

        // Registrar en contexto
        if (!this.contexts.has(context)) {
            this.contexts.set(context, new Set());
        }
        this.contexts.get(context).add(id);

        // Actualizar stats
        this.stats.created++;
        this.stats.active++;

        logger.debug(`BlobURLManager: URL creada para ${id} (contexto: ${context})`);

        return url;
    }

    /**
     * Revoca una URL específica
     * @param {string} id - El ID de la URL a revocar
     * @returns {boolean} True si se revocó exitosamente
     */
    revoke(id) {
        const entry = this.urls.get(id);

        if (!entry) {
            logger.debug(`BlobURLManager: ID ${id} no encontrado`);
            return false;
        }

        // Revocar URL
        URL.revokeObjectURL(entry.url);

        // Remover del contexto
        const contextSet = this.contexts.get(entry.context);
        if (contextSet) {
            contextSet.delete(id);

            // Si el contexto está vacío, eliminarlo
            if (contextSet.size === 0) {
                this.contexts.delete(entry.context);
            }
        }

        // Remover de urls
        this.urls.delete(id);

        // Actualizar stats
        this.stats.revoked++;
        this.stats.active--;

        logger.debug(`BlobURLManager: URL revocada para ${id}`);

        return true;
    }

    /**
     * Revoca todas las URLs de un contexto
     * @param {string} context - El contexto a limpiar
     * @returns {number} Cantidad de URLs revocadas
     */
    revokeContext(context) {
        const contextSet = this.contexts.get(context);

        if (!contextSet || contextSet.size === 0) {
            logger.debug(`BlobURLManager: Contexto ${context} vacío o no existe`);
            return 0;
        }

        let count = 0;

        // Copiar el Set para evitar modificaciones durante iteración
        const idsToRevoke = Array.from(contextSet);

        idsToRevoke.forEach(id => {
            if (this.revoke(id)) {
                count++;
            }
        });

        logger.info(`BlobURLManager: ${count} URLs revocadas del contexto ${context}`);

        return count;
    }

    /**
     * Revoca todas las URLs registradas
     * @returns {number} Cantidad de URLs revocadas
     */
    revokeAll() {
        const count = this.urls.size;

        // Revocar todas las URLs
        this.urls.forEach((entry, id) => {
            URL.revokeObjectURL(entry.url);
        });

        // Limpiar todo
        this.urls.clear();
        this.contexts.clear();

        // Actualizar stats
        this.stats.revoked += count;
        this.stats.active = 0;

        logger.info(`BlobURLManager: ${count} URLs revocadas (limpiar todo)`);

        return count;
    }

    /**
     * Obtiene la URL para un ID si existe
     * @param {string} id - El ID de la URL
     * @returns {string|null} La URL o null si no existe
     */
    get(id) {
        const entry = this.urls.get(id);
        return entry ? entry.url : null;
    }

    /**
     * Verifica si existe una URL para un ID
     * @param {string} id - El ID a verificar
     * @returns {boolean}
     */
    has(id) {
        return this.urls.has(id);
    }

    /**
     * Obtiene estadísticas del gestor
     * @returns {Object} Estadísticas de uso
     */
    getStats() {
        return {
            ...this.stats,
            contexts: this.contexts.size,
            oldestUrl: this._getOldestUrl()
        };
    }

    /**
     * Limpia URLs antiguas (más de X tiempo)
     * @param {number} maxAge - Edad máxima en milisegundos (default: 1 hora)
     * @returns {number} Cantidad de URLs limpiadas
     */
    cleanOldUrls(maxAge = 60 * 60 * 1000) { // 1 hora por defecto
        const now = Date.now();
        const idsToRevoke = [];

        this.urls.forEach((entry, id) => {
            const age = now - entry.createdAt;
            if (age > maxAge) {
                idsToRevoke.push(id);
            }
        });

        let count = 0;
        idsToRevoke.forEach(id => {
            if (this.revoke(id)) {
                count++;
            }
        });

        if (count > 0) {
            logger.info(`BlobURLManager: ${count} URLs antiguas limpiadas`);
        }

        return count;
    }

    /**
     * Obtiene información de la URL más antigua
     * @private
     */
    _getOldestUrl() {
        if (this.urls.size === 0) return null;

        let oldest = null;
        let oldestTime = Infinity;

        this.urls.forEach((entry) => {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldest = entry;
            }
        });

        return oldest ? {
            age: Date.now() - oldestTime,
            context: oldest.context
        } : null;
    }

    /**
     * Registra información de debug
     */
    debug() {
        logger.info('BlobURLManager Status:', {
            stats: this.getStats(),
            urls: Array.from(this.urls.keys()),
            contexts: Array.from(this.contexts.keys())
        });
    }
}

// Instancia singleton
export const blobManager = new BlobURLManager();

// Limpiar URLs antiguas cada 10 minutos
if (typeof window !== 'undefined') {
    setInterval(() => {
        const cleaned = blobManager.cleanOldUrls();
        if (cleaned > 0) {
            logger.info(`Auto-limpieza: ${cleaned} URLs antiguas removidas`);
        }
    }, 10 * 60 * 1000); // 10 minutos

    // Limpiar todo al cerrar/recargar página
    window.addEventListener('beforeunload', () => {
        blobManager.revokeAll();
    });
}
