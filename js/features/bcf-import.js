/**
 * BCF IMPORT - Sistema avanzado de importación con validación y detección de duplicados
 * =====================================================================================
 *
 * Mejoras implementadas en FASE 4 - UX/UI Improvements:
 * - Pre-validación de archivos BCF antes de importar
 * - Detección automática de duplicados
 * - Modal interactivo con resumen detallado
 * - Opciones para manejar duplicados (omitir/actualizar/crear)
 * - Barra de progreso granular durante importación
 *
 * @module features/bcf-import
 */

import { BCFParser } from '../bcf-parser.js';
import { AppState } from '../state.js';
import { logger } from '../config.js';
import { notify } from '../ui-utils.js';
import { escapeHtml } from '../ui-utils.js';
import { CSS_CLASSES } from '../utils/constants.js';

/**
 * Pre-valida archivos BCF sin importarlos
 *
 * @param {File[]} files - Archivos a pre-validar
 * @returns {Promise<Array>} Array de objetos con datos validados y estadísticas
 *
 * @example
 * const validated = await preValidateBCFFiles([file1, file2]);
 * validated.forEach(v => {
 *   console.log(`${v.file.name}: ${v.stats.topics} incidencias`);
 * });
 */
export async function preValidateBCFFiles(files) {
    const results = [];

    for (const file of files) {
        try {
            logger.debug(`Pre-validando: ${file.name}`);

            // Parsear el archivo
            const bcfData = await BCFParser.loadBCF(file);

            // Calcular estadísticas
            const stats = calculateBCFStats(bcfData);

            // Detectar duplicados si hay proyecto actual
            let duplicates = [];
            if (AppState.currentProject && AppState.currentProject.bcfFiles) {
                duplicates = detectDuplicateTopics(bcfData, AppState.currentProject.bcfFiles);
            }

            results.push({
                file,
                fileName: file.name,
                fileSize: file.size,
                data: bcfData,
                stats,
                duplicates,
                warnings: [],
                valid: true
            });

        } catch (error) {
            logger.error(`Error validando ${file.name}:`, error);
            results.push({
                file,
                fileName: file.name,
                fileSize: file.size,
                data: null,
                stats: null,
                duplicates: [],
                warnings: [],
                valid: false,
                error: error.message
            });
        }
    }

    return results;
}

/**
 * Calcula estadísticas de un archivo BCF
 *
 * @param {Object} bcfData - Datos parseados del BCF
 * @returns {Object} Estadísticas del archivo
 *
 * @private
 */
function calculateBCFStats(bcfData) {
    const topics = bcfData.topics || [];

    const stats = {
        total: topics.length,
        byStatus: {},
        byPriority: {},
        withSnapshots: 0,
        withComments: 0,
        withViewpoints: 0
    };

    topics.forEach(topic => {
        // Contar por estado
        const status = topic.topicStatus || 'Unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Contar por prioridad
        const priority = topic.priority || 'None';
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // Contar features
        if (topic.snapshot) stats.withSnapshots++;
        if (topic.comment && topic.comment.length > 0) stats.withComments++;
        if (topic.viewpoints && topic.viewpoints.length > 0) stats.withViewpoints++;
    });

    return stats;
}

/**
 * Detecta topics duplicados comparando GUIDs
 *
 * @param {Object} newBCF - Nuevo archivo BCF a importar
 * @param {Array} existingBCFFiles - Archivos BCF ya existentes en el proyecto
 * @returns {Array} Array de objetos con información de duplicados
 *
 * @example
 * const duplicates = detectDuplicateTopics(newBCF, project.bcfFiles);
 * console.log(`${duplicates.length} duplicados encontrados`);
 */
export function detectDuplicateTopics(newBCF, existingBCFFiles) {
    const duplicates = [];
    const newTopics = newBCF.topics || [];

    // Crear mapa de GUIDs existentes para búsqueda rápida
    const existingGUIDs = new Map();

    existingBCFFiles.forEach((bcfFile, fileIndex) => {
        (bcfFile.topics || []).forEach(topic => {
            existingGUIDs.set(topic.guid, {
                topic,
                fileIndex,
                fileName: bcfFile.fileName || `Archivo ${fileIndex + 1}`
            });
        });
    });

    // Buscar duplicados
    newTopics.forEach((newTopic, index) => {
        if (existingGUIDs.has(newTopic.guid)) {
            const existing = existingGUIDs.get(newTopic.guid);
            duplicates.push({
                index,
                guid: newTopic.guid,
                newTopic,
                existingTopic: existing.topic,
                existingFile: existing.fileName,
                title: newTopic.title || 'Sin título',
                isDifferent: hasSignificantChanges(newTopic, existing.topic)
            });
        }
    });

    return duplicates;
}

/**
 * Compara dos topics para detectar cambios significativos
 *
 * @param {Object} topic1 - Primer topic
 * @param {Object} topic2 - Segundo topic
 * @returns {boolean} true si hay cambios significativos
 *
 * @private
 */
function hasSignificantChanges(topic1, topic2) {
    // Comparar campos importantes
    const fields = [
        'topicStatus',
        'topicType',
        'priority',
        'assignedTo',
        'description'
    ];

    return fields.some(field => topic1[field] !== topic2[field]);
}

/**
 * Muestra modal interactivo con resumen de importación
 *
 * @param {Array} validatedFiles - Archivos pre-validados
 * @returns {Promise<Object|null>} Configuración de importación o null si canceló
 *
 * @example
 * const config = await showImportSummaryModal(validated);
 * if (config) {
 *   await importWithConfig(config);
 * }
 */
export function showImportSummaryModal(validatedFiles) {
    return new Promise((resolve) => {
        const totalTopics = validatedFiles.reduce((sum, v) => sum + (v.stats?.total || 0), 0);
        const totalDuplicates = validatedFiles.reduce((sum, v) => sum + v.duplicates.length, 0);
        const hasErrors = validatedFiles.some(v => !v.valid);

        const modal = document.createElement('div');
        modal.className = 'modal bcf-import-summary-modal active';
        modal.style.zIndex = '4000';

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content" style="max-width: 750px; max-height: 85vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Resumen de Importación BCF
                    </h3>
                    <button class="modal-close" aria-label="Cerrar">×</button>
                </div>

                <div class="modal-body">
                    <!-- Estadísticas generales MEJORADAS -->
                    <div class="import-summary-stats">
                        <div class="stat-card">
                            <div class="stat-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                    <polyline points="13 2 13 9 20 9"/>
                                </svg>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${validatedFiles.length}</div>
                                <div class="stat-label">Archivo${validatedFiles.length !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon-wrapper stat-icon-primary">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="8" y1="6" x2="21" y2="6"/>
                                    <line x1="8" y1="12" x2="21" y2="12"/>
                                    <line x1="8" y1="18" x2="21" y2="18"/>
                                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                                </svg>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${totalTopics}</div>
                                <div class="stat-label">Incidencias totales</div>
                            </div>
                        </div>
                        ${totalDuplicates > 0 ? `
                            <div class="stat-card stat-warning">
                                <div class="stat-icon-wrapper stat-icon-warning">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                        <line x1="12" y1="9" x2="12" y2="13"/>
                                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${totalDuplicates}</div>
                                    <div class="stat-label">Duplicados detectados</div>
                                </div>
                            </div>
                        ` : ''}
                        ${hasErrors ? `
                            <div class="stat-card stat-error">
                                <div class="stat-icon-wrapper stat-icon-error">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="15" y1="9" x2="9" y2="15"/>
                                        <line x1="9" y1="9" x2="15" y2="15"/>
                                    </svg>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-value">${validatedFiles.filter(v => !v.valid).length}</div>
                                    <div class="stat-label">Archivos con errores</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Lista de archivos -->
                    <div class="import-files-list">
                        <h4 class="section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                            Archivos a importar
                        </h4>
                        ${validatedFiles.map((v, index) => renderFileItem(v, index)).join('')}
                    </div>

                    ${totalDuplicates > 0 ? `
                        <div class="import-duplicate-config">
                            <h4>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                                </svg>
                                Configuración de Duplicados
                            </h4>
                            <p class="text-muted">¿Qué hacer con las ${totalDuplicates} incidencias que ya existen en el proyecto?</p>
                            <div class="duplicate-options">
                                <label class="radio-option">
                                    <input type="radio" name="duplicate-action" value="skip" checked>
                                    <div class="option-content">
                                        <strong>Omitir duplicados</strong>
                                        <p>No importar incidencias que ya existen (recomendado)</p>
                                    </div>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="duplicate-action" value="update">
                                    <div class="option-content">
                                        <strong>Actualizar existentes</strong>
                                        <p>Sobrescribir incidencias existentes con los datos nuevos</p>
                                    </div>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="duplicate-action" value="create">
                                    <div class="option-content">
                                        <strong>Crear duplicados</strong>
                                        <p>Importar como incidencias nuevas (se generarán GUIDs únicos)</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-ghost btn-cancel">Cancelar</button>
                    <button class="btn btn-primary btn-import" ${hasErrors ? 'disabled' : ''}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        ${hasErrors ? 'Hay errores que corregir' : `Importar ${totalTopics - (totalDuplicates || 0)} incidencias`}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event handlers
        const close = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
            resolve(null);
        };

        modal.querySelector('.modal-close').onclick = close;
        modal.querySelector('.btn-cancel').onclick = close;
        modal.querySelector('.modal-backdrop').onclick = close;

        const btnImport = modal.querySelector('.btn-import');
        if (!hasErrors) {
            btnImport.onclick = () => {
                // Obtener configuración de duplicados
                const duplicateAction = modal.querySelector('input[name="duplicate-action"]:checked')?.value || 'skip';

                modal.remove();
                resolve({
                    files: validatedFiles,
                    duplicateAction
                });
            };
        }

        // Toggle detalles de archivo
        modal.querySelectorAll('.file-item-header').forEach((header, index) => {
            header.onclick = () => {
                const details = modal.querySelectorAll('.file-item-details')[index];
                if (details) {
                    details.classList.toggle('expanded');
                    const icon = header.querySelector('.expand-icon');
                    if (icon) {
                        icon.textContent = details.classList.contains('expanded') ? '▼' : '▶';
                    }
                }
            };
        });
    });
}

/**
 * Renderiza un item de archivo en el modal de resumen
 *
 * @param {Object} validatedFile - Archivo validado
 * @param {number} index - Índice del archivo
 * @returns {string} HTML del item
 *
 * @private
 */
function renderFileItem(validatedFile, index) {
    const { fileName, fileSize, stats, duplicates, valid, error, data } = validatedFile;

    if (!valid) {
        return `
            <div class="file-item file-item-error">
                <div class="file-item-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="file-icon-error">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(fileName)}</div>
                        <div class="file-error">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            ${escapeHtml(error)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    const statusSummary = Object.entries(stats.byStatus)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([status, count]) => `${count} ${status}`)
        .join(' · ');

    return `
        <div class="file-item ${duplicates.length > 0 ? 'has-warning' : ''}">
            <div class="file-item-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="expand-icon">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="file-icon-bcf">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                </svg>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(fileName)}</div>
                    <div class="file-meta">
                        <span class="meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            ${stats.total} incidencias
                        </span>
                        <span class="meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            </svg>
                            ${(fileSize / 1024).toFixed(1)} KB
                        </span>
                        ${duplicates.length > 0 ? `
                            <span class="meta-item meta-warning">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                ${duplicates.length} duplicados
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="file-item-details">
                <!-- Resumen de estadísticas -->
                <div class="file-stats-grid">
                    <div class="stat-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <div>
                            <div class="stat-label">Estados:</div>
                            <div class="stat-value">${statusSummary}</div>
                        </div>
                    </div>
                    ${Object.keys(stats.byPriority).length > 0 ? `
                        <div class="stat-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            </svg>
                            <div>
                                <div class="stat-label">Alta prioridad:</div>
                                <div class="stat-value">${stats.byPriority.High || stats.byPriority.high || 0}</div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="stat-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <div>
                            <div class="stat-label">Con snapshots:</div>
                            <div class="stat-value">${stats.withSnapshots}</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <div>
                            <div class="stat-label">Con comentarios:</div>
                            <div class="stat-value">${stats.withComments}</div>
                        </div>
                    </div>
                </div>

                ${duplicates.length > 0 ? `
                    <div class="duplicates-list">
                        <h5>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            </svg>
                            Duplicados encontrados
                        </h5>
                        <ul>
                            ${duplicates.slice(0, 5).map(d => `
                                <li>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    ${escapeHtml(d.title)}
                                    ${d.isDifferent ? '<span class="badge badge-modified">Modificada</span>' : '<span class="badge badge-same">Sin cambios</span>'}
                                </li>
                            `).join('')}
                            ${duplicates.length > 5 ? `<li class="text-muted">... y ${duplicates.length - 5} más</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Importa archivos BCF con configuración y progreso granular
 *
 * @param {Object} config - Configuración de importación
 * @param {Function} onProgress - Callback de progreso (current, total, fileName)
 * @returns {Promise<Object>} Resultado de la importación
 *
 * @example
 * const result = await importBCFWithProgress(config, (current, total) => {
 *   console.log(`${current}/${total}`);
 * });
 */
export async function importBCFWithProgress(config, onProgress = null) {
    const { files, duplicateAction } = config;
    const validFiles = files.filter(f => f.valid);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalUpdated = 0;
    const errors = [];

    // Obtener el proyecto una vez al inicio
    const project = AppState.currentProject;

    for (let i = 0; i < validFiles.length; i++) {
        const validFile = validFiles[i];

        if (onProgress) {
            onProgress(i + 1, validFiles.length, validFile.fileName);
        }

        try {
            const result = await importSingleBCF(validFile, duplicateAction, project);
            totalImported += result.imported;
            totalSkipped += result.skipped;
            totalUpdated += result.updated;
        } catch (error) {
            logger.error(`Error importando ${validFile.fileName}:`, error);
            errors.push({
                fileName: validFile.fileName,
                error: error.message
            });
        }
    }

    // Reasignar el proyecto para activar el setter del Proxy
    AppState.currentProject = project;

    return {
        totalImported,
        totalSkipped,
        totalUpdated,
        errors
    };
}

/**
 * Importa un solo archivo BCF según la configuración de duplicados
 *
 * @param {Object} validFile - Archivo validado
 * @param {string} duplicateAction - 'skip', 'update' o 'create'
 * @param {Object} project - Proyecto al que importar (pasado por referencia)
 * @returns {Promise<Object>} Resultado de la importación
 *
 * @private
 */
async function importSingleBCF(validFile, duplicateAction, project) {
    const { data, duplicates, fileName } = validFile;
    const duplicateGUIDs = new Set(duplicates.map(d => d.guid));

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    // Crear copia del BCF para importar con metadatos necesarios
    const bcfToImport = {
        ...data,
        fileName: fileName || data.fileName || 'Archivo BCF',
        topics: []
    };

    // Si no hay topics, retornar sin importar
    if (!data.topics || data.topics.length === 0) {
        logger.warning(`Archivo ${fileName} no contiene topics`);
        return { imported: 0, skipped: 0, updated: 0 };
    }

    // Procesar cada topic según la configuración
    for (const topic of data.topics) {
        const isDuplicate = duplicateGUIDs.has(topic.guid);

        if (isDuplicate) {
            if (duplicateAction === 'skip') {
                skipped++;
                continue;
            } else if (duplicateAction === 'update') {
                // Actualizar topic existente
                updateExistingTopic(topic, project);
                updated++;
                continue;
            } else if (duplicateAction === 'create') {
                // Crear como nuevo (generar nuevo GUID y mantener todos los demás datos)
                const newTopic = {
                    ...topic,
                    guid: crypto.randomUUID(),
                    // Marcar como duplicado en título para referencia
                    title: `${topic.title} (copia)`
                };
                bcfToImport.topics.push(newTopic);
                imported++;
            }
        } else {
            // No es duplicado, importar normalmente (copia profunda del topic)
            bcfToImport.topics.push({ ...topic });
            imported++;
        }
    }

    // Agregar archivo al proyecto solo si tiene topics después del procesamiento
    if (bcfToImport.topics.length > 0) {
        logger.info(`Importando archivo ${fileName} con ${bcfToImport.topics.length} topics`);
        project.bcfFiles.push(bcfToImport);
    } else {
        logger.warning(`Archivo ${fileName} no tiene topics para importar después del filtrado`);
    }

    return { imported, skipped, updated };
}

/**
 * Actualiza un topic existente con nuevos datos
 *
 * @param {Object} newTopic - Topic con nuevos datos
 * @param {Object} project - Proyecto donde buscar el topic
 *
 * @private
 */
function updateExistingTopic(newTopic, project) {
    // Buscar y actualizar el topic existente
    for (const bcfFile of project.bcfFiles) {
        const existingTopicIndex = bcfFile.topics.findIndex(t => t.guid === newTopic.guid);
        if (existingTopicIndex !== -1) {
            // Actualizar manteniendo comentarios existentes
            const existingComments = bcfFile.topics[existingTopicIndex].comments || [];
            const newComments = newTopic.comments || [];

            bcfFile.topics[existingTopicIndex] = {
                ...newTopic,
                comments: [...existingComments, ...newComments]
            };

            return;
        }
    }
}
