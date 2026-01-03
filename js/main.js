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
import { $, $$, notify, withErrorHandling, updateGlobalStats, closeAllModals, escapeHtml, debounce, throttle, $cached, clearDOMCache } from './ui-utils.js';
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
import { blobManager } from './utils/blob-manager.js';
import { errorHandler, ErrorTypes, ErrorSeverity } from './utils/error-handler.js';
import { eventBus, Events } from './core/event-bus.js';
import { FormValidator } from './utils/validation.js';
import { TIMEOUTS, CSS_CLASSES, PAGES, VIEW_MODES, STORAGE_KEYS, CUSTOM_EVENTS } from './utils/constants.js';
import { setupAllNavigation } from './core/navigation.js';
import { initAccessibility } from './ui/accessibility.js';

// Inicializar API Client
export const bcfApi = new BCFApiClient('');

// Variable global para archivos pendientes de asignar
let pendingFiles = [];

// Validador del formulario de proyecto (inicializado en setupModals)
let projectValidator = null;

// Envolver renderIssues para inyectar dependencias
/**
 * Renderiza las incidencias del proyecto actual con callbacks configurados
 *
 * Wrapper que llama a renderIssues() con callbacks predefinidos para:
 * - Click en issue → abrir edit sidebar
 * - Click en favorito → toggle favorite
 *
 * @example
 * renderAppIssues(); // Re-renderiza issues con comportamiento por defecto
 */
const renderAppIssues = () => {
    renderIssues(
        (guid) => {
            AppState.currentIssueId = guid;
            openEditSidebar(guid);
        },
        (guid) => toggleFavorite(guid)
    );
};

/**
 * Alterna el estado de favorito de una incidencia
 *
 * @param {string} guid - GUID único de la incidencia
 *
 * @example
 * toggleFavorite('a3f5d8e2-1b4c-4d3a-9e7f-2c1a8b5d3e4f');
 */
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
 * Configura el sistema de manejo de errores global con estrategias de recuperación
 *
 * Registra 4 estrategias de recuperación automática:
 * - NETWORK: Marca servidor como offline y notifica al usuario
 * - STORAGE: Limpia blobs antiguos si quota excedida
 * - PARSE: Notifica errores de formato BCF/XML/JSON
 * - RENDER: Intenta re-renderizar la vista actual
 *
 * @example
 * setupErrorHandler();
 * // Error handler queda activo durante toda la sesión
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
                const cleaned = blobManager.cleanOldUrls(TIMEOUTS.BLOB_CLEANUP);
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
/**
 * Inicializa la aplicación BCF Viewer Pro
 *
 * Punto de entrada principal que:
 * - Configura error handler global
 * - Inicializa storage (localStorage/IndexedDB)
 * - Carga datos guardados
 * - Configura UI y event listeners
 * - Restaura último proyecto abierto si existe
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Llamado automáticamente al cargar la página
 * document.addEventListener('DOMContentLoaded', init);
 */
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

        // Inicializar mejoras de accesibilidad (WCAG 2.1 Level AA)
        initAccessibility();

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
        $('#app').classList.remove(CSS_CLASSES.HIDDEN);

        logger.info('✅ Aplicación iniciada correctamente');

        // Emitir evento de app lista
        eventBus.emit(Events.APP_READY, {
            timestamp: Date.now(),
            version: CONFIG.VERSION
        });

    } catch (error) {
        console.error('Error fatal al iniciar:', error);
        notify(`Error fatal: ${error.message}`, 'error');

        // Emitir evento de error de app
        eventBus.emit(Events.APP_ERROR, {
            error: error.message,
            stack: error.stack
        });
        
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

/**
 * Inicializa todos los componentes de la interfaz de usuario
 *
 * Orquesta la configuración de:
 * - Drop zones para drag & drop de archivos
 * - Sistema de navegación y routing
 * - Panel de filtros
 * - Barra de acciones masivas
 * - Exportación de datos
 * - Dropdowns y menús
 * - Sistema de temas (light/dark)
 * - Paneles de notificaciones
 * - Personalizador de columnas
 * - Modales y formularios
 *
 * @example
 * initUI();
 * // Todos los componentes UI quedan funcionales
 */
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

/**
 * Configura la barra de acciones masivas para modificar múltiples issues
 *
 * Configura event listeners para:
 * - Cambio masivo de estado (status)
 * - Cambio masivo de prioridad (priority)
 * - Asignación masiva (assignee)
 * - Exportación masiva a Excel
 * - Eliminación masiva con confirmación
 *
 * Todas las acciones se aplican solo a issues seleccionados
 * y refrescan automáticamente la vista después de ejecutarse.
 *
 * @example
 * setupBulkActionsBar();
 * // Los botones de bulk actions quedan funcionales
 */
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

/**
 * Navega entre issues usando prev/next
 *
 * Actualiza AppState.focusedIndex y el indicador UI.
 * Previene overflow/underflow con Math.max/min.
 *
 * @param {number} delta - Cantidad de issues a avanzar (+1) o retroceder (-1)
 *
 * @example
 * navigateIssue(1);  // Siguiente issue
 * navigateIssue(-1); // Issue anterior
 */
function navigateIssue(delta) {
    const total = AppState.filteredIssues.length;
    if (total === 0) return;
    const current = typeof AppState.focusedIndex === 'number' ? AppState.focusedIndex : -1;
    const next = Math.max(0, Math.min(total - 1, current + delta));
    AppState.focusedIndex = next;
    updateNavIndicatorUI();
}

/**
 * Configura todos los modales de la aplicación y sus formularios
 *
 * Configura:
 * - Modal de proyecto (crear/editar) con FormValidator
 * - Modal de servidor BCF con validación de URL
 * - Modal de issue detail con lazy loading
 * - Listeners de botones de cierre (X y backdrop)
 * - Validación y sanitización de datos
 * - Escape key para cerrar modales
 *
 * @example
 * setupModals();
 * // Todos los modales quedan operativos con validación
 */
function setupModals() {
    // Modal Nuevo Proyecto
    const modalProject = $('#modal-project');
    const formProject = $('#form-project');

    // Inicializar validador del formulario de proyecto
    if (formProject) {
        // Necesitamos agregar atributo name a los campos (actualmente solo tienen id)
        const nameField = $('#project-name');
        const descField = $('#project-description');
        if (nameField && !nameField.hasAttribute('name')) nameField.setAttribute('name', 'project-name');
        if (descField && !descField.hasAttribute('name')) descField.setAttribute('name', 'project-description');

        projectValidator = new FormValidator('#form-project', {
            'project-name': {
                required: true,
                minLength: 3,
                maxLength: 100,
                noSpecialChars: true
            },
            'project-description': {
                maxLength: 500
            }
        }, {
            liveValidation: true,
            sanitize: true,
            showErrors: true,
            scrollToError: true
        });

        formProject.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔵 [DEBUG] Form submit triggered');

            // Validar antes de procesar
            const isValid = projectValidator.validate();
            console.log('🔵 [DEBUG] Validation result:', isValid);

            if (!isValid) {
                console.log('❌ [DEBUG] Validation failed');
                notify('Por favor corrige los errores en el formulario', 'error');
                return;
            }

            // Obtener datos validados y sanitizados
            const data = projectValidator.getData();
            console.log('🔵 [DEBUG] Raw data from validator:', data);

            const projectId = $('#project-id').value;
            const name = data['project-name'];
            const description = data['project-description'] || '';

            console.log('🔵 [DEBUG] Parsed values:', {
                projectId: projectId,
                name: name,
                nameType: typeof name,
                nameLength: name ? name.length : 0,
                description: description,
                pendingFilesLength: pendingFiles.length
            });

            if (projectId) {
                // Modo edición
                console.log('🔵 [DEBUG] Modo edición');
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
                console.log('🔵 [DEBUG] Modo creación - Llamando createNewProject');
                try {
                    await createNewProject(name, description, pendingFiles);
                    console.log('✅ [DEBUG] createNewProject completado');
                    pendingFiles = []; // Limpiar pendientes
                    notify('Proyecto creado correctamente', 'success');
                } catch (error) {
                    console.error('❌ [DEBUG] Error en createNewProject:', error);
                    notify('Error al crear proyecto: ' + error.message, 'error');
                }
            } else {
                console.error('❌ [DEBUG] NO entra en ninguna condición - projectId:', projectId, 'name:', name);
            }

            modalProject.classList.remove(CSS_CLASSES.ACTIVE);
            projectValidator.reset();
        });
    }

    // Modal Selección de Target (para Drop)
    const modalTarget = $('#modal-select-project-target');
    const btnTargetNew = $('#btn-target-new');

    if (btnTargetNew) {
        btnTargetNew.addEventListener('click', () => {
            modalTarget.classList.remove(CSS_CLASSES.ACTIVE);
            // Abrir modal de nuevo proyecto
            $('#project-name').value = '';
            $('#project-description').value = '';
            if (projectValidator) projectValidator.clearErrors();
            $('#modal-project').classList.add(CSS_CLASSES.ACTIVE);
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
            $('#modal-edit-issue').classList.remove(CSS_CLASSES.ACTIVE);
            notify('Incidencia guardada correctamente', 'success');
            renderAppIssues();
            updateGlobalStats(); // Actualizar contadores globales
        });
    }

    // Botones de cerrar modales genéricos
    $$('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove(CSS_CLASSES.ACTIVE);
        });
    });

    // Cerrar ayuda de teclado
    const btnCloseKeyboard = $('[data-close-keyboard]');
    if (btnCloseKeyboard) {
        btnCloseKeyboard.addEventListener('click', () => {
            $('#keyboard-help').classList.remove(CSS_CLASSES.ACTIVE);
        });
    }
}

/**
 * Configura el comportamiento de todos los menús dropdown
 *
 * Implementa:
 * - Toggle al hacer click en trigger
 * - Cierre automático al hacer click fuera
 * - Prevención de propagación de eventos
 *
 * @example
 * setupDropdowns();
 * // Todos los .dropdown quedan funcionales
 */
function setupDropdowns() {
    const dropdowns = $$('.dropdown');

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle(CSS_CLASSES.ACTIVE);
            });
        }
    });
    
    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', (e) => {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove(CSS_CLASSES.ACTIVE);
            }
        });
    });
}

/**
 * Configura las zonas de drag & drop para archivos BCF
 *
 * Implementa:
 * - Drop zone en dashboard para archivos y carpetas
 * - Overlay global de drop zone en toda la ventana
 * - Soporte para carpetas usando webkitGetAsEntry API
 * - Feedback visual con clase 'drag-over'
 * - Filtrado automático de archivos .bcf/.bcfzip/.zip
 * - Escaneo recursivo de carpetas
 *
 * @example
 * setupDropZones();
 * // Usuario puede arrastrar archivos BCF a cualquier parte de la app
 */
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
            $('#drop-zone-overlay').classList.add(CSS_CLASSES.ACTIVE);
        }
    });
    
    $('#drop-zone-overlay').addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null) {
            $('#drop-zone-overlay').classList.remove(CSS_CLASSES.ACTIVE);
        }
    });
    
    $('#drop-zone-overlay').addEventListener('drop', (e) => {
        e.preventDefault();
        $('#drop-zone-overlay').classList.remove(CSS_CLASSES.ACTIVE);
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
/**
 * Verifica si un archivo es BCF por su extensión
 *
 * @param {File} file - Archivo a verificar
 * @returns {boolean} true si es .bcf, .bcfzip o .zip
 *
 * @example
 * if (isBcfFile(file)) {
 *   // Procesar archivo BCF
 * }
 */
function isBcfFile(file) {
    const name = file.name.toLowerCase();
    return name.endsWith('.bcf') || name.endsWith('.bcfzip') || name.endsWith('.zip');
}

/**
 * Escanea recursivamente entries de drag & drop para encontrar archivos BCF
 *
 * Usa webkitGetAsEntry API para soportar carpetas en drag & drop.
 * Escanea recursivamente directorios y filtra solo archivos BCF.
 *
 * @param {FileSystemEntry[]} entries - Entries de DataTransferItems
 * @returns {Promise<File[]>} Array de archivos BCF encontrados
 *
 * @example
 * const entries = Array.from(e.dataTransfer.items).map(i => i.webkitGetAsEntry());
 * const files = await scanEntries(entries);
 */
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

/**
 * Convierte FileSystemFileEntry a File object
 *
 * @param {FileSystemFileEntry} fileEntry - Entry de archivo
 * @returns {Promise<File>} File object
 */
function getFileFromEntry(fileEntry) {
    return new Promise((resolve, reject) => fileEntry.file(resolve, reject));
}

/**
 * Lee recursivamente un directorio y retorna todos los archivos BCF
 *
 * Maneja el batch reading de DirectoryReader (100 entries por batch en algunos navegadores).
 * Continúa leyendo hasta que no hay más entries.
 *
 * @param {FileSystemDirectoryEntry} dirEntry - Entry de directorio
 * @returns {Promise<File[]>} Array de archivos BCF en el directorio
 */
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

/**
 * Procesa la selección de una carpeta con archivos BCF
 *
 * Filtra solo archivos BCF, valida que haya al menos uno,
 * y muestra modal de resumen para confirmar la carga.
 *
 * @param {File[]} files - Array de archivos de la carpeta seleccionada
 *
 * @example
 * // Desde input webkitdirectory
 * folderInput.addEventListener('change', (e) => {
 *   handleFolderSelection(Array.from(e.target.files));
 * });
 */
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

/**
 * Muestra modal de resumen con archivos BCF encontrados en carpeta
 *
 * Genera modal dinámico con:
 * - Contador de archivos
 * - Lista de archivos
 * - Botones confirmar/cancelar
 *
 * @param {File[]} files - Archivos BCF a mostrar en resumen
 *
 * @example
 * showFolderSummary(bcfFiles);
 * // Muestra modal con lista de archivos para confirmar
 */
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
        modal.classList.remove(CSS_CLASSES.ACTIVE);
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

/**
 * Procesa archivos BCF subidos por el usuario con pre-validación y detección de duplicados
 *
 * MEJORA FASE 4: Implementa pre-validación, detección de duplicados y modal interactivo
 * antes de importar. Determina si crear nuevo proyecto o agregar a proyecto existente.
 * Soporta drag & drop y selección de archivos.
 *
 * @param {FileList|File[]} files - Archivos a procesar
 * @returns {Promise<void>}
 *
 * @example
 * // Desde input file
 * inputFile.addEventListener('change', (e) => {
 *   handleFiles(e.target.files);
 * });
 *
 * // Desde drag & drop
 * dropZone.addEventListener('drop', (e) => {
 *   handleFiles(e.dataTransfer.files);
 * });
 */
async function handleFiles(files) {
    if (files.length === 0) return;

    console.log('🟡 [handleFiles] Iniciando con', files.length, 'archivos');
    console.log('🟡 [handleFiles] AppState.currentProject:', AppState.currentProject);

    // Si ya estamos dentro de un proyecto, importar directamente a ese proyecto
    if (AppState.currentProject) {
        console.log('🟡 [handleFiles] Ya hay proyecto activo, importando directamente');
        await handleFilesWithValidation(files);
        return;
    }

    // Si no hay proyecto activo, mostrar modal de selección
    console.log('🟡 [handleFiles] No hay proyecto activo, mostrando modal de selección');
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

            // Añadir listeners con pre-validación
            listContainer.querySelectorAll('.existing-project-option').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const projectId = btn.dataset.id;
                    modalTarget.classList.remove(CSS_CLASSES.ACTIVE);

                    // Cargar proyecto y mostrar pre-validación
                    await loadProject(projectId);
                    await handleFilesWithValidation(pendingFiles);
                    pendingFiles = [];
                });
            });
        }

        modalTarget.classList.add(CSS_CLASSES.ACTIVE);
    } else {
        // Fallback si no hay modal (no debería pasar)
        await createNewProject(`Proyecto ${new Date().toLocaleDateString()}`, '', files);
    }
}

/**
 * Maneja archivos con pre-validación y modal de resumen
 *
 * NUEVA FUNCIÓN FASE 4: Pre-valida archivos BCF, detecta duplicados,
 * muestra modal interactivo y permite al usuario configurar la importación.
 *
 * @param {File[]} files - Archivos a procesar
 * @returns {Promise<void>}
 *
 * @private
 */
async function handleFilesWithValidation(files) {
    console.log('🟣 [handleFilesWithValidation] Iniciando validación de', files.length, 'archivos');

    // Importar dinámicamente el módulo de importación mejorada
    const { preValidateBCFFiles, showImportSummaryModal, importBCFWithProgress } = await import('./features/bcf-import.js');

    // 1. Mostrar notificación de análisis
    const loadingNotification = notify('Analizando archivos BCF...', 'info', 0);

    try {
        // 2. Pre-validar archivos
        console.log('🟣 [handleFilesWithValidation] Pre-validando archivos...');
        const validatedFiles = await preValidateBCFFiles(files);
        console.log('🟣 [handleFilesWithValidation] Archivos validados:', validatedFiles.length);

        // Cerrar notificación de carga
        if (loadingNotification && typeof loadingNotification.dismiss === 'function') {
            loadingNotification.dismiss();
        }

        // 3. Mostrar modal de resumen interactivo
        console.log('🟣 [handleFilesWithValidation] Mostrando modal de resumen...');
        const importConfig = await showImportSummaryModal(validatedFiles);
        console.log('🟣 [handleFilesWithValidation] Config de importación:', importConfig);

        // 4. Si el usuario canceló, salir
        if (!importConfig) {
            console.log('🟣 [handleFilesWithValidation] Usuario canceló importación');
            notify('Importación cancelada', 'info');
            return;
        }

        // 5. Importar con progreso granular
        console.log('🟣 [handleFilesWithValidation] Iniciando importación...');
        await importWithProgressBar(importConfig);
        console.log('🟣 [handleFilesWithValidation] Importación completada');

    } catch (error) {
        console.error('❌ [handleFilesWithValidation] Error:', error);
        logger.error('Error en validación de archivos:', error);
        notify(`Error al analizar archivos: ${error.message}`, 'error');
    }
}

/**
 * Importa archivos mostrando barra de progreso granular
 *
 * @param {Object} importConfig - Configuración de importación
 * @returns {Promise<void>}
 *
 * @private
 */
async function importWithProgressBar(importConfig) {
    console.log('🟠 [importWithProgressBar] Iniciando importación con progreso');
    const { importBCFWithProgress } = await import('./features/bcf-import.js');

    // Crear modal de progreso
    const progressModal = createProgressModal(importConfig.files.length);
    document.body.appendChild(progressModal);

    try {
        // Importar con callback de progreso
        console.log('🟠 [importWithProgressBar] Llamando importBCFWithProgress...');
        const result = await importBCFWithProgress(importConfig, (current, total, fileName) => {
            updateProgressModal(progressModal, current, total, fileName);
        });
        console.log('🟠 [importWithProgressBar] Resultado:', result);

        // Guardar cambios
        console.log('🟠 [importWithProgressBar] Guardando en Storage...');
        await Storage.saveAll();

        // Recargar proyecto
        console.log('🟠 [importWithProgressBar] Recargando proyecto:', AppState.currentProject?.id);
        await loadProject(AppState.currentProject.id);

        // Cerrar modal de progreso
        progressModal.remove();

        // Mostrar resultado
        showImportResults(result);
        console.log('🟠 [importWithProgressBar] Importación finalizada correctamente');

    } catch (error) {
        progressModal.remove();
        console.error('❌ [importWithProgressBar] Error:', error);
        logger.error('Error durante importación:', error);
        notify(`Error al importar: ${error.message}`, 'error');
    }
}

/**
 * Crea modal de progreso para importación
 *
 * @param {number} totalFiles - Número total de archivos
 * @returns {HTMLElement} Modal de progreso
 *
 * @private
 */
function createProgressModal(totalFiles) {
    const modal = document.createElement('div');
    modal.className = 'modal progress-modal active';
    modal.style.zIndex = '5000';

    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>📦 Importando archivos BCF</h3>
            </div>
            <div class="modal-body">
                <div class="progress-info">
                    <div class="progress-file-name">Preparando...</div>
                    <div class="progress-stats">
                        <span class="progress-current">0</span> /
                        <span class="progress-total">${totalFiles}</span> archivos
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <div class="progress-percentage">0%</div>
            </div>
        </div>
    `;

    return modal;
}

/**
 * Actualiza el modal de progreso
 *
 * @param {HTMLElement} modal - Modal de progreso
 * @param {number} current - Archivo actual
 * @param {number} total - Total de archivos
 * @param {string} fileName - Nombre del archivo actual
 *
 * @private
 */
function updateProgressModal(modal, current, total, fileName) {
    const percentage = Math.round((current / total) * 100);

    const fileNameEl = modal.querySelector('.progress-file-name');
    if (fileNameEl) fileNameEl.textContent = `Importando: ${fileName}`;

    const currentEl = modal.querySelector('.progress-current');
    if (currentEl) currentEl.textContent = current;

    const progressBar = modal.querySelector('.progress-bar');
    if (progressBar) progressBar.style.width = `${percentage}%`;

    const percentageEl = modal.querySelector('.progress-percentage');
    if (percentageEl) percentageEl.textContent = `${percentage}%`;
}

/**
 * Muestra resultados de la importación
 *
 * @param {Object} result - Resultado de la importación
 *
 * @private
 */
function showImportResults(result) {
    const { errors } = result;
    notify('Importación completada', errors.length > 0 ? 'warning' : 'success', 3000);
}

/**
 * Crea un nuevo proyecto BCF con archivos opcionales
 *
 * @param {string} name - Nombre del proyecto (3-100 caracteres)
 * @param {string} [description=''] - Descripción opcional del proyecto
 * @param {File[]} [files=[]] - Array de archivos BCF a agregar al proyecto
 * @returns {Promise<Object>} El proyecto creado
 *
 * @example
 * const project = await createNewProject(
 *   'Edificio Central',
 *   'Proyecto de construcción',
 *   [bcfFile1, bcfFile2]
 * );
 *
 * @throws {Error} Si el nombre es inválido o falla el guardado
 */
async function createNewProject(name, description, files = []) {
    console.log('🟢 [createNewProject] Iniciando con:', { name, description, filesCount: files.length });

    const newProject = {
        id: crypto.randomUUID(),
        name: name,
        description: description || `Creado el ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        bcfFiles: []
    };

    console.log('🟢 [createNewProject] Proyecto creado:', newProject);

    // IMPORTANTE: Obtener, modificar, y reasignar para activar el setter del Proxy
    const projects = AppState.projects;
    projects.push(newProject);
    AppState.projects = projects;
    console.log('🟢 [createNewProject] Total proyectos en AppState:', AppState.projects.length);

    await Storage.saveAll();
    console.log('🟢 [createNewProject] Storage.saveAll completado');

    renderProjects();
    console.log('🟢 [createNewProject] renderProjects llamado');

    updateGlobalStats();
    console.log('🟢 [createNewProject] updateGlobalStats llamado');

    // Solo cargar el proyecto si tiene archivos para importar
    // Si no, quedarse en el dashboard para que el usuario vea el proyecto creado
    if (files.length > 0) {
        console.log('🟢 [createNewProject] Importando archivos...');
        AppState.currentProject = newProject;
        await addFilesToProject(files);
        // Cargar el proyecto con archivos
        await loadProject(newProject.id);
    } else {
        console.log('🟢 [createNewProject] Sin archivos, permaneciendo en dashboard');
    }
}

/**
 * Agrega archivos BCF al proyecto actual
 *
 * Parsea cada archivo usando BCFParser, los agrega al proyecto,
 * guarda los cambios y recarga el proyecto para mostrar las nuevas incidencias.
 *
 * @param {File[]} files - Array de archivos BCF a agregar
 * @returns {Promise<void>}
 *
 * @example
 * await addFilesToProject([bcfFile1, bcfFile2]);
 * // Archivos parseados y agregados al proyecto actual
 *
 * @throws {Error} Si falla el parsing o guardado
 */
async function addFilesToProject(files) {
    const project = AppState.currentProject; // Obtener referencia al proyecto

    for (const file of files) {
        try {
            const bcfData = await BCFParser.loadBCF(file);
            project.bcfFiles.push(bcfData);
        } catch (error) {
            logger.error('Error parseando archivo BCF:', error);
            notify(`Error en ${file.name}`, 'error');
        }
    }

    AppState.currentProject = project; // Reasignar para activar el setter
    await Storage.saveAll();
    await loadProject(AppState.currentProject.id);
    notify('Archivos cargados correctamente', 'success');
}

/**
 * Establece el estado de carga y muestra/oculta indicadores visuales
 *
 * @param {boolean} isLoading - true para mostrar loading, false para ocultar
 * @param {string} [type='project'] - Tipo de carga ('project', 'issues', 'save', 'sync')
 *
 * @example
 * setLoadingState(true, 'project');  // Mostrar loading de proyecto
 * // ... operación asíncrona ...
 * setLoadingState(false, 'project'); // Ocultar loading
 */
function setLoadingState(isLoading, type = 'project') {
    const body = document.body;

    // Agregar/remover clase global de loading
    if (isLoading) {
        body.classList.add(`loading-${type}`);
        body.style.cursor = 'wait';
    } else {
        body.classList.remove(`loading-${type}`);
        body.style.cursor = '';
    }

    // Deshabilitar project cards durante carga
    if (type === 'project') {
        const projectCards = $$('.project-card');
        projectCards.forEach(card => {
            if (isLoading) {
                card.style.pointerEvents = 'none';
                card.style.opacity = '0.6';
            } else {
                card.style.pointerEvents = '';
                card.style.opacity = '';
            }
        });

        // Mostrar/ocultar loading screen si existe
        const loadingScreen = $cached('#loading-screen');
        if (loadingScreen && isLoading) {
            loadingScreen.classList.remove('fade-out');
            loadingScreen.style.display = 'flex';
            const loadingText = loadingScreen.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = 'Cargando proyecto...';
            }
        } else if (loadingScreen && !isLoading) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }
}

/**
 * Carga un proyecto con protección contra race conditions
 * @param {string} projectId - ID del proyecto a cargar
 * @returns {Promise<boolean>} - true si se cargó exitosamente
 */
/**
 * Carga un proyecto BCF y renderiza sus incidencias
 *
 * Implementa protección contra race conditions usando AbortController
 * y loading states. Solo permite una carga a la vez.
 *
 * @param {string} projectId - ID del proyecto a cargar
 * @returns {Promise<boolean>} true si la carga fue exitosa, false si fue abortada o falló
 *
 * @example
 * const success = await loadProject('project-123');
 * if (success) {
 *   console.log('Proyecto cargado correctamente');
 * }
 *
 * @throws {Error} Si el proyecto no existe o hay error de storage
 */
export async function loadProject(projectId) {
    // === RACE CONDITION PREVENTION ===

    // 1. Si ya está cargando, ignorar nueva petición
    if (AppState.loading.project) {
        logger.debug(`Carga de proyecto ya en progreso, ignorando: ${projectId}`);
        return false;
    }

    // 2. Abortar carga anterior si existe
    if (AppState.abortControllers.projectLoad) {
        AppState.abortControllers.projectLoad.abort();
        logger.debug('Carga de proyecto anterior abortada');
    }

    // 3. Crear nuevo abort controller
    const abortController = new AbortController();
    AppState.abortControllers.projectLoad = abortController;

    // 4. Marcar como loading
    AppState.loading.project = true;
    setLoadingState(true, 'project');

    try {
        // Verificar que el proyecto existe
        const project = AppState.projects.find(p => p.id === projectId);
        if (!project) {
            logger.error(`Proyecto no encontrado: ${projectId}`);
            notify('Proyecto no encontrado', 'error');
            return false;
        }

        // Check si fue abortado
        if (abortController.signal.aborted) {
            logger.debug('Carga abortada durante búsqueda de proyecto');
            return false;
        }

        // Limpiar URLs del proyecto anterior si existe
        if (AppState.currentProject && AppState.currentProject.id !== projectId) {
            const oldContext = `project-${AppState.currentProject.id}`;
            blobManager.revokeContext(oldContext);
            logger.debug(`Limpiadas URLs del proyecto anterior: ${oldContext}`);
        }

        console.log('🔵 [loadProject] Proyecto encontrado:', project.name, '- bcfFiles:', project.bcfFiles?.length);

        AppState.currentProject = project;
        AppState.currentIssues = [];

        // Context para este proyecto
        const projectContext = `project-${projectId}`;

        // Simular delay para operaciones pesadas (ej: cargar de DB)
        // En futuro: aquí iría fetch de servidor o loadProject de IndexedDB
        await new Promise(resolve => setTimeout(resolve, 50));

        // Check si fue abortado durante procesamiento
        if (abortController.signal.aborted) {
            logger.debug('Carga abortada durante procesamiento');
            return false;
        }

        console.log('🔵 [loadProject] Procesando archivos BCF...');

        // Process issues and generate blob URLs for current session
        project.bcfFiles.forEach(bcf => {
            console.log('🔵 [loadProject] Procesando BCF:', bcf.fileName, '- topics:', bcf.topics?.length);
            bcf.topics?.forEach(topic => {
                // Generate temporary URL for snapshot if it's a Blob
                let snapshotUrl = null;
                if (topic.snapshot instanceof Blob) {
                    // Usar blob manager en lugar de crear URL directamente
                    snapshotUrl = blobManager.create(topic.snapshot, topic.guid, projectContext);
                } else if (typeof topic.snapshot === 'string' && topic.snapshot.startsWith('blob:')) {
                    // Warning: Old stale blob URL, cannot recover if Blob is lost
                    logger.warning(`URL de blob obsoleta detectada para ${topic.guid}`);
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

        console.log('🔵 [loadProject] Total issues cargados en AppState.currentIssues:', AppState.currentIssues.length);

        // Update project name in UI (usar $cached - se accede frecuentemente)
        const currentNameEl = $cached('#current-project-name');
        if (currentNameEl) currentNameEl.textContent = project.name;

        console.log('🔵 [loadProject] Aplicando filtros...');
        updateFilterOptions();
        applyFiltersAndSort();
        console.log('🔵 [loadProject] Filtered issues:', AppState.filteredIssues.length);

        console.log('🔵 [loadProject] Renderizando issues...');
        renderIssues();

        console.log('🔵 [loadProject] Navegando a viewer...');
        navigateTo('viewer');

        // Emitir evento de proyecto cargado
        eventBus.emit(Events.PROJECT_LOADED, {
            projectId: project.id,
            projectName: project.name,
            issueCount: AppState.currentIssues.length
        });

        logger.info(`✅ Proyecto cargado: ${project.name} (${AppState.currentIssues.length} incidencias)`);
        return true;

    } catch (error) {
        // Si es un abort, no es realmente un error
        if (error.name === 'AbortError') {
            logger.debug('Carga de proyecto abortada');
            return false;
        }

        logger.error('Error al cargar proyecto:', error);
        notify(`Error al cargar proyecto: ${error.message}`, 'error');
        return false;

    } finally {
        // 5. Limpiar loading state SIEMPRE
        AppState.loading.project = false;
        AppState.abortControllers.projectLoad = null;
        setLoadingState(false, 'project');
    }
}
/**
 * Configura todo el sistema de navegación y controles de la aplicación
 *
 * Esta función ahora delega en módulos especializados para mejor mantenibilidad.
 * Ver js/navigation-setup.js para la implementación detallada.
 *
 * Módulos configurados:
 * - Gestión de proyectos (nuevo/editar)
 * - Búsqueda spotlight
 * - Panel lateral de filtros
 * - Sidebar de edición
 * - Navegación al dashboard
 * - Creación de incidencias
 * - Cambio de vista (lista/grid)
 *
 * @example
 * setupNavigation();
 * // Todo el sistema de navegación queda funcional
 */
function setupNavigation() {
    setupAllNavigation();
}

/**
 * Navega entre páginas de la aplicación (dashboard/viewer)
 *
 * Maneja la visibilidad de páginas y actualiza el estado de navegación.
 * Limpia cache DOM para evitar referencias obsoletas.
 *
 * @param {string} pageId - ID de la página ('dashboard' o 'viewer')
 *
 * @example
 * navigateTo(PAGES.DASHBOARD); // Ir al dashboard
 * navigateTo(PAGES.VIEWER);    // Ir al visor de issues
 */
function navigateTo(pageId) {
    $$('.page').forEach(p => p.classList.remove(CSS_CLASSES.ACTIVE));

    if (pageId === 'viewer') {
        const viewerPage = $cached('#viewer-page');
        if (viewerPage) viewerPage.classList.add(CSS_CLASSES.ACTIVE);
        $cached('#dashboard-page')?.classList.remove(CSS_CLASSES.ACTIVE);
        $cached('#app')?.classList.remove(CSS_CLASSES.HIDDEN);
    } else {
        $cached('#dashboard-page')?.classList.add(CSS_CLASSES.ACTIVE);
        const viewerPage = $cached('#viewer-page');
        if (viewerPage) viewerPage.classList.remove(CSS_CLASSES.ACTIVE);
    }
}

/**
 * Navega al dashboard de proyectos
 *
 * Atajo para navigateTo('dashboard').
 *
 * @example
 * goToDashboard(); // Vuelve a la vista principal de proyectos
 */
function goToDashboard() {
    navigateTo('dashboard');
}

/**
 * Alterna entre modos de vista (lista/mosaico)
 *
 * @example
 * toggleViewMode(); // Cambia de list a grid o viceversa
 */
function toggleViewMode() {
    AppState.viewMode = AppState.viewMode === 'list' ? 'grid' : 'list';
    const btnViewList = $('#btn-view-list');
    const btnViewGrid = $('#btn-view-grid');
    
    if (AppState.viewMode === 'list') {
        if (btnViewList) btnViewList.classList.add(CSS_CLASSES.ACTIVE);
        if (btnViewGrid) btnViewGrid.classList.remove(CSS_CLASSES.ACTIVE);
    } else {
        if (btnViewList) btnViewList.classList.remove(CSS_CLASSES.ACTIVE);
        if (btnViewGrid) btnViewGrid.classList.add(CSS_CLASSES.ACTIVE);
    }
    renderIssues();
}

/**
 * Configura el sistema de filtros de incidencias
 *
 * Implementa:
 * - Debouncing (300ms) para inputs de texto (autor, búsqueda)
 * - Filtrado inmediato para selects, dates y chips
 * - Select all checkbox para selección masiva
 * - Botón de favoritos con toggle
 * - Delegación de eventos para filter chips
 * - Cache de DOM queries para optimización
 *
 * Filtros disponibles:
 * - Autor (debounced)
 * - Búsqueda de texto (debounced)
 * - BCF file (inmediato)
 * - Rango de fechas (inmediato)
 * - Orden/sorting (inmediato)
 * - Favoritos (inmediato)
 * - Chips de estado/prioridad/tipo (inmediato)
 *
 * @example
 * setupFilters();
 * // Sistema de filtros queda operativo con debouncing optimizado
 */
function setupFilters() {
    // Crear función debounced para filtros de texto (300ms de espera)
    const debouncedFilter = debounce(() => {
        applyFiltersAndSort();
        renderAppIssues();
    }, 300);

    // Función inmediata para selects y otros controles
    const immediateFilter = () => {
        applyFiltersAndSort();
        renderAppIssues();
    };

    // Inputs de texto que deben usar debouncing
    const textInputs = ['filter-author', 'filter-search'];

    // Inputs que deben ser inmediatos (dates, selects)
    const immediateInputs = ['filter-bcf', 'filter-date-from', 'filter-date-to', 'sort-by'];

    // Aplicar debouncing a inputs de texto (usar $cached - se acceden frecuentemente)
    textInputs.forEach(id => {
        const el = $cached(`#${id}`);
        if (el) {
            // 'input' event con debouncing (mientras escribe)
            el.addEventListener('input', debouncedFilter);
            // 'change' event inmediato (blur, enter)
            el.addEventListener('change', immediateFilter);
        }
    });

    // Aplicar filtrado inmediato a selects y dates (usar $cached)
    immediateInputs.forEach(id => {
        const el = $cached(`#${id}`);
        if (el) {
            el.addEventListener('input', immediateFilter);
            el.addEventListener('change', immediateFilter);
        }
    });

    // Botón de favoritos - inmediato (usar $cached)
    const btnFilterFavorites = $cached('#btn-filter-favorites');
    if (btnFilterFavorites) {
        btnFilterFavorites.addEventListener('click', () => {
            btnFilterFavorites.classList.toggle(CSS_CLASSES.ACTIVE);
            immediateFilter();
        });
    }

    // Filter chips - inmediatos (delegación de eventos - no cachear)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-chip')) {
            e.target.classList.toggle(CSS_CLASSES.ACTIVE);
            immediateFilter();
        }
    });

    // Select all checkbox - inmediato (usar $cached)
    const selectAll = $cached('#select-all-checkbox');
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

    // Botones de limpiar filtros - inmediatos (usar $cached)
    const btnClearFilters = $cached('#btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => resetFilters());
    }
    const btnClearFiltersHeader = $cached('#btn-clear-filters-header');
    if (btnClearFiltersHeader) {
        btnClearFiltersHeader.addEventListener('click', () => resetFilters());
    }

    logger.info('✅ Filtros configurados con debouncing y DOM cache');
}

/**
 * Resetea todos los filtros a sus valores por defecto
 *
 * Limpia:
 * - Inputs de texto (BCF, autor, fechas, búsqueda)
 * - Ordenamiento → 'date-desc'
 * - Chips de estado, prioridad, disciplina
 * - Botón de favoritos
 * - Filtros de columnas personalizadas
 *
 * Luego aplica filtros y re-renderiza.
 *
 * @example
 * resetFilters(); // Vuelve a mostrar todas las issues sin filtros
 */
function resetFilters() {
    ['filter-bcf','filter-author','filter-date-from','filter-date-to','filter-search'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sort = document.getElementById('sort-by');
    if (sort) sort.value = 'date-desc';
    $$('#filter-status .filter-chip.active').forEach(c => c.classList.remove(CSS_CLASSES.ACTIVE));
    $$('#filter-priority .filter-chip.active').forEach(c => c.classList.remove(CSS_CLASSES.ACTIVE));
    $$('#filter-discipline .filter-chip.active').forEach(c => c.classList.remove(CSS_CLASSES.ACTIVE));
    const favBtn = $('#btn-filter-favorites');
    if (favBtn) favBtn.classList.remove(CSS_CLASSES.ACTIVE);
    clearColumnFilters();
    applyFiltersAndSort();
    renderAppIssues();
}

/**
 * Configura los botones de exportación de datos
 *
 * Formatos soportados:
 * - Excel (.xlsx) - Tabla completa de issues
 * - CSV (.csv) - Datos en formato texto
 * - PDF (.pdf) - Resumen visual de issues
 * - PDF Detail - Reporte detallado con imágenes
 * - JSON (.json) - Estructura completa de datos
 *
 * @example
 * setupExport();
 * // Botones de exportación quedan funcionales
 */
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

/**
 * Configura el sistema de temas (light/dark mode)
 *
 * Implementa:
 * - Toggle entre temas light y dark
 * - Persistencia en localStorage
 * - Detección de preferencia del sistema (prefers-color-scheme)
 * - Actualización de iconos (sol/luna)
 * - Aplicación de atributo data-theme en documentElement
 *
 * @example
 * setupTheme();
 * // Sistema de temas queda operativo con persistencia
 */
function setupTheme() {
    const btnTheme = $('#btn-theme-toggle');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        AppState.theme = theme;
        
        const isDark = theme === 'dark';
        const iconSun = $('.icon-sun');
        const iconMoon = $('.icon-moon');
        
        if (iconSun) iconSun.classList.toggle(CSS_CLASSES.HIDDEN, isDark);
        if (iconMoon) iconMoon.classList.toggle(CSS_CLASSES.HIDDEN, !isDark);
        
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

/**
 * Configura la conexión con servidor BCF remoto
 *
 * Implementa:
 * - Modal de configuración de servidor
 * - Botón de test de conexión con BCFApiClient temporal
 * - Guardado de URL y token de autenticación
 * - Sincronización de proyectos desde servidor
 * - Indicadores de estado de conexión
 *
 * @example
 * setupServer();
 * // Modal de conexión queda operativo con test y sincronización
 */
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
                modalServer.classList.add(CSS_CLASSES.ACTIVE);
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

            statusDiv.classList.remove(CSS_CLASSES.HIDDEN);
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
                
                if (modalServer) modalServer.classList.remove(CSS_CLASSES.ACTIVE);
                
                // Intentar sincronizar
                syncServerProjects();

            } catch (error) {
                notify('Error al guardar configuración', 'error');
            }
        });
    }
}

/**
 * Inicializa event listeners globales con throttle/debounce
 *
 * Configura:
 * - Window resize con throttle (250ms)
 * - beforeunload para advertir cambios sin guardar
 * - 'issues:refresh' custom event con debounce (100ms)
 *
 * @example
 * initGlobalEvents();
 * // Eventos globales optimizados quedan activos
 */
function initGlobalEvents() {
    // Throttle resize para evitar ejecuciones excesivas (máx 1 cada 250ms)
    window.addEventListener('resize', throttle(() => {
        // Ajustar layout si es necesario
        // Futuro: responsive adjustments
    }, 250));

    window.addEventListener('beforeunload', (e) => {
        if (Object.keys(AppState.localChanges).length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Debounce refresh de incidencias para evitar renders múltiples rápidos
    const debouncedRefresh = debounce(() => {
        renderAppIssues();
    }, 100);

    document.addEventListener('issues:refresh', debouncedRefresh);

    logger.info('✅ Eventos globales configurados con throttle/debounce');
}

/**
 * Verifica y notifica issues con fecha límite cercana (próximos 7 días)
 *
 * Filtra issues con:
 * - dueDate en los próximos 0-7 días
 * - Estado NO cerrado/resuelto
 *
 * Muestra badge de notificación si encuentra issues.
 *
 * @example
 * checkUpcomingDeadlines();
 * // Badge de notificación aparece si hay deadlines próximos
 */
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
    const projects = AppState.projects; // Obtener el array una vez

    for (const sProject of serverProjects) {
        const exists = projects.some(p => p.id === sProject.guid || p.serverGuid === sProject.guid);
        if (!exists) {
            projects.push({
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
        AppState.projects = projects; // Reasignar para activar el setter del Proxy
        await Storage.saveAll();
        renderProjects();
        updateGlobalStats();
        notify(`Sincronizados ${newProjectsCount} nuevos proyectos`, 'success');
    } else {
        notify('Proyectos al día', 'success');
    }
}, 'Error al sincronizar con el servidor');

/**
 * Abre un modal lightbox para mostrar snapshot/imagen en pantalla completa
 *
 * Crea modal dinámico con:
 * - Fondo transparente
 * - Imagen con max-width 90vw, max-height 80vh
 * - Cierre con backdrop o botón X
 *
 * @param {string} src - URL de la imagen a mostrar
 *
 * @example
 * window.openSnapshot('blob:http://localhost/abc-123');
 * // Abre imagen en modal fullscreen
 */
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

/**
 * Maneja clicks en cards de estadísticas del dashboard para aplicar filtros rápidos
 *
 * Filtros disponibles:
 * - 'priority': Filtra issues con prioridad High
 * - 'due': Filtra issues con fecha límite en próximos 7 días
 * - 'unresolved': Filtra issues con estado Open
 * - 'comments': Filtra issues con comentarios
 *
 * Resetea todos los filtros existentes antes de aplicar el nuevo.
 * Actualiza URL con query param ?quickFilter=type.
 * Navega automáticamente a página viewer.
 *
 * @param {string} type - Tipo de filtro rápido
 * @returns {Promise<void>}
 *
 * @example
 * window.handleStatClick('priority');
 * // Resetea filtros, aplica prioridad High, navega a viewer
 */
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
        document.querySelectorAll('.filter-chip.active').forEach(c => c.classList.remove(CSS_CLASSES.ACTIVE));

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
                if (highChip) highChip.classList.add(CSS_CLASSES.ACTIVE);
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
/**
 * Busca y carga una incidencia por GUID en todos los proyectos disponibles
 *
 * Flujo:
 * 1. Valida GUID con validators.guid()
 * 2. Itera por todos los proyectos de AppState.projects
 * 3. Carga cada proyecto con loadProject() si no está activo
 * 4. Busca issue por GUID en currentIssues
 * 5. Si encuentra: renderiza, hace scroll, añade highlight-pulse
 * 6. Si no encuentra: notifica warning
 *
 * Útil para deep linking y búsqueda global.
 *
 * @param {string} issueId - GUID de la incidencia a buscar
 * @returns {Promise<void>}
 *
 * @example
 * await loadIssueFromAnyProject('a3f5d8e2-1b4c-4d3a-9e7f-2c1a8b5d3e4f');
 * // Busca en todos los proyectos, carga el que la contiene y muestra la issue
 *
 * @throws {Error} Si falla la carga de proyectos (continúa con siguiente)
 */
async function loadIssueFromAnyProject(issueId) {
    logger.info('🔍 Buscando incidencia en todos los proyectos:', issueId);
    
    if (!validators.guid(issueId)) {
        logger.warninging('GUID inválido:', issueId);
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
                    logger.warninging('Elemento DOM no encontrado después de renderizar');
                    notify('Incidencia encontrada pero error al mostrar', 'warning');
                }
            }, 100);
            
            return;
        }
    }
    
    logger.warninging('Incidencia no encontrada en ningún proyecto:', issueId);
    notify('Incidencia no encontrada en ningún proyecto', 'warning');
}

export { loadIssueFromAnyProject, errorHandler, ErrorTypes, eventBus, Events };

document.addEventListener('DOMContentLoaded', init);
