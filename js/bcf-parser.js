/**
 * BCF PARSER - Módulo de lectura de archivos BCF
 * Versión mejorada con soporte para BCF 2.1+, namespaces XML y validaciones
 */

import { createSafeObjectURL } from './ui-utils.js';
import { createError, PARSE_ERRORS } from './error-codes.js';

const STATUS_MAP = {
    'open': 'Open', 'abierto': 'Open', 'active': 'Open', 'new': 'Open',
    'in progress': 'In Progress', 'inprogress': 'In Progress', 'en proceso': 'In Progress',
    'resolved': 'Resolved', 'resuelto': 'Resolved', 'done': 'Resolved',
    'closed': 'Closed', 'cerrado': 'Closed', 'finished': 'Closed'
};

const PRIORITY_MAP = {
    'high': 'High', 'alta': 'High', 'critical': 'High', 'urgent': 'High',
    'medium': 'Medium', 'media': 'Medium', 'normal': 'Medium',
    'low': 'Low', 'baja': 'Low', 'minor': 'Low'
};

const TYPE_MAP = {
    'architecture': 'ARQ', 'arquitectura': 'ARQ', 'arq': 'ARQ',
    'structural': 'EST', 'estructura': 'EST', 'est': 'EST',
    'mep': 'MEP', 'mechanical': 'MEP', 'electrical': 'MEP', 'instalaciones': 'MEP',
    'clash': 'Clash', 'coordination': 'Coord', 'design': 'Design', 'request': 'Request'
};

/**
 * Parsea XML con soporte para namespaces BCF
 */
function parseXML(xmlString) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        
        // Verificar errores de parseo
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            console.error('XML parse error:', parserError.textContent);
            return null;
        }
        
        return doc;
    } catch (e) {
        console.error('Error parsing XML:', e);
        return null;
    }
}

/**
 * Obtiene texto de elemento con o sin namespace
 */
function getElementText(parent, tagName, defaultValue = '') {
    if (!parent) return defaultValue;
    
    // Intentar con namespace primero
    let element = parent.querySelector(tagName);
    
    // Si no existe, intentar sin namespace (buscar por nombre local)
    if (!element) {
        const localName = tagName.split(':').pop();
        element = parent.querySelector(localName);
    }
    
    return element ? (element.textContent || '').trim() : defaultValue;
}

/**
 * Obtiene atributo de elemento
 */
function getAttribute(element, attrName, defaultValue = '') {
    if (!element) return defaultValue;
    return element.getAttribute(attrName) || defaultValue;
}

/**
 * Obtiene todos los textos de elementos con selector
 */
function getAllElementTexts(parent, tagName) {
    if (!parent) return [];
    
    let elements = Array.from(parent.querySelectorAll(tagName));
    
    // Si no hay resultados con namespace, intentar sin él
    if (elements.length === 0) {
        const localName = tagName.split(':').pop();
        elements = Array.from(parent.querySelectorAll(localName));
    }
    
    return elements
        .map(el => (el.textContent || '').trim())
        .filter(t => t);
}

function normalizeStatus(status) {
    if (!status) return 'Open';
    return STATUS_MAP[status.toLowerCase().trim()] || status;
}

function normalizePriority(priority) {
    if (!priority) return 'Medium';
    return PRIORITY_MAP[priority.toLowerCase().trim()] || priority;
}

function normalizeType(type) {
    if (!type) return 'General';
    return TYPE_MAP[type.toLowerCase().trim()] || type;
}

function formatDate(isoDate) {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return isoDate;
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return isoDate;
    }
}

function parseDate(isoDate) {
    if (!isoDate) return null;
    try {
        const date = new Date(isoDate);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        return null;
    }
}

function parseBCFVersion(xmlString) {
    const doc = parseXML(xmlString);
    if (!doc) return { version: 'Unknown' };
    
    const versionElement = doc.querySelector('Version') || doc.documentElement;
    return {
        version: getAttribute(versionElement, 'VersionId', 'Unknown')
    };
}

/**
 * Parsea markup.bcf con soporte robusto para BCF 2.0, 2.1 y variantes
 */
function parseMarkupBCF(xmlString, topicFolder) {
    const doc = parseXML(xmlString);
    if (!doc) {
        console.warn(`No se pudo parsear markup.bcf en ${topicFolder}`);
        return null;
    }

    // Buscar Topic con o sin namespace
    let topic = doc.querySelector('Topic');
    if (!topic) {
        const topics = doc.getElementsByTagName('Topic');
        topic = topics.length > 0 ? topics[0] : null;
    }
    
    if (!topic) {
        console.warn(`No se encontró elemento Topic en ${topicFolder}`);
        return null;
    }

    const guid = getAttribute(topic, 'Guid') || topicFolder;
    
    // TopicType puede estar como atributo o elemento hijo
    let topicType = getAttribute(topic, 'TopicType');
    if (!topicType) topicType = getElementText(topic, 'TopicType');
    
    // TopicStatus puede estar como atributo o elemento hijo
    let topicStatus = getAttribute(topic, 'TopicStatus');
    if (!topicStatus) topicStatus = getElementText(topic, 'TopicStatus');

    const data = {
        guid,
        folder: topicFolder,
        title: getElementText(topic, 'Title', 'Sin título'),
        description: getElementText(topic, 'Description', ''),
        creationDate: getElementText(topic, 'CreationDate'),
        creationDateFormatted: formatDate(getElementText(topic, 'CreationDate')),
        creationDateParsed: parseDate(getElementText(topic, 'CreationDate')),
        creationAuthor: getElementText(topic, 'CreationAuthor', 'Desconocido'),
        modifiedDate: getElementText(topic, 'ModifiedDate'),
        modifiedDateFormatted: formatDate(getElementText(topic, 'ModifiedDate')),
        modifiedAuthor: getElementText(topic, 'ModifiedAuthor', ''),
        topicType: normalizeType(topicType),
        topicTypeOriginal: topicType || 'General',
        topicStatus: normalizeStatus(topicStatus),
        topicStatusOriginal: topicStatus || 'Open',
        priority: normalizePriority(getElementText(topic, 'Priority')),
        priorityOriginal: getElementText(topic, 'Priority', 'Medium'),
        assignedTo: getElementText(topic, 'AssignedTo', ''),
        dueDate: getElementText(topic, 'DueDate', ''),
        labels: [],
        referenceLinks: [],
        viewpoints: [],
        bcfComments: []
    };

    // Labels - puede estar en Labels/Label o directamente Label
    let labels = getAllElementTexts(topic, 'Labels Label');
    if (labels.length === 0) {
        labels = getAllElementTexts(topic, 'Label');
    }
    data.labels = labels;

    // ReferenceLinks
    data.referenceLinks = getAllElementTexts(topic, 'ReferenceLink');

    // Viewpoints - BCF 2.1 usa estructura ViewPoint/Viewpoint (caso sensible)
    const viewpointElements = doc.querySelectorAll('ViewPoint, Viewpoint, ViewPoints ViewPoint');
    Array.from(viewpointElements).forEach(vp => {
        const vpGuid = getAttribute(vp, 'Guid');
        if (vpGuid) {
            data.viewpoints.push({
                guid: vpGuid,
                viewpoint: getElementText(vp, 'Viewpoint') || getElementText(vp, 'ViewpointReference'),
                snapshot: getElementText(vp, 'Snapshot')
            });
        }
    });

    // Comments
    const commentElements = doc.querySelectorAll('Comment');
    Array.from(commentElements).forEach(comment => {
        const commentDate = getElementText(comment, 'Date');
        data.bcfComments.push({
            guid: getAttribute(comment, 'Guid'),
            date: commentDate,
            dateFormatted: formatDate(commentDate) || 'Sin fecha',
            author: getElementText(comment, 'Author', 'Anónimo'),
            comment: getElementText(comment, 'Comment')
        });
    });

    return data;
}

/**
 * Busca snapshot de forma flexible en el BCF
 */
async function findSnapshot(zip, folder, topicData) {
    // Lista de posibles nombres/rutas de snapshot
    const possiblePaths = [
        `${folder}/snapshot.png`,
        `${folder}/snapshot.jpg`,
        `${folder}/snapshot.jpeg`,
        `${folder}/Snapshot.png`,
        `${folder}/Snapshot.jpg`,
        `${folder}/snapshot.PNG`,
        `${folder}/snapshot.JPG`
    ];

    // 1. Intentar rutas comunes
    for (const path of possiblePaths) {
        const file = zip.file(path);
        if (file) {
            try {
                // Return Blob directly for storage
                return await file.async('blob');
            } catch (e) {
                console.warn(`Error cargando snapshot ${path}:`, e);
            }
        }
    }

    // 2. Buscar en viewpoints si existen
    if (topicData.viewpoints && topicData.viewpoints.length > 0) {
        for (const vp of topicData.viewpoints) {
            if (vp.snapshot) {
                const vpSnapshotPath = `${folder}/${vp.snapshot}`;
                const file = zip.file(vpSnapshotPath);
                if (file) {
                    try {
                        return await file.async('blob');
                    } catch (e) {
                        console.warn(`Error cargando viewpoint snapshot ${vpSnapshotPath}:`, e);
                    }
                }
            }
        }
    }

    // 3. Buscar cualquier imagen en la carpeta del topic
    const allFiles = Object.keys(zip.files);
    const imagesInFolder = allFiles.filter(path =>
        path.startsWith(folder + '/') &&
        !zip.files[path].dir &&
        /\.(png|jpg|jpeg)$/i.test(path)
    );

    if (imagesInFolder.length > 0) {
        const firstImage = imagesInFolder[0];
        try {
            return await zip.files[firstImage].async('blob');
        } catch (e) {
            console.warn(`Error cargando imagen ${firstImage}:`, e);
        }
    }

    return null;
}

/**
 * Carga y procesa archivo BCF
 */
async function loadBCF(file) {
    if (typeof JSZip === 'undefined') {
        throw createError(
            PARSE_ERRORS.BCF_ZIP_ERROR,
            'JSZip no está cargado. Incluye la biblioteca JSZip.'
        );
    }

    let zip;
    try {
        zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch (e) {
        throw createError(
            PARSE_ERRORS.BCF_ZIP_ERROR,
            `Error al descomprimir BCF: ${e.message}`,
            { originalError: e.message, filename: file.name }
        );
    }

    const result = {
        fileName: file.name,
        fileSize: file.size,
        version: { version: 'Unknown' },
        topics: [],
        loadedAt: new Date().toISOString()
    };

    // Leer versión BCF
    const versionFile = zip.file('bcf.version');
    if (versionFile) {
        try {
            result.version = parseBCFVersion(await versionFile.async('string'));
        } catch (e) {
            console.warn('Error leyendo bcf.version:', e);
        }
    }

    // Identificar carpetas de topics (cada topic es una carpeta)
    const folders = new Set();
    zip.forEach((path, entry) => {
        if (!entry.dir && path.includes('/')) {
            const folder = path.split('/')[0];
            // Filtrar carpetas del sistema
            if (folder && folder !== '__MACOSX' && !folder.startsWith('.')) {
                folders.add(folder);
            }
        }
    });

    if (folders.size === 0) {
        throw createError(
            PARSE_ERRORS.BCF_MISSING_MARKUP,
            'No se encontraron topics en el archivo BCF',
            { filename: file.name }
        );
    }

    // Procesar cada topic
    for (const folder of folders) {
        const markupFile = zip.file(`${folder}/markup.bcf`);
        if (!markupFile) {
            console.warn(`No se encontró markup.bcf en ${folder}, omitiendo...`);
            continue;
        }

        try {
            const markupXML = await markupFile.async('string');
            const topicData = parseMarkupBCF(markupXML, folder);
            
            if (!topicData) {
                console.warn(`No se pudo parsear topic en ${folder}`);
                continue;
            }

            // Buscar snapshot
            topicData.snapshot = await findSnapshot(zip, folder, topicData);

            result.topics.push(topicData);
        } catch (e) {
            console.error(`Error procesando topic ${folder}:`, e);
        }
    }

    // Validar que hay al menos un topic válido
    if (result.topics.length === 0) {
        throw createError(
            PARSE_ERRORS.BCF_INVALID_FORMAT,
            'El archivo BCF no contiene topics válidos',
            { filename: file.name, topicsFolders: folders.size }
        );
    }

    // Ordenar por fecha de creación (más recientes primero)
    result.topics.sort((a, b) => {
        const dateA = a.creationDateParsed || new Date(0);
        const dateB = b.creationDateParsed || new Date(0);
        return dateB - dateA;
    });

    return result;
}

/**
 * Obtiene estadísticas de incidencias
 */
function getIssueStats(issues) {
    const stats = {
        total: issues.length,
        byStatus: {},
        byPriority: {},
        byType: {},
        byAuthor: {}
    };

    issues.forEach(issue => {
        // Por estado
        const status = issue.topicStatus || 'Sin estado';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Por prioridad
        const priority = issue.priority || 'Sin prioridad';
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // Por tipo
        const type = issue.topicType || 'Sin tipo';
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // Por autor
        const author = issue.creationAuthor || 'Sin autor';
        stats.byAuthor[author] = (stats.byAuthor[author] || 0) + 1;
    });

    return stats;
}

/**
 * Obtiene valores únicos de un campo
 */
function getUniqueValues(issues, field) {
    const values = new Set();
    
    issues.forEach(issue => {
        const value = issue[field];
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                value.forEach(v => values.add(v));
            } else {
                values.add(value);
            }
        }
    });

    return Array.from(values).sort();
}

/**
 * Filtra incidencias según criterios
 */
function filterIssues(issues, filters) {
    return issues.filter(issue => {
        // Filtro por archivo BCF
        if (filters.bcfFile && issue.bcfFile !== filters.bcfFile) {
            return false;
        }

        // Filtro por estados (array)
        if (filters.statuses && filters.statuses.length > 0) {
            if (!filters.statuses.includes(issue.topicStatus)) {
                return false;
            }
        }

        // Filtro por prioridades (array)
        if (filters.priorities && filters.priorities.length > 0) {
            if (!filters.priorities.includes(issue.priority)) {
                return false;
            }
        }

        // Filtro por tipos (array)
        if (filters.types && filters.types.length > 0) {
            if (!filters.types.includes(issue.topicType)) {
                return false;
            }
        }

        // Filtro por autor (texto parcial)
        if (filters.author && filters.author.trim()) {
            const authorLower = issue.creationAuthor.toLowerCase();
            const filterLower = filters.author.toLowerCase();
            if (!authorLower.includes(filterLower)) {
                return false;
            }
        }

        // Filtro por fecha desde
        if (filters.dateFrom) {
            const dateFrom = new Date(filters.dateFrom);
            dateFrom.setHours(0, 0, 0, 0);
            if (issue.creationDateParsed && issue.creationDateParsed < dateFrom) {
                return false;
            }
        }

        // Filtro por fecha hasta
        if (filters.dateTo) {
            const dateTo = new Date(filters.dateTo);
            dateTo.setHours(23, 59, 59, 999);
            if (issue.creationDateParsed && issue.creationDateParsed > dateTo) {
                return false;
            }
        }

        // Filtro por favoritos
        if (filters.onlyFavorites && !filters.favoritesSet?.has(issue.guid)) {
            return false;
        }

        // Filtro por sin asignar
        if (filters.unassignedOnly && issue.assignedTo) {
            return false;
        }

        // Filtro por búsqueda general (título, descripción, comentarios)
        if (filters.search && filters.search.trim()) {
            const searchLower = filters.search.toLowerCase();
            const titleMatch = issue.title.toLowerCase().includes(searchLower);
            const descMatch = issue.description.toLowerCase().includes(searchLower);
            if (!titleMatch && !descMatch) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Ordena incidencias según criterio
 */
function sortIssues(issues, sortBy) {
    const sorted = [...issues];
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const statusOrder = { 'Open': 0, 'In Progress': 1, 'Resolved': 2, 'Closed': 3 };

    switch (sortBy) {
        case 'date-desc':
            sorted.sort((a, b) => {
                const dateA = a.creationDateParsed || new Date(0);
                const dateB = b.creationDateParsed || new Date(0);
                return dateB - dateA;
            });
            break;

        case 'date-asc':
            sorted.sort((a, b) => {
                const dateA = a.creationDateParsed || new Date(0);
                const dateB = b.creationDateParsed || new Date(0);
                return dateA - dateB;
            });
            break;

        case 'priority-desc':
            sorted.sort((a, b) => {
                const orderA = priorityOrder[a.priority] ?? 1;
                const orderB = priorityOrder[b.priority] ?? 1;
                return orderA - orderB;
            });
            break;

        case 'priority-asc':
            sorted.sort((a, b) => {
                const orderA = priorityOrder[a.priority] ?? 1;
                const orderB = priorityOrder[b.priority] ?? 1;
                return orderB - orderA;
            });
            break;

        case 'deadline-asc':
            sorted.sort((a, b) => {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return dateA - dateB;
            });
            break;

        case 'status':
            sorted.sort((a, b) => {
                const orderA = statusOrder[a.topicStatus] ?? 0;
                const orderB = statusOrder[b.topicStatus] ?? 0;
                return orderA - orderB;
            });
            break;

        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;

        case 'author':
            sorted.sort((a, b) => a.creationAuthor.localeCompare(b.creationAuthor));
            break;

        default:
            // Por defecto: fecha descendente
            sorted.sort((a, b) => {
                const dateA = a.creationDateParsed || new Date(0);
                const dateB = b.creationDateParsed || new Date(0);
                return dateB - dateA;
            });
    }

    return sorted;
}

export const BCFParser = {
    loadBCF,
    getIssueStats,
    getUniqueValues,
    filterIssues,
    sortIssues,
    normalizeStatus,
    normalizePriority,
    normalizeType,
    formatDate,
    parseDate
};
