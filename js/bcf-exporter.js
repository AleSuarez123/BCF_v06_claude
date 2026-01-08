/**
 * BCF EXPORTER - Exportador principal de archivos BCF
 * Implementa el ciclo completo de exportación con validación, generación XML y empaquetado ZIP
 */

import { validateProject, validateTopic, normalizeTopic, generateGUID } from './bcf-validator.js';
import { generateVersionXML, generateMarkupXML, generateProjectXML, generateExtensionsXSD } from './bcf-xml-generator.js';
import { LogManager } from './log-manager.js';

const logger = LogManager.getLogger('BCFExporter');

/**
 * Clase principal para exportar proyectos a formato BCF
 */
export class BCFExporter {
    constructor(options = {}) {
        this.bcfVersion = options.bcfVersion || '3.0';
        this.includeProject = options.includeProject !== false;
        this.includeExtensions = options.includeExtensions !== false && this.bcfVersion === '3.0';
        this.validateBeforeExport = options.validateBeforeExport !== false;
        this.onProgress = options.onProgress || null;
    }

    /**
     * Exporta un proyecto completo a archivo .bcfzip
     * @param {Object} project - Proyecto a exportar
     * @param {Array} selectedTopics - Array de topics a exportar (opcional, si no se pasa exporta todos)
     * @returns {Promise<Blob>} Blob del archivo .bcfzip
     */
    async exportProject(project, selectedTopics = null) {
        try {
            logger.info(`Iniciando exportación BCF ${this.bcfVersion}...`);
            const startTime = performance.now();

            // 1. Recopilar todos los topics a exportar
            const topicsToExport = this._collectTopics(project, selectedTopics);

            if (topicsToExport.length === 0) {
                throw new Error('No hay topics para exportar');
            }

            logger.info(`Topics a exportar: ${topicsToExport.length}`);

            // 2. Limpiar datos (auto-generar fechas faltantes en comentarios)
            this._sanitizeTopics(topicsToExport);

            // 3. Validar si está habilitado
            if (this.validateBeforeExport) {
                await this._validateTopics(topicsToExport);
            }

            // 3. Crear estructura ZIP
            const zip = new JSZip();

            // 4. Agregar archivo bcf.version
            const versionXML = generateVersionXML(this.bcfVersion);
            zip.file('bcf.version', versionXML);
            logger.debug('Agregado bcf.version');

            // 5. Agregar project.bcfp (opcional)
            if (this.includeProject && project.name) {
                const projectXML = generateProjectXML(project, this.bcfVersion);
                zip.file('project.bcfp', projectXML);
                logger.debug('Agregado project.bcfp');
            }

            // 6. Agregar extensions.xsd (BCF 3.0 opcional)
            if (this.includeExtensions && this.bcfVersion === '3.0') {
                const extensionsXSD = generateExtensionsXSD();
                zip.file('extensions.xsd', extensionsXSD);
                logger.debug('Agregado extensions.xsd');
            }

            // 7. Procesar cada topic
            for (let i = 0; i < topicsToExport.length; i++) {
                const topic = topicsToExport[i];

                await this._addTopicToZip(zip, topic);

                // Reportar progreso
                if (this.onProgress) {
                    this.onProgress({
                        current: i + 1,
                        total: topicsToExport.length,
                        percentage: Math.round(((i + 1) / topicsToExport.length) * 100),
                        topic: topic.title
                    });
                }
            }

            // 8. Generar blob del archivo ZIP
            logger.info('Generando archivo .bcfzip...');
            const blob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            logger.info(`Exportación completada en ${duration}s: ${blob.size} bytes, ${topicsToExport.length} topics`);

            return blob;
        } catch (error) {
            logger.error('Error durante exportación BCF:', error);
            throw error;
        }
    }

    /**
     * Exporta topics seleccionados a archivo BCF
     * @param {Array} topics - Array de topics a exportar
     * @param {String} projectName - Nombre del proyecto (opcional)
     * @returns {Promise<Blob>} Blob del archivo .bcfzip
     */
    async exportTopics(topics, projectName = 'Export') {
        const fakeProject = {
            name: projectName,
            bcfFiles: [{ topics }]
        };

        return this.exportProject(fakeProject, topics);
    }

    /**
     * Recopila todos los topics a exportar
     */
    _collectTopics(project, selectedTopics) {
        if (selectedTopics && selectedTopics.length > 0) {
            // Exportar solo topics seleccionados
            return selectedTopics.map(topic => normalizeTopic(topic, this.bcfVersion));
        }

        // Exportar todos los topics del proyecto
        const allTopics = [];

        if (project.bcfFiles && Array.isArray(project.bcfFiles)) {
            project.bcfFiles.forEach(bcfFile => {
                if (bcfFile.topics && Array.isArray(bcfFile.topics)) {
                    bcfFile.topics.forEach(topic => {
                        allTopics.push(normalizeTopic(topic, this.bcfVersion));
                    });
                }
            });
        }

        return allTopics;
    }

    /**
     * Limpia y sanitiza topics antes de exportar
     * Auto-genera campos faltantes como fechas en comentarios
     */
    _sanitizeTopics(topics) {
        const now = new Date().toISOString();
        let fixedCount = 0;

        topics.forEach(topic => {
            // Asegurar que los comentarios tengan fecha
            if (topic.bcfComments && Array.isArray(topic.bcfComments)) {
                topic.bcfComments.forEach(comment => {
                    if (!comment.date || comment.date === '') {
                        // Usar la fecha de creación del topic si existe, sino la actual
                        comment.date = topic.creationDate || now;
                        fixedCount++;
                    }

                    // Asegurar que tenga GUID
                    if (!comment.guid || comment.guid === '') {
                        comment.guid = this._generateGUID();
                    }

                    // Asegurar que tenga autor
                    if (!comment.author || comment.author === '') {
                        comment.author = topic.creationAuthor || 'unknown@example.com';
                    }
                });
            }

            // Asegurar que el topic tenga GUID
            if (!topic.guid || topic.guid === '') {
                topic.guid = this._generateGUID();
            }

            // Asegurar fechas en el topic
            if (!topic.creationDate || topic.creationDate === '') {
                topic.creationDate = now;
            }
            if (!topic.modifiedDate || topic.modifiedDate === '') {
                topic.modifiedDate = topic.creationDate || now;
            }
        });

        if (fixedCount > 0) {
            logger.info(`Auto-generadas ${fixedCount} fechas faltantes en comentarios`);
        }
    }

    /**
     * Genera un GUID v4
     */
    _generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Valida topics antes de exportar
     */
    async _validateTopics(topics) {
        logger.info('Validando topics...');

        const errors = [];
        const warnings = [];

        topics.forEach((topic, idx) => {
            const validation = validateTopic(topic, this.bcfVersion);

            if (!validation.valid) {
                errors.push(`Topic ${idx + 1} (${topic.title}): ${validation.errors.join(', ')}`);
            }

            validation.warnings.forEach(w => {
                warnings.push(`Topic ${idx + 1} (${topic.title}): ${w}`);
            });
        });

        if (errors.length > 0) {
            const errorMsg = `Validación falló:\n${errors.join('\n')}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        if (warnings.length > 0) {
            warnings.forEach(w => logger.warn(w));
        }

        logger.info(`Validación exitosa: ${topics.length} topics válidos`);
    }

    /**
     * Agrega un topic al ZIP
     */
    async _addTopicToZip(zip, topic) {
        const topicFolder = topic.guid;

        // 1. Crear carpeta del topic
        const folder = zip.folder(topicFolder);

        // 2. Generar y agregar markup.bcf
        const markupXML = generateMarkupXML(topic, this.bcfVersion);
        folder.file('markup.bcf', markupXML);

        // 3. Agregar snapshot si existe
        if (topic.snapshot) {
            await this._addSnapshot(folder, topic.snapshot);
        }

        // 4. Agregar viewpoint files si existen
        // (Por ahora solo incluimos referencias, los archivos .bcfv se pueden agregar después)

        logger.debug(`Topic agregado: ${topicFolder} (${topic.title})`);
    }

    /**
     * Agrega snapshot al topic folder
     */
    async _addSnapshot(folder, snapshot) {
        try {
            // snapshot puede ser un Blob, File, o URL
            if (snapshot instanceof Blob || snapshot instanceof File) {
                // Determinar extensión
                const extension = this._getSnapshotExtension(snapshot);
                folder.file(`snapshot.${extension}`, snapshot);
            } else if (typeof snapshot === 'string' && snapshot.startsWith('blob:')) {
                // Es una blob URL, necesitamos fetch
                const response = await fetch(snapshot);
                const blob = await response.blob();
                const extension = this._getSnapshotExtension(blob);
                folder.file(`snapshot.${extension}`, blob);
            } else if (typeof snapshot === 'string' && (snapshot.startsWith('data:image'))) {
                // Es un data URL
                const blob = await this._dataURLtoBlob(snapshot);
                const extension = this._getSnapshotExtension(blob);
                folder.file(`snapshot.${extension}`, blob);
            } else {
                logger.warn('Formato de snapshot no soportado, ignorando');
            }
        } catch (error) {
            logger.error('Error agregando snapshot:', error);
            // No fallar por un snapshot, continuar
        }
    }

    /**
     * Obtiene la extensión del snapshot según MIME type
     */
    _getSnapshotExtension(blob) {
        if (!blob.type) return 'png';

        if (blob.type === 'image/png') return 'png';
        if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') return 'jpg';
        if (blob.type === 'image/gif') return 'gif';
        if (blob.type === 'image/webp') return 'webp';
        if (blob.type === 'image/bmp') return 'bmp';

        // Por defecto PNG
        return 'png';
    }

    /**
     * Convierte data URL a Blob
     */
    async _dataURLtoBlob(dataURL) {
        const response = await fetch(dataURL);
        return response.blob();
    }

    /**
     * Descarga el archivo BCF generado
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Genera nombre de archivo sugerido
     */
    static generateFilename(projectName, bcfVersion = '3.0') {
        const sanitized = projectName
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 50);

        const timestamp = new Date().toISOString().split('T')[0];

        return `${sanitized}_BCF${bcfVersion}_${timestamp}.bcfzip`;
    }
}

/**
 * Función auxiliar para exportación rápida
 */
export async function exportBCF(project, options = {}) {
    const exporter = new BCFExporter(options);
    return exporter.exportProject(project, options.selectedTopics);
}

/**
 * Función auxiliar para exportar y descargar directamente
 */
export async function exportAndDownload(project, options = {}) {
    const exporter = new BCFExporter(options);
    const blob = await exporter.exportProject(project, options.selectedTopics);

    const filename = BCFExporter.generateFilename(
        project.name || 'Project',
        exporter.bcfVersion
    );

    BCFExporter.downloadBlob(blob, filename);

    return { blob, filename };
}
