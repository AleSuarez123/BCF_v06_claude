/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MAIN.JS - Punto de entrada de la aplicación
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Versión: 3.1.0
 * Última actualización: 2024-12-22
 * 
 * Este módulo orquesta la inicialización y coordinación de todos los módulos
 * de la aplicación BCF Viewer Pro.
 */

import { CONFIG, logger, validators } from './config.js';
import { AppState } from './state.js';
import { $, $$, notify, withErrorHandling, updateGlobalStats, closeAllModals, escapeHtml } from './ui-utils.js';
import { Storage } from './storage.js';
import { dbManager } from './db-manager.js';
import { renderProjects, renderIssues, applyFiltersAndSort, updateFilterOptions, openEditIssueModal, saveIssue, clearColumnFilters, updateNavIndicatorUI } from './issue-manager.js';
import { BCFApiClient } from './bcf-api.js';
import { initSpotlight, openSpotlight, closeSpotlight, navigateSpotlight, selectSpotlightResult, toggleKeyboardHelp, initNotificationsPanel } from './ui-panels.js';
import { initKeyboardShortcuts } from './keyboard-shortcuts.js';
import { exportToPDF, exportToExcel, exportToJSON, exportToCSV } from './export-utils.js';
import { BCFParser } from './bcf-parser.js';
import { initColumnCustomizer } from './column-customizer.js';
import { openIssueDetail } from './issue-detail.js';
import { applyBulkStatus, applyBulkUpdate, applyBulkDelete, deselectAllIssues, toggleIssueSelection, selectAllIssues } from './selection-utils.js';
import { openEditSidebar } from './edit-panel.js';
import { blobManager } from './blob-url-manager.js';
import { errorHandler, ErrorTypes, ErrorSeverity } from './error-handler.js';

// Inicializar API Client
export const bcfApi = new BCFApiClient('');

// Variable global para archivos pendientes de asignar
let pendingFiles = [];

// Envolver renderIssues para inyectar dependencias
const renderAppIssues = () => {
    renderIssues(
        (guid) => {
            AppState.currentIssueId = guid;
            openEditSidebar(guid);
        },
        (guid) => toggleFavorite(guid)
    );
};

function toggleFavorite(guid) {
    if (AppState.favorites.has(guid)) {
        AppState.favorites.delete(guid);
    } else {
        AppState.favorites.add(guid);
    }
    Storage.saveAll();
    renderAppIssues();
}

/**
 * Configura el error handler global con estrategias de recuperación
 */
function setupErrorHandler() {
    logger.info('⚙️ Configurando error handler global...');

    // Estrategia de recuperación para errores de red
    errorHandler.registerRecovery(ErrorTypes.NETWORK, (error) => {
        logger.debug('Recovery: Error de red detectado');

        // Si hay servidor configurado, intentar reconectar
        if (AppState.bcfServer.url) {
            // Marcar servidor como potencialmente inaccesible
            const serverStatus = $('#server-status-indicator');
            if (serverStatus) {
                serverStatus.classList.add('offline');
                serverStatus.title = 'Servidor sin conexión';
            }
        }
    });

    // Estrategia de recuperación para errores de almacenamiento
    errorHandler.registerRecovery(ErrorTypes.STORAGE, async (error) => {
        logger.debug('Recovery: Error de almacenamiento detectado');

        const message = error.message.toLowerCase();

        // Si es quota excedida, intentar limpiar datos antiguos
        if (message.includes('quota') || message.includes('full')) {
            try {
                // Limpiar blobs antiguos
                const cleaned = blobManager.cleanOldUrls(30 * 60 * 1000); // 30 minutos
                if (cleaned > 0) {
                    logger.info(`Recovery: ${cleaned} blob URLs antiguas limpiadas`);
                }

                notify('Espacio de almacenamiento bajo. Se limpiaron datos antiguos.', 'warning');
            } catch (cleanupError) {
                logger.error('Error al intentar limpiar almacenamiento:', cleanupError);
            }
        }
    });

    // Estrategia de recuperación para errores de parsing
    errorHandler.registerRecovery(ErrorTypes.PARSE, (error) => {
        logger.debug('Recovery: Error de parsing detectado');

        // Sugerir al usuario verificar el formato del archivo
        const message = error.message.toLowerCase();
        if (message.includes('bcf') || message.includes('xml')) {
            notify('El archivo BCF podría estar corrupto o tener formato incorrecto', 'error');
        } else if (message.includes('json')) {
            notify('Error al procesar datos JSON. Verifica el formato.', 'error');
        }
    });

    // Estrategia de recuperación para errores de renderizado
    errorHandler.registerRecovery(ErrorTypes.RENDER, (error) => {
        logger.debug('Recovery: Error de renderizado detectado');

        // Intentar refrescar la vista actual
        if (AppState.viewMode === 'list') {
            logger.info('Recovery: Intentando re-renderizar lista de incidencias');
            setTimeout(() => {
                try {
                    renderAppIssues();
                } catch (retryError) {
                    logger.error('Error al reintentar renderizado:', retryError);
                }
            }, 100);
        }
    });

    logger.info('✅ Error handler configurado con 4 estrategias de recuperación');
}

// Inicialización principal
const init = async () => {
    try {
        logger.info('🚀 Iniciando BCF Viewer Pro...');
        logger.debug('Configuración:', CONFIG.getVersionInfo?.() || { version: CONFIG.VERSION });

        // Configurar error handler con estrategias de recuperación
        setupErrorHandler();

        // Inicializar DB
        await dbManager.init();
        
        // Cargar datos persistentes
        await Storage.loadAll();
        
        // Configurar API si hay datos guardados
        if (AppState.bcfServer.url) {
            bcfApi.baseUrl = AppState.bcfServer.url;
            if (AppState.bcfServer.token) {
                bcfApi.setToken(AppState.bcfServer.token);
            }
            logger.debug('API configurada:', AppState.bcfServer.url);
        }
        
        // Inicializar UI
        initUI();
        
        // Inicializar eventos globales
        initGlobalEvents();
        
        // Inicializar módulos
        initSpotlight((result) => {
            if (result.type === 'project') {
                loadProject(result.id);
            } else if (result.type === 'issue') {
                // Buscar la incidencia en el proyecto actual o cargar su proyecto
                const issue = AppState.currentIssues.find(i => i.guid === result.id);
                if (issue) {
                    // Ya estamos en el proyecto correcto
                    AppState.viewMode = 'list';
                    renderAppIssues();
                    setTimeout(() => {
                        const el = $(`[data-id="${result.id}"]`);
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('highlight-pulse');
                            setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
                        }
                    }, 100);
                } else {
                    // Buscar incidencia en todos los proyectos
                    loadIssueFromAnyProject(result.id);
                }
            }
        });
        
        // Inicializar atajos de teclado con acciones
        if (typeof initKeyboardShortcuts === 'function') {
            initKeyboardShortcuts({
                openSpotlight,
                closeSpotlight,
                navigateSpotlight,
                selectSpotlightResult,
                toggleKeyboardHelp,
                closeAllModals,
                toggleViewMode,
                resetFilters,
                renderIssues: renderAppIssues,
                applyFiltersAndSort,
                exportToExcel,
                exportToPDF,
                goToDashboard,
                navigateIssue,
                openIssueDetail,
                toggleSelection: toggleIssueSelection,
                selectAll: selectAllIssues
            });
        }
        
        // Renderizar estado inicial
        renderProjects();
        updateGlobalStats();
        
        // Sincronizar con servidor si hay credenciales
        if (AppState.bcfServer.url && AppState.bcfServer.token) {
            syncServerProjects();
        }

        // Verificar fechas de vencimiento
        checkUpcomingDeadlines();
        
        // Verificar filtros en URL (Deep Linking)
        const urlParams = new URLSearchParams(window.location.search);
        const quickFilter = urlParams.get('quickFilter');
        
        if (quickFilter) {
            // Si hay filtro en URL, aplicarlo y dejar que maneje la transición
            await window.handleStatClick(quickFilter);
            
            // Asegurar que el loader se elimine del DOM eventualmente si handleStatClick solo lo ocultó
            const loadingScreen = $('#loading-screen');
            if (loadingScreen && !loadingScreen.classList.contains('fade-out')) {
                 loadingScreen.classList.add('fade-out');
                 setTimeout(() => loadingScreen.remove(), 500);
            }
        } else {
            // Ocultar pantalla de carga estándar
            const loadingScreen = $('#loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => loadingScreen.remove(), 500);
            }
        }
        
        // Mostrar la aplicación principal
        $('#app').classList.remove('hidden');
        
        logger.info('✅ Aplicación iniciada correctamente');
    } catch (error) {
        console.error('Error fatal al iniciar:', error);
        notify(`Error fatal: ${error.message}`, 'error');
        
        const loadingScreen = $('#loading-screen');
        if (loadingScreen) {
            const text = loadingScreen.querySelector('.loading-text');
            if (text) {
                text.style.color = '#ef4444';
                text.innerHTML = `Error al iniciar:<br>${error.message}<br><br><small style="opacity:0.7">Si estás usando archivos locales, asegúrate de usar un servidor web (http://localhost)</small>`;
            }
            const loader = loadingScreen.querySelector('.loader');
            if (loader) loader.style.display = 'none';
        }
    }
};

function initUI() {
    // Configurar drop zones
    setupDropZones();
    
    // Configurar navegación
    setupNavigation();
    
    // Configurar filtros
    setupFilters();
    
    // Configurar barra de acciones masivas
    setupBulkActionsBar();
    
    // Configurar exportación
    setupExport();
    
    // Configurar dropdowns
    setupDropdowns();
    
    // Configurar tema
    setupTheme();

    // Inicializar paneles de la interfaz
    initNotificationsPanel();
    
    // Inicializar personalizador de columnas
    initColumnCustomizer();
    
    // Configurar modales y formularios
    setupModals();
}

function setupBulkActionsBar() {
    // Status
    const btnApplyStatus = document.getElementById('btn-bulk-status');
    const bulkStatusSelect = document.getElementById('bulk-status');
    
    if (btnApplyStatus) {
        btnApplyStatus.addEventListener('click', () => {
            applyBulkUpdate('topicStatus', bulkStatusSelect?.value, () => {
                applyFiltersAndSort();
                renderAppIssues();
            });
        });
    }

    // Priority
    const btnApplyPriority = document.getElementById('btn-bulk-priority');
    const bulkPrioritySelect = document.getElementById('bulk-priority');

    if (btnApplyPriority) {
        btnApplyPriority.addEventListener('click', () => {
            applyBulkUpdate('priority', bulkPrioritySelect?.value, () => {
                applyFiltersAndSort();
                renderAppIssues();
            });
        });
    }

    // Assignee
    const btnApplyAssigned = document.getElementById('btn-bulk-assigned');
    const bulkAssignedInput = document.getElementById('bulk-assigned');

    if (btnApplyAssigned) {
        btnApplyAssigned.addEventListener('click', () => {
            applyBulkUpdate('assignedTo', bulkAssignedInput?.value, () => {
                applyFiltersAndSort();
                renderAppIssues();
            });
        });
    }

    // Export
    const btnExport = document.getElementById('btn-bulk-export');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            exportToExcel(true);
        });
    }

    // Delete
    const btnDelete = document.getElementById('btn-bulk-delete');
    if (btnDelete) {
        btnDelete.addEventListener('click', () => {
            applyBulkDelete(() => {
                applyFiltersAndSort();
                renderAppIssues();
                updateGlobalStats();
            });
        });
    }

    // Clear
    const btnClear = document.getElementById('btn-clear-selection');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            deselectAllIssues();
        });
    }
}

function navigateIssue(delta) {
    const total = AppState.filteredIssues.length;
    if (total === 0) return;
    const current = typeof AppState.focusedIndex === 'number' ? AppState.focusedIndex : -1;
    const next = Math.max(0, Math.min(total - 1, current + delta));
    AppState.focusedIndex = next;
    updateNavIndicatorUI();
}

function setupModals() {
    // Modal Nuevo Proyecto
    const modalProject = $('#modal-project');
    const formProject = $('#form-project');
    
    if (formProject) {
        formProject.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projectId = $('#project-id').value;
            const name = $('#project-name').value;
            const description = $('#project-description').value;
            
            if (projectId) {
                // Modo edición
                const project = AppState.projects.find(p => p.id === projectId);
                if (project) {
                    project.name = name;
                    project.description = description;
                    await Storage.saveAll();
                    renderProjects();
                    if (AppState.currentProject?.id === projectId) {
                        const currentNameEl = $('#current-project-name');
                        if (currentNameEl) currentNameEl.textContent = name;
                    }
                    notify('Proyecto actualizado', 'success');
                }
            } else if (name) {
                // Modo creación
                await createNewProject(name, description, pendingFiles);
                pendingFiles = []; // Limpiar pendientes
            }
            
            modalProject.classList.remove('active');
        });
    }

    // Modal Selección de Target (para Drop)
    const modalTarget = $('#modal-select-project-target');
    const btnTargetNew = $('#btn-target-new');
    
    if (btnTargetNew) {
        btnTargetNew.addEventListener('click', () => {
            modalTarget.classList.remove('active');
            // Abrir modal de nuevo proyecto
            $('#project-name').value = '';
            $('#project-description').value = '';
            $('#modal-project').classList.add('active');
            $('#project-name').focus();
        });
    }

    // Botón de ayuda de teclado
    const btnKeyboardHelp = $('#btn-keyboard-help');
    if (btnKeyboardHelp) {
        btnKeyboardHelp.addEventListener('click', () => {
            toggleKeyboardHelp();
        });
    }

    // Modal Crear/Editar Incidencia
    const formEditIssue = $('#form-edit-issue');
    if (formEditIssue) {
        formEditIssue.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formEditIssue);
            // Mapear campos manualmente si es necesario o usar FormData
            const data = new FormData();
            data.append('guid', $('#edit-issue-guid').value);
            data.append('title', $('#edit-issue-title').value);
            data.append('description', $('#edit-issue-description').value);
            data.append('status', $('#edit-issue-status').value);
            data.append('priority', $('#edit-issue-priority').value);
            data.append('type', $('#edit-issue-type').value);
            data.append('assigned', $('#edit-issue-assigned').value);
            data.append('labels', $('#edit-issue-labels').value);

            await saveIssue(data);
            $('#modal-edit-issue').classList.remove('active');
            notify('Incidencia guardada correctamente', 'success');
            renderAppIssues();
            updateGlobalStats(); // Actualizar contadores globales
        });
    }

    // Botones de cerrar modales genéricos
    $$('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });

    // Cerrar ayuda de teclado
    const btnCloseKeyboard = $('[data-close-keyboard]');
    if (btnCloseKeyboard) {
        btnCloseKeyboard.addEventListener('click', () => {
            $('#keyboard-help').classList.remove('active');
        });
    }
}

function setupDropdowns() {
    const dropdowns = $$('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
        }
    });
    
    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', (e) => {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    });
}

function setupDropZones() {
    const dashboardDropZone = $('#dashboard-drop-zone');
    
    if (dashboardDropZone) {
        dashboardDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dashboardDropZone.classList.add('drag-over');
        });
        
        dashboardDropZone.addEventListener('dragleave', () => {
            dashboardDropZone.classList.remove('drag-over');
        });
        
        dashboardDropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dashboardDropZone.classList.remove('drag-over');
            
            // Soporte para carpetas usando DataTransferItems
            const items = e.dataTransfer.items;
            if (items && items.length > 0 && items[0].webkitGetAsEntry) {
                const entries = [];
                for (let i = 0; i < items.length; i++) {
                    const entry = items[i].webkitGetAsEntry();
                    if (entry) entries.push(entry);
                }
                
                notify('Escaneando carpeta...', 'info');
                try {
                    const files = await scanEntries(entries);
                    handleFolderSelection(files);
                } catch (err) {
                    console.error('Error escaneando carpeta:', err);
                    notify('Error al leer el contenido de la carpeta', 'error');
                }
            } else {
                // Fallback estándar
                const files = Array.from(e.dataTransfer.files).filter(f => 
                    f.name.toLowerCase().endsWith('.bcf') || 
                    f.name.toLowerCase().endsWith('.bcfzip') ||
                    f.name.toLowerCase().endsWith('.zip')
                );
                handleFiles(files);
            }
        });
    }
    
    // Drop zone global
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            $('#drop-zone-overlay').classList.add('active');
        }
    });
    
    $('#drop-zone-overlay').addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null) {
            $('#drop-zone-overlay').classList.remove('active');
        }
    });
    
    $('#drop-zone-overlay').addEventListener('drop', (e) => {
        e.preventDefault();
        $('#drop-zone-overlay').classList.remove('active');
        const files = Array.from(e.dataTransfer.files).filter(f => 
            f.name.toLowerCase().endsWith('.bcf') || 
            f.name.toLowerCase().endsWith('.bcfzip') ||
            f.name.toLowerCase().endsWith('.zip')
        );
        handleFiles(files);
    });
    
    // Input file oculto (archivos individuales)
    let fileInput = $('#global-file-input');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.id = 'global-file-input';
        fileInput.type = 'file';
        fileInput.accept = '.bcf,.bcfzip,.zip';
        fileInput.style.display = 'none';
        fileInput.multiple = true;
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(Array.from(e.target.files));
            }
            fileInput.value = '';
        });
    }
    
    // Input folder oculto (carpetas)
    let folderInput = $('#global-folder-input');
    if (!folderInput) {
        folderInput = document.createElement('input');
        folderInput.id = 'global-folder-input';
        folderInput.type = 'file';
        folderInput.webkitdirectory = true;
        folderInput.directory = true; // Para compatibilidad
        folderInput.style.display = 'none';
        document.body.appendChild(folderInput);
        
        folderInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFolderSelection(Array.from(e.target.files));
            }
            folderInput.value = '';
        });
    }
    
    const btnQuickUpload = $('#btn-quick-upload');
    if (btnQuickUpload) {
        btnQuickUpload.addEventListener('click', () => fileInput.click());
    }
    
    const btnFolderUpload = $('#btn-folder-upload');
    if (btnFolderUpload) {
        btnFolderUpload.addEventListener('click', () => folderInput.click());
    }
    
    const btnUploadBcf = $('#btn-upload-bcf');
    if (btnUploadBcf) {
        btnUploadBcf.addEventListener('click', () => fileInput.click());
    }
}

// Helpers para lectura de carpetas
function isBcfFile(file) {
    const name = file.name.toLowerCase();
    return name.endsWith('.bcf') || name.endsWith('.bcfzip') || name.endsWith('.zip');
}

async function scanEntries(entries) {
    const files = [];
    for (const entry of entries) {
        if (entry.isFile) {
            const file = await getFileFromEntry(entry);
            if (isBcfFile(file)) files.push(file);
        } else if (entry.isDirectory) {
            const dirFiles = await readDirectory(entry);
            files.push(...dirFiles);
        }
    }
    return files;
}

function getFileFromEntry(fileEntry) {
    return new Promise((resolve, reject) => fileEntry.file(resolve, reject));
}

function readDirectory(dirEntry) {
    return new Promise((resolve) => {
        const dirReader = dirEntry.createReader();
        const files = [];
        
        const readEntries = () => {
            dirReader.readEntries(async (entries) => {
                if (entries.length === 0) {
                    resolve(files);
                } else {
                    const subFiles = await scanEntries(entries);
                    files.push(...subFiles);
                    readEntries(); // Continuar leyendo (batch de 100 en algunos navegadores)
                }
            }, (err) => {
                console.warn('Error leyendo directorio:', err);
                resolve(files);
            });
        };
        
        readEntries();
    });
}

function handleFolderSelection(files) {
    // 1. Filtrar BCF (si vienen de input.files ya son File objects, si vienen de scanEntries también)
    // El input.files de webkitdirectory devuelve todos los archivos, hay que filtrar por extensión
    const bcfFiles = files.filter(isBcfFile);

    // 2. Validar
    if (bcfFiles.length === 0) {
        notify('No se encontraron archivos BCF válidos en la carpeta seleccionada', 'warning');
        return;
    }

    // 3. Mostrar resumen y confirmar
    showFolderSummary(bcfFiles);
}

function showFolderSummary(files) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '3000'; // Asegurar que está por encima
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Resumen de Carga de Carpeta</h3>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: var(--color-primary-light); color: var(--color-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div>
                        <div style="font-weight: 700; font-size: 1.1rem;">${files.length} archivos BCF</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">Listos para importar</div>
                    </div>
                </div>
                
                <p style="margin-bottom: 8px; font-weight: 500;">Archivos encontrados:</p>
                <ul style="max-height: 200px; overflow-y: auto; margin: 0; padding: 0; list-style: none; border: 1px solid var(--border-color); border-radius: 4px;">
                    ${files.slice(0, 50).map(f => `
                        <li style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(f.webkitRelativePath || f.name)}</span>
                            <span style="margin-left: auto; color: var(--text-muted); font-size: 0.75rem;">${(f.size / 1024).toFixed(1)} KB</span>
                        </li>
                    `).join('')}
                    ${files.length > 50 ? `<li style="padding: 8px 12px; color: var(--text-muted); text-align: center; font-style: italic;">... y ${files.length - 50} más</li>` : ''}
                </ul>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost btn-cancel">Cancelar</button>
                <button class="btn btn-primary btn-confirm">Confirmar e Importar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const close = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.modal-close').onclick = close;
    modal.querySelector('.btn-cancel').onclick = close;
    modal.querySelector('.modal-backdrop').onclick = close;
    
    modal.querySelector('.btn-confirm').onclick = () => {
        close();
        handleFiles(files);
    };
}

const handleFileDrop = withErrorHandling(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => 
        f.name.toLowerCase().endsWith('.bcf') || 
        f.name.toLowerCase().endsWith('.bcfzip') ||
        f.name.toLowerCase().endsWith('.zip')
    );
    
    if (files.length === 0) return;
    
    await handleFiles(files);
}, 'Error al procesar archivos');

async function handleFiles(files) {
    if (files.length === 0) return;
    
    notify(`Procesando ${files.length} archivo(s)...`, 'info');
    pendingFiles = files;
    const modalTarget = $('#modal-select-project-target');
    const listContainer = $('#existing-projects-list');
    
    if (modalTarget && listContainer) {
        // Renderizar lista de proyectos existentes
        if (AppState.projects.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-muted">No hay proyectos existentes.</p>';
        } else {
            listContainer.innerHTML = AppState.projects.map(p => `
                <button class="target-option-card existing-project-option" data-id="${p.id}">
                    <div class="option-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                    </div>
                    <div class="option-info">
                        <h4>${escapeHtml(p.name)}</h4>
                        <p>${p.bcfFiles?.length || 0} archivos • ${new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div style="color: var(--color-primary); opacity: 0.5;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                </button>
            `).join('');

            // Añadir listeners
            listContainer.querySelectorAll('.existing-project-option').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const projectId = btn.dataset.id;
                    modalTarget.classList.remove('active');
                    
                    // Cargar proyecto y añadir archivos
                    await loadProject(projectId);
                    await addFilesToProject(pendingFiles);
                    pendingFiles = [];
                });
            });
        }
        
        modalTarget.classList.add('active');
    } else {
        // Fallback si no hay modal (no debería pasar)
        await createNewProject(`Proyecto ${new Date().toLocaleDateString()}`, '', files);
    }
}

async function createNewProject(name, description, files = []) {
    const newProject = {
        id: crypto.randomUUID(),
        name: name,
        description: description || `Creado el ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        bcfFiles: []
    };
    
    AppState.projects.push(newProject);
    await Storage.saveAll();
    
    AppState.currentProject = newProject;
    
    if (files.length > 0) {
        await addFilesToProject(files);
    }
    
    renderProjects();
    updateGlobalStats();
    
    // Cargar el proyecto recién creado
    await loadProject(newProject.id);
}

async function addFilesToProject(files) {
    for (const file of files) {
        try {
            const bcfData = await BCFParser.loadBCF(file);
            AppState.currentProject.bcfFiles.push(bcfData);
        } catch (error) {
            logger.error('Error parseando archivo BCF:', error);
            notify(`Error en ${file.name}`, 'error');
        }
    }
    
    await Storage.saveAll();
    await loadProject(AppState.currentProject.id);
    notify('Archivos cargados correctamente', 'success');
}

export async function loadProject(projectId) {
    const project = AppState.projects.find(p => p.id === projectId);
    if (!project) return;

    // Limpiar URLs del proyecto anterior si existe
    if (AppState.currentProject && AppState.currentProject.id !== projectId) {
        const oldContext = `project-${AppState.currentProject.id}`;
        blobManager.revokeContext(oldContext);
        logger.debug(`Limpiadas URLs del proyecto anterior: ${oldContext}`);
    }

    AppState.currentProject = project;
    AppState.currentIssues = [];

    // Context para este proyecto
    const projectContext = `project-${projectId}`;

    // Process issues and generate blob URLs for current session
    project.bcfFiles.forEach(bcf => {
        bcf.topics?.forEach(topic => {
            // Generate temporary URL for snapshot if it's a Blob
            let snapshotUrl = null;
            if (topic.snapshot instanceof Blob) {
                // Usar blob manager en lugar de crear URL directamente
                snapshotUrl = blobManager.create(topic.snapshot, topic.guid, projectContext);
            } else if (typeof topic.snapshot === 'string' && topic.snapshot.startsWith('blob:')) {
                // Warning: Old stale blob URL, cannot recover if Blob is lost
                logger.warn(`URL de blob obsoleta detectada para ${topic.guid}`);
                snapshotUrl = null;
            }

            AppState.currentIssues.push({
                ...topic,
                bcfFile: bcf.fileName,
                bcfVersion: bcf.version,
                snapshotUrl: snapshotUrl // Use this for display
            });
        });
    });

    // Update project name in UI
    const currentNameEl = $('#current-project-name');
    if (currentNameEl) currentNameEl.textContent = project.name;

    updateFilterOptions();
    applyFiltersAndSort();
    renderIssues();

    navigateTo('viewer');
}

function setupNavigation() {
    const btnNewProject = $('#btn-new-project');
    if (btnNewProject) {
        btnNewProject.addEventListener('click', () => {
            // Limpiar formulario y mostrar modal
            const form = $('#form-project');
            if (form) form.reset();
            $('#modal-project-title').textContent = 'Nuevo Proyecto';
            $('#project-id').value = '';
            $('#modal-project').classList.add('active');
            $('#project-name').focus();
        });
    }

    const btnEditProject = $('#btn-edit-project');
    if (btnEditProject) {
        btnEditProject.addEventListener('click', () => {
            if (!AppState.currentProject) return;
            const form = $('#form-project');
            if (form) {
                form.reset();
                $('#project-id').value = AppState.currentProject.id;
                $('#project-name').value = AppState.currentProject.name;
                $('#project-description').value = AppState.currentProject.description || '';
                $('#modal-project-title').textContent = 'Editar Proyecto';
                $('#modal-project').classList.add('active');
            }
        });
    }
    
    // Search trigger
    const searchTrigger = $('#search-trigger');
    if (searchTrigger) {
        searchTrigger.addEventListener('click', openSpotlight);
    }
    
    const btnToggleFilters = $('#btn-toggle-filters');
    const filtersSidebar = $('.filters-sidebar');
    const btnCloseFilters = $('#btn-close-filters');
    const viewerLayout = document.querySelector('.viewer-content-layout');
    const filtersBackdrop = $('#filters-backdrop');

    // Initialize ARIA attributes
    if (filtersSidebar) {
        filtersSidebar.setAttribute('role', 'complementary');
        filtersSidebar.setAttribute('aria-label', 'Panel de filtros');
        filtersSidebar.setAttribute('aria-hidden', 'true');
    }

    if (btnToggleFilters) {
        btnToggleFilters.setAttribute('aria-label', 'Abrir panel de filtros');
        btnToggleFilters.setAttribute('aria-expanded', 'false');
        btnToggleFilters.setAttribute('aria-controls', 'filters-sidebar');
    }

    if (btnCloseFilters) {
        btnCloseFilters.setAttribute('aria-label', 'Cerrar panel de filtros');
        btnCloseFilters.setAttribute('aria-expanded', 'false');
        btnCloseFilters.setAttribute('aria-controls', 'filters-sidebar');
    }

    // Initialize layout classes
    if (viewerLayout) {
        viewerLayout.classList.add('filters-closed');
    }

    if (btnToggleFilters && filtersSidebar) {
        btnToggleFilters.addEventListener('click', () => {
            const isOpen = filtersSidebar.classList.contains('active') && !filtersSidebar.classList.contains('collapsed');
            
            if (isOpen) {
                closeFiltersPanel();
            } else {
                openFiltersPanel();
            }
        });
    }

    if (btnCloseFilters && filtersSidebar) {
        btnCloseFilters.addEventListener('click', (e) => {
             e.preventDefault();
             closeFiltersPanel();
        });
    }

    // Function to close filters panel with animation
    function closeFiltersPanel() {
        const viewerLayout = document.querySelector('.viewer-content-layout');
        const isMobile = window.innerWidth <= 768;
        
        console.log('Closing filters panel...'); // Debug log
        
        // Add closing class for animation
        filtersSidebar.classList.add('closing');
        filtersSidebar.classList.remove('active');
        
        // Update ARIA attributes
        filtersSidebar.setAttribute('aria-hidden', 'true');
        if (btnCloseFilters) {
            btnCloseFilters.setAttribute('aria-expanded', 'false');
        }
        if (btnToggleFilters) {
            btnToggleFilters.setAttribute('aria-expanded', 'false');
            btnToggleFilters.setAttribute('aria-label', 'Abrir panel de filtros');
        }
        
        // Update main layout class
        if (viewerLayout) {
            viewerLayout.classList.remove('filters-open');
            viewerLayout.classList.add('filters-closed');
        }
        
        // Hide backdrop on mobile
        if (filtersBackdrop) {
            filtersBackdrop.classList.remove('active');
        }
        
        // Remove classes after animation completes
        setTimeout(() => {
            filtersSidebar.classList.remove('closing');
            filtersSidebar.classList.add('collapsed');
            
            // Move focus to toggle button for accessibility
            if (btnToggleFilters) {
                btnToggleFilters.focus();
            }
            console.log('Filters panel closed successfully'); // Debug log
        }, 300); // Match CSS transition duration
    }

    // Function to open filters panel with animation
    function openFiltersPanel() {
        const viewerLayout = document.querySelector('.viewer-content-layout');
        const isMobile = window.innerWidth <= 768;
        
        console.log('Opening filters panel...'); // Debug log
        
        // Remove collapsed state
        filtersSidebar.classList.remove('collapsed', 'closing');
        filtersSidebar.classList.add('active');
        
        // Update ARIA attributes
        filtersSidebar.setAttribute('aria-hidden', 'false');
        if (btnCloseFilters) {
            btnCloseFilters.setAttribute('aria-expanded', 'true');
        }
        if (btnToggleFilters) {
            btnToggleFilters.setAttribute('aria-expanded', 'true');
            btnToggleFilters.setAttribute('aria-label', 'Cerrar panel de filtros');
        }
        
        // Update main layout class
        if (viewerLayout) {
            viewerLayout.classList.remove('filters-closed');
            viewerLayout.classList.add('filters-open');
        }
        
        // Show backdrop on mobile
        if (filtersBackdrop && window.innerWidth <= 768) {
            filtersBackdrop.classList.add('active');
        }
        
        // Move focus to panel for accessibility
        setTimeout(() => {
            const firstFocusable = filtersSidebar.querySelector('button, input, select, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
            console.log('Filters panel opened successfully'); // Debug log
        }, 300); // After animation completes
    }

    // Keyboard navigation support
    if (btnCloseFilters) {
        btnCloseFilters.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeFiltersPanel();
            }
        });
    }

    // Close panel when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const isMobile = window.innerWidth <= 768;
        const isPanelOpen = filtersSidebar.classList.contains('active') && !filtersSidebar.classList.contains('collapsed');
        
        if (isMobile && isPanelOpen && !filtersSidebar.contains(e.target) && !btnToggleFilters.contains(e.target)) {
            closeFiltersPanel();
        }
    });

    // Close panel when clicking backdrop
    if (filtersBackdrop) {
        filtersBackdrop.addEventListener('click', () => {
            closeFiltersPanel();
        });
    }
    
    // Sidebar toggle
    const btnToggleSidebar = $('#btn-toggle-sidebar');
    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            const sidebar = document.querySelector('.edit-sidebar');
            const isActive = sidebar && sidebar.classList.contains('active');
            
            if (isActive) {
                if (window.closeEditSidebar) window.closeEditSidebar();
            } else {
                if (AppState.currentIssueId) {
                    if (window.openEditSidebar) window.openEditSidebar(AppState.currentIssueId);
                } else {
                    notify('Selecciona una incidencia primero', 'info');
                }
            }
        });
    }

    const btnBack = $('#btn-back');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            navigateTo('dashboard');
            AppState.currentProject = null;
            AppState.currentIssues = [];
            AppState.filteredIssues = [];
            renderProjects();
            updateGlobalStats();
        });
    }

    const btnNewIssue = $('#btn-new-issue');
    if (btnNewIssue) {
        btnNewIssue.addEventListener('click', () => {
            openEditIssueModal();
        });
    }
    
    const btnViewList = $('#btn-view-list');
    const btnViewGrid = $('#btn-view-grid');
    
    if (btnViewList) {
        btnViewList.addEventListener('click', () => {
            AppState.viewMode = 'list';
            btnViewList.classList.add('active');
            if (btnViewGrid) btnViewGrid.classList.remove('active');
            renderIssues();
        });
    }
    
    if (btnViewGrid) {
        btnViewGrid.addEventListener('click', () => {
            AppState.viewMode = 'grid';
            btnViewGrid.classList.add('active');
            if (btnViewList) btnViewList.classList.remove('active');
            renderIssues();
        });
    }
}

function navigateTo(pageId) {
    $$('.page').forEach(p => p.classList.remove('active'));
    
    if (pageId === 'viewer') {
        const viewerPage = $('#viewer-page');
        if (viewerPage) viewerPage.classList.add('active');
        $('#dashboard-page').classList.remove('active');
        $('#app').classList.remove('hidden');
    } else {
        $('#dashboard-page').classList.add('active');
        const viewerPage = $('#viewer-page');
        if (viewerPage) viewerPage.classList.remove('active');
    }
}

function goToDashboard() {
    navigateTo('dashboard');
}

function toggleViewMode() {
    AppState.viewMode = AppState.viewMode === 'list' ? 'grid' : 'list';
    const btnViewList = $('#btn-view-list');
    const btnViewGrid = $('#btn-view-grid');
    
    if (AppState.viewMode === 'list') {
        if (btnViewList) btnViewList.classList.add('active');
        if (btnViewGrid) btnViewGrid.classList.remove('active');
    } else {
        if (btnViewList) btnViewList.classList.remove('active');
        if (btnViewGrid) btnViewGrid.classList.add('active');
    }
    renderIssues();
}

function setupFilters() {
    const filterInputs = ['filter-bcf', 'filter-author', 'filter-date-from', 'filter-date-to', 'filter-search', 'sort-by'];
    
    filterInputs.forEach(id => {
        const el = $(`#${id}`);
        if (el) {
            el.addEventListener('input', () => {
                applyFiltersAndSort();
                renderAppIssues();
            });
            el.addEventListener('change', () => {
                applyFiltersAndSort();
                renderAppIssues();
            });
        }
    });

    const btnFilterFavorites = $('#btn-filter-favorites');
    if (btnFilterFavorites) {
        btnFilterFavorites.addEventListener('click', () => {
            btnFilterFavorites.classList.toggle('active');
            applyFiltersAndSort();
            renderAppIssues();
        });
    }
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-chip')) {
            e.target.classList.toggle('active');
            applyFiltersAndSort();
            renderAppIssues();
        }
    });
    
    const selectAll = $('#select-all-checkbox');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            if (e.target.checked) {
                AppState.filteredIssues.forEach(issue => AppState.selectedIssues.add(issue.guid));
            } else {
                AppState.selectedIssues.clear();
            }
            renderIssues();
        });
    }

    const btnClearFilters = $('#btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => resetFilters());
    }
    const btnClearFiltersHeader = $('#btn-clear-filters-header');
    if (btnClearFiltersHeader) {
        btnClearFiltersHeader.addEventListener('click', () => resetFilters());
    }
}

function resetFilters() {
    ['filter-bcf','filter-author','filter-date-from','filter-date-to','filter-search'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sort = document.getElementById('sort-by');
    if (sort) sort.value = 'date-desc';
    $$('#filter-status .filter-chip.active').forEach(c => c.classList.remove('active'));
    $$('#filter-priority .filter-chip.active').forEach(c => c.classList.remove('active'));
    $$('#filter-discipline .filter-chip.active').forEach(c => c.classList.remove('active'));
    const favBtn = $('#btn-filter-favorites');
    if (favBtn) favBtn.classList.remove('active');
    clearColumnFilters();
    applyFiltersAndSort();
    renderAppIssues();
}

function setupExport() {
    const btnExcel = $('#btn-export-excel');
    if (btnExcel) btnExcel.addEventListener('click', () => exportToExcel());
    
    const btnCsv = $('#btn-export-csv');
    if (btnCsv) btnCsv.addEventListener('click', () => exportToCSV());
    
    const btnPdf = $('#btn-export-pdf');
    if (btnPdf) btnPdf.addEventListener('click', () => exportToPDF(false));
    
    const btnPdfDetail = $('#btn-export-pdf-detail');
    if (btnPdfDetail) btnPdfDetail.addEventListener('click', () => exportToPDF(true));
    
    const btnJson = $('#btn-export-json');
    if (btnJson) btnJson.addEventListener('click', () => exportToJSON());
}

function setupTheme() {
    const btnTheme = $('#btn-theme-toggle');
    
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        AppState.theme = theme;
        
        const isDark = theme === 'dark';
        const iconSun = $('.icon-sun');
        const iconMoon = $('.icon-moon');
        
        if (iconSun) iconSun.classList.toggle('hidden', isDark);
        if (iconMoon) iconMoon.classList.toggle('hidden', !isDark);
        
        Storage.saveSettings();
    };

    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            const newTheme = AppState.theme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }
    
    // Aplicar tema inicial
    applyTheme(AppState.theme || 'light');
}

function setupServer() {
    const btnConnect = $('#btn-connect-server');
    const modalServer = $('#modal-connect-server');
    const btnTest = $('#btn-test-connection');
    const btnSave = $('#btn-save-server');
    const inputUrl = $('#server-url');
    const inputToken = $('#server-token');
    const statusDiv = $('#server-status');

    if (btnConnect) {
        btnConnect.addEventListener('click', () => {
            if (modalServer) {
                modalServer.classList.add('active');
                if (AppState.bcfServer.url) {
                    inputUrl.value = AppState.bcfServer.url;
                    inputToken.value = AppState.bcfServer.token || '';
                }
            }
        });
    }

    if (btnTest && inputUrl) {
        btnTest.addEventListener('click', async () => {
            const url = inputUrl.value.trim();
            const token = inputToken.value.trim();

            if (!url) {
                notify('Introduce una URL válida', 'warning');
                return;
            }

            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '<div class="spinner spinner-sm"></div><span>Verificando conexión...</span>';
            statusDiv.className = 'server-status';

            try {
                // Configurar cliente temporal para prueba
                const tempApi = new BCFApiClient(url);
                if (token) tempApi.setToken(token);

                const versions = await tempApi.getVersions();
                
                statusDiv.innerHTML = '<span>✅ Conexión exitosa (BCF API detectada)</span>';
                statusDiv.classList.add('success');
                
            } catch (error) {
                console.error('Error de conexión:', error);
                statusDiv.innerHTML = `<span>❌ Error: ${error.message}</span>`;
                statusDiv.classList.add('error');
            }
        });
    }

    if (btnSave && inputUrl) {
        btnSave.addEventListener('click', async () => {
            const url = inputUrl.value.trim();
            const token = inputToken.value.trim();

            if (!url) {
                notify('Introduce una URL válida', 'warning');
                return;
            }

            try {
                AppState.bcfServer = { url, token };
                bcfApi.baseUrl = url;
                if (token) bcfApi.setToken(token);

                await Storage.saveSettings();
                notify('Configuración del servidor guardada', 'success');
                
                if (modalServer) modalServer.classList.remove('active');
                
                // Intentar sincronizar
                syncServerProjects();

            } catch (error) {
                notify('Error al guardar configuración', 'error');
            }
        });
    }
}

function initGlobalEvents() {
    window.addEventListener('resize', () => {
        // Ajustar layout si es necesario
    });
    
    window.addEventListener('beforeunload', (e) => {
        if (Object.keys(AppState.localChanges).length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Escuchar evento de refresco de incidencias (para Sort y Drag&Drop)
    document.addEventListener('issues:refresh', () => {
        renderAppIssues();
    });
}

function checkUpcomingDeadlines() {
    if (!AppState.currentIssues) return;
    
    const today = new Date();
    const upcoming = AppState.currentIssues.filter(issue => {
        if (!issue.dueDate) return false;
        const due = new Date(issue.dueDate);
        const diff = (due - today) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7 && issue.topicStatus !== 'Closed' && issue.topicStatus !== 'Resolved';
    });

    if (upcoming.length > 0) {
        notify(`Tienes ${upcoming.length} incidencias próximas a vencer`, 'warning');
    }
}

const syncServerProjects = withErrorHandling(async () => {
    if (!AppState.bcfServer?.url) return;
    
    notify('Sincronizando proyectos del servidor...', 'info', 3000);
    const serverProjects = await bcfApi.getProjects();
    
    if (!serverProjects || !Array.isArray(serverProjects)) return;

    let newProjectsCount = 0;
    for (const sProject of serverProjects) {
        const exists = AppState.projects.some(p => p.id === sProject.guid || p.serverGuid === sProject.guid);
        if (!exists) {
            AppState.projects.push({
                id: sProject.guid,
                serverGuid: sProject.guid,
                name: sProject.name,
                description: `Servidor: ${AppState.bcfServer.url}`,
                createdAt: new Date().toISOString(),
                bcfFiles: [],
                isServerProject: true
            });
            newProjectsCount++;
        }
    }

    if (newProjectsCount > 0) {
        await Storage.saveAll();
        renderProjects();
        updateGlobalStats();
        notify(`Sincronizados ${newProjectsCount} nuevos proyectos`, 'success');
    } else {
        notify('Proyectos al día', 'success');
    }
}, 'Error al sincronizar con el servidor');

window.openSnapshot = (src) => { 
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content" style="max-width: 90vw; max-height: 90vh; background: transparent; padding: 0;">
            <img src="${src}" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 4px;">
            <button class="modal-close" style="top: -30px; right: 0; color: white;">×</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-backdrop').onclick = () => modal.remove();
    modal.querySelector('.modal-close').onclick = () => modal.remove();
};

window.handleStatClick = async (type) => {
    if (!type) return;
    
    // Mostrar indicador de carga
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('fade-out');
        loadingScreen.style.opacity = '0.7';
        const text = loadingScreen.querySelector('.loading-text');
        if (text) text.textContent = 'Filtrando incidencias...';
    }

    // Pequeño delay para permitir que el UI se actualice
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        // Resetear filtros primero
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
            AppState.filters.unassignedOnly = false;
        }
        clearColumnFilters();
        
        // Resetear inputs UI
        const inputs = document.querySelectorAll('#filter-bcf, #filter-author, #filter-date-from, #filter-date-to, #filter-search');
        inputs.forEach(i => i.value = '');
        document.querySelectorAll('.filter-chip.active').forEach(c => c.classList.remove('active'));

        // Actualizar URL
        const url = new URL(window.location);
        url.searchParams.set('quickFilter', type);
        window.history.pushState({}, '', url);

        // Aplicar filtro específico
        switch (type) {
            case 'priority':
                AppState.filters.priorities = ['High'];
                // Activar chip visualmente si existe
                const highChip = document.querySelector('#filter-priority .filter-chip[data-value="High"]');
                if (highChip) highChip.classList.add('active');
                break;
                
            case 'due':
                // Próximos 7 días
                const today = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);
                
                const dateFrom = today.toISOString().split('T')[0];
                const dateTo = nextWeek.toISOString().split('T')[0];
                
                AppState.filters.dateFrom = dateFrom;
                AppState.filters.dateTo = dateTo;
                
                const fromInput = document.getElementById('filter-date-from');
                const toInput = document.getElementById('filter-date-to');
                if (fromInput) fromInput.value = dateFrom;
                if (toInput) toInput.value = dateTo;
                
                // También ordenar por fecha límite si es posible
                const sort = document.getElementById('sort-by');
                if (sort) {
                    if (!sort.querySelector('option[value="deadline-asc"]')) {
                        const opt = document.createElement('option');
                        opt.value = 'deadline-asc';
                        opt.textContent = 'Vencen pronto';
                        sort.appendChild(opt);
                    }
                    sort.value = 'deadline-asc';
                }
                break;
                
            case 'unassigned':
                AppState.filters.unassignedOnly = true;
                break;
                
            case 'issues':
            case 'projects':
            case 'files':
            default:
                // Solo resetear (ya hecho arriba)
                break;
        }

        // Navegar a viewer
        navigateTo('viewer');
        
        applyFiltersAndSort();
        renderAppIssues();

        // Feedback de resultados
        const count = AppState.filteredIssues.length;
        if (count === 0) {
            notify('No se encontraron incidencias que coincidan con el filtro', 'warning');
        } else {
            // Opcional: Feedback sutil o nada si hay resultados
        }

    } catch (error) {
        console.error('Error al aplicar filtro rápido:', error);
        notify('Error al procesar el filtro', 'error');
    } finally {
        // Ocultar indicador de carga
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.opacity = '';
                const text = loadingScreen.querySelector('.loading-text');
                if (text) text.textContent = 'Cargando...';
            }, 300);
        }
    }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BÚSQUEDA CROSS-PROJECT
 * ═══════════════════════════════════════════════════════════════════════════
 */
async function loadIssueFromAnyProject(issueId) {
    logger.info('🔍 Buscando incidencia en todos los proyectos:', issueId);
    
    if (!validators.guid(issueId)) {
        logger.warning('GUID inválido:', issueId);
        notify('ID de incidencia inválido', 'error');
        return;
    }
    
    notify('Buscando incidencia en proyectos...', 'info');
    
    for (const project of AppState.projects) {
        logger.debug(`Buscando en proyecto: ${project.name}`);
        
        if (AppState.currentProject?.id !== project.id) {
            try {
                await loadProject(project.id);
            } catch (error) {
                logger.error(`Error al cargar proyecto ${project.name}:`, error);
                continue;
            }
        }
        
        const issue = AppState.currentIssues.find(i => i.guid === issueId);
        
        if (issue) {
            logger.info('✅ Incidencia encontrada en proyecto:', project.name);
            
            AppState.viewMode = 'list';
            renderIssues();
            
            setTimeout(() => {
                const el = $(`[data-id="${issueId}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight-pulse');
                    setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
                    
                    notify(`Incidencia encontrada en: ${project.name}`, 'success');
                } else {
                    logger.warning('Elemento DOM no encontrado después de renderizar');
                    notify('Incidencia encontrada pero error al mostrar', 'warning');
                }
            }, 100);
            
            return;
        }
    }
    
    logger.warning('Incidencia no encontrada en ningún proyecto:', issueId);
    notify('Incidencia no encontrada en ningún proyecto', 'warning');
}

export { loadIssueFromAnyProject, errorHandler, ErrorTypes };

document.addEventListener('DOMContentLoaded', init);
