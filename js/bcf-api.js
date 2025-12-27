/**
 * BCF API CLIENT - Soporte para BCF 3.0 (OpenCDE API)
 */

import { withErrorHandling } from './ui-utils.js';

export class BCFApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Accept': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            throw new Error(`BCF API Error: ${response.status} ${response.statusText}`);
        }

        if (response.status === 204) return null;
        return await response.json();
    }

    /**
     * Obtiene las versiones soportadas de la API
     */
    async getVersions() {
        // Intentar obtener versiones de la API (endpoint común)
        try {
            return await this.fetch('/versions');
        } catch (e) {
            // Si falla, intentar validar con projects (endpoint seguro en BCF 3.0)
            await this.getProjects();
            return { versions: ['3.0'] };
        }
    }

    /**
     * Obtiene la lista de proyectos desde el servidor BCF
     */
    getProjects = withErrorHandling(async () => {
        return await this.fetch('/bcf/3.0/projects');
    }, 'Error al obtener proyectos del servidor');

    /**
     * Obtiene las incidencias (topics) de un proyecto
     */
    getTopics = withErrorHandling(async (projectId) => {
        return await this.fetch(`/bcf/3.0/projects/${projectId}/topics`);
    }, 'Error al obtener incidencias del servidor');

    /**
     * Obtiene el detalle de una incidencia
     */
    getTopic = withErrorHandling(async (projectId, topicGuid) => {
        return await this.fetch(`/bcf/3.0/projects/${projectId}/topics/${topicGuid}`);
    }, 'Error al obtener detalle de la incidencia');

    /**
     * Obtiene los comentarios de una incidencia
     */
    getComments = withErrorHandling(async (projectId, topicGuid) => {
        return await this.fetch(`/bcf/3.0/projects/${projectId}/topics/${topicGuid}/comments`);
    }, 'Error al obtener comentarios');

    /**
     * Obtiene los viewpoints de una incidencia
     */
    getViewpoints = withErrorHandling(async (projectId, topicGuid) => {
        return await this.fetch(`/bcf/3.0/projects/${projectId}/topics/${topicGuid}/viewpoints`);
    }, 'Error al obtener vistas (viewpoints)');
}
