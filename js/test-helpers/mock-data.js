/**
 * Mock Data Generators para Testing
 *
 * Proporciona factories para generar datos de prueba consistentes
 * para issues, proyectos, archivos BCF, comentarios, etc.
 *
 * @module test-helpers/mock-data
 */

import { COLORS } from '../constants.js';

/**
 * Genera un GUID v4 aleatorio
 *
 * @returns {string} GUID en formato xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Genera una fecha aleatoria dentro de un rango
 *
 * @param {Date} [start] - Fecha de inicio (por defecto: hace 90 días)
 * @param {Date} [end] - Fecha de fin (por defecto: dentro de 30 días)
 * @returns {string} Fecha en formato ISO
 */
export function randomDate(start, end) {
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 90);

    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const startDate = start || defaultStart;
    const endDate = end || defaultEnd;

    const timestamp = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    return new Date(timestamp).toISOString();
}

/**
 * Selecciona elemento aleatorio de un array
 *
 * @template T
 * @param {T[]} array - Array de elementos
 * @returns {T} Elemento aleatorio
 */
export function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Genera número aleatorio entre min y max (inclusivo)
 *
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} Número aleatorio
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Datos de ejemplo para generación realista
const SAMPLE_DATA = {
    statuses: ['Open', 'In Progress', 'Resolved', 'Closed'],
    priorities: ['Low', 'Normal', 'High', 'Critical'],
    types: ['Issue', 'Clash', 'Remark', 'Request'],
    disciplines: ['Architecture', 'Structure', 'MEP', 'HVAC', 'Electrical', 'Plumbing'],
    authors: ['John Smith', 'Maria García', 'Alex Chen', 'Sara Johnson', 'Ahmed Hassan'],
    assignees: ['Carlos López', 'Emily Watson', 'David Kim', 'Ana Silva', 'Michael Brown'],

    titles: [
        'Wall alignment issue',
        'Door clearance problem',
        'Clash between beam and duct',
        'Missing structural element',
        'Incorrect window placement',
        'Rebar spacing error',
        'Foundation level mismatch',
        'Column dimension discrepancy',
        'Ceiling height verification needed',
        'Fire exit blocked',
        'Accessibility ramp slope incorrect',
        'MEP routing conflict',
        'Insulation specification unclear',
        'Material specification missing',
        'Detail drawing required'
    ],

    descriptions: [
        'This element needs to be reviewed and adjusted according to the latest design changes.',
        'Coordination required between architecture and structural teams.',
        'Please verify dimensions against approved drawings.',
        'This issue was identified during clash detection analysis.',
        'Urgent attention required before next construction phase.',
        'Designer input needed to resolve coordination issue.',
        'Field verification recommended before proceeding.',
        'Drawing discrepancy noted - please clarify intent.',
        'Material substitution requires approval.',
        'Construction sequence needs clarification.'
    ]
};

/**
 * Crea un issue/incidencia BCF mock con datos realistas
 *
 * @param {Object} [overrides={}] - Propiedades a sobrescribir
 * @param {string} [overrides.guid] - GUID personalizado
 * @param {string} [overrides.title] - Título personalizado
 * @param {string} [overrides.topicStatus] - Estado personalizado
 * @param {string} [overrides.priority] - Prioridad personalizada
 * @param {string} [overrides.topicType] - Tipo personalizado
 * @param {string} [overrides.assignedTo] - Asignado personalizado
 * @param {string} [overrides.creationAuthor] - Autor personalizado
 * @param {Date} [overrides.creationDate] - Fecha de creación
 * @param {Date} [overrides.dueDate] - Fecha límite
 * @returns {Object} Issue mock completo
 *
 * @example
 * const issue = createMockIssue({ priority: 'High', topicStatus: 'Open' });
 * console.log(issue.title); // Título aleatorio de alta prioridad
 */
export function createMockIssue(overrides = {}) {
    const guid = overrides.guid || generateGUID();
    const creationDate = overrides.creationDate || randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date());
    const modifiedDate = overrides.modifiedDate || randomDate(new Date(creationDate), new Date());

    // 30% de probabilidad de tener dueDate
    const hasDueDate = overrides.dueDate !== undefined || Math.random() > 0.7;
    const dueDate = hasDueDate
        ? (overrides.dueDate || randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)))
        : null;

    const issue = {
        guid,
        topicType: overrides.topicType || randomChoice(SAMPLE_DATA.types),
        topicStatus: overrides.topicStatus || randomChoice(SAMPLE_DATA.statuses),
        title: overrides.title || randomChoice(SAMPLE_DATA.titles),
        priority: overrides.priority || randomChoice(SAMPLE_DATA.priorities),
        index: overrides.index || randomInt(1, 1000),
        labels: overrides.labels || (Math.random() > 0.7 ? [randomChoice(SAMPLE_DATA.disciplines)] : []),
        creationDate,
        creationAuthor: overrides.creationAuthor || randomChoice(SAMPLE_DATA.authors),
        modifiedDate,
        modifiedAuthor: overrides.modifiedAuthor || randomChoice(SAMPLE_DATA.authors),
        dueDate,
        assignedTo: overrides.assignedTo || (Math.random() > 0.5 ? randomChoice(SAMPLE_DATA.assignees) : ''),
        description: overrides.description || randomChoice(SAMPLE_DATA.descriptions),
        stage: overrides.stage || (Math.random() > 0.5 ? randomChoice(['Design', 'Construction', 'Review']) : null),

        // Referencias y archivos
        referenceLinks: overrides.referenceLinks || [],
        documentReferences: overrides.documentReferences || [],
        relatedTopics: overrides.relatedTopics || [],

        // Datos de viewpoint
        viewpoints: overrides.viewpoints || [],

        // Comentarios (20% de probabilidad de tener comentarios)
        comments: overrides.comments || (Math.random() > 0.8 ? createMockComments(randomInt(1, 3)) : []),

        // Metadata
        bcfFile: overrides.bcfFile || `project_${randomInt(1, 5)}.bcf`,
        projectId: overrides.projectId || generateGUID(),
    };

    return issue;
}

/**
 * Crea un array de comentarios mock
 *
 * @param {number} count - Número de comentarios a generar
 * @returns {Array<Object>} Array de comentarios
 */
export function createMockComments(count = 3) {
    const comments = [];
    const commentTexts = [
        'I have reviewed this issue and it needs immediate attention.',
        'This has been discussed with the contractor.',
        'Please coordinate with the MEP team before proceeding.',
        'Updated design has been uploaded to the shared drive.',
        'Field conditions differ from the model - adjustment required.',
        'Approved with noted changes.',
        'Waiting for client feedback.',
        'This is a duplicate of another issue - will consolidate.'
    ];

    for (let i = 0; i < count; i++) {
        comments.push({
            guid: generateGUID(),
            date: randomDate(),
            author: randomChoice(SAMPLE_DATA.authors),
            comment: randomChoice(commentTexts),
            viewpoint: null,
            modifiedDate: randomDate(),
            modifiedAuthor: randomChoice(SAMPLE_DATA.authors)
        });
    }

    return comments;
}

/**
 * Genera múltiples issues en bulk
 *
 * @param {number} count - Número de issues a generar
 * @param {Object} [baseOverrides={}] - Propiedades base para todos los issues
 * @returns {Array<Object>} Array de issues mock
 *
 * @example
 * // Generar 100 issues de prueba
 * const issues = generateBulkIssues(100);
 *
 * @example
 * // Generar 50 issues de alta prioridad
 * const urgentIssues = generateBulkIssues(50, { priority: 'High' });
 */
export function generateBulkIssues(count, baseOverrides = {}) {
    const issues = [];

    for (let i = 0; i < count; i++) {
        issues.push(createMockIssue({
            ...baseOverrides,
            index: i + 1
        }));
    }

    return issues;
}

/**
 * Crea un proyecto BCF mock
 *
 * @param {Object} [overrides={}] - Propiedades a sobrescribir
 * @returns {Object} Proyecto mock completo
 *
 * @example
 * const project = createMockProject({ name: 'Torre Central' });
 */
export function createMockProject(overrides = {}) {
    const projectNames = [
        'Torre Corporativa Central',
        'Residencial Los Alamos',
        'Centro Comercial Plaza Norte',
        'Hospital General',
        'Campus Universitario',
        'Aeropuerto Internacional',
        'Estadio Deportivo',
        'Museo de Arte Moderno'
    ];

    const id = overrides.id || generateGUID();
    const name = overrides.name || randomChoice(projectNames);
    const issueCount = overrides.issueCount || randomInt(10, 100);

    return {
        id,
        name,
        description: overrides.description || `Proyecto de construcción ${name}`,
        createdAt: overrides.createdAt || randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date()),
        modifiedAt: overrides.modifiedAt || randomDate(),
        bcfFiles: overrides.bcfFiles || [
            {
                filename: `${name.toLowerCase().replace(/\s+/g, '_')}_issues.bcf`,
                size: randomInt(50000, 5000000),
                uploadedAt: randomDate(),
                issuesCount: issueCount
            }
        ],
        stats: overrides.stats || {
            totalIssues: issueCount,
            openIssues: Math.floor(issueCount * 0.4),
            resolvedIssues: Math.floor(issueCount * 0.3),
            closedIssues: Math.floor(issueCount * 0.3)
        },
        isServerProject: overrides.isServerProject || false,
        serverGuid: overrides.serverGuid || null
    };
}

/**
 * Genera múltiples proyectos en bulk
 *
 * @param {number} count - Número de proyectos a generar
 * @returns {Array<Object>} Array de proyectos mock
 *
 * @example
 * const projects = generateBulkProjects(10);
 */
export function generateBulkProjects(count) {
    const projects = [];

    for (let i = 0; i < count; i++) {
        projects.push(createMockProject());
    }

    return projects;
}

/**
 * Crea un archivo BCF mock completo con estructura válida
 *
 * @param {Object} [options={}] - Opciones de configuración
 * @param {string} [options.filename] - Nombre del archivo
 * @param {number} [options.issueCount=10] - Número de issues a incluir
 * @returns {Object} Estructura de archivo BCF mock
 *
 * @example
 * const bcfFile = createMockBCFFile({ issueCount: 50 });
 */
export function createMockBCFFile(options = {}) {
    const issueCount = options.issueCount || randomInt(5, 30);
    const filename = options.filename || `mock_project_${Date.now()}.bcf`;

    return {
        filename,
        version: '2.1',
        issues: generateBulkIssues(issueCount),
        extensions: {
            topicType: SAMPLE_DATA.types,
            topicStatus: SAMPLE_DATA.statuses,
            priority: SAMPLE_DATA.priorities,
            topicLabel: SAMPLE_DATA.disciplines,
            snippetType: [],
            stage: ['Design', 'Construction', 'Review', 'Closeout'],
            userIdType: []
        },
        metadata: {
            createdAt: randomDate(),
            modifiedAt: randomDate(),
            author: randomChoice(SAMPLE_DATA.authors),
            tool: 'BCF Viewer Pro - Test Generator'
        }
    };
}

/**
 * Dataset de prueba predefinido para diferentes escenarios
 */
export const TEST_DATASETS = {
    /**
     * Dataset pequeño para pruebas rápidas (10 issues)
     */
    small: () => generateBulkIssues(10),

    /**
     * Dataset mediano para pruebas de rendimiento básico (100 issues)
     */
    medium: () => generateBulkIssues(100),

    /**
     * Dataset grande para pruebas de virtual scrolling (1000 issues)
     */
    large: () => generateBulkIssues(1000),

    /**
     * Dataset muy grande para pruebas de estrés (5000 issues)
     */
    xlarge: () => generateBulkIssues(5000),

    /**
     * Dataset de alta prioridad (20 issues críticos)
     */
    highPriority: () => generateBulkIssues(20, { priority: 'High', topicStatus: 'Open' }),

    /**
     * Dataset con deadlines próximos (15 issues)
     */
    dueSoon: () => {
        const issues = [];
        const now = new Date();
        for (let i = 0; i < 15; i++) {
            const dueDate = new Date(now);
            dueDate.setDate(now.getDate() + randomInt(1, 7));
            issues.push(createMockIssue({
                dueDate: dueDate.toISOString(),
                topicStatus: 'Open'
            }));
        }
        return issues;
    },

    /**
     * Dataset mixto realista (50 issues variados)
     */
    realistic: () => {
        const issues = [];
        // 20% críticos
        issues.push(...generateBulkIssues(10, { priority: 'High', topicStatus: 'Open' }));
        // 30% en progreso
        issues.push(...generateBulkIssues(15, { topicStatus: 'In Progress' }));
        // 30% resueltos
        issues.push(...generateBulkIssues(15, { topicStatus: 'Resolved' }));
        // 20% cerrados
        issues.push(...generateBulkIssues(10, { topicStatus: 'Closed' }));

        return issues;
    }
};

/**
 * Limpia todos los datos mock del AppState
 *
 * ADVERTENCIA: Elimina todos los proyectos e issues actuales
 *
 * @param {Object} AppState - Referencia al AppState global
 */
export function clearMockData(AppState) {
    AppState.projects = [];
    AppState.currentProject = null;
    AppState.currentIssues = [];
    AppState.filteredIssues = [];
    AppState.selectedIssues.clear();
    AppState.favorites.clear();

    console.warn('🗑️ Mock data cleared from AppState');
}
