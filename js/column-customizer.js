
import { updateColumnConfig, HEADER_ICONS } from './issue-manager.js';
import { $ } from './ui-utils.js';

/**
 * Módulo para personalizar columnas
 */

const ICONS = {
    drag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    up: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
    down: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="10" height="10" rx="2"></rect><rect x="5" y="5" width="10" height="10" rx="2"></rect></svg>`
};

const ALL_COLUMNS = [
    { id: 'checkbox', label: '', mandatory: true },
    { id: 'index', label: '#', mandatory: true },
    { id: 'title', label: 'Título', default: true, icon: HEADER_ICONS.title },
    { id: 'status', label: 'Estado', default: true, icon: HEADER_ICONS.status },
    { id: 'priority', label: 'Prioridad', default: true, icon: HEADER_ICONS.priority },
    { id: 'type', label: 'Tipo', default: true, icon: HEADER_ICONS.type },
    { id: 'labels', label: 'Etiquetas', default: false, icon: HEADER_ICONS.tag },
    { id: 'assigned', label: 'Asignado a', default: true, icon: HEADER_ICONS.assigned },
    { id: 'creation', label: 'Creación', default: false, icon: HEADER_ICONS.date },
    { id: 'modification', label: 'Modificación', default: false, icon: HEADER_ICONS.date },
    { id: 'dueDate', label: 'Vencimiento', default: false, icon: HEADER_ICONS.date },
    { id: 'date', label: 'Fecha', default: true, icon: HEADER_ICONS.date },
    { id: 'guid', label: 'GUID', mandatory: true, icon: ICONS.copy },
    { id: 'comments', label: 'Comentarios', mandatory: true, icon: HEADER_ICONS.comments },
    { id: 'actions', label: '', mandatory: true }
];


// Estado local
let columnPreferences = [];

/**
 * Inicializa el personalizador
 */
export function initColumnCustomizer() {
    loadPreferences();
    
    // Configurar botón de apertura con delegación al body o comprobación robusta
    // Usamos delegación en document para asegurar que funcione aunque el botón se regenere
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-open-customizer');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botón de personalizar columnas clickeado');
            alert('Botón de personalizar columnas clickeado - Modal se abrirá');
            openCustomizerModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        const btn = e.target.closest('#btn-open-customizer');
        if (btn && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            openCustomizerModal();
        }
    });
    
    // Verificar que el botón exista en el DOM
    const btn = document.getElementById('btn-open-customizer');
    if (btn) {
        console.log('Botón de personalizar columnas encontrado en el DOM');
    } else {
        console.warn('Botón de personalizar columnas NO encontrado en el DOM');
    }
}

/**
 * Carga preferencias guardadas o establece defaults
 */
function loadPreferences() {
    try {
        const saved = localStorage.getItem('column_prefs_v1');
        if (saved) {
            columnPreferences = JSON.parse(saved);
        } else {
            // Default: Todas las 'default: true' en orden original
            columnPreferences = ALL_COLUMNS.filter(c => c.default).map(c => c.id);
        }
        
        // Aplicar configuración inicial
        updateColumnConfig(columnPreferences);
        
    } catch (e) {
        console.error('Error cargando preferencias de columnas:', e);
        columnPreferences = ALL_COLUMNS.filter(c => c.default).map(c => c.id);
    }
}

/**
 * Guarda las preferencias actuales
 */
function savePreferences(newOrderIds) {
    try {
        console.log('Guardando preferencias:', newOrderIds);
        localStorage.setItem('column_prefs_v1', JSON.stringify(newOrderIds));
        columnPreferences = newOrderIds;
        
        console.log('Actualizando configuración de columnas...');
        updateColumnConfig(newOrderIds);
        console.log('Configuración actualizada');
        
        closeModal();
        alert('Columnas actualizadas: ' + newOrderIds.join(', '));
        
    } catch (e) {
        console.error('Error guardando preferencias:', e);
        alert('Error al guardar configuración.');
    }
}

/**
 * Genera y muestra el modal de personalización
 */
function openCustomizerModal() {
    console.log('Abriendo modal de personalización de columnas');
    if (document.getElementById('column-customizer-modal')) return;
    console.log('Modal no existe, creando...');

    const EXCLUDED_IDS = ['actions'];
    const MASTER_ORDER = ['checkbox','index','title','status','priority','type','assigned','creation','modification','dueDate','date','comments','guid'];
    const PERMITTED = ALL_COLUMNS.filter(c => !EXCLUDED_IDS.includes(c.id) && !c.mandatory);

    function sortByMasterOrder(cols) {
        const indexMap = new Map(MASTER_ORDER.map((id, idx) => [id, idx]));
        return cols.slice().sort((a, b) => {
            const ia = indexMap.has(a.id) ? indexMap.get(a.id) : Number.MAX_SAFE_INTEGER;
            const ib = indexMap.has(b.id) ? indexMap.get(b.id) : Number.MAX_SAFE_INTEGER;
            return ia - ib;
        });
    }

    const activeCols = [];
    const inactiveCols = [];
    const mandatoryCols = [];

    // Buscar activas en orden
    columnPreferences.forEach(id => {
        if (EXCLUDED_IDS.includes(id)) return;
        const col = PERMITTED.find(c => c.id === id && !c.mandatory);
        if (col) activeCols.push(col);
    });

    // Buscar inactivas
    PERMITTED.forEach(col => {
        if (col.mandatory) {
            mandatoryCols.push(col);
        } else if (!columnPreferences.includes(col.id)) {
            inactiveCols.push(col);
        }
    });

    const displayOrder = [
        ...sortByMasterOrder(mandatoryCols),
        ...sortByMasterOrder(activeCols),
        ...sortByMasterOrder(inactiveCols)
    ];

    // Generar HTML
    const listItemsHtml = displayOrder.map(col => {
        const isActive = columnPreferences.includes(col.id);
        const isMandatory = !!col.mandatory;
        return `
            <div class="column-item ${isActive ? 'active' : ''} ${isMandatory ? 'mandatory' : ''}" 
                 data-id="${col.id}" 
                 draggable="${isMandatory ? 'false' : 'true'}"
                 role="listitem" ${isMandatory ? 'aria-disabled="true"' : ''}>
                ${isMandatory ? '' : `
                <div class="column-item-drag-handle" title="Arrastrar para reordenar">
                    ${ICONS.drag}
                </div>`}
                <label class="checkbox-wrapper">
                    <input type="checkbox" ${isActive ? 'checked' : ''} ${isMandatory ? 'disabled' : ''} aria-label="Mostrar columna ${col.label}">
                    <span class="checkmark"></span>
                </label>
                <div class="column-item-icon">${col.icon || ''}</div>
                <span class="column-item-label">${col.label}</span>
                ${isMandatory ? '' : `
                <div class="column-item-actions" style="margin-left: auto; display: flex; gap: 4px;">
                    <button class="btn-icon-small btn-move-up" title="Mover arriba" aria-label="Mover ${col.label} arriba" type="button" style="border: none; background: transparent; cursor: pointer; color: var(--text-muted); padding: 2px;">
                        ${ICONS.up}
                    </button>
                    <button class="btn-icon-small btn-move-down" title="Mover abajo" aria-label="Mover ${col.label} abajo" type="button" style="border: none; background: transparent; cursor: pointer; color: var(--text-muted); padding: 2px;">
                        ${ICONS.down}
                    </button>
                </div>`}
            </div>
        `;
    }).join('');

    const modalHtml = `
        <div class="modal-overlay" id="column-customizer-modal" role="dialog" aria-modal="true" aria-labelledby="modal-customizer-title">
            <div class="column-customizer-panel">
                <div class="column-customizer-header">
                    <h3 id="modal-customizer-title">Personalizar Columnas</h3>
                    <button class="btn-close-customizer" aria-label="Cerrar">✕</button>
                </div>
                <div class="column-customizer-body">
                    <p class="text-muted text-sm mb-3">
                        Arrastra para reordenar. Marca para mostrar/ocultar.
                    </p>
                    <div class="column-list" id="column-list-container" role="list">
                        ${listItemsHtml}
                    </div>
                </div>
                <div class="column-customizer-footer">
                    <button class="btn btn-ghost" id="btn-reset-columns">Restablecer</button>
                    <button class="btn btn-primary" id="btn-save-columns">Guardar Cambios</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    console.log('Modal insertado en el DOM');

    requestAnimationFrame(() => {
        const modal = document.getElementById('column-customizer-modal');
        if(modal) {
            modal.classList.add('active');
            console.log('Modal activado con clase active');
        } else {
            console.error('Modal no encontrado después de insertar');
        }
    });

    setupModalEvents();
}

function moveItem(item, direction) {
    if (direction === 'up') {
        const prev = item.previousElementSibling;
        if (prev) {
            item.parentNode.insertBefore(item, prev);
        }
    } else {
        const next = item.nextElementSibling;
        if (next) {
            item.parentNode.insertBefore(next, item);
        }
    }
}

function closeModal() {
    const modal = document.getElementById('column-customizer-modal');
    if (!modal) return;

    modal.classList.remove('active');
    setTimeout(() => {
        modal.remove();
    }, 200);
}

function setupModalEvents() {
    const modal = document.getElementById('column-customizer-modal');
    const container = document.getElementById('column-list-container');
    
    modal.querySelector('.btn-close-customizer').addEventListener('click', closeModal);
    
    // Close on Escape
    document.addEventListener('keydown', function escListener(e) {
        if (e.key === 'Escape' && document.getElementById('column-customizer-modal')) {
            closeModal();
            document.removeEventListener('keydown', escListener);
        }
    });

    // Delegation for move buttons
    container.addEventListener('click', (e) => {
        const btnUp = e.target.closest('.btn-move-up');
        const btnDown = e.target.closest('.btn-move-down');
        const item = e.target.closest('.column-item');

        if (btnUp && item) {
            moveItem(item, 'up');
        } else if (btnDown && item) {
            moveItem(item, 'down');
        }
    });
    
    modal.querySelector('#btn-save-columns').addEventListener('click', () => {
        console.log('Botón guardar columnas clickeado');
        const items = container.querySelectorAll('.column-item');
        const newPrefs = [];
        items.forEach(item => {
            const isChecked = item.querySelector('input[type="checkbox"]').checked;
            if (isChecked) {
                newPrefs.push(item.dataset.id);
            }
        });
        console.log('Nuevas preferencias:', newPrefs);
        savePreferences(newPrefs);
    });

    modal.querySelector('#btn-reset-columns').addEventListener('click', () => {
        if(confirm('¿Restablecer configuración por defecto?')) {
            localStorage.removeItem('column_prefs_v1');
            loadPreferences();
            closeModal();
            setTimeout(openCustomizerModal, 250);
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    container.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const item = e.target.closest('.column-item');
            if (e.target.checked) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });

    // Drag & Drop
    let draggedItem = null;

    const items = container.querySelectorAll('.column-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            setTimeout(() => item.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.id);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
        });
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.column-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
