const React = window.React;
const ReactDOM = window.ReactDOM;
const Redux = window.Redux;
const ReactRedux = window.ReactRedux;
import { AppState } from './state.js';

const initialState = {
  open: false,
  pinned: false,
  mode: 'single',
  selectedGuids: [],
  form: {
    guid: '',
    title: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    type: 'Error',
    assigned: '',
    labels: '',
    dueDate: ''
  },
  errors: {},
  snapshotUrls: [],
  unsaved: false,
  commentFilter: 'all',
  pendingImage: null,
  activeTab: 'campos', // 'campos', 'comentarios', 'detalles'
  customStatuses: [
    { id: 'Open', label: 'Abierto', color: 'warning' },
    { id: 'In Progress', label: 'En Proceso', color: 'accent' },
    { id: 'Resolved', label: 'Resuelto', color: 'success' },
    { id: 'Closed', label: 'Cerrado', color: 'muted' }
  ],
  customPriorities: [
    { id: 'High', label: 'Alta', icon: 'arrow-up', color: 'danger' },
    { id: 'Medium', label: 'Media', icon: 'minus', color: 'warning' },
    { id: 'Low', label: 'Baja', icon: 'arrow-down', color: 'success' }
  ]
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'OPEN_SINGLE':
      return {
        ...state,
        open: true,
        mode: 'single',
        selectedGuids: [action.payload.guid],
        form: { ...state.form, ...action.payload.form, guid: action.payload.guid },
        errors: {},
        snapshotUrls: action.payload.snapshots || [],
        unsaved: false,
        activeTab: 'campos'
      };
    case 'OPEN_BULK':
      return {
        ...state,
        open: true,
        mode: 'bulk',
        selectedGuids: action.payload.guids,
        form: {
          status: action.payload.common.status || 'Open',
          priority: action.payload.common.priority || 'Medium',
          assigned: action.payload.common.assigned || ''
        },
        errors: {},
        snapshotUrls: action.payload.snapshots || [],
        unsaved: false,
        activeTab: 'campos'
      };
    case 'CLOSE':
      return { ...initialState, open: false };
    case 'UPDATE_FIELD':
      return { ...state, form: { ...state.form, [action.payload.field]: action.payload.value } };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.payload.field]: action.payload.message } };
    case 'CLEAR_ERROR':
      if (!state.errors[action.payload.field]) return state;
      const nextErrors = { ...state.errors };
      delete nextErrors[action.payload.field];
      return { ...state, errors: nextErrors };
    case 'SET_UNSAVED':
      return { ...state, unsaved: action.payload };
    case 'SET_COMMENT_FILTER':
      return { ...state, commentFilter: action.payload };
    case 'SET_PENDING_IMAGE':
      return { ...state, pendingImage: action.payload };
    case 'CLEAR_PENDING_IMAGE':
      return { ...state, pendingImage: null };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'ADD_CUSTOM_STATUS':
      if (state.customStatuses.find(s => s.id === action.payload.id)) return state;
      return { ...state, customStatuses: [...state.customStatuses, action.payload] };
    case 'UPDATE_CUSTOM_STATUS':
      return { ...state, customStatuses: state.customStatuses.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_CUSTOM_STATUS':
      return { ...state, customStatuses: state.customStatuses.filter(s => s.id !== action.payload) };
    case 'ADD_CUSTOM_PRIORITY':
      if (state.customPriorities.find(p => p.id === action.payload.id)) return state;
      return { ...state, customPriorities: [...state.customPriorities, action.payload] };
    case 'UPDATE_CUSTOM_PRIORITY':
      return { ...state, customPriorities: state.customPriorities.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_CUSTOM_PRIORITY':
      return { ...state, customPriorities: state.customPriorities.filter(p => p.id !== action.payload) };
    case 'TOGGLE_PIN':
      return { ...state, pinned: !state.pinned };
    default:
      return state;
  }
}

const store = Redux.createStore(reducer);
const { Provider, useDispatch, useSelector } = ReactRedux;

/**
 * Sección de snapshot con cambio y previsualización
 * Renderiza imagen asociada a la incidencia y permite actualizarla
 */
function SnapshotSection({ issue }) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = React.useState(false);
  const canvasRef = React.useRef(null);
  const editorRef = React.useRef(null);
  const [activeTool, setActiveTool] = React.useState('draw');

  const onChangeSnapshot = (e) => {
    const file = e.target.files?.[0];
    if (!file || !issue) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      issue.snapshot = ev.target.result;
      import('./storage.js').then(m => m.Storage.saveAll());
      dispatch({ type: 'SET_UNSAVED', payload: true });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onDownload = (e) => {
    e.stopPropagation();
    const src = toSnapshotUrl(issue);
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `snapshot_${issue.guid || 'image'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const onStartEdit = async (e) => {
    e.stopPropagation();
    const src = toSnapshotUrl(issue);
    if (!src) return;
    setIsEditing(true);
    
    try {
        const { ImageEditor } = await import('./image-editor.js');
        // Give time for DOM to update
        requestAnimationFrame(() => {
           if (canvasRef.current) {
              editorRef.current = new ImageEditor(canvasRef.current, src);
           }
        });
    } catch (err) {
        console.error('Error loading editor', err);
        setIsEditing(false);
    }
  };

  const onSaveEdit = () => {
      if (editorRef.current) {
          const dataUrl = editorRef.current.save();
          dispatch({ type: 'SET_PENDING_IMAGE', payload: dataUrl });
          dispatch({ type: 'SET_TAB', payload: 'comentarios' });
          setIsEditing(false);
          editorRef.current = null;
          setTimeout(() => {
            const input = document.getElementById('comment-input-react');
            if (input) input.focus();
          }, 100);
      }
  };

  const onCancelEdit = () => {
      setIsEditing(false);
      editorRef.current = null;
  };

  const setTool = (tool) => {
      if (editorRef.current) {
          editorRef.current.setTool(tool);
          setActiveTool(tool);
      }
  };

  const inputId = 'file-input-snapshot-react';
  const src = toSnapshotUrl(issue);

  if (isEditing) {
      return React.createElement('div', { className: 'snapshot-section editing' },
          React.createElement('div', { className: 'snapshot-editor-container' },
             React.createElement('canvas', { ref: canvasRef, className: 'editor-canvas' })
          ),
          React.createElement('div', { className: 'editor-toolbar' },
             React.createElement('div', { className: 'editor-tools-group' },
                 ['draw', 'line', 'rect', 'circle', 'text', 'move'].map(tool => 
                     React.createElement('button', {
                         key: tool,
                         className: `editor-tool-btn ${activeTool === tool ? 'active' : ''}`,
                         onClick: () => setTool(tool),
                         title: tool.charAt(0).toUpperCase() + tool.slice(1)
                     }, tool === 'draw' ? '✏️' : tool === 'line' ? '📏' : tool === 'rect' ? '⬜' : tool === 'circle' ? '⭕' : tool === 'text' ? 'T' : '✋')
                 )
             ),
             React.createElement('div', { className: 'editor-actions-group' },
                 React.createElement('button', { className: 'btn btn-sm btn-primary', onClick: onSaveEdit }, 'Guardar'),
                 React.createElement('button', { className: 'btn btn-sm btn-ghost', onClick: onCancelEdit }, 'Cancelar')
             )
          )
      );
  }

  return React.createElement('div', { className: 'snapshot-section' },
    React.createElement('div', { className: 'snapshot-container', onClick: () => {
      const img = src;
      if (!img) return;
      const modal = document.getElementById('modal-snapshot');
      const image = document.getElementById('snapshot-image');
      if (modal && image) {
        image.src = img;
        modal.classList.add('active');
      }
    } },
      src
        ? React.createElement('img', { src: src, alt: 'Snapshot' })
        : React.createElement('div', { className: 'no-img' }, 
            React.createElement('span', null, 'Sin imagen')
          ),
      React.createElement('div', { className: 'snapshot-actions' },
        src ? React.createElement('button', { className: 'btn btn-icon-sm', 'aria-label': 'Descargar imagen', title: 'Descargar imagen', onClick: onDownload },
          React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
            React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
            React.createElement('polyline', { points: '7 10 12 15 17 10' }),
            React.createElement('line', { x1: 12, y1: 15, x2: 12, y2: 3 })
          )
        ) : null,
        React.createElement('button', { className: 'btn btn-icon-sm', 'aria-label': 'Cambiar imagen', title: 'Cambiar imagen', onClick: (e) => { e.stopPropagation(); document.getElementById(inputId)?.click(); } },
          React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
            React.createElement('path', { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' }),
            React.createElement('circle', { cx: 12, cy: 13, r: 4 })
          )
        ),
        src ? React.createElement('button', { className: 'btn btn-icon-sm', 'aria-label': 'Editar y adjuntar', title: 'Editar y adjuntar a comentario', onClick: onStartEdit },
          React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
            React.createElement('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
            React.createElement('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
          )
        ) : null,
        React.createElement('input', { id: inputId, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onChangeSnapshot })
      )
    )
  );
}

function Pill({ active, onClick, children }) {
  return React.createElement('label', { className: ['pill', active ? 'active' : ''].filter(Boolean).join(' '), onClick }, children);
}

function PillsSection({ label, options, value, onChange, type }) {
  const icons = {
    'minus': React.createElement('path', { d: 'M5 12h14' }),
    'check': React.createElement('polyline', { points: '20 6 9 17 4 12' }),
    'circle': React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
    'clock': React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
    'alert-triangle': React.createElement('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' })
  };
  
  // Custom icons logic
  const getCustomIcon = (val, type) => {
      if (type === 'status') {
          if (val === 'Open') return React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className: 'pill-icon' }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }));
          if (val === 'InProgress') return React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className: 'pill-icon' }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }), React.createElement('path', { d: 'M12 6v6l4 2' }));
          if (val === 'Done') return React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className: 'pill-icon' }, React.createElement('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), React.createElement('polyline', { points: '22 4 12 14.01 9 11.01' }));
          if (val === 'Closed') return React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className: 'pill-icon' }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }), React.createElement('line', { x1: 15, y1: 9, x2: 9, y2: 15 }), React.createElement('line', { x1: 9, y1: 9, x2: 15, y2: 15 }));
      }
      if (type === 'priority') {
          if (val === 'High') return React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className: 'pill-icon' }, React.createElement('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }), React.createElement('line', { x1: 12, y1: 9, x2: 12, y2: 13 }), React.createElement('line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }));
          if (val === 'Medium') return React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className: 'pill-icon' }, React.createElement('rect', { x: 2, y: 7, width: 20, height: 14, rx: 2, ry: 2 }), React.createElement('path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }));
          if (val === 'Low') return React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className: 'pill-icon' }, React.createElement('path', { d: 'M12 20v-6M6 20V10M18 20V4' }));
      }
      return null;
  };

  const addCustom = () => {
    // Open full modal for customization
    if (window.openCustomStatusModal && type === 'status') {
        window.openCustomStatusModal();
        return;
    }
    if (window.openCustomPriorityModal && type === 'priority') {
        window.openCustomPriorityModal();
        return;
    }
  };

// Modals logic for customization
window.openCustomStatusModal = () => {
    openCustomManager('status', 'Gestionar Estados');
};

window.openCustomPriorityModal = () => {
    openCustomManager('priority', 'Gestionar Prioridades');
};

function openCustomManager(type, title) {
    let modal = document.getElementById(`modal-manager-${type}`);
    // Always recreate to ensure fresh state
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = `modal-manager-${type}`;
    modal.className = 'modal custom-manager-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="manager-list" id="manager-list-${type}">
                    <!-- Items will be injected here -->
                </div>
                <div class="manager-add-form">
                    <h4>Añadir Nuevo</h4>
                    <div class="form-row">
                        <input type="text" id="new-${type}-name" class="form-input" placeholder="Nombre">
                        <div class="color-picker-trigger" id="new-${type}-color-trigger"></div>
                        <input type="hidden" id="new-${type}-color" value="accent">
                        <button class="btn btn-secondary btn-sm" id="btn-add-${type}">Añadir</button>
                    </div>
                    <div class="color-palette hidden" id="new-${type}-palette">
                        <!-- Colors -->
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').classList.remove('active')">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Color palette options
    const colors = ['danger', 'warning', 'success', 'accent', 'purple', 'muted'];
    const palette = modal.querySelector(`#new-${type}-palette`);
    colors.forEach(c => {
        const d = document.createElement('div');
        d.className = `color-swatch bg-${c}`;
        d.style.backgroundColor = colorHex(c);
        d.onclick = () => {
            modal.querySelector(`#new-${type}-color`).value = c;
            modal.querySelector(`#new-${type}-color-trigger`).style.backgroundColor = colorHex(c);
            palette.classList.add('hidden');
        };
        palette.appendChild(d);
    });
    
    // Trigger color picker
    modal.querySelector(`#new-${type}-color-trigger`).style.backgroundColor = colorHex('accent');
    modal.querySelector(`#new-${type}-color-trigger`).onclick = () => {
        palette.classList.toggle('hidden');
    };

    // Render List
    const renderList = () => {
        const state = store.getState();
        const items = type === 'status' ? state.customStatuses : state.customPriorities;
        const container = modal.querySelector(`#manager-list-${type}`);
        container.innerHTML = '';
        
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'manager-item-row';
            row.innerHTML = `
                <div class="item-color-preview" style="background: ${colorHex(item.color)}"></div>
                <span class="item-label">${item.label}</span>
                <div class="item-actions">
                    <button class="btn-icon-sm btn-delete" title="Eliminar">×</button>
                </div>
            `;
            
            // Delete action
            row.querySelector('.btn-delete').onclick = () => {
                if (confirm(`¿Eliminar "${item.label}"?`)) {
                    store.dispatch({ 
                        type: type === 'status' ? 'DELETE_CUSTOM_STATUS' : 'DELETE_CUSTOM_PRIORITY', 
                        payload: item.id 
                    });
                    renderList();
                }
            };
            
            container.appendChild(row);
        });
    };
    
    // Add action
    modal.querySelector(`#btn-add-${type}`).onclick = () => {
        const nameInput = modal.querySelector(`#new-${type}-name`);
        const name = nameInput.value.trim();
        const color = modal.querySelector(`#new-${type}-color`).value;
        
        if (name) {
            const id = name.replace(/\s+/g, '');
            const payload = type === 'status' 
                ? { id, label: name, color } 
                : { id, label: name, color, icon: 'circle' };
                
            store.dispatch({ 
                type: type === 'status' ? 'ADD_CUSTOM_STATUS' : 'ADD_CUSTOM_PRIORITY', 
                payload 
            });
            
            nameInput.value = '';
            renderList();
        }
    };

    // Initial render
    renderList();
    
    // Open
    modal.querySelector('.modal-close').onclick = () => modal.classList.remove('active');
    setTimeout(() => modal.classList.add('active'), 10);
}

  return React.createElement('div', { className: 'quick-section' },
    React.createElement('div', { className: 'section-header' },
      React.createElement('span', { className: 'section-title' }, label),
      React.createElement('span', { className: 'section-action', onClick: addCustom },
        'Gestionar'
      )
    ),
    React.createElement('div', { className: 'pills-container' },
      options.map(p => React.createElement('label', {
        className: ['pill', value === p.id ? 'active' : ''].join(' '),
        key: p.id,
        onClick: () => { onChange(p.id); }
      }, [
        getCustomIcon(p.id, type) || React.createElement('span', { className: 'pill-dot', style: { background: colorHex(p.color) } }),
        p.label
      ]))
    )
  );
}

function StatusPills({ value, onChange }) {
  const statuses = useSelector(s => s.customStatuses);
  const dispatch = useDispatch();
  const addCustom = () => openCustomModal('status', (payload) => dispatch({ type: 'ADD_CUSTOM_STATUS', payload }));
  return React.createElement('div', { className: 'quick-section' },
    React.createElement('div', { className: 'section-header' },
      React.createElement('span', { className: 'section-title' }, 'Estado'),
      React.createElement('span', { className: 'section-action', onClick: addCustom }, 'Gestionar')
    ),
    React.createElement('div', { className: 'pills-container' },
      statuses.map(s => React.createElement(Pill, {
        key: s.id,
        active: value === s.id,
        onClick: () => { onChange(s.id); }
      }, [
        React.createElement('span', { key: 'dot', className: 'pill-dot', style: { background: colorHex(s.color) } }),
        s.label
      ]))
    )
  );
}

function PriorityPills({ value, onChange }) {
  const priorities = useSelector(s => s.customPriorities);
  const dispatch = useDispatch();
  const addCustom = () => openCustomModal('priority', (payload) => {
      dispatch({ type: 'ADD_CUSTOM_PRIORITY', payload });
      import('./state.js').then(m => {
          m.PRIORITY_COLORS[payload.id] = payload.color;
          m.PRIORITY_LABELS[payload.id] = payload.label;
          document.dispatchEvent(new CustomEvent('issues:refresh'));
      });
  });
  const icons = {
    'arrow-up': React.createElement('path', { d: 'M12 19V5' }, null),
    'minus': React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 }, null),
    'arrow-down': React.createElement('path', { d: 'M12 5v14' }, null)
  };
  return React.createElement('div', { className: 'quick-section' },
    React.createElement('div', { className: 'section-header' },
      React.createElement('span', { className: 'section-title' }, 'Prioridad'),
      React.createElement('span', { className: 'section-action', onClick: addCustom }, 'Gestionar')
    ),
    React.createElement('div', { className: 'pills-container' },
      priorities.map(p => React.createElement(Pill, {
        key: p.id,
        active: value === p.id,
        onClick: () => { onChange(p.id); }
      }, [
        React.createElement('svg', { key: 'icon', className: 'pill-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, style: { color: colorHex(p.color) } },
          icons[p.icon] || icons['minus']
        ),
        p.label
      ]))
    )
  );
}

function AssigneeSection({ value, onChange }) {
  const users = ['asuarez@gocsa.es', 'jgarcia@gocsa.es', 'mlopez@gocsa.es', 'usuario@empresa.com'];
  const [inputVal, setInputVal] = React.useState('');
  
  // Parse multiple assignees
  const assignees = (value || '').split(',').map(s => s.trim()).filter(Boolean);

  const addAssignee = (user) => {
    if (!user) return;
    const next = Array.from(new Set([...assignees, user])).join(', ');
    onChange(next);
    setInputVal('');
  };

  const removeAssignee = (user) => {
    const next = assignees.filter(x => x !== user).join(', ');
    onChange(next);
  };

  return React.createElement('div', { className: 'quick-section' },
    React.createElement('div', { className: 'section-header' },
      React.createElement('span', { className: 'section-title' }, 'Asignado a')
    ),
    React.createElement('div', { className: 'tags-editor' }, // Reuse tags style for chips
      React.createElement('div', { className: 'tags-list' },
        assignees.map(u => React.createElement('span', { key: u, className: 'tag-chip user-chip' },
          React.createElement('div', { className: 'user-avatar-xs' }, u.substring(0, 2).toUpperCase()),
          React.createElement('span', { className: 'tag-text' }, u),
          React.createElement('button', { className: 'tag-remove', onClick: () => removeAssignee(u), title: 'Eliminar' }, '×')
        ))
      ),
      React.createElement('div', { style: { position: 'relative', flex: 1 } },
          React.createElement('input', {
            type: 'text',
            className: 'assignee-input',
            placeholder: 'Buscar o escribir usuario...',
            value: inputVal,
            list: 'users-datalist',
            onInput: (e) => setInputVal(e.target.value),
            onKeyDown: (e) => {
                if (e.key === 'Enter' && inputVal.trim()) {
                    e.preventDefault();
                    addAssignee(inputVal.trim());
                }
            },
            onBlur: () => {
                if(inputVal.trim()) addAssignee(inputVal.trim());
            }
          }),
          React.createElement('datalist', { id: 'users-datalist' },
             users.filter(u => !assignees.includes(u)).map(u => 
                 React.createElement('option', { key: u, value: u })
             )
          )
      )
    )
  );
}

function TagsEditor({ value, onChange }) {
  const tags = (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const existingTags = ['Urgente', 'Revisar', 'Estructural', 'Instalaciones', 'Arquitectura', 'Pendiente'];
  const [inputVal, setInputVal] = React.useState('');
  
  const addTag = (t) => {
    const next = Array.from(new Set([...tags, t])).join(', ');
    onChange(next);
    setInputVal('');
  };
  const removeTag = (t) => {
    const next = tags.filter(x => x !== t).join(', ');
    onChange(next);
  };
  return React.createElement('div', { className: 'tags-editor' },
    React.createElement('div', { className: 'tags-list' },
      tags.map(t => React.createElement('span', { key: t, className: 'tag-chip' },
        React.createElement('span', { className: 'tag-text' }, t),
        React.createElement('button', { className: 'tag-remove', onClick: () => removeTag(t), title: 'Eliminar' }, '×')
      ))
    ),
    React.createElement('div', { style: { position: 'relative', flex: 1 } },
        React.createElement('input', {
          type: 'text',
          className: 'tag-input',
          placeholder: 'Añadir etiqueta...',
          value: inputVal,
          list: 'tags-datalist',
          onInput: (e) => setInputVal(e.target.value),
          onBlur: () => {
            const v = inputVal.trim();
            if (v) {
              addTag(v.replace(',', ''));
            }
          },
          onKeyDown: (e) => {
            const v = inputVal.trim();
            if ((e.key === 'Enter' || e.key === ',') && v) {
              e.preventDefault();
              addTag(v.replace(',', ''));
            }
          }
        }),
        React.createElement('datalist', { id: 'tags-datalist' },
            existingTags.filter(t => !tags.includes(t)).map(t => 
                React.createElement('option', { key: t, value: t })
            )
        )
    )
  );
}

function TabsHeader() {
  const dispatch = useDispatch();
  const active = useSelector(s => s.activeTab);
  const tabs = [
    { id: 'campos', label: 'Campos' },
    { id: 'comentarios', label: 'Comentarios' },
    { id: 'detalles', label: 'Detalles' }
  ];
  return React.createElement('div', { className: 'tabs-header' },
    tabs.map(t => React.createElement('button', {
      key: t.id,
      className: ['tab-btn', active === t.id ? 'active' : ''].join(' '),
      onClick: () => dispatch({ type: 'SET_TAB', payload: t.id })
    }, t.label))
  );
}

/**
 * Contenido principal del panel
 */
function EditSidebarContent() {
  const dispatch = useDispatch();
  const state = useSelector(s => s);
  const form = state.form || {};
  const isBulk = state.mode === 'bulk';
  const activeTab = state.activeTab;
  const currentIssue = !isBulk ? (AppState?.currentIssues?.find(i => i.guid === form.guid) || null) : null;

  const handleField = (field) => (e) => {
    const v = e.target.value;
    dispatch({ type: 'UPDATE_FIELD', payload: { field, value: v } });
    if (!isBulk && field === 'title') {
      if (!v || v.trim().length === 0) dispatch({ type: 'SET_ERROR', payload: { field: 'title', message: 'Requerido' } });
      else dispatch({ type: 'CLEAR_ERROR', payload: { field: 'title' } });
    }
    if (isBulk) {
      applyBulkLive(field, v);
    }
    dispatch({ type: 'SET_UNSAVED', payload: true });
  };

  const onCancel = () => {
    closeEditSidebar();
  };
  const onSave = () => {
    if (isBulk) {
      saveBulk(form);
    } else {
      saveSingle(form);
    }
  };

  const CommentsHeader = () => {
    const filter = state.commentFilter;
    const remoteCount = (currentIssue?.bcfComments?.length || 0);
    if (currentIssue && typeof currentIssue.lastReadRemoteCount !== 'number') currentIssue.lastReadRemoteCount = 0;
    const unread = Math.max(0, remoteCount - (currentIssue?.lastReadRemoteCount || 0));
    return React.createElement('div', { className: 'comments-header' },
      React.createElement('div', { className: 'comments-title' }, 'Comentarios',
        React.createElement('span', { className: 'comments-count' }, `${(currentIssue?.bcfComments?.length || 0) + (currentIssue?.localComments?.length || 0)}`),
        unread > 0 ? React.createElement('span', { className: 'unread-dot', title: `${unread} sin leer` }, '•') : null
      ),
      React.createElement('div', { className: 'comments-filter' },
        React.createElement('button', { className: ['filter-btn', filter === 'all' ? 'active' : ''].join(' '), onClick: () => dispatch({ type: 'SET_COMMENT_FILTER', payload: 'all' }) }, 'Todos'),
        React.createElement('button', { className: ['filter-btn', filter === 'local' ? 'active' : ''].join(' '), onClick: () => dispatch({ type: 'SET_COMMENT_FILTER', payload: 'local' }) }, 'Locales')
      )
    );
  };

  const CommentsList = () => {
    if (!currentIssue) return null;
    let comments = [
      ...(currentIssue.bcfComments || []).map(c => ({ ...c, isLocal: false, id: c.id || Date.now() })),
      ...(currentIssue.localComments || []).map(c => ({ ...c, isLocal: true }))
    ];
    if (state.commentFilter === 'local') {
      comments = comments.filter(c => c.isLocal);
    }
    if (comments.length === 0) {
      return React.createElement('div', { className: 'comments-empty' }, 'Sin comentarios');
    }
    
    const renderText = (t) => {
      const parts = (t || '').split(/(@[A-Za-z0-9_.-]+)/g);
      return React.createElement('span', null, parts.map((p, i) => {
        if (p.match(/^@[A-Za-z0-9_.-]+$/)) {
          return React.createElement('span', { key: i, className: 'mention' }, p);
        }
        // Basic Markdown
        let html = p
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        return React.createElement('span', { key: i, dangerouslySetInnerHTML: { __html: html } });
      }));
    };

    if (currentIssue) {
      currentIssue.lastReadRemoteCount = (currentIssue.bcfComments || []).length;
      import('./storage.js').then(m => m.Storage.saveAll());
    }
    return React.createElement('div', { className: 'comments-list' },
      comments.map(c => React.createElement('div', { key: c.id || `${c.author}-${c.date}`, className: ['comment', c.isLocal ? 'local' : ''].join(' ') },
        React.createElement('div', { className: 'comment-header' },
          React.createElement('div', { className: 'comment-author' },
            React.createElement('div', { className: 'comment-avatar' }, (c.author || '').toString().slice(0, 2).toUpperCase()),
            React.createElement('span', { className: 'comment-name' }, (c.author || '').toString())
          ),
          React.createElement('span', { className: 'comment-date' }, c.dateFormatted || c.date || '')
        ),
        React.createElement('div', { className: 'comment-text' }, renderText(c.comment || c.text || '')),
        // Support for multiple attachments
        c.attachments && c.attachments.length > 0 
            ? React.createElement('div', { className: 'comment-attachments' },
                c.attachments.map((att, idx) => 
                    React.createElement('div', { key: idx, className: 'attachment-item' },
                        att.type === 'image' 
                            ? React.createElement('img', { src: att.url, alt: att.name, onClick: () => window.open(att.url, '_blank') })
                            : React.createElement('a', { href: att.url, download: att.name, className: 'file-attachment' }, 
                                React.createElement('span', { className: 'file-icon' }, '📄'),
                                React.createElement('span', { className: 'file-name' }, att.name)
                              )
                    )
                )
              )
            : (c.image ? React.createElement('div', { className: 'comment-image' }, React.createElement('img', { src: c.image, alt: 'Adjunto' })) : null),
        
        // Reactions and Actions
        React.createElement('div', { className: 'comment-actions' },
             React.createElement('button', { className: 'action-btn', title: 'Responder' }, '↩ Responder'),
             React.createElement('button', { className: 'action-btn', title: 'Reaccionar' }, '👍'),
             c.isLocal ? React.createElement('button', { className: 'action-btn delete', title: 'Eliminar', onClick: () => {
                 if(confirm('¿Eliminar comentario?')) {
                     currentIssue.localComments = currentIssue.localComments.filter(lc => lc.id !== c.id);
                     import('./storage.js').then(m => m.Storage.saveAll());
                     dispatch({ type: 'SET_UNSAVED', payload: true });
                 }
             }}, '🗑️') : null
        )
      ))
    );
  };

  const CommentsComposer = () => {
    const pending = state.pendingImage;
    const [attachments, setAttachments] = React.useState([]);
    const [isDragging, setIsDragging] = React.useState(false);
    const [showEmoji, setShowEmoji] = React.useState(false);

    // Sync global pending image to attachments
    React.useEffect(() => {
        if (pending) {
            setAttachments(prev => [...prev, { type: 'image', url: pending, name: 'Snapshot.png' }]);
            dispatch({ type: 'CLEAR_PENDING_IMAGE' });
        }
    }, [pending]);

    const sendComment = async () => {
      if (!currentIssue || state.mode === 'bulk') return;
      const input = document.getElementById('comment-input-react');
      const text = input ? input.value.trim() : '';
      if (!text && attachments.length === 0) return;
      
      const nowIso = new Date().toISOString();
      const mod = await import('./bcf-parser.js');
      const parsed = mod.BCFParser.formatDate(nowIso);
      
      const comment = { 
          text, 
          author: 'Usuario', 
          date: nowIso, 
          dateFormatted: parsed, 
          attachments: attachments, 
          isLocal: true, 
          id: Date.now() 
      };
      
      if (!currentIssue.localComments) currentIssue.localComments = [];
      currentIssue.localComments.push(comment);
      
      import('./storage.js').then(m => m.Storage.saveAll());
      import('./issue-manager.js').then(m => { m.renderIssues(); });
      
      if (input) input.value = '';
      setAttachments([]);
      dispatch({ type: 'SET_UNSAVED', payload: true });
      
      const ui = await import('./ui-utils.js');
      ui.notify('Comentario añadido', 'success', 2500);
    };

    const processFiles = (files) => {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const isImage = file.type.startsWith('image/');
                setAttachments(prev => [...prev, {
                    type: isImage ? 'image' : 'file',
                    url: ev.target.result,
                    name: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const attachImage = (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      processFiles(files);
      e.target.value = '';
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files || []);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const files = items.map(i => i.getAsFile()).filter(Boolean);
      if (files.length > 0) {
          processFiles(files);
          e.preventDefault();
      }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const insertEmoji = (emoji) => {
        const input = document.getElementById('comment-input-react');
        if (input) {
            input.value += emoji;
            input.focus();
        }
        setShowEmoji(false);
    };

    return React.createElement('div', { className: 'comment-composer' },
      React.createElement('div', { 
        className: ['composer-wrapper', isDragging ? 'dragging' : ''].filter(Boolean).join(' '), 
        onDrop: handleDrop, 
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onPaste: handlePaste 
      },
        React.createElement('textarea', { 
          id: 'comment-input-react', 
          className: 'composer-textarea', 
          placeholder: 'Escribe un comentario... (@menciones, **negrita**, arrastra archivos)', 
          rows: 2,
          onKeyDown: (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); sendComment(); } }
        }),
        React.createElement('div', { className: ['composer-preview', attachments.length > 0 ? '' : 'hidden'].join(' ') },
          attachments.map((att, i) => React.createElement('div', { key: i, className: 'preview-item' },
            att.type === 'image' 
                ? React.createElement('img', { src: att.url, alt: att.name })
                : React.createElement('div', { className: 'preview-file' }, '📄 ' + att.name),
            React.createElement('button', { className: 'preview-remove', onClick: () => removeAttachment(i) }, '×')
          ))
        ),
        React.createElement('div', { className: 'composer-toolbar' },
          React.createElement('div', { className: 'toolbar-left' },
            React.createElement('button', { className: 'toolbar-btn', onClick: () => document.getElementById('attach-img-input-react')?.click(), title: 'Adjuntar imagen' }, 
                React.createElement('svg', { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, 
                    React.createElement('rect', { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
                    React.createElement('circle', { cx: "8.5", cy: "8.5", r: "1.5" }),
                    React.createElement('path', { d: "M21 15l-5-5L5 21" })
                )
            ),
            React.createElement('button', { className: 'toolbar-btn', onClick: () => document.getElementById('attach-img-input-react')?.click(), title: 'Adjuntar archivo' }, 
                React.createElement('svg', { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, 
                    React.createElement('path', { d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" })
                )
            ),
            React.createElement('button', { className: 'toolbar-btn', onClick: () => { const el = document.getElementById('comment-input-react'); if(el) { el.value += '@'; el.focus(); } }, title: 'Mencionar usuario' }, 
                React.createElement('svg', { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, 
                    React.createElement('circle', { cx: "12", cy: "12", r: "4" }),
                    React.createElement('path', { d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" })
                )
            ),
            React.createElement('input', { id: 'attach-img-input-react', type: 'file', multiple: true, style: { display: 'none' }, onChange: attachImage })
          ),
          React.createElement('div', { className: 'toolbar-right' },
            React.createElement('span', { className: 'toolbar-hint' }, 
                React.createElement('kbd', null, 'Ctrl'), '+', React.createElement('kbd', null, '↵'), ' enviar'
            ),
            React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: sendComment }, 
                React.createElement('svg', { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { marginRight: '4px' } }, 
                    React.createElement('line', { x1: "22", y1: "2", x2: "11", y2: "13" }),
                    React.createElement('polygon', { points: "22 2 15 22 11 13 2 9 22 2" })
                ),
                'Enviar'
            )
          )
        )
      )
    );
  };

  const BulkBanner = () => {
    if (!isBulk) return null;
    const count = state.selectedGuids?.length || 0;
    return React.createElement('div', { className: 'bulk-banner visible' },
      React.createElement('div', { className: 'bulk-count' }, String(count)),
      React.createElement('div', { className: 'bulk-text' }, `Editando ${count} incidencias`)
    );
  };

  const PanelFooter = () => {
    return React.createElement('footer', { className: 'panel-footer' },
      React.createElement('div', { className: ['unsaved', state.unsaved ? 'visible' : ''].join(' '), role: 'status', 'aria-live': 'polite' }, 'Sin guardar'),
      React.createElement('div', { className: 'panel-footer-actions' },
        React.createElement('button', { className: 'btn btn-ghost btn-sm', onClick: onCancel }, 'Cancelar'),
        React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: onSave }, 'Guardar')
      )
    );
  };

  const PanelHeader = () => {
    const navigate = (dir) => {
      const st = AppState;
      if (!st || isBulk) return;
      const list = st.filteredIssues?.length ? st.filteredIssues : st.currentIssues;
      const idx = list.findIndex(i => i.guid === form.guid);
      if (idx === -1 || list.length === 0) return;
      let next = idx + dir;
      if (next < 0) next = list.length - 1;
      if (next >= list.length) next = 0;
      openSingle(list[next].guid);
    };
    return React.createElement('header', { className: 'panel-header' },
      React.createElement('div', { className: 'panel-header-info' },
        React.createElement('div', { className: 'panel-header-title', id: 'edit-panel-title' }, isBulk ? 'Edición Masiva' : (form.title || 'Editar Incidencia')),
        React.createElement('div', { className: 'panel-header-sub', id: 'edit-panel-sub' }, `ID: ${form.guid || '-'}`)
      ),
      React.createElement('div', { className: 'panel-nav' },
        React.createElement('button', { className: 'btn btn-icon-sm btn-ghost', title: 'Anterior', 'aria-label': 'Anterior', onClick: () => navigate(-1) }, '◀'),
        React.createElement('button', { className: 'btn btn-icon-sm btn-ghost', title: 'Siguiente', 'aria-label': 'Siguiente', onClick: () => navigate(1) }, '▶')
      ),
      React.createElement('button', { 
        className: ['btn btn-icon-sm btn-ghost', state.pinned ? 'active' : ''].join(' '), 
        title: state.pinned ? 'Desanclar' : 'Anclar panel', 
        onClick: () => dispatch({ type: 'TOGGLE_PIN' }) 
      }, React.createElement('svg', { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, React.createElement('path', { d: "M12 22v-5" }), React.createElement('path', { d: "M16 3v6l3 3H5l3-3V3" }))),
      React.createElement('button', { className: 'btn btn-icon-sm btn-ghost', title: 'Cerrar', 'aria-label': 'Cerrar', onClick: onCancel }, '×')
    );
  };

  return React.createElement('div', { className: 'panel open edit-sidebar', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'edit-panel-title', 'aria-describedby': 'edit-panel-sub' },
    React.createElement(PanelHeader),
    React.createElement(BulkBanner),
    React.createElement(TabsHeader),
    React.createElement('div', { className: 'tab-content' },
      activeTab === 'campos' ? React.createElement('div', { className: 'campos-container' },
        !isBulk ? React.createElement(SnapshotSection, { issue: currentIssue }) : null,
        React.createElement(StatusPills, { value: form.status || 'Open', onChange: (val) => handleField('status')({ target: { value: val } }) }),
        React.createElement(PriorityPills, { value: form.priority || 'Medium', onChange: (val) => handleField('priority')({ target: { value: val } }) }),
        React.createElement(AssigneeSection, { value: form.assigned || '', onChange: (val) => handleField('assigned')({ target: { value: val } }) }),
        React.createElement('div', { className: 'quick-section' },
          React.createElement('div', { className: 'section-header' },
            React.createElement('span', { className: 'section-title' }, 'Fecha límite'),
            React.createElement('span', { className: 'section-action', onClick: () => handleField('dueDate')({ target: { value: '' } }) }, 'Limpiar')
          ),
          React.createElement('input', {
            type: 'date',
            className: 'date-input',
            value: (form.dueDate || '').split('T')[0],
            onInput: (e) => handleField('dueDate')({ target: { value: e.target.value } })
          })
        ),
        React.createElement('div', { className: 'quick-section' },
          React.createElement('div', { className: 'section-header' },
            React.createElement('span', { className: 'section-title' }, 'Etiquetas'),
            React.createElement('span', { className: 'section-action', title: 'Gestionar etiquetas', onClick: () => alert('Gestión de etiquetas próximamente') }, 'Gestionar')
          ),
          React.createElement(TagsEditor, { value: form.labels || '', onChange: (val) => handleField('labels')({ target: { value: val } }) })
        )
      ) : null,
      activeTab === 'comentarios' ? React.createElement('div', { className: 'comments-section' },
        React.createElement(CommentsHeader),
        React.createElement(CommentsList),
        React.createElement(CommentsComposer)
      ) : null,
      activeTab === 'detalles' ? React.createElement('div', { className: 'detalles-container' },
        React.createElement('textarea', {
          className: 'description-editor',
          placeholder: 'Descripción detallada...',
          value: form.description || '',
          onInput: (e) => handleField('description')(e)
        })
      ) : null
    ),
    React.createElement(PanelFooter)
  );
}

function EditSidebarRoot() {
  const open = useSelector(s => s.open);
  const pinned = useSelector(s => s.pinned);
  React.useEffect(() => {
    const backdrop = ensureBackdrop();
    backdrop.classList.toggle('active', open && !pinned);
    // If pinned, allow interaction with background?
    // For now, just hide backdrop but keep panel open.
    if (pinned) {
        backdrop.style.pointerEvents = 'none';
    } else {
        backdrop.style.pointerEvents = '';
    }

    const panelEl = document.querySelector('.edit-sidebar');
    if (panelEl) panelEl.classList.toggle('active', open);
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !pinned) closeEditSidebar();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, pinned]);
  return open ? React.createElement(EditSidebarContent) : null;
}

function ensureBackdrop() {
  let backdrop = document.getElementById('edit-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'edit-sidebar-backdrop';
    backdrop.className = 'edit-sidebar-backdrop';
    backdrop.addEventListener('click', () => {
        const state = store.getState();
        if (!state.pinned) closeEditSidebar();
    });
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

/**
 * Monta el panel de edición en el contenedor raíz
 */
function mountSidebar() {
  const rootContainer = document.getElementById('edit-sidebar-root');
  if (!rootContainer) return;
  ReactDOM.render(React.createElement(Provider, { store }, React.createElement(EditSidebarRoot)), rootContainer);
}

function getIssueByGuid(guid) {
  try {
    const { AppState } = window.__modules || {};
    if (AppState) return AppState.currentIssues.find(i => i.guid === guid);
  } catch {}
  return null;
}

function mapCommonFields(issues) {
  const getVal = (key) => {
    const vals = issues.map(i => i[key]).filter(v => v !== undefined && v !== null);
    return vals.length ? vals[0] : undefined;
  };
  return {
    status: getVal('topicStatus'),
    priority: getVal('priority'),
    assigned: getVal('assignedTo'),
    dueDate: getVal('dueDate')
  };
}

function toSnapshotUrl(issue) {
  if (!issue) return null;
  const v = issue.snapshotUrl || issue.snapshot;
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Blob) {
    return URL.createObjectURL(v);
  }
  return null;
}

/**
 * Abre el panel en modo edición individual
 */
function openSingle(guid) {
  // Si guid es null o undefined, crear nueva incidencia
  if (!guid) {
    const form = {
      guid: '',
      title: '',
      description: '',
      status: 'Open',
      priority: 'Medium',
      type: 'Error',
      assigned: '',
      labels: '',
      dueDate: ''
    };
    store.dispatch({ type: 'OPEN_SINGLE', payload: { guid: '', form, snapshots: [] } });
    return;
  }

  const issue = AppState?.currentIssues?.find(i => i.guid === guid);
  if (!issue) return;
  const form = {
    title: issue.title || '',
    description: issue.description || '',
    status: issue.topicStatus || 'Open',
    priority: issue.priority || 'Medium',
    type: issue.topicType || 'Error',
    assigned: issue.assignedTo || '',
    labels: (issue.labels || []).join(', '),
    dueDate: issue.dueDate || ''
  };
  const snapshots = [toSnapshotUrl(issue)].filter(Boolean);
  store.dispatch({ type: 'OPEN_SINGLE', payload: { guid, form, snapshots } });
}

/**
 * Abre el panel en modo edición masiva
 */
function openBulk(guids) {
  const issues = AppState?.currentIssues?.filter(i => guids.includes(i.guid)) || [];
  const common = mapCommonFields(issues);
  const snapshots = issues.map(toSnapshotUrl).filter(Boolean);
  store.dispatch({ type: 'OPEN_BULK', payload: { guids, common, snapshots } });
}

function closeEditSidebar() {
  store.dispatch({ type: 'CLOSE' });
}

/**
 * Guarda cambios de una incidencia en modo individual
 */
async function saveSingle(form) {
  if (!form.title || form.title.trim().length === 0) {
    store.dispatch({ type: 'SET_ERROR', payload: { field: 'title', message: 'Requerido' } });
    return;
  }
  const fd = new FormData();
  fd.append('guid', form.guid);
  fd.append('title', form.title || '');
  fd.append('description', form.description || '');
  fd.append('status', form.status || 'Open');
  fd.append('priority', form.priority || 'Medium');
  fd.append('type', form.type || 'Error');
  fd.append('assigned', form.assigned || '');
  fd.append('labels', form.labels || '');
  fd.append('dueDate', form.dueDate || '');
  const mod = await import('./issue-manager.js');
  await mod.saveIssue(fd);
  const ui = await import('./ui-utils.js');
  ui.notify('Incidencia actualizada', 'success', 3000);
  closeEditSidebar();
}

function applyBulkLive(field, value) {
  const guids = store.getState().selectedGuids || [];
  const mods = {
    status: 'topicStatus',
    priority: 'priority',
    assigned: 'assignedTo',
    dueDate: 'dueDate'
  };
  const key = mods[field];
  if (!key) return;
  const st = AppState;
  if (!st) return;
  st.currentIssues.forEach(i => {
    if (guids.includes(i.guid)) i[key] = value;
  });
  AppState.projects.forEach(p => {
    p.bcfFiles.forEach(bcf => {
      bcf.topics?.forEach(t => {
        if (guids.includes(t.guid)) t[key] = value;
      });
    });
  });
  import('./storage.js').then(m => m.Storage.saveAll());
  import('./issue-manager.js').then(m => { m.applyFiltersAndSort(); m.renderIssues(); });
}

/**
 * Aplica cambios en modo masivo y notifica
 */
async function saveBulk(form) {
  applyBulkLive('status', form.status);
  applyBulkLive('priority', form.priority);
  applyBulkLive('assigned', form.assigned);
  applyBulkLive('dueDate', form.dueDate);
  const ui = await import('./ui-utils.js');
  ui.notify('Cambios aplicados a la selección', 'success', 3000);
  closeEditSidebar();
}

export function openEditSidebar(guid) {
  mountSidebar();
  openSingle(guid);
}

export function openEditSidebarBulk(guids) {
  mountSidebar();
  openBulk(guids);
}

export function __getEditPanelState() {
  return store.getState();
}

window.openEditSidebar = openEditSidebar;
window.openEditSidebarBulk = openEditSidebarBulk;
window.closeEditSidebar = closeEditSidebar;

function colorHex(colorId) {
  const palette = {
    danger: '#f85149',
    warning: '#d29922',
    success: '#3fb950',
    accent: '#58a6ff',
    purple: '#a371f7',
    muted: '#6e7681'
  };
  return palette[colorId] || palette.muted;
}

function openCustomModal(type, onSave) {
  const existing = document.getElementById('custom-value-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'custom-modal';
  modal.id = 'custom-value-modal';
  modal.innerHTML = `
    <div class="custom-modal-content" role="dialog" aria-modal="true">
      <div class="custom-modal-title">${type === 'status' ? 'Nuevo Estado' : 'Nueva Prioridad'}</div>
      <input id="custom-name-input" class="custom-modal-input" type="text" placeholder="${type === 'status' ? 'Nombre del estado' : 'Nombre de la prioridad'}">
      <div class="custom-modal-colors">
        <div class="color-option" data-color="accent" style="background: ${colorHex('accent')}"></div>
        <div class="color-option" data-color="success" style="background: ${colorHex('success')}"></div>
        <div class="color-option" data-color="warning" style="background: ${colorHex('warning')}"></div>
        <div class="color-option" data-color="danger" style="background: ${colorHex('danger')}"></div>
        <div class="color-option" data-color="purple" style="background: ${colorHex('purple')}"></div>
      </div>
      <div class="custom-modal-actions">
        <button id="custom-cancel" class="btn btn-ghost btn-sm">Cancelar</button>
        <button id="custom-save" class="btn btn-primary btn-sm">Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('visible'), 10);
  let selectedColor = 'accent';
  const colorEls = modal.querySelectorAll('.color-option');
  colorEls.forEach(el => {
    if (el.dataset.color === selectedColor) el.classList.add('active');
    el.addEventListener('click', () => {
      colorEls.forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      selectedColor = el.dataset.color || 'accent';
    });
  });
  const close = () => { modal.classList.remove('visible'); setTimeout(() => modal.remove(), 200); };
  modal.querySelector('#custom-cancel')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('#custom-save')?.addEventListener('click', () => {
    const name = (modal.querySelector('#custom-name-input')?.value || '').trim();
    if (!name) return;
    const id = name;
    const payload = type === 'status'
      ? { id, label: name, color: selectedColor }
      : { id, label: name, icon: 'minus', color: selectedColor };
    onSave(payload);
    close();
  });
}

export { store };
