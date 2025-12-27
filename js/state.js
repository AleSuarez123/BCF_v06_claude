/**
 * APP STATE - Gestión del estado global de la aplicación
 */

export const AppState = {
    projects: [],
    currentProject: null,
    currentIssues: [],
    filteredIssues: [],
    selectedIssues: new Set(),
    focusedIndex: -1,
    viewMode: 'list',
    sortBy: 'date-desc',
    filters: {
        bcfFile: '',
        statuses: [],
        priorities: [],
        types: [],
        author: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    },
    currentIssueId: null,
    localChanges: {},
    theme: 'dark',
    favorites: new Set(),
    notifications: [],
    pendingBCFFiles: [],
    bcfServer: {
        url: '',
        token: ''
    }
};

export const STATUS_COLORS = {
    'open': 'open',
    'in_progress': 'progress',
    'resolved': 'resolved',
    'closed': 'closed',
    'Open': 'open',
    'In Progress': 'progress',
    'Resolved': 'resolved',
    'Closed': 'closed'
};

export const PRIORITY_COLORS = {
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low'
};

export const STATUS_LABELS = {
    'open': 'Abierto',
    'in_progress': 'En Proceso',
    'resolved': 'Resuelto',
    'closed': 'Cerrado',
    'Open': 'Abierto',
    'In Progress': 'En Proceso',
    'Resolved': 'Resuelto',
    'Closed': 'Cerrado'
};

export const PRIORITY_LABELS = {
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja',
    'High': 'Alta',
    'Medium': 'Media',
    'Low': 'Baja'
};

export const STORAGE_KEY = 'bcf_viewer_pro_data';
