/**
 * STORAGE - Capa de persistencia avanzada
 */

import { dbManager } from './db-manager.js';
import { AppState, STORAGE_KEY } from './state.js';
import { withErrorHandling, notify } from './ui-utils.js';

export const Storage = {
    /**
     * Guarda el estado actual en IndexedDB
     */
    saveAll: withErrorHandling(async () => {
        // Guardar proyectos uno a uno para eficiencia
        for (const project of AppState.projects) {
            await dbManager.put('projects', project);
        }

        // Guardar configuración general
        const settings = {
            key: 'app_settings',
            theme: AppState.theme,
            favorites: Array.from(AppState.favorites),
            bcfServer: AppState.bcfServer,
            lastUpdate: new Date().toISOString()
        };
        await dbManager.put('settings', settings);

        // Backup en localStorage para compatibilidad (opcional y limitado)
        try {
            const lightData = {
                theme: AppState.theme,
                projectIds: AppState.projects.map(p => p.id)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(lightData));
        } catch (e) {
            console.warn('LocalStorage backup failed (likely full)');
        }
    }, 'Error al guardar datos en la base de datos local'),

    /**
     * Carga los datos desde IndexedDB al iniciar
     */
    loadAll: withErrorHandling(async () => {
        // Cargar proyectos
        const projects = await dbManager.getAll('projects');
        AppState.projects = projects || [];

        // Cargar configuración
        const settings = await dbManager.get('settings', 'app_settings');
        if (settings) {
            AppState.theme = settings.theme || 'dark';
            AppState.favorites = new Set(settings.favorites || []);
            AppState.bcfServer = settings.bcfServer || { url: '', token: '' };
        }

        return AppState;
    }, 'Error al cargar datos desde la base de datos local'),

    /**
     * Guarda la configuración de la aplicación
     */
    saveSettings: withErrorHandling(async () => {
        const settings = {
            key: 'app_settings',
            theme: AppState.theme,
            favorites: Array.from(AppState.favorites),
            bcfServer: AppState.bcfServer,
            lastUpdate: new Date().toISOString()
        };
        await dbManager.put('settings', settings);
        
        // Backup en localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                theme: AppState.theme,
                projectIds: AppState.projects.map(p => p.id)
            }));
        } catch (e) {
            console.warn('LocalStorage settings backup failed');
        }
    }, 'Error al guardar configuración'),

    /**
     * Guarda un archivo binario (ej. Imagenes, Documentos)
     */
    saveFile: withErrorHandling(async (id, fileData, metadata = {}) => {
        const fileRecord = {
            id: id,
            data: fileData,
            name: metadata.name,
            type: metadata.type,
            size: metadata.size,
            lastModified: metadata.lastModified || Date.now()
        };
        await dbManager.put('files', fileRecord);
        notify(`Archivo ${metadata.name || id} guardado localmente`, 'success');
    }, 'Error al guardar archivo pesado'),

    /**
     * Recupera un archivo binario
     */
    getFile: withErrorHandling(async (id) => {
        return await dbManager.get('files', id);
    }, 'Error al recuperar archivo')
};
