/**
 * ISSUE MANAGER - Gestión de renderizado, filtrado y ordenamiento de incidencias
 */

import { AppState, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from './state.js';
import { $, $$, escapeHtml } from './ui-utils.js';
import { BCFParser } from './bcf-parser.js';
import { updateBulkActionsBar } from './selection-utils.js';

// Configuración de Iconos para cabeceras
export const HEADER_ICONS = {
    title: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
    status: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    priority: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 22h20L12 2zM12 16v2M12 8v5"/></svg>`,
    type: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    assigned: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    date: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    guid: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l8-4 10 10-8 8L3 15z"/><circle cx="8" cy="8" r="1.5"/></svg>`,
    comments: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg>`
};

// Iconos para valores específicos
export const STATUS_ICONS = {
    'Open': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
    'InProgress': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    'Done': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'Closed': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
};

export const PRIORITY_ICONS = {
    'High': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    'Medium': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f59e0b;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    'Low': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>`
};

// Configuración de Columnas (Estado local)
let columnConfig = [
    { id: 'checkbox', width: '48px', fixed: true, label: '' },
    { id: 'index', width: '60px', label: '#', fixed: true },
    { id: 'title', width: 'minmax(250px, 3fr)', label: 'TÍTULO', icon: HEADER_ICONS.title, resize: true, sortable: true },
    { id: 'status', width: 'minmax(120px, 1fr)', label: 'ESTADO', icon: HEADER_ICONS.status, resize: true, sortable: true },
    { id: 'priority', width: 'minmax(110px, 1fr)', label: 'PRIORIDAD', icon: HEADER_ICONS.priority, resize: true, sortable: true, align: 'center' },
    { id: 'type', width: 'minmax(110px, 1fr)', label: 'TIPO', icon: HEADER_ICONS.type, resize: true, sortable: true, align: 'center' },
    { id: 'assigned', width: 'minmax(160px, 1.5fr)', label: 'ASIGNADO A', icon: HEADER_ICONS.assigned, resize: true, sortable: true },
    { id: 'date', width: 'minmax(110px, 1fr)', label: 'FECHA', icon: HEADER_ICONS.date, resize: true, sortable: true },
    { id: 'labels', width: '150px', label: 'ETIQUETAS', icon: HEADER_ICONS.tag, resize: true, sortable: false, hidden: true },
    { id: 'comments', width: 'minmax(80px, 0.5fr)', label: 'COMENTARIOS', icon: HEADER_ICONS.comments, resize: true, sortable: false, fixed: true },
    { id: 'guid', width: '48px', label: 'GUID', icon: HEADER_ICONS.guid, resize: true, sortable: false, fixed: true },
    { id: 'actions', width: '80px', fixed: true, label: '' }
];

/**
 * Actualiza la configuración de columnas y refresca la vista
 * @param {Array} newConfigIds - Lista de IDs de columnas visibles en orden
 */
export function updateColumnConfig(newConfigIds) {
    // Definición maestra de todas las columnas posibles (para reconstruir config)
    const ALL_COLUMNS_DEF = {
        checkbox: { id: 'checkbox', width: '48px', fixed: true, label: '' },
        index: { id: 'index', width: '60px', label: '#', fixed: true },
        title: { id: 'title', width: 'minmax(250px, 3fr)', label: 'TÍTULO', icon: HEADER_ICONS.title, resize: true, sortable: true },
        status: { id: 'status', width: 'minmax(120px, 1fr)', label: 'ESTADO', icon: HEADER_ICONS.status, resize: true, sortable: true },
        priority: { id: 'priority', width: 'minmax(110px, 1fr)', label: 'PRIORIDAD', icon: HEADER_ICONS.priority, resize: true, sortable: true },
        type: { id: 'type', width: 'minmax(110px, 1fr)', label: 'TIPO', icon: HEADER_ICONS.type, resize: true, sortable: true, align: 'center' },
        assigned: { id: 'assigned', width: 'minmax(160px, 1.5fr)', label: 'ASIGNADO A', icon: HEADER_ICONS.assigned, resize: true, sortable: true },
        labels: { id: 'labels', width: '150px', label: 'ETIQUETAS', icon: HEADER_ICONS.tag, resize: true, sortable: false },
        date: { id: 'date', width: 'minmax(110px, 1fr)', label: 'FECHA', icon: HEADER_ICONS.date, resize: true, sortable: true },
        guid: { id: 'guid', width: '48px', label: 'GUID', icon: HEADER_ICONS.guid, resize: true, sortable: false, fixed: true },
        comments: { id: 'comments', width: 'minmax(80px, 0.5fr)', label: 'COMENTARIOS', icon: HEADER_ICONS.comments, resize: true, sortable: false, fixed: true },
        actions: { id: 'actions', width: '80px', fixed: true, label: '' }
    };

    // Reconstruir columnConfig basado en los IDs proporcionados
    // Siempre incluir checkbox e index al principio y actions al final si no están
    
    let newConfig = [];
    
    // 1. Fixed start
    newConfig.push(ALL_COLUMNS_DEF.checkbox);
    newConfig.push(ALL_COLUMNS_DEF.index);
    
    // 2. User defined (non-fixed columns)
    newConfigIds.forEach(id => {
        if (ALL_COLUMNS_DEF[id] && !ALL_COLUMNS_DEF[id].fixed) {
            newConfig.push(ALL_COLUMNS_DEF[id]);
        }
    });
    
    if (!newConfig.find(c => c.id === 'labels')) {
        // Labels column should be last user column, hidden by default
        const labelsCol = { ...ALL_COLUMNS_DEF.labels, hidden: true }; 
        newConfig.push(labelsCol);
    } else {
        // Ensure properties
        const idx = newConfig.findIndex(c => c.id === 'labels');
        if(idx !== -1) {
             newConfig[idx] = { ...newConfig[idx], ...ALL_COLUMNS_DEF.labels };
        }
    }

    newConfig = newConfig.filter(c => c.id !== 'guid' && c.id !== 'comments' && c.id !== 'actions');
    
    // Push fixed columns at end
    newConfig.push(ALL_COLUMNS_DEF.comments);
    newConfig.push(ALL_COLUMNS_DEF.guid);
    newConfig.push(ALL_COLUMNS_DEF.actions);
    
    columnConfig = newConfig;
    
    // Refrescar vista
    renderIssues();
}

// Estado de ordenamiento
let currentSort = { colId: null, direction: 'asc' };
// Estado de filtros por columna
let activeColumnFilters = {};
export function clearColumnFilters() { activeColumnFilters = {}; }

// Helpers para avatares
function stringToColor(str) {
    if (!str) return '#ccc';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 45%)`;
}

function getInitials(name) {
    if (!name) return '-';
    
    // Si parece un email, usar las 2 primeras letras del usuario (antes del @)
    if (name.includes('@')) {
        const localPart = name.split('@')[0];
        if (localPart.length >= 2) {
            return localPart.substring(0, 2).toUpperCase();
        }
        return localPart.substring(0, 1).toUpperCase();
    }
    
    // Si no es email, intentar usar iniciales de Nombre Apellido
    return name
        .split(/[\s.@]+/) // Split by space, dot, or @
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// Callbacks almacenados para re-renderizado
let listCallbacks = { 
    onIssueClick: (guid) => {
        console.warn('Callback onIssueClick no configurado. GUID:', guid);
    }, 
    onFavoriteClick: (guid) => {
        console.warn('Callback onFavoriteClick no configurado. GUID:', guid);
    } 
};

/**
 * Renderiza la lista o cuadrícula de incidencias según el modo de vista actual
 */
export function renderIssues(onIssueClick, onFavoriteClick) {
    // Actualizar callbacks si se proporcionan
    if (onIssueClick) listCallbacks.onIssueClick = onIssueClick;
    if (onFavoriteClick) listCallbacks.onFavoriteClick = onFavoriteClick;
    
    // Usar callbacks almacenados si no se proporcionan
    const issueCb = onIssueClick || listCallbacks.onIssueClick;
    const favCb = onFavoriteClick || listCallbacks.onFavoriteClick;

    const listContainer = $('#issues-list');
    const gridContainer = $('#issues-grid');
    const emptyState = $('#viewer-empty-state');

    if (!listContainer || !gridContainer || !emptyState) return;

    if (AppState.filteredIssues.length === 0) {
        listContainer.innerHTML = '';
        gridContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    if (AppState.viewMode === 'list') {
        listContainer.classList.remove('hidden');
        gridContainer.classList.add('hidden');
        renderIssuesList(issueCb, favCb);
    } else {
        listContainer.classList.add('hidden');
        gridContainer.classList.remove('hidden');
        renderIssuesGrid(issueCb, favCb);
    }

    updateNavIndicator();
}

function renderIssuesList(onIssueClick, onFavoriteClick) {
    const container = $('#issues-list');
    
    // Filtrar columnas ocultas
    const visibleColumns = columnConfig.filter(col => !col.hidden);
    
    // Generar estilo de grid dinámico
    const gridTemplate = visibleColumns.map(col => col.width).join(' ');
    container.style.setProperty('--grid-columns', gridTemplate);
    
    // Header dinámico
    const headerCols = visibleColumns.map((col, index) => {
        if (col.id === 'checkbox') {
            return `
                <div class="col-checkbox">
                    <label class="checkbox-wrapper" title="Seleccionar todo">
                        <input type="checkbox" id="select-all-list">
                        <span class="checkmark"></span>
                    </label>
                </div>`;
        }
        if (col.id === 'actions') {
        return `<div class="col-actions">
            <span class="col-header-label">ACCIONES</span>
        </div>`;
    }
        
        const isSorted = currentSort.colId === col.id;
        const sortIcon = isSorted 
            ? (currentSort.direction === 'asc' ? '↑' : '↓') 
            : '';
        const isFiltered = activeColumnFilters[col.id];
            
        if (col.id === 'guid') {
            return `<div class="col-header" data-col-id="${col.id}" data-col-index="${index}" aria-hidden="true"></div>`;
        }
        return `
            <div class="col-header ${col.resize ? 'draggable' : ''} ${isSorted ? 'sorted' : ''}" 
                 draggable="${col.resize}" 
                 data-col-id="${col.id}"
                 data-col-index="${index}">
                <div class="col-header-content ${col.sortable ? 'sortable' : ''}" onclick="${col.sortable ? `window.handleSort('${col.id}')` : ''}">
                    ${col.icon ? `<span class="col-header-icon">${col.icon}</span>` : ''}
                    ${col.id === 'comments' ? '' : `<span>${col.label}</span>`}
                    ${isSorted ? `<span class="sort-indicator">${sortIcon}</span>` : ''}
                    ${col.sortable ? `
                    <div class="col-header-filter ${isFiltered ? 'active' : ''}" 
                         onclick="event.stopPropagation(); window.handleFilter('${col.id}', this)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                        </svg>
                    </div>` : ''}
                </div>
                ${col.resize ? `<div class="col-resizer" data-col-index="${index}"></div>` : ''}
            </div>
        `;
    }).join('');

    const headerHtml = `<div class="issues-list-header">${headerCols}</div>`;
    
    // Aplicar ordenamiento si es necesario
    let issuesToRender = [...AppState.filteredIssues];
    if (currentSort.colId) {
        issuesToRender.sort((a, b) => {
            let valA, valB;
            
            // Obtener valores según columna
            switch (currentSort.colId) {
                case 'title': valA = a.title; valB = b.title; break;
                case 'status': valA = a.topicStatus; valB = b.topicStatus; break;
                case 'priority': valA = a.priority; valB = b.priority; break;
                case 'type': valA = a.topicType; valB = b.topicType; break;
                case 'assigned': valA = a.assignedTo || ''; valB = b.assignedTo || ''; break;
                case 'date': valA = new Date(a.creationDate); valB = new Date(b.creationDate); break;
                default: valA = ''; valB = '';
            }
            
            // Comparación
            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const rowsHtml = issuesToRender.map((issue, index) => {
        const isSelected = AppState.selectedIssues.has(issue.guid);
        const isFocused = index === AppState.focusedIndex;
        const isFavorite = AppState.favorites.has(issue.guid);
        const statusColor = `var(--status-${STATUS_COLORS[issue.topicStatus] || 'open'})`;

        // Generar celdas dinámicamente (solo columnas visibles)
        const cellsHtml = visibleColumns.map(col => getCellContent(col, issue, isFavorite, index)).join('');

        return `
            <div class="issue-row ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''} ${isFavorite ? 'favorite' : ''}" 
                 data-id="${issue.guid}" data-idx="${index}"
                 style="--row-status-color: ${statusColor}">
                ${cellsHtml}
            </div>
        `;
    }).join('');

    container.innerHTML = headerHtml + rowsHtml;

    // Listeners
    setupListListeners(container, onIssueClick, onFavoriteClick);
    setupColumnInteractions(container);
}

// Helper para generar contenido de celda
function getCellContent(col, issue, isFavorite, index) {
  const statusColor = `var(--status-${STATUS_COLORS[issue.topicStatus] || 'open'})`;

  switch (col.id) {
        case 'checkbox':
            const isSelected = AppState.selectedIssues.has(issue.guid);
            return `
                <div class="col-checkbox">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" class="issue-checkbox" ${isSelected ? 'checked' : ''} data-guid="${issue.guid}">
                        <span class="checkmark"></span>
                    </label>
                </div>`;
        case 'index':
            return `<div class="col-index" style="color: var(--text-muted); font-size: 0.9em; padding-left: 8px;">${index + 1}</div>`;
        case 'title':
            return `
                <div class="col-title">
                    <span class="issue-title-text">${escapeHtml(issue.title)}</span>
                    <span class="issue-subtitle">${escapeHtml(issue.bcfFile)}</span>
                </div>`;
        case 'status':
            return `
                <div class="col-status">
                    <span class="status-dot" style="background-color: ${statusColor}"></span>
                    ${STATUS_LABELS[issue.topicStatus] || issue.topicStatus}
                </div>`;
        case 'priority':
            return `
                <div class="col-priority" style="justify-content: center;">
                    <span class="priority-tag priority-${issue.priority?.toLowerCase() || 'medium'}">
                        ${PRIORITY_LABELS[issue.priority] || issue.priority}
                    </span>
                </div>`;
        case 'type':
            return `<div class="col-type" style="text-align: center; justify-content: center;">${escapeHtml(issue.topicType)}</div>`;
        case 'assigned':
            const assignedName = issue.assignedTo || '';
            const hasAssigned = assignedName.length > 0;
            const initials = hasAssigned ? getInitials(assignedName) : '-';
            const color = hasAssigned ? stringToColor(assignedName) : '#cbd5e1';
            
            return `
                <div class="col-assigned">
                    ${hasAssigned ? `
                    <div class="user-badge" title="${escapeHtml(assignedName)}">
                        <div class="user-avatar" style="background-color: ${color}">${initials}</div>
                        <span class="user-name">${escapeHtml(assignedName)}</span>
                    </div>
                    ` : '<span class="text-muted">-</span>'}
                </div>`;
        case 'labels':
            const labelChips = (issue.labels || []).map(l => {
                const color = stringToColor(l);
                return `<span class="label-chip" style="
                    display: inline-block; 
                    padding: 2px 6px; 
                    border-radius: 12px; 
                    background-color: ${color}20; 
                    color: ${color}; 
                    border: 1px solid ${color}40;
                    font-size: 0.8em;
                    margin-right: 4px;
                ">${escapeHtml(l)}</span>`;
            }).join('');
            return `<div class="col-labels" style="padding-left: 8px; text-align: center;">${labelChips}</div>`;
        case 'date':
            return `<div class="col-date">${issue.creationDateFormatted?.split(' ')[0] || '-'}</div>`;
        case 'guid':
            return `
                <div class="col-guid">
                    <button class="btn btn-icon btn-ghost btn-sm btn-copy-guid" data-guid="${issue.guid}" title="Copiar GUID">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>`;
    case 'comments':
            const remoteCount = (issue.bcfComments?.length || 0);
            const commentCount = remoteCount + (issue.comments?.length || 0) + (issue.localComments?.length || 0);
            const unread = Math.max(0, remoteCount - (issue.lastReadRemoteCount || 0));
            return `
                <div class="col-comments">
                    <span class="comment-badge ${commentCount > 0 ? 'has-comments' : ''}" title="${commentCount} comentarios">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        ${commentCount > 0 ? commentCount : ''}
                        ${unread > 0 ? `<span class="unread-badge" title="${unread} sin leer">${unread}</span>` : ''}
                    </span>
                </div>`;
        case 'actions':
            return `
                <div class="col-actions">
                    <button class="btn btn-icon btn-ghost btn-sm btn-favorite ${isFavorite ? 'active' : ''}" data-id="${issue.guid}" title="Marcar favorito">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                    <button class="btn btn-icon btn-ghost btn-sm btn-edit" data-id="${issue.guid}" title="Editar incidencia">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                </div>`;
        default:
            return `<div></div>`;
    }
}

// Exponer función de ordenamiento globalmente para el onclick inline
window.handleSort = function(colId) {
    if (currentSort.colId === colId) {
        if (currentSort.direction === 'asc') {
            currentSort.direction = 'desc';
        } else {
            // Tercer clic: desactivar orden
            currentSort.colId = null;
            currentSort.direction = 'asc';
        }
    } else {
        currentSort.colId = colId;
        currentSort.direction = 'asc';
    }
    // Disparar evento para re-renderizar
    document.dispatchEvent(new CustomEvent('issues:refresh'));
};

window.handleFilter = function(colId, element) {
    // Close existing popups
    const existing = document.querySelector('.filter-popup');
    if (existing) existing.remove();
    
    // Si ya estaba abierto en este elemento, solo cerrar
    if (element.classList.contains('open-popup')) {
        element.classList.remove('open-popup');
        return;
    }

    // Marcar como abierto
    document.querySelectorAll('.col-header-filter').forEach(el => el.classList.remove('open-popup'));
    element.classList.add('open-popup');
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'filter-popup';
    
    // Content based on column type
    const content = getFilterContent(colId);
    popup.innerHTML = content;
    
    document.body.appendChild(popup);

    // Position
    if (window.innerWidth < 768) {
        // Mobile: Center on screen
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.width = '90%';
        popup.style.maxWidth = '320px';
    } else {
        // Desktop: Position relative to button
        const rect = element.getBoundingClientRect();
        let left = rect.left;
        
        // Check right edge
        if (left + 280 > window.innerWidth) {
            left = window.innerWidth - 290;
        }
        
        // Check left edge
        if (left < 10) {
            left = 10;
        }

        popup.style.top = `${rect.bottom + 8}px`;
        popup.style.left = `${left}px`;
        
        // Check bottom edge
        const popupHeight = popup.offsetHeight || 300;
        if (rect.bottom + popupHeight + 20 > window.innerHeight) {
             // If not enough space below, check if enough space above
             if (rect.top - popupHeight - 8 > 0) {
                 popup.style.top = `${rect.top - popupHeight - 8}px`;
             } else {
                 // If neither, stick to below and limit height
                 popup.style.maxHeight = `${window.innerHeight - rect.bottom - 20}px`;
                 popup.style.overflowY = 'auto';
             }
        }
    }
    
    // Add event listeners for popup
    setupFilterPopupListeners(popup, colId);
    
    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', closeFilterPopup);
    }, 0);
};

function closeFilterPopup(e) {
    const popup = document.querySelector('.filter-popup');
    if (popup && !popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closeFilterPopup);
        document.querySelectorAll('.col-header-filter').forEach(el => el.classList.remove('open-popup'));
    }
}

function getFilterContent(colId) {
    const currentFilter = activeColumnFilters[colId];
    
    let body = '';
    
    if (colId === 'title') {
        const val = currentFilter?.value || '';
        body = `
            <input type="text" class="filter-search-input" placeholder="Buscar..." value="${escapeHtml(val)}">
        `;
    } else if (['status', 'priority', 'type', 'assigned'].includes(colId)) {
        // Get unique values
        const field = colId === 'status' ? 'topicStatus' : (colId === 'type' ? 'topicType' : (colId === 'assigned' ? 'assignedTo' : colId));
        const values = BCFParser.getUniqueValues(AppState.currentIssues, field);
        
        // Check for empty values
        const hasEmpty = AppState.currentIssues.some(i => !i[field]);
        if (hasEmpty && !values.includes('')) {
             values.unshift(''); 
        }

        const selected = currentFilter?.value || [];
        
        const list = values.map(v => {
            const isChecked = selected.includes(v);
            const label = colId === 'status' ? (STATUS_LABELS[v] || v) : (colId === 'priority' ? (PRIORITY_LABELS[v] || v) : (v || 'Sin asignar'));
            const val = v || ''; // Empty string for unassigned
            return `
                <label class="filter-checkbox-item">
                    <input type="checkbox" value="${escapeHtml(val)}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(label)}</span>
                </label>
            `;
        }).join('');
        
        body = `
            <div class="filter-search-input" style="margin-bottom: 8px;">
                <input type="text" placeholder="Filtrar opciones..." style="width: 100%; border: none; background: transparent; outline: none;">
            </div>
            <div class="filter-checkbox-list">
                ${list}
            </div>
        `;
    } else if (colId === 'date') {
        const from = currentFilter?.from || '';
        const to = currentFilter?.to || '';
        body = `
            <div class="filter-date-range">
                <div>
                    <div class="filter-label">Desde</div>
                    <input type="date" class="filter-date-input" id="filter-date-from-col" value="${from}">
                </div>
                <div>
                    <div class="filter-label">Hasta</div>
                    <input type="date" class="filter-date-input" id="filter-date-to-col" value="${to}">
                </div>
            </div>
        `;
    }

    return `
        <div class="filter-popup-header">
            <span>Filtrar por ${columnConfig.find(c => c.id === colId)?.label || colId}</span>
            <span class="filter-popup-close" onclick="document.querySelector('.filter-popup').remove(); document.removeEventListener('click', closeFilterPopup);">✕</span>
        </div>
        <div class="filter-popup-body">
            ${body}
        </div>
        <div class="filter-popup-footer">
            <button class="btn btn-ghost btn-sm" id="btn-filter-clear">Limpiar</button>
            <button class="btn btn-primary btn-sm" id="btn-filter-apply">Aplicar</button>
        </div>
    `;
}

function setupFilterPopupListeners(popup, colId) {
    const applyBtn = popup.querySelector('#btn-filter-apply');
    const clearBtn = popup.querySelector('#btn-filter-clear');
    
    // Search in checkbox list
    const searchInput = popup.querySelector('.filter-search-input input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            popup.querySelectorAll('.filter-checkbox-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(term) ? 'flex' : 'none';
            });
        });
    }

    applyBtn.addEventListener('click', () => {
        let filter = null;
        
        if (colId === 'title') {
            const val = popup.querySelector('input').value;
            if (val) filter = { type: 'text', value: val };
        } else if (colId === 'date') {
            const from = popup.querySelector('#filter-date-from-col').value;
            const to = popup.querySelector('#filter-date-to-col').value;
            if (from || to) filter = { type: 'date', from, to };
        } else {
            const checked = Array.from(popup.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            if (checked.length > 0) filter = { type: 'select', value: checked };
        }
        
        if (filter) {
            activeColumnFilters[colId] = filter;
        } else {
            delete activeColumnFilters[colId];
        }
        
        applyFiltersAndSort();
        renderIssues();
        popup.remove();
        document.removeEventListener('click', closeFilterPopup);
    });

    clearBtn.addEventListener('click', () => {
        delete activeColumnFilters[colId];
        applyFiltersAndSort();
        renderIssues();
        popup.remove();
        document.removeEventListener('click', closeFilterPopup);
    });
    
    // Prevent closing when clicking inside popup
    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}


function setupListListeners(container, onIssueClick, onFavoriteClick) {
    // Select All
    const selectAll = container.querySelector('#select-all-list');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const checkboxes = container.querySelectorAll('.issue-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = checked;
                const guid = cb.dataset.guid;
                if (checked) AppState.selectedIssues.add(guid);
                else AppState.selectedIssues.delete(guid);
                cb.closest('.issue-row').classList.toggle('selected', checked);
            });
            updateBulkActionsBar();
        });
    }

    attachListeners(container, onIssueClick, onFavoriteClick);
}

function setupColumnInteractions(container) {
    const headers = container.querySelectorAll('.col-header.draggable');
    let draggedCol = null;

    headers.forEach(header => {
        // Drag & Drop
        header.addEventListener('dragstart', (e) => {
            draggedCol = header;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', header.dataset.colIndex);
            header.classList.add('opacity-50');
        });

        header.addEventListener('dragend', () => {
            draggedCol = null;
            headers.forEach(h => {
                h.classList.remove('opacity-50');
                h.classList.remove('drag-over');
            });
        });

        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (header === draggedCol) return;
            
            // Detectar si estamos en la mitad izquierda o derecha
            const rect = header.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            const isRight = e.clientX > midpoint;
            
            header.classList.remove('drop-target-left', 'drop-target-right');
            header.classList.add(isRight ? 'drop-target-right' : 'drop-target-left');
        });

        header.addEventListener('dragleave', () => {
            header.classList.remove('drop-target-left', 'drop-target-right');
        });

        header.addEventListener('drop', (e) => {
            e.preventDefault();
            header.classList.remove('drop-target-left', 'drop-target-right');
            
            if (!draggedCol || header === draggedCol) return;

            const fromIndex = parseInt(draggedCol.dataset.colIndex);
            let toIndex = parseInt(header.dataset.colIndex);
            
            // Ajustar índice destino según posición de drop
            const rect = header.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            const isRight = e.clientX > midpoint;
            
            if (isRight) toIndex++; // Insertar después
            if (fromIndex < toIndex) toIndex--; // Ajustar por eliminación previa

            if (fromIndex !== toIndex) {
                // Reorder array
                const item = columnConfig[fromIndex];
                columnConfig.splice(fromIndex, 1);
                columnConfig.splice(toIndex, 0, item);
                
                document.dispatchEvent(new CustomEvent('issues:refresh'));
            }
        });
    });

    // Resizing
    const resizers = container.querySelectorAll('.col-resizer');
    resizers.forEach(resizer => {
        const header = resizer.parentElement;
        const colIndex = parseInt(header.dataset.colIndex);

        resizer.addEventListener('mousedown', (ev) => {
            const now = Date.now();
            if (now - (resizer.lastClickTime || 0) < 300) {
                // Double click detected - Auto resize
                columnConfig[colIndex].width = 'minmax(100px, max-content)';
                const gridTemplate = columnConfig.map(c => c.width).join(' ');
                container.style.setProperty('--grid-columns', gridTemplate);
                ev.stopPropagation(); 
                return;
            }
            resizer.lastClickTime = now;
            
            // Single click - Start Drag
            initResizeDrag(ev, resizer, header, colIndex);
        });
        
        // Prevent propagation to header sort
        resizer.addEventListener('click', e => e.stopPropagation());
    });
}

function initResizeDrag(e, resizer, header, colIndex) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = header.offsetWidth;

    function doDrag(e) {
        const newWidth = startWidth + (e.clientX - startX);
        if (newWidth > 50) { // Min width
            columnConfig[colIndex].width = `${newWidth}px`;
            // Actualizar solo CSS variable para performance
            const gridTemplate = columnConfig.map(c => c.width).join(' ');
            $('#issues-list').style.setProperty('--grid-columns', gridTemplate);
        }
    }

    function stopDrag() {
        document.documentElement.removeEventListener('mousemove', doDrag);
        document.documentElement.removeEventListener('mouseup', stopDrag);
    }

    document.documentElement.addEventListener('mousemove', doDrag);
    document.documentElement.addEventListener('mouseup', stopDrag);
}

function renderIssuesGrid(onIssueClick, onFavoriteClick) {
    const container = $('#issues-grid');
    
    const visibleColumns = columnConfig.filter(col => !col.hidden);
    const colVisible = (id) => visibleColumns.some(c => c.id === id);
    const labelsColumnEnabled = colVisible('labels');
    
    container.innerHTML = AppState.filteredIssues.map((issue, index) => {
        const isSelected = AppState.selectedIssues.has(issue.guid);
        const isFavorite = AppState.favorites.has(issue.guid);
        
        // Assigned User
        const assignedName = issue.assignedTo || '';
        const hasAssigned = assignedName.length > 0;
        const initials = hasAssigned ? getInitials(assignedName) : '-';
        const color = hasAssigned ? stringToColor(assignedName) : '#cbd5e1';

        return `
            <div class="issue-card ${isSelected ? 'selected' : ''} ${isFavorite ? 'favorite' : ''}" data-id="${issue.guid}" data-idx="${index}">
                <div class="issue-card-checkbox">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" class="issue-checkbox" ${isSelected ? 'checked' : ''} data-guid="${issue.guid}">
                        <span class="checkmark"></span>
                    </label>
                </div>
                
                <div class="issue-card-actions">
                    <button class="btn btn-icon btn-ghost btn-sm btn-favorite ${isFavorite ? 'active' : ''}" data-id="${issue.guid}" title="Marcar favorito">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                    <button class="btn btn-icon btn-ghost btn-sm btn-edit" data-id="${issue.guid}" title="Editar incidencia">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    ${colVisible('guid') ? `
                    <button class="btn btn-icon btn-ghost btn-sm btn-copy-guid" data-guid="${issue.guid}" title="Copiar GUID">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>` : ''}
                </div>

                <div class="issue-card-snapshot">
                    ${issue.snapshotUrl ? 
                        `<img src="${issue.snapshotUrl}" alt="Snapshot" class="issue-thumb">` :
                        `<div class="no-snapshot" style="height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); color: var(--text-muted);">
                            <div style="text-align: center;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                </svg>
                                <div style="font-size: 0.7rem;">Sin imagen</div>
                            </div>
                        </div>`
                    }
                </div>
                
                <div class="issue-card-content">
                    <div class="issue-header">
                        <div style="display: flex; align-items: flex-start; gap: 8px;">
                            <span class="issue-index" style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.85rem; padding-top: 2px;">#${index + 1}</span>
                            <h4 class="issue-title" title="${escapeHtml(issue.title)}" style="margin: 0;">
                                ${escapeHtml(issue.title)}
                            </h4>
                        </div>
                    </div>
                    
                    <div class="issue-badges">
                        ${colVisible('status') ? `
                        <span class="badge badge-status-${STATUS_COLORS[issue.topicStatus] || 'open'}">
                            ${STATUS_LABELS[issue.topicStatus] || issue.topicStatus}
                        </span>` : ''}
                        ${colVisible('priority') ? `
                        <span class="badge badge-priority-${PRIORITY_COLORS[issue.priority] || 'medium'}" style="justify-content: center;">
                            ${PRIORITY_LABELS[issue.priority] || issue.priority}
                        </span>` : ''}
                        ${colVisible('type') ? `
                        <span class="badge" style="display: inline-flex; align-items: center; justify-content: center;">
                            ${escapeHtml(issue.topicType)}
                        </span>` : ''}
                    </div>

                    <div class="issue-meta">
                        ${colVisible('assigned') ? `
                            ${hasAssigned ? `
                            <div class="user-badge" title="${escapeHtml(assignedName)}">
                                <div class="user-avatar" style="background-color: ${color}">${initials}</div>
                                <span class="user-name">${escapeHtml(assignedName)}</span>
                            </div>` : '<span class="text-muted" style="font-size: 0.8rem">-</span>'}
                        ` : ''}
                        ${colVisible('date') ? `
                            <span style="font-family: var(--font-mono);">${issue.creationDateFormatted?.split(' ')[0] || '-'}</span>
                        ` : ''}
                        ${colVisible('comments') ? (() => {
                            const remoteCount = (issue.bcfComments?.length || 0);
                            const commentCount = remoteCount + (issue.comments?.length || 0) + (issue.localComments?.length || 0);
                            const unread = Math.max(0, remoteCount - (issue.lastReadRemoteCount || 0));
                            return `
                            <span class="comment-badge ${commentCount > 0 ? 'has-comments' : ''}" title="${commentCount} comentarios">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                ${commentCount > 0 ? commentCount : ''}
                                ${unread > 0 ? `<span class="unread-badge" title="${unread} sin leer">${unread}</span>` : ''}
                            </span>`;
                        })() : ''}
                    </div>
                    
                    ${labelsColumnEnabled && (issue.labels || []).length > 0 ? `
                    <div class="issue-labels" style="margin-top: 8px;">
                        ${(issue.labels || []).map(l => {
                            const color = stringToColor(l);
                            return `<span class="label-chip" style="
                                display: inline-block; 
                                padding: 2px 6px; 
                                border-radius: 12px; 
                                background-color: ${color}20; 
                                color: ${color}; 
                                border: 1px solid ${color}40;
                                font-size: 0.8em;
                                margin-right: 4px;
                                margin-bottom: 4px;
                            ">${escapeHtml(l)}</span>`;
                        }).join('')}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    attachListeners(container, onIssueClick, onFavoriteClick);
}

function attachListeners(container, onIssueClick, onFavoriteClick) {
    // Click en la fila/tarjeta para abrir detalle
    container.querySelectorAll('.issue-row, .issue-card').forEach(el => {
        el.addEventListener('click', e => {
            if (e.target.closest('.issue-checkbox, .checkbox-wrapper, .issue-row-actions, .issue-card-checkbox')) {
                return;
            }
            if (onIssueClick && typeof onIssueClick === 'function') {
                onIssueClick(el.dataset.id);
            }
        });
    });

    // Checkboxes de selección
    container.querySelectorAll('.issue-checkbox').forEach(cb => {
        cb.addEventListener('change', e => {
            const guid = cb.dataset.guid;
            if (cb.checked) AppState.selectedIssues.add(guid);
            else AppState.selectedIssues.delete(guid);
            updateBulkActionsBar();
            cb.closest('.issue-row, .issue-card').classList.toggle('selected', cb.checked);
        });
    });

    // Favoritos
    container.querySelectorAll('.btn-favorite').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (typeof onFavoriteClick === 'function') {
                onFavoriteClick(btn.dataset.id);
            }
        });
    });

    // Snapshot
    container.querySelectorAll('.btn-snapshot').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const guid = btn.dataset.guid;
            const issue = AppState.currentIssues.find(i => i.guid === guid);
            if (issue && issue.snapshot) {
                const url = issue.snapshotUrl || (issue.snapshot instanceof Blob ? URL.createObjectURL(issue.snapshot) : issue.snapshot);
                if (window.openSnapshot) {
                    window.openSnapshot(url);
                } else {
                    const modal = $('#modal-snapshot');
                    const img = $('#snapshot-image');
                    if (modal && img) {
                        img.src = url;
                        modal.classList.add('active');
                    }
                }
            }
        });
    });

  container.querySelectorAll('.comment-badge').forEach(badge => {
    badge.addEventListener('dblclick', e => {
      e.stopPropagation();
      const row = badge.closest('.issue-row, .issue-card');
      const guid = row?.dataset.id;
      if (guid) {
          // Use dynamic import but ensure store is available or pass intent differently
          import('./edit-panel.js').then(m => {
              m.store.dispatch({ type: 'SET_TAB', payload: 'comentarios' });
              m.openEditSidebar(guid);
          });
      }
    });
  });

  // Editar (solo desde los botones específicos)
  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      import('./edit-panel.js').then(m => m.openEditSidebar(btn.dataset.id));
    });
  });
  
  container.querySelectorAll('.issue-title-text').forEach(span => {
    span.addEventListener('dblclick', e => {
      e.stopPropagation();
      const row = span.closest('.issue-row, .issue-card');
      const guid = row?.dataset.id;
      const issue = AppState.currentIssues.find(i => i.guid === guid);
      if (!issue) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'list-title-input';
      input.value = issue.title || '';
      const parent = span.parentElement;
      if (!parent) return;
      parent.replaceChild(input, span);
      input.focus();
      const commit = async () => {
        issue.title = input.value.trim();
        import('./storage.js').then(m => m.Storage.saveAll());
        renderIssues(onIssueClick, onFavoriteClick);
      };
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { commit(); }
        if (ev.key === 'Escape') { renderIssues(onIssueClick, onFavoriteClick); }
      });
      input.addEventListener('blur', () => commit());
    });
  });
    
    // Copiar GUID
    container.querySelectorAll('.btn-copy-guid').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const guid = btn.dataset.guid;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(guid);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = guid;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                btn.title = 'GUID copiado';
                btn.classList.add('active');
                setTimeout(() => {
                    btn.title = 'Copiar GUID';
                    btn.classList.remove('active');
                }, 1500);
            } catch (err) {
                console.warn('No se pudo copiar el GUID:', err);
            }
        });
    });
}

/**
 * Actualiza las opciones de los filtros basadas en las incidencias actuales
 */
export function updateFilterOptions() {
    const bcfSelect = $('#filter-bcf');
    if (bcfSelect) {
        bcfSelect.innerHTML = '<option value="">Todos</option>' +
            (AppState.currentProject?.bcfFiles || []).map(bcf => 
                `<option value="${escapeHtml(bcf.fileName)}">${escapeHtml(bcf.fileName)}</option>`
            ).join('');
    }

    const statuses = BCFParser.getUniqueValues(AppState.currentIssues, 'topicStatus');
    const priorities = BCFParser.getUniqueValues(AppState.currentIssues, 'priority');
    const types = BCFParser.getUniqueValues(AppState.currentIssues, 'topicType');
    const authors = BCFParser.getUniqueValues(AppState.currentIssues, 'creationAuthor');

    const statusFilter = $('#filter-status');
    if (statusFilter) {
        statusFilter.innerHTML = statuses.map(status => `
            <label class="filter-chip" data-value="${status}">
                <input type="checkbox" hidden>
                <span class="filter-chip-dot" style="background:var(--status-${STATUS_COLORS[status] || 'open'})"></span>
                ${STATUS_LABELS[status] || status}
            </label>
        `).join('');
    }

    const priorityFilter = $('#filter-priority');
    if (priorityFilter) {
        priorityFilter.innerHTML = priorities.map(priority => `
            <label class="filter-chip" data-value="${priority}">
                <input type="checkbox" hidden>
                <span class="filter-chip-dot" style="background:var(--priority-${PRIORITY_COLORS[priority] || 'medium'})"></span>
                ${PRIORITY_LABELS[priority] || priority}
            </label>
        `).join('');
    }

    const typeFilter = $('#filter-discipline');
    if (typeFilter) {
        typeFilter.innerHTML = types.map(type => `
            <label class="filter-chip" data-value="${type}">
                <input type="checkbox" hidden>
                ${escapeHtml(type)}
            </label>
        `).join('');
    }

    const authorsList = $('#authors-list');
    if (authorsList) {
        authorsList.innerHTML = authors.map(author => 
            `<option value="${escapeHtml(author)}">`
        ).join('');
    }

    // Re-vincular listeners de chips
    $$('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            // Nota: applyFiltersAndSort debe ser llamado desde fuera
            document.dispatchEvent(new CustomEvent('filter-changed'));
        });
    });
}

/**
 * Filtra incidencias según filtros de columna
 */
export function filterIssuesByColumns(issues, columnFilters) {
    if (Object.keys(columnFilters).length === 0) return issues;
    
    return issues.filter(issue => {
        return Object.entries(columnFilters).every(([colId, filter]) => {
            if (!filter) return true;
            
            let value;
            switch (colId) {
                case 'title': value = issue.title; break;
                case 'status': value = issue.topicStatus; break;
                case 'priority': value = issue.priority; break;
                case 'type': value = issue.topicType; break;
                case 'assigned': value = issue.assignedTo || ''; break;
                case 'date': value = issue.creationDate; break;
                default: return true;
            }

            if (filter.type === 'text') {
                return (value || '').toString().toLowerCase().includes(filter.value.toLowerCase());
            } else if (filter.type === 'select') {
                return filter.value.length === 0 || filter.value.includes(value);
            } else if (filter.type === 'date') {
                if (!value) return false;
                const date = new Date(value);
                const from = filter.from ? new Date(filter.from) : null;
                const to = filter.to ? new Date(filter.to) : null;
                if (from && date < from) return false;
                if (to) {
                    to.setHours(23, 59, 59, 999);
                    if (date > to) return false;
                }
                return true;
            }
            return true;
        });
    });
}

/**
 * Aplica filtros y ordenamiento a las incidencias actuales
 */
export function applyFiltersAndSort() {
    const filterBcf = $('#filter-bcf');
    const filterAuthor = $('#filter-author');
    const filterDateFrom = $('#filter-date-from');
    const filterDateTo = $('#filter-date-to');
    const filterSearch = $('#filter-search');
    const sortBy = $('#sort-by');
    if (sortBy && !sortBy.querySelector('option[value="deadline-asc"]')) {
        const opt = document.createElement('option');
        opt.value = 'deadline-asc';
        opt.textContent = 'Vencen pronto';
        sortBy.appendChild(opt);
    }

    AppState.filters.bcfFile = filterBcf ? filterBcf.value : '';
    AppState.filters.statuses = Array.from($$('#filter-status .filter-chip.active')).map(c => c.dataset.value);
    AppState.filters.priorities = Array.from($$('#filter-priority .filter-chip.active')).map(c => c.dataset.value);
    AppState.filters.types = Array.from($$('#filter-discipline .filter-chip.active')).map(c => c.dataset.value);
    AppState.filters.author = filterAuthor ? filterAuthor.value : '';
    AppState.filters.dateFrom = filterDateFrom ? filterDateFrom.value : '';
    AppState.filters.dateTo = filterDateTo ? filterDateTo.value : '';
    AppState.filters.search = filterSearch ? filterSearch.value : '';
    AppState.filters.onlyFavorites = $('#btn-filter-favorites')?.classList.contains('active');
    AppState.filters.favoritesSet = AppState.favorites;
    AppState.sortBy = sortBy ? sortBy.value : 'date-desc';

    let filtered = BCFParser.filterIssues(AppState.currentIssues, AppState.filters);

    // Aplicar filtros de columna
    filtered = filterIssuesByColumns(filtered, activeColumnFilters);

    AppState.filteredIssues = BCFParser.sortIssues(filtered, AppState.sortBy);
    AppState.focusedIndex = -1;

    const filteredCount = $('#filtered-count');
    if (filteredCount) filteredCount.textContent = AppState.filteredIssues.length;
    
    import('./ui-utils.js').then(m => m.updateGlobalStats());
    updateActiveFiltersBadge();
}

function updateActiveFiltersBadge() {
    const f = AppState.filters || {};
    let c = 0;
    if (f.bcfFile) c++;
    if (f.statuses && f.statuses.length) c++;
    if (f.priorities && f.priorities.length) c++;
    if (f.types && f.types.length) c++;
    if (f.author) c++;
    if (f.dateFrom || f.dateTo) c++;
    if (f.search) c++;
    if (f.onlyFavorites) c++;
    c += Object.keys(activeColumnFilters || {}).length;
    const badge = document.getElementById('active-filters-badge');
    if (badge) {
        if (c > 0) {
            badge.textContent = c;
            badge.classList.remove('hidden');
        } else {
            badge.textContent = '0';
            badge.classList.add('hidden');
        }
    }
    const btn = document.getElementById('btn-clear-filters-header');
    if (btn) {
        const text = c > 0 ? `Limpiar filtros (${c} activos)` : 'Limpiar filtros';
        btn.setAttribute('aria-label', text);
        btn.title = text;
        
        // Ensure click handler is attached
        btn.onclick = () => {
            // Reset filters
            if (AppState.filters) {
                AppState.filters.bcfFile = '';
                AppState.filters.statuses = [];
                AppState.filters.priorities = [];
                AppState.filters.types = [];
                AppState.filters.author = '';
                AppState.filters.dateFrom = '';
                AppState.filters.dateTo = '';
                AppState.filters.search = '';
                AppState.filters.onlyFavorites = false;
            }
            
            // Reset column filters
            clearColumnFilters();
            
            // Reset UI inputs
            const inputs = document.querySelectorAll('#filter-bcf, #filter-author, #filter-date-from, #filter-date-to, #filter-search');
            inputs.forEach(i => i.value = '');
            document.querySelectorAll('.filter-chip.active').forEach(c => c.classList.remove('active'));
            const favBtn = document.getElementById('btn-filter-favorites');
            if (favBtn) favBtn.classList.remove('active');
            const sortSelect = document.getElementById('sort-by');
            if (sortSelect) sortSelect.value = 'date-desc';

            applyFiltersAndSort();
            renderIssues();
        };
    }
}

/**
 * Abre el modal de creación/edición de incidencia
 */
export function openEditIssueModal(guid = null) {
    import('./edit-panel.js').then(m => m.openEditSidebar(guid));
}

/**
 * Guarda o actualiza una incidencia
 */
export async function saveIssue(formData) {
  const guid = formData.get('guid');
  const isNew = !guid;
  
  const issueData = {
    title: formData.get('title'),
    description: formData.get('description'),
    topicStatus: formData.get('status'),
    priority: (formData.get('priority') || '').trim(),
    topicType: formData.get('type'),
    assignedTo: formData.get('assigned'),
    labels: formData.get('labels') ? formData.get('labels').split(',').map(l => l.trim()) : [],
    dueDate: formData.get('dueDate') || '',
    modifiedDate: new Date().toISOString(),
    modifiedDateFormatted: BCFParser.formatDate(new Date().toISOString())
  };

    if (isNew) {
        // Crear nueva incidencia
        const newIssue = {
            ...issueData,
            guid: crypto.randomUUID(),
            topicStatus: issueData.topicStatus || 'Open',
            priority: issueData.priority || 'Medium',
            creationDate: new Date().toISOString(),
            creationDateFormatted: BCFParser.formatDate(new Date().toISOString()),
            creationAuthor: 'Usuario Actual',
            bcfFile: AppState.currentProject?.bcfFiles[0]?.fileName || 'Manual',
            bcfVersion: '3.0',
            comments: []
        };

        // Añadir al proyecto actual
        if (AppState.currentProject) {
            // Buscamos el primer archivo BCF para añadirla ahí (o creamos uno virtual)
            if (AppState.currentProject.bcfFiles.length === 0) {
                AppState.currentProject.bcfFiles.push({
                    fileName: 'incidencias_locales.bcf',
                    version: '3.0',
                    topics: []
                });
            }
            AppState.currentProject.bcfFiles[0].topics.push(newIssue);
        }

        AppState.currentIssues.push(newIssue);
    } else {
        // Actualizar incidencia existente
        const issue = AppState.currentIssues.find(i => i.guid === guid);
        if (issue) {
            Object.assign(issue, issueData);
            
            // También actualizar en el proyecto persistente
            AppState.projects.forEach(p => {
                p.bcfFiles.forEach(bcf => {
                    const topic = bcf.topics?.find(t => t.guid === guid);
                    if (topic) {
                        Object.assign(topic, issueData);
                    }
                });
            });
        }
    }

    // Guardar cambios
    import('./storage.js').then(m => m.Storage.saveAll());
    
    // Refrescar UI
    applyFiltersAndSort();
    renderIssues();
    import('./ui-utils.js').then(m => m.updateGlobalStats());
    
    return true;
}

function updateNavIndicator() {
    const indicator = document.getElementById('nav-indicator');
    if (!indicator) return;
    
    const total = AppState.filteredIssues.length;
    const current = total > 0 && AppState.focusedIndex >= 0 ? AppState.focusedIndex + 1 : 0;
    
    indicator.textContent = `${current} de ${total}`;
    indicator.classList.toggle('hidden', total === 0);
}

export function updateNavIndicatorUI() {
    $$('.issue-row, .issue-card').forEach((el, index) => {
        el.classList.toggle('focused', index === AppState.focusedIndex);
    });
    
    if (AppState.focusedIndex >= 0) {
        const focusedEl = $$('.issue-row, .issue-card')[AppState.focusedIndex];
        if (focusedEl) {
            focusedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    updateNavIndicator();
}

export function renderProjects() {
    const container = document.getElementById('projects-grid');
    if (!container) return;
    
    // Capture old positions
    const oldPositions = new Map();
    container.querySelectorAll('.project-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        oldPositions.set(card.dataset.id, { left: rect.left, top: rect.top });
    });

    if (AppState.projects.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        container.innerHTML = '';
        return;
    }
    
    document.getElementById('empty-state').classList.add('hidden');
    
    // Calculate pinned status
    const pinned = AppState.projects.filter(p => p.pinned);
    const unpinned = AppState.projects.filter(p => !p.pinned);
    const displayProjects = [...pinned, ...unpinned];
    
    container.innerHTML = displayProjects.map(p => {
        const fileCount = p.bcfFiles?.length || 0;
        const fileLabel = fileCount === 1 ? 'archivo' : 'archivos';
        const dateStr = new Date(p.createdAt).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
        const initials = getInitials(p.name);
        const color = stringToColor(p.name);

        return `
        <div class="project-card ${p.pinned ? 'pinned' : ''}" data-id="${p.id}" onclick="window.loadProject('${p.id}')">
            <div class="project-card-header">
                <div class="project-icon" style="background-color: ${color}">
                    ${initials}
                </div>
                <div class="project-actions">
                    <button class="btn btn-icon btn-ghost btn-sm ${p.pinned ? 'active' : ''}" onclick="event.stopPropagation(); toggleProjectPin('${p.id}')" title="${p.pinned ? 'Desanclar' : 'Anclar'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22v-5"></path>
                            <path d="M16 3v6l3 3H5l3-3V3"></path>
                        </svg>
                    </button>
                    <button class="btn btn-icon btn-ghost btn-sm" onclick="event.stopPropagation(); editProject('${p.id}')" title="Editar proyecto">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn btn-icon btn-ghost btn-sm" onclick="event.stopPropagation(); deleteProject('${p.id}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
            <div class="project-info">
                <h3>${escapeHtml(p.name)}</h3>
                <p class="project-desc">${escapeHtml(p.description || 'Sin descripción')}</p>
                <div class="project-meta">
                    ${p.pinned ? `
                    <span title="Anclado" aria-label="Anclado" class="pinned-indicator">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22v-5"></path>
                            <path d="M16 3v6l3 3H5l3-3V3"></path>
                        </svg>
                    </span>` : ''}
                    <span title="Archivos">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        ${fileCount} ${fileLabel}
                    </span>
                    <span title="Fecha de creación">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${dateStr}
                    </span>
                </div>
            </div>
        </div>
    `}).join('');
    
    // Exponer función global para el onclick
    window.loadProject = (id) => {
        import('./main.js').then(m => m.loadProject(id));
    };
    
    window.toggleProjectPin = (id) => {
        const project = AppState.projects.find(p => p.id === id);
        if (!project) return;
        const newState = !project.pinned;
        project.pinned = newState;
        project.pinnedAt = newState ? Date.now() : undefined;
        import('./storage.js').then(m => m.Storage.saveAll());
        renderProjects();
        import('./ui-utils.js').then(m => m.updateGlobalStats());
    };
    

    
    window.editProject = (id) => {
        const project = AppState.projects.find(p => p.id === id);
        if (!project) return;
        
        const modal = document.getElementById('modal-project');
        const form = document.getElementById('form-project');
        const titleEl = document.getElementById('modal-project-title') || modal.querySelector('h3');
        
        if (modal && form) {
            // Set values
            document.getElementById('project-id').value = project.id;
            document.getElementById('project-name').value = project.name;
            document.getElementById('project-description').value = project.description || '';
            
            // Update modal title
            if (titleEl) titleEl.textContent = 'Editar Proyecto';
            
            modal.classList.add('active');
        }
    };
    
    window.deleteProject = (id) => {
        const modal = document.getElementById('modal-confirm');
        const msgEl = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('btn-confirm-action');
        
        if (!modal || !msgEl || !confirmBtn) {
            console.error('Modal elements not found');
            return;
        }
        
        msgEl.textContent = '¿Está seguro que desea eliminar este proyecto?';
        
        confirmBtn.onclick = () => {
            const idx = AppState.projects.findIndex(p => p.id === id);
            if(idx !== -1) {
                AppState.projects.splice(idx, 1);
                import('./storage.js').then(m => m.Storage.saveAll());
                renderProjects();
                import('./ui-utils.js').then(m => m.updateGlobalStats());
            }
            modal.classList.remove('active');
        };
        
        modal.classList.add('active');
        confirmBtn.focus();
    };
    
    requestAnimationFrame(() => {
        container.querySelectorAll('.project-card').forEach(card => {
            const id = card.dataset.id;
            const old = oldPositions.get(id);
            if (!old) return;
            const rect = card.getBoundingClientRect();
            const dx = old.left - rect.left;
            const dy = old.top - rect.top;
            if (dx !== 0 || dy !== 0) {
                card.style.transform = `translate(${dx}px, ${dy}px)`;
                card.style.transition = 'transform 200ms ease, opacity 200ms ease';
                card.style.willChange = 'transform';
                requestAnimationFrame(() => {
                    card.style.transform = '';
                });
                setTimeout(() => {
                    card.style.transition = '';
                    card.style.willChange = '';
                }, 240);
            }
        });
    });
}
