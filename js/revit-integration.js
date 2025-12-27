/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REVIT-INTEGRATION.JS - Módulo de integración con Revit API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Versión: 3.1.0
 * Última actualización: 2024-12-22
 * 
 * Este módulo maneja la comunicación bidireccional con Revit a través del
 * bridge MCP (Model Communication Protocol). Permite sincronizar incidencias
 * BCF con elementos de Revit en tiempo real.
 * 
 * CARACTERÍSTICAS:
 * - Sincronización automática con Revit
 * - Creación de incidencias desde selección en Revit
 * - Resaltado de elementos en Revit desde BCF Viewer
 * - Actualización de parámetros de elementos
 * - Estado de conexión en tiempo real
 */

import { CONFIG, logger, validators } from './config.js';
import { AppState } from './state.js';
import { notify } from './ui-utils.js';

/**
 * Cliente de integración con Revit
 */
export class RevitIntegration {
    constructor() {
        this.isConnected = false;
        this.bridgeUrl = CONFIG.REVIT_INTEGRATION?.BRIDGE_URL || 'http://localhost:8080';
        this.autoSync = CONFIG.REVIT_INTEGRATION?.AUTO_SYNC || false;
        this.syncInterval = null;
        this.connectionCheckInterval = null;
        this.lastSyncTime = null;
        
        // Listeners para eventos
        this.listeners = {
            connected: [],
            disconnected: [],
            selectionChanged: [],
            modelUpdated: []
        };
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * CONEXIÓN Y ESTADO
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Inicializa la conexión con Revit
     */
    async init() {
        if (!CONFIG.REVIT_INTEGRATION?.ENABLED) {
            logger.info('Integración con Revit deshabilitada en config');
            return false;
        }
        
        logger.info('🔗 Inicializando integración con Revit...');
        
        try {
            const connected = await this.checkConnection();
            
            if (connected) {
                this.isConnected = true;
                this.emit('connected');
                notify('Conectado con Revit', 'success');
                
                // Iniciar auto-sync si está habilitado
                if (this.autoSync) {
                    this.startAutoSync();
                }
                
                // Monitorear conexión
                this.startConnectionMonitoring();
                
                logger.info('✅ Integración con Revit iniciada correctamente');
                return true;
            } else {
                logger.warning('No se pudo conectar con Revit');
                notify('Revit no disponible. Modo offline.', 'warning');
                return false;
            }
        } catch (error) {
            logger.error('Error al inicializar integración con Revit:', error);
            return false;
        }
    }
    
    /**
     * Verifica si hay conexión con Revit
     */
    async checkConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.REVIT_INTEGRATION?.BRIDGE_TIMEOUT || 5000);
            
            const response = await fetch(`${this.bridgeUrl}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            logger.debug('Revit no disponible:', error.message);
            return false;
        }
    }
    
    /**
     * Monitorea el estado de la conexión
     */
    startConnectionMonitoring() {
        this.connectionCheckInterval = setInterval(async () => {
            const connected = await this.checkConnection();
            
            if (connected && !this.isConnected) {
                // Reconectado
                this.isConnected = true;
                this.emit('connected');
                notify('Reconectado con Revit', 'success');
                logger.info('Reconexión con Revit establecida');
            } else if (!connected && this.isConnected) {
                // Desconectado
                this.isConnected = false;
                this.emit('disconnected');
                notify('Conexión con Revit perdida', 'warning');
                logger.warning('Conexión con Revit perdida');
            }
        }, 10000); // Cada 10 segundos
    }
    
    /**
     * Detiene el monitoreo de conexión
     */
    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * COMANDOS A REVIT
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Ejecuta un comando en Revit
     */
    async executeCommand(command, params = {}) {
        if (!this.isConnected) {
            throw new Error('No hay conexión con Revit');
        }
        
        logger.debug(`Ejecutando comando en Revit: ${command}`, params);
        
        try {
            const response = await fetch(`${this.bridgeUrl}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command, params })
            });
            
            if (!response.ok) {
                throw new Error(`Error en comando Revit: ${response.statusText}`);
            }
            
            const result = await response.json();
            logger.debug(`Resultado comando ${command}:`, result);
            
            return result;
        } catch (error) {
            logger.error(`Error ejecutando comando ${command}:`, error);
            throw error;
        }
    }
    
    /**
     * Obtiene información del modelo actual de Revit
     */
    async getModelInfo() {
        return await this.executeCommand('get_model_info');
    }
    
    /**
     * Obtiene los elementos seleccionados en Revit
     */
    async getSelection() {
        return await this.executeCommand('get_selection');
    }
    
    /**
     * Resalta elementos en Revit por sus IDs
     */
    async highlightElements(elementIds) {
        if (!Array.isArray(elementIds) || elementIds.length === 0) {
            logger.warning('highlightElements: array de IDs vacío o inválido');
            return;
        }
        
        return await this.executeCommand('highlight_elements', { element_ids: elementIds });
    }
    
    /**
     * Actualiza parámetros de elementos en Revit
     */
    async updateElementParameters(elementId, parameters) {
        return await this.executeCommand('update_parameters', {
            element_id: elementId,
            parameters: parameters
        });
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * SINCRONIZACIÓN BCF ↔ REVIT
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Crea una incidencia BCF desde la selección actual en Revit
     */
    async createIssueFromSelection() {
        try {
            notify('Capturando selección de Revit...', 'info');
            
            // Obtener selección
            const selection = await this.getSelection();
            
            if (!selection || !selection.elements || selection.elements.length === 0) {
                notify('No hay elementos seleccionados en Revit', 'warning');
                return null;
            }
            
            // Obtener info del modelo
            const modelInfo = await this.getModelInfo();
            
            // Crear issue básico
            const issue = {
                guid: crypto.randomUUID(),
                title: `Incidencia desde Revit - ${new Date().toLocaleString()}`,
                description: `Elementos: ${selection.elements.map(e => e.id).join(', ')}`,
                topicStatus: 'Open',
                priority: 'Medium',
                topicType: 'Issue',
                author: modelInfo.user || 'Usuario Revit',
                creationDate: new Date().toISOString(),
                modifiedDate: new Date().toISOString(),
                
                // Información de Revit
                revitInfo: {
                    projectName: modelInfo.project_name,
                    elementIds: selection.elements.map(e => e.id),
                    elements: selection.elements,
                    viewName: selection.view_name
                },
                
                // Componentes relacionados
                relatedTopics: [],
                comments: [],
                viewpoints: [],
                labels: ['Revit']
            };
            
            logger.info('Issue creado desde Revit:', issue);
            notify('Incidencia creada desde Revit', 'success');
            
            return issue;
        } catch (error) {
            logger.error('Error creando issue desde Revit:', error);
            notify('Error al crear incidencia desde Revit', 'error');
            throw error;
        }
    }
    
    /**
     * Sincroniza una incidencia con Revit (resalta elementos)
     */
    async syncIssueToRevit(issue) {
        if (!issue.revitInfo || !issue.revitInfo.elementIds) {
            logger.warning('Issue no tiene información de Revit');
            return;
        }
        
        try {
            await this.highlightElements(issue.revitInfo.elementIds);
            notify(`Elementos resaltados en Revit`, 'success');
        } catch (error) {
            logger.error('Error sincronizando issue a Revit:', error);
            notify('Error al resaltar elementos en Revit', 'error');
        }
    }
    
    /**
     * Inicia sincronización automática
     */
    startAutoSync() {
        if (this.syncInterval) {
            return; // Ya está iniciado
        }
        
        const interval = CONFIG.REVIT_INTEGRATION?.SYNC_INTERVAL || 60000;
        
        this.syncInterval = setInterval(async () => {
            if (this.isConnected) {
                await this.performSync();
            }
        }, interval);
        
        logger.info(`Auto-sincronización con Revit iniciada (cada ${interval/1000}s)`);
    }
    
    /**
     * Detiene sincronización automática
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            logger.info('Auto-sincronización con Revit detenida');
        }
    }
    
    /**
     * Realiza una sincronización
     */
    async performSync() {
        try {
            logger.debug('Ejecutando sincronización con Revit...');
            
            const modelInfo = await this.getModelInfo();
            
            // Aquí puedes implementar lógica de sincronización específica
            // Por ejemplo: detectar cambios en el modelo, actualizar issues, etc.
            
            this.lastSyncTime = new Date();
            this.emit('modelUpdated', modelInfo);
            
            logger.debug('Sincronización completada');
        } catch (error) {
            logger.error('Error en sincronización:', error);
        }
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * SISTEMA DE EVENTOS
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Registra un listener para un evento
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    /**
     * Remueve un listener
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Emite un evento
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    logger.error(`Error en listener de evento ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * CLEANUP
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Limpia recursos y detiene timers
     */
    dispose() {
        this.stopAutoSync();
        this.stopConnectionMonitoring();
        this.listeners = {
            connected: [],
            disconnected: [],
            selectionChanged: [],
            modelUpdated: []
        };
        
        logger.info('Integración con Revit finalizada');
    }
}

/**
 * Instancia singleton
 */
export const revitIntegration = new RevitIntegration();

/**
 * Helper para inicializar en main.js
 */
export async function initRevitIntegration() {
    if (CONFIG.REVIT_INTEGRATION?.ENABLED) {
        return await revitIntegration.init();
    }
    return false;
}
