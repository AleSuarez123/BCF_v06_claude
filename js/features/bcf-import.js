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
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>📦 Resumen de Importación BCF</h3>
                    <button class="modal-close" aria-label="Cerrar">×</button>
                </div>

                <div class="modal-body">
                    <!-- Estadísticas generales -->
                    <div class="import-summary-stats">
                        <div class="stat-card">
                            <div class="stat-icon">📄</div>
                            <div class="stat-value">${validatedFiles.length}</div>
                            <div class="stat-label">Archivo${validatedFiles.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🏷️</div>
                            <div class="stat-value">${totalTopics}</div>
                            <div class="stat-label">Incidencias totales</div>
                        </div>
                        ${totalDuplicates > 0 ? `
                            <div class="stat-card warning">
                                <div class="stat-icon">⚠️</div>
                                <div class="stat-value">${totalDuplicates}</div>
                                <div class="stat-label">Duplicados detectados</div>
                            </div>
                        ` : ''}
                        ${hasErrors ? `
                            <div class="stat-card error">
                                <div class="stat-icon">❌</div>
                                <div class="stat-value">${validatedFiles.filter(v => !v.valid).length}</div>
                                <div class="stat-label">Archivos con errores</div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Lista de archivos -->
                    <div class="import-files-list">
                        ${validatedFiles.map((v, index) => renderFileItem(v, index)).join('')}
                    </div>

                    ${totalDuplicates > 0 ? `
                        <div class="import-duplicate-config">
                            <h4>⚙️ Configuración de Duplicados</h4>
                            <p class="text-muted">¿Qué hacer con las ${totalDuplicates} incidencias que ya existen?</p>
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
                                        <p>Sobrescribir con los datos del archivo nuevo</p>
                                    </div>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="duplicate-action" value="create">
                                    <div class="option-content">
                                        <strong>Crear duplicados</strong>
                                        <p>Importar como incidencias nuevas (generará GUIDs nuevos)</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-ghost btn-cancel">Cancelar</button>
                    <button class="btn btn-primary btn-import" ${hasErrors ? 'disabled' : ''}>
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
    const { fileName, fileSize, stats, duplicates, valid, error } = validatedFile;

    if (!valid) {
        return `
            <div class="file-item error">
                <div class="file-item-header">
                    <div class="file-icon">❌</div>
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(fileName)}</div>
                        <div class="file-error">Error: ${escapeHtml(error)}</div>
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
                <span class="expand-icon">▶</span>
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(fileName)}</div>
                    <div class="file-meta">
                        ${stats.total} incidencias · ${(fileSize / 1024).toFixed(1)} KB
                        ${duplicates.length > 0 ? `· <span class="warning-text">⚠️ ${duplicates.length} duplicados</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="file-item-details">
                <div class="file-stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Estados:</div>
                        <div class="stat-value">${statusSummary}</div>
                    </div>
                    ${Object.keys(stats.byPriority).length > 0 ? `
                        <div class="stat-item">
                            <div class="stat-label">Alta prioridad:</div>
                            <div class="stat-value">${stats.byPriority.High || stats.byPriority.high || 0}</div>
                        </div>
                    ` : ''}
                    <div class="stat-item">
                        <div class="stat-label">Con snapshots:</div>
                        <div class="stat-value">${stats.withSnapshots}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Con comentarios:</div>
                        <div class="stat-value">${stats.withComments}</div>
                    </div>
                </div>

                ${duplicates.length > 0 ? `
                    <div class="duplicates-list">
                        <h5>Duplicados encontrados:</h5>
                        <ul>
                            ${duplicates.slice(0, 3).map(d => `
                                <li>
                                    ${escapeHtml(d.title)}
                                    ${d.isDifferent ? '<span class="badge">Modificada</span>' : '<span class="badge-subtle">Sin cambios</span>'}
                                </li>
                            `).join('')}
                            ${duplicates.length > 3 ? `<li class="text-muted">... y ${duplicates.length - 3} más</li>` : ''}
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

    for (let i = 0; i < validFiles.length; i++) {
        const validFile = validFiles[i];

        if (onProgress) {
            onProgress(i + 1, validFiles.length, validFile.fileName);
        }

        try {
            const result = await importSingleBCF(validFile, duplicateAction);
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
 * @returns {Promise<Object>} Resultado de la importación
 *
 * @private
 */
async function importSingleBCF(validFile, duplicateAction) {
    const { data, duplicates } = validFile;
    const duplicateGUIDs = new Set(duplicates.map(d => d.guid));

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    // Crear copia del BCF para importar
    const bcfToImport = {
        ...data,
        topics: []
    };

    // Procesar cada topic según la configuración
    for (const topic of data.topics) {
        const isDuplicate = duplicateGUIDs.has(topic.guid);

        if (isDuplicate) {
            if (duplicateAction === 'skip') {
                skipped++;
                continue;
            } else if (duplicateAction === 'update') {
                // Actualizar topic existente
                updateExistingTopic(topic);
                updated++;
                continue;
            } else if (duplicateAction === 'create') {
                // Crear como nuevo (generar nuevo GUID)
                const newTopic = { ...topic, guid: crypto.randomUUID() };
                bcfToImport.topics.push(newTopic);
                imported++;
            }
        } else {
            // No es duplicado, importar normalmente
            bcfToImport.topics.push(topic);
            imported++;
        }
    }

    // Agregar archivo al proyecto si tiene topics
    if (bcfToImport.topics.length > 0) {
        AppState.currentProject.bcfFiles.push(bcfToImport);
    }

    return { imported, skipped, updated };
}

/**
 * Actualiza un topic existente con nuevos datos
 *
 * @param {Object} newTopic - Topic con nuevos datos
 *
 * @private
 */
function updateExistingTopic(newTopic) {
    // Buscar y actualizar el topic existente
    for (const bcfFile of AppState.currentProject.bcfFiles) {
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
