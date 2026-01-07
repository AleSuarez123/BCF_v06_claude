/**
 * BCF VALIDATOR - Validación de datos BCF antes de exportación
 * Garantiza cumplimiento con estándares buildingSMART BCF 2.1 y 3.0
 */

import { LogManager } from './log-manager.js';

const logger = LogManager.getLogger('BCFValidator');

/**
 * Expresiones regulares para validación
 */
const PATTERNS = {
    // UUID RFC 4122
    GUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

    // ISO 8601 date-time
    ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/,

    // Email básico
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

    // Caracteres XML problemáticos (deben ser escapados)
    XML_INVALID: /[\x00-\x08\x0B-\x0C\x0E-\x1F]/
};

/**
 * Campos obligatorios por versión BCF
 */
const REQUIRED_FIELDS = {
    '2.1': ['guid', 'title', 'creationDate', 'creationAuthor'],
    '3.0': ['guid', 'title', 'creationDate', 'creationAuthor', 'topicType', 'topicStatus']
};

/**
 * Valida un GUID según RFC 4122
 */
export function validateGUID(guid) {
    if (!guid) {
        return { valid: false, error: 'GUID no puede estar vacío' };
    }

    if (!PATTERNS.GUID.test(guid)) {
        return { valid: false, error: `GUID inválido: ${guid}` };
    }

    return { valid: true };
}

/**
 * Valida una fecha ISO 8601
 */
export function validateISODate(dateString) {
    if (!dateString) {
        return { valid: false, error: 'Fecha no puede estar vacía' };
    }

    // Intentar parsear como fecha
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return { valid: false, error: `Fecha inválida: ${dateString}` };
    }

    // Verificar formato ISO 8601 estricto
    if (!PATTERNS.ISO_DATE.test(dateString)) {
        logger.warn(`Fecha no está en formato ISO 8601 estricto: ${dateString}`);
    }

    return { valid: true };
}

/**
 * Valida que un string no tenga caracteres XML inválidos
 */
export function validateXMLString(text, fieldName = 'campo') {
    if (text === null || text === undefined) {
        return { valid: true }; // Campos opcionales pueden ser null
    }

    if (typeof text !== 'string') {
        return { valid: false, error: `${fieldName} debe ser string, recibido: ${typeof text}` };
    }

    if (PATTERNS.XML_INVALID.test(text)) {
        return {
            valid: false,
            error: `${fieldName} contiene caracteres XML inválidos (control characters)`
        };
    }

    return { valid: true };
}

/**
 * Valida un email (opcional)
 */
export function validateEmail(email) {
    if (!email) {
        return { valid: true }; // Email es opcional
    }

    if (!PATTERNS.EMAIL.test(email)) {
        return { valid: false, error: `Email inválido: ${email}` };
    }

    return { valid: true };
}

/**
 * Normaliza una fecha a formato ISO 8601
 */
export function normalizeToISO8601(dateValue) {
    if (!dateValue) return null;

    // Si ya es ISO 8601, retornar tal cual
    if (typeof dateValue === 'string' && PATTERNS.ISO_DATE.test(dateValue)) {
        return dateValue;
    }

    // Intentar convertir a Date y formatear
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;

        // Formato ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ
        return date.toISOString();
    } catch (e) {
        logger.error('Error normalizando fecha:', e);
        return null;
    }
}

/**
 * Genera un GUID RFC 4122 v4
 */
export function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Valida un topic completo antes de exportar
 */
export function validateTopic(topic, bcfVersion = '3.0') {
    const errors = [];
    const warnings = [];

    // Validar campos obligatorios
    const requiredFields = REQUIRED_FIELDS[bcfVersion] || REQUIRED_FIELDS['3.0'];

    for (const field of requiredFields) {
        if (!topic[field] || topic[field] === '') {
            errors.push(`Campo obligatorio faltante: ${field}`);
        }
    }

    // Validar GUID
    if (topic.guid) {
        const guidValidation = validateGUID(topic.guid);
        if (!guidValidation.valid) {
            errors.push(guidValidation.error);
        }
    }

    // Validar fechas
    if (topic.creationDate) {
        const dateValidation = validateISODate(topic.creationDate);
        if (!dateValidation.valid) {
            errors.push(`creationDate: ${dateValidation.error}`);
        }
    }

    if (topic.modifiedDate) {
        const dateValidation = validateISODate(topic.modifiedDate);
        if (!dateValidation.valid) {
            warnings.push(`modifiedDate: ${dateValidation.error}`);
        }
    }

    if (topic.dueDate) {
        // dueDate puede ser solo fecha (YYYY-MM-DD)
        const dueDateValidation = validateISODate(topic.dueDate + 'T00:00:00Z');
        if (!dueDateValidation.valid) {
            warnings.push(`dueDate: ${dueDateValidation.error}`);
        }
    }

    // Validar strings
    const stringFields = ['title', 'description', 'creationAuthor', 'modifiedAuthor', 'assignedTo'];
    for (const field of stringFields) {
        if (topic[field]) {
            const strValidation = validateXMLString(topic[field], field);
            if (!strValidation.valid) {
                errors.push(strValidation.error);
            }
        }
    }

    // Validar título no vacío
    if (topic.title && topic.title.trim().length === 0) {
        errors.push('title no puede estar vacío');
    }

    // Validar límites de longitud
    if (topic.title && topic.title.length > 255) {
        warnings.push('title excede 255 caracteres (no estándar BCF)');
    }

    if (topic.description && topic.description.length > 10000) {
        warnings.push('description excede 10000 caracteres (puede causar problemas)');
    }

    // Validar assignedTo como email si existe
    if (topic.assignedTo) {
        const emailValidation = validateEmail(topic.assignedTo);
        if (!emailValidation.valid) {
            warnings.push(emailValidation.error);
        }
    }

    // Validar arrays
    if (topic.bcfComments && Array.isArray(topic.bcfComments)) {
        topic.bcfComments.forEach((comment, idx) => {
            if (!comment.guid) {
                errors.push(`Comment ${idx}: falta GUID`);
            } else {
                const guidValidation = validateGUID(comment.guid);
                if (!guidValidation.valid) {
                    errors.push(`Comment ${idx}: ${guidValidation.error}`);
                }
            }

            if (!comment.date) {
                errors.push(`Comment ${idx}: falta fecha`);
            } else {
                const dateValidation = validateISODate(comment.date);
                if (!dateValidation.valid) {
                    errors.push(`Comment ${idx}: ${dateValidation.error}`);
                }
            }

            if (!comment.author) {
                errors.push(`Comment ${idx}: falta autor`);
            }
        });
    }

    // Validar viewpoints
    if (topic.viewpoints && Array.isArray(topic.viewpoints)) {
        topic.viewpoints.forEach((vp, idx) => {
            if (!vp.guid) {
                errors.push(`Viewpoint ${idx}: falta GUID`);
            } else {
                const guidValidation = validateGUID(vp.guid);
                if (!guidValidation.valid) {
                    errors.push(`Viewpoint ${idx}: ${guidValidation.error}`);
                }
            }
        });
    }

    // BCF 3.0: TopicType y TopicStatus son obligatorios
    if (bcfVersion === '3.0') {
        if (!topic.topicType) {
            errors.push('topicType es obligatorio en BCF 3.0');
        }
        if (!topic.topicStatus) {
            errors.push('topicStatus es obligatorio en BCF 3.0');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Valida un proyecto completo antes de exportar
 */
export function validateProject(project, bcfVersion = '3.0') {
    const errors = [];
    const warnings = [];

    if (!project) {
        return {
            valid: false,
            errors: ['Proyecto no puede ser null'],
            warnings: []
        };
    }

    if (!project.bcfFiles || !Array.isArray(project.bcfFiles)) {
        return {
            valid: false,
            errors: ['Proyecto no tiene bcfFiles válidos'],
            warnings: []
        };
    }

    if (project.bcfFiles.length === 0) {
        return {
            valid: false,
            errors: ['Proyecto no tiene ningún archivo BCF para exportar'],
            warnings: []
        };
    }

    // Validar cada topic en cada bcfFile
    let topicCount = 0;
    const guids = new Set();

    project.bcfFiles.forEach((bcfFile, fileIdx) => {
        if (!bcfFile.topics || !Array.isArray(bcfFile.topics)) {
            warnings.push(`BCF file ${fileIdx}: no tiene topics válidos`);
            return;
        }

        bcfFile.topics.forEach((topic, topicIdx) => {
            topicCount++;

            // Validar topic
            const validation = validateTopic(topic, bcfVersion);
            if (!validation.valid) {
                errors.push(`BCF file ${fileIdx}, Topic ${topicIdx} (${topic.title || 'sin título'}): ${validation.errors.join(', ')}`);
            }

            validation.warnings.forEach(w => {
                warnings.push(`BCF file ${fileIdx}, Topic ${topicIdx} (${topic.title || 'sin título'}): ${w}`);
            });

            // Detectar GUIDs duplicados
            if (topic.guid) {
                if (guids.has(topic.guid)) {
                    errors.push(`GUID duplicado encontrado: ${topic.guid}`);
                }
                guids.add(topic.guid);
            }
        });
    });

    if (topicCount === 0) {
        return {
            valid: false,
            errors: ['No hay topics para exportar'],
            warnings: []
        };
    }

    logger.info(`Validación completada: ${topicCount} topics, ${errors.length} errores, ${warnings.length} warnings`);

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        stats: {
            totalTopics: topicCount,
            uniqueGuids: guids.size
        }
    };
}

/**
 * Escapa caracteres especiales XML
 */
export function escapeXML(text) {
    if (!text) return '';

    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Normaliza un topic para exportación
 * Asegura que todos los campos estén en formato correcto
 */
export function normalizeTopic(topic, bcfVersion = '3.0') {
    const normalized = { ...topic };

    // Normalizar fechas a ISO 8601
    if (normalized.creationDate) {
        normalized.creationDate = normalizeToISO8601(normalized.creationDate) || normalized.creationDate;
    }

    if (normalized.modifiedDate) {
        normalized.modifiedDate = normalizeToISO8601(normalized.modifiedDate) || normalized.modifiedDate;
    }

    // Asegurar GUID si no existe
    if (!normalized.guid) {
        normalized.guid = generateGUID();
        logger.warn(`Topic sin GUID, generando uno nuevo: ${normalized.guid}`);
    }

    // Asegurar campos obligatorios BCF 3.0
    if (bcfVersion === '3.0') {
        if (!normalized.topicType) {
            normalized.topicType = 'Issue';
            logger.warn(`Topic ${normalized.guid}: topicType faltante, usando 'Issue'`);
        }
        if (!normalized.topicStatus) {
            normalized.topicStatus = 'Open';
            logger.warn(`Topic ${normalized.guid}: topicStatus faltante, usando 'Open'`);
        }
    }

    // Normalizar arrays vacíos
    normalized.labels = normalized.labels || [];
    normalized.referenceLinks = normalized.referenceLinks || [];
    normalized.bcfComments = normalized.bcfComments || [];
    normalized.viewpoints = normalized.viewpoints || [];

    // Asegurar GUIDs en comments
    if (normalized.bcfComments) {
        normalized.bcfComments.forEach(comment => {
            if (!comment.guid) {
                comment.guid = generateGUID();
            }
            if (comment.date) {
                comment.date = normalizeToISO8601(comment.date) || comment.date;
            }
        });
    }

    // Asegurar GUIDs en viewpoints
    if (normalized.viewpoints) {
        normalized.viewpoints.forEach(vp => {
            if (!vp.guid) {
                vp.guid = generateGUID();
            }
        });
    }

    return normalized;
}
