/**
 * ADVANCED EXPORT - Sistema avanzado de exportación con configuración personalizable
 * Permite exportar en múltiples formatos con opciones flexibles
 */

import { AppState } from './state.js';
import { $, notify } from './ui-utils.js';
import { BCFExporter } from './bcf-exporter.js';
import { BCFSimpleExporter } from './bcf-simple-export.js';
import { exportToExcel, exportToJSON, exportToCSV, exportToPDF } from './export-utils.js';
import { BCFDebugger } from './bcf-debug.js';

const STORAGE_KEY = 'bcf_export_preferences';

export class AdvancedExport {
    constructor() {
        this.preferences = this.loadPreferences();
    }

    /**
     * Configuración por defecto
     */
    getDefaultPreferences() {
        return {
            // Datos a incluir
            includeOpenIssues: true,
            includeClosedIssues: true,
            includeInProgressIssues: true,
            includeSnapshots: true,
            includeComments: true,
            includeAssignees: true,
            includeStatus: true,
            includePriority: true,
            includeDates: true,
            includeLabels: true,
            includeAttachments: false,
            includeViewpoints: false,

            // Formato
            format: 'bcfzip',  // bcfzip, bcf-xml, json, csv, excel, pdf
            bcfVersion: '3.0',

            // Alcance
            scope: 'all',  // all, filtered, selected

            // Opciones avanzadas
            groupBy: 'none',  // none, status, priority, assigned, type
            sortBy: 'date-desc',  // date-asc, date-desc, title-asc, title-desc, priority
            includeMetadata: true,
            compressOutput: true,

            // Excel específico
            excelMultipleSheets: true,
            excelIncludeCharts: false,

            // PDF específico
            pdfOrientation: 'portrait',  // portrait, landscape
            pdfIncludeImages: true,
            pdfPageSize: 'A4'
        };
    }

    /**
     * Cargar preferencias guardadas
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return { ...this.getDefaultPreferences(), ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Error cargando preferencias de exportación:', error);
        }
        return this.getDefaultPreferences();
    }

    /**
     * Guardar preferencias
     */
    savePreferences(prefs) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
            this.preferences = prefs;
        } catch (error) {
            console.error('Error guardando preferencias:', error);
        }
    }

    /**
     * Abrir modal de configuración avanzada
     */
    openAdvancedExportModal() {
        BCFDebugger.log('EXPORT', '📊 Abriendo modal de exportación avanzada');

        if (!AppState.currentProject) {
            notify('Por favor selecciona un proyecto primero', 'warning');
            return;
        }

        const modal = this.createAdvancedModal();
        document.body.appendChild(modal);

        // Mostrar modal con animación
        setTimeout(() => modal.classList.add('show'), 10);

        // Aplicar preferencias guardadas
        this.applyPreferencesToForm(modal);

        // Configurar event listeners
        this.setupModalListeners(modal);
    }

    /**
     * Crear HTML del modal avanzado
     */
    createAdvancedModal() {
        const modal = document.createElement('div');
        modal.id = 'modal-advanced-export';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Exportación Avanzada</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    ${this.renderConfigurationTabs()}
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px;">
                        <button type="button" id="btn-reset-export-prefs" class="btn btn-ghost btn-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                <path d="M21 3v5h-5"></path>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                <path d="M3 21v-5h5"></path>
                            </svg>
                            Restaurar Valores
                        </button>
                        <span id="export-issues-count" style="color: var(--text-secondary); font-size: 14px; padding: 8px 12px;"></span>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="button" id="btn-start-advanced-export" class="btn btn-primary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Exportar
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Renderizar tabs de configuración
     */
    renderConfigurationTabs() {
        return `
            <div class="export-tabs">
                <div class="tab-buttons" style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">
                    <button class="tab-btn active" data-tab="content">📦 Contenido</button>
                    <button class="tab-btn" data-tab="format">🎨 Formato</button>
                    <button class="tab-btn" data-tab="advanced">⚙️ Avanzado</button>
                </div>

                <!-- Tab: Contenido -->
                <div class="tab-panel active" data-panel="content">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Seleccionar Datos a Incluir</h4>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        ${this.renderCheckbox('includeOpenIssues', 'Incidencias Abiertas', '🟢')}
                        ${this.renderCheckbox('includeInProgressIssues', 'Incidencias En Progreso', '🟡')}
                        ${this.renderCheckbox('includeClosedIssues', 'Incidencias Cerradas', '🔴')}
                        ${this.renderCheckbox('includeComments', 'Comentarios', '💬')}
                        ${this.renderCheckbox('includeSnapshots', 'Capturas de Pantalla', '📷')}
                        ${this.renderCheckbox('includeAssignees', 'Responsables', '👤')}
                        ${this.renderCheckbox('includeStatus', 'Estados', '📊')}
                        ${this.renderCheckbox('includePriority', 'Prioridades', '🔥')}
                        ${this.renderCheckbox('includeDates', 'Fechas', '📅')}
                        ${this.renderCheckbox('includeLabels', 'Etiquetas', '🏷️')}
                        ${this.renderCheckbox('includeAttachments', 'Archivos Adjuntos', '📎')}
                        ${this.renderCheckbox('includeViewpoints', 'Puntos de Vista 3D', '👁️')}
                    </div>

                    <h4 style="margin: 20px 0 16px; color: var(--text-primary);">Alcance de Exportación</h4>
                    <select id="export-scope" class="filter-select" style="width: 100%; padding: 10px; border-radius: 6px;">
                        <option value="all">Todas las incidencias del proyecto</option>
                        <option value="filtered">Solo incidencias filtradas actualmente</option>
                        <option value="selected">Solo incidencias seleccionadas</option>
                    </select>
                </div>

                <!-- Tab: Formato -->
                <div class="tab-panel" data-panel="format" style="display: none;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Formato de Salida</h4>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        ${this.renderFormatCard('bcfzip', 'BCF .bcfzip', 'Formato estándar BuildingSMART (comprimido)', '📦')}
                        ${this.renderFormatCard('bcf-xml', 'BCF XML', 'XML sin comprimir (para revisar)', '📄')}
                        ${this.renderFormatCard('json', 'JSON', 'JavaScript Object Notation (desarrollo)', '{ }')}
                        ${this.renderFormatCard('csv', 'CSV', 'Compatible con Excel/Spreadsheets', '📊')}
                        ${this.renderFormatCard('excel', 'Excel', 'Libro de Excel (.xlsx)', '📗')}
                        ${this.renderFormatCard('pdf', 'PDF', 'Documento PDF imprimible', '📕')}
                    </div>

                    <!-- Opciones específicas de formato -->
                    <div id="format-specific-options">
                        <div id="bcf-options" style="display: none;">
                            <h5 style="margin: 16px 0 12px;">Opciones BCF</h5>
                            <div class="form-group">
                                <label for="bcf-version-select">Versión BCF</label>
                                <select id="bcf-version-select" class="filter-select">
                                    <option value="3.0">BCF 3.0 (Recomendado)</option>
                                    <option value="2.1">BCF 2.1 (Compatibilidad)</option>
                                </select>
                            </div>
                            ${this.renderCheckbox('compressOutput', 'Comprimir archivo', '🗜️')}
                        </div>

                        <div id="excel-options" style="display: none;">
                            <h5 style="margin: 16px 0 12px;">Opciones Excel</h5>
                            ${this.renderCheckbox('excelMultipleSheets', 'Usar múltiples hojas (por estado)', '📑')}
                            ${this.renderCheckbox('excelIncludeCharts', 'Incluir gráficos', '📊')}
                        </div>

                        <div id="pdf-options" style="display: none;">
                            <h5 style="margin: 16px 0 12px;">Opciones PDF</h5>
                            <div class="form-group">
                                <label for="pdf-orientation">Orientación</label>
                                <select id="pdf-orientation" class="filter-select">
                                    <option value="portrait">Vertical (Portrait)</option>
                                    <option value="landscape">Horizontal (Landscape)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="pdf-page-size">Tamaño de página</label>
                                <select id="pdf-page-size" class="filter-select">
                                    <option value="A4">A4</option>
                                    <option value="Letter">Letter</option>
                                    <option value="Legal">Legal</option>
                                </select>
                            </div>
                            ${this.renderCheckbox('pdfIncludeImages', 'Incluir imágenes', '🖼️')}
                        </div>
                    </div>
                </div>

                <!-- Tab: Avanzado -->
                <div class="tab-panel" data-panel="advanced" style="display: none;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Opciones Avanzadas</h4>

                    <div class="form-group">
                        <label for="export-group-by">Agrupar por</label>
                        <select id="export-group-by" class="filter-select">
                            <option value="none">Sin agrupación</option>
                            <option value="status">Estado</option>
                            <option value="priority">Prioridad</option>
                            <option value="assigned">Responsable</option>
                            <option value="type">Tipo de Incidencia</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="export-sort-by">Ordenar por</label>
                        <select id="export-sort-by" class="filter-select">
                            <option value="date-desc">Fecha (más reciente primero)</option>
                            <option value="date-asc">Fecha (más antiguo primero)</option>
                            <option value="title-asc">Título (A-Z)</option>
                            <option value="title-desc">Título (Z-A)</option>
                            <option value="priority">Prioridad (Alta a Baja)</option>
                        </select>
                    </div>

                    ${this.renderCheckbox('includeMetadata', 'Incluir metadatos del proyecto', 'ℹ️')}

                    <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <h5 style="margin-bottom: 8px;">💡 Consejos</h5>
                        <ul style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
                            <li>BCF .bcfzip es el formato más compatible con herramientas BIM</li>
                            <li>JSON y XML son útiles para desarrollo e integración</li>
                            <li>CSV/Excel son ideales para análisis de datos</li>
                            <li>PDF es perfecto para informes impresos</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar checkbox
     */
    renderCheckbox(id, label, icon = '') {
        return `
            <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                <input type="checkbox" id="${id}" style="cursor: pointer;">
                <span>${icon} ${label}</span>
            </label>
        `;
    }

    /**
     * Renderizar tarjeta de formato
     */
    renderFormatCard(value, title, description, icon) {
        return `
            <label class="format-card" data-format="${value}" style="display: block; padding: 16px; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                <input type="radio" name="export-format" value="${value}" style="display: none;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <span style="font-size: 24px;">${icon}</span>
                    <strong style="font-size: 16px;">${title}</strong>
                </div>
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">${description}</p>
            </label>
        `;
    }

    /**
     * Aplicar preferencias al formulario
     */
    applyPreferencesToForm(modal) {
        const prefs = this.preferences;

        // Checkboxes
        Object.keys(prefs).forEach(key => {
            const element = modal.querySelector(`#${key}`);
            if (element && element.type === 'checkbox') {
                element.checked = prefs[key];
            }
        });

        // Selects
        const scopeSelect = modal.querySelector('#export-scope');
        if (scopeSelect) scopeSelect.value = prefs.scope;

        const groupBySelect = modal.querySelector('#export-group-by');
        if (groupBySelect) groupBySelect.value = prefs.groupBy;

        const sortBySelect = modal.querySelector('#export-sort-by');
        if (sortBySelect) sortBySelect.value = prefs.sortBy;

        // Formato
        const formatRadio = modal.querySelector(`input[value="${prefs.format}"]`);
        if (formatRadio) {
            formatRadio.checked = true;
            this.showFormatOptions(prefs.format, modal);
        }

        // Actualizar contador
        this.updateIssuesCount(modal);
    }

    /**
     * Configurar event listeners del modal
     */
    setupModalListeners(modal) {
        // Tabs
        const tabButtons = modal.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Actualizar botones
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Actualizar paneles
                modal.querySelectorAll('.tab-panel').forEach(panel => {
                    panel.style.display = panel.dataset.panel === tabName ? 'block' : 'none';
                });
            });
        });

        // Formato cards
        const formatCards = modal.querySelectorAll('.format-card');
        formatCards.forEach(card => {
            card.addEventListener('click', () => {
                formatCards.forEach(c => c.style.borderColor = 'var(--border-color)');
                card.style.borderColor = 'var(--primary-color)';

                const format = card.dataset.format;
                this.showFormatOptions(format, modal);
            });
        });

        // Scope change
        const scopeSelect = modal.querySelector('#export-scope');
        if (scopeSelect) {
            scopeSelect.addEventListener('change', () => this.updateIssuesCount(modal));
        }

        // Checkboxes de estado
        ['includeOpenIssues', 'includeInProgressIssues', 'includeClosedIssues'].forEach(id => {
            const checkbox = modal.querySelector(`#${id}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.updateIssuesCount(modal));
            }
        });

        // Botón reset
        const btnReset = modal.querySelector('#btn-reset-export-prefs');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.preferences = this.getDefaultPreferences();
                this.applyPreferencesToForm(modal);
                notify('Preferencias restauradas', 'info');
            });
        }

        // Botón exportar
        const btnExport = modal.querySelector('#btn-start-advanced-export');
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                await this.executeAdvancedExport(modal);
            });
        }
    }

    /**
     * Mostrar opciones específicas del formato
     */
    showFormatOptions(format, modal) {
        // Ocultar todas las opciones
        modal.querySelectorAll('#format-specific-options > div').forEach(div => {
            div.style.display = 'none';
        });

        // Mostrar opciones del formato seleccionado
        if (format === 'bcfzip' || format === 'bcf-xml') {
            const bcfOptions = modal.querySelector('#bcf-options');
            if (bcfOptions) bcfOptions.style.display = 'block';
        } else if (format === 'excel') {
            const excelOptions = modal.querySelector('#excel-options');
            if (excelOptions) excelOptions.style.display = 'block';
        } else if (format === 'pdf') {
            const pdfOptions = modal.querySelector('#pdf-options');
            if (pdfOptions) pdfOptions.style.display = 'block';
        }
    }

    /**
     * Actualizar contador de incidencias
     */
    updateIssuesCount(modal) {
        const scopeSelect = modal.querySelector('#export-scope');
        const scope = scopeSelect?.value || 'all';

        const includeOpen = modal.querySelector('#includeOpenIssues')?.checked !== false;
        const includeInProgress = modal.querySelector('#includeInProgressIssues')?.checked !== false;
        const includeClosed = modal.querySelector('#includeClosedIssues')?.checked !== false;

        let issues = [];

        // Obtener issues según scope
        if (scope === 'all') {
            issues = AppState.currentIssues || [];
        } else if (scope === 'filtered') {
            issues = AppState.filteredIssues || [];
        } else if (scope === 'selected') {
            issues = Array.from(AppState.selectedIssues || [])
                .map(guid => AppState.currentIssues.find(i => i.guid === guid))
                .filter(i => i);
        }

        // Filtrar por estado
        issues = issues.filter(issue => {
            const status = issue.topicStatus;
            if (status === 'Open' && !includeOpen) return false;
            if (status === 'InProgress' && !includeInProgress) return false;
            if (status === 'Closed' && !includeClosed) return false;
            return true;
        });

        const countElement = modal.querySelector('#export-issues-count');
        if (countElement) {
            countElement.textContent = `📊 ${issues.length} incidencia${issues.length !== 1 ? 's' : ''} para exportar`;
        }
    }

    /**
     * Ejecutar exportación avanzada
     */
    async executeAdvancedExport(modal) {
        BCFDebugger.log('EXPORT', '🚀 Iniciando exportación avanzada');

        try {
            // Recopilar configuración
            const config = this.collectConfiguration(modal);

            // Guardar preferencias
            this.savePreferences(config);

            // Validar que hay incidencias
            const issues = this.getIssuesToExport(config);
            if (issues.length === 0) {
                notify('No hay incidencias para exportar con la configuración seleccionada', 'warning');
                return;
            }

            BCFDebugger.log('EXPORT', 'Configuración recopilada', config);

            // Deshabilitar botón
            const btnExport = modal.querySelector('#btn-start-advanced-export');
            if (btnExport) {
                btnExport.disabled = true;
                btnExport.textContent = 'Exportando...';
            }

            // Ejecutar exportación según formato
            await this.exportInFormat(config, issues);

            // Cerrar modal
            modal.remove();
            notify(`Exportado exitosamente: ${issues.length} incidencias en formato ${config.format}`, 'success');

        } catch (error) {
            BCFDebugger.error('EXPORT', 'Error en exportación avanzada', error);
            notify(`Error al exportar: ${error.message}`, 'error');

            // Rehabilitar botón
            const btnExport = modal.querySelector('#btn-start-advanced-export');
            if (btnExport) {
                btnExport.disabled = false;
                btnExport.textContent = 'Exportar';
            }
        }
    }

    /**
     * Recopilar configuración del formulario
     */
    collectConfiguration(modal) {
        const config = {};

        // Checkboxes
        modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            config[checkbox.id] = checkbox.checked;
        });

        // Selects
        config.scope = modal.querySelector('#export-scope')?.value || 'all';
        config.groupBy = modal.querySelector('#export-group-by')?.value || 'none';
        config.sortBy = modal.querySelector('#export-sort-by')?.value || 'date-desc';

        // Formato
        const formatRadio = modal.querySelector('input[name="export-format"]:checked');
        config.format = formatRadio?.value || 'bcfzip';

        // Opciones específicas de formato
        config.bcfVersion = modal.querySelector('#bcf-version-select')?.value || '3.0';
        config.pdfOrientation = modal.querySelector('#pdf-orientation')?.value || 'portrait';
        config.pdfPageSize = modal.querySelector('#pdf-page-size')?.value || 'A4';

        return config;
    }

    /**
     * Obtener incidencias a exportar según configuración
     */
    getIssuesToExport(config) {
        let issues = [];

        // Obtener issues según scope
        if (config.scope === 'all') {
            issues = AppState.currentIssues || [];
        } else if (config.scope === 'filtered') {
            issues = AppState.filteredIssues || [];
        } else if (config.scope === 'selected') {
            issues = Array.from(AppState.selectedIssues || [])
                .map(guid => AppState.currentIssues.find(i => i.guid === guid))
                .filter(i => i);
        }

        // Filtrar por estado
        issues = issues.filter(issue => {
            const status = issue.topicStatus;
            if (status === 'Open' && !config.includeOpenIssues) return false;
            if (status === 'InProgress' && !config.includeInProgressIssues) return false;
            if (status === 'Closed' && !config.includeClosedIssues) return false;
            return true;
        });

        // Ordenar
        issues = this.sortIssues(issues, config.sortBy);

        return issues;
    }

    /**
     * Ordenar incidencias
     */
    sortIssues(issues, sortBy) {
        const copy = [...issues];

        switch (sortBy) {
            case 'date-asc':
                return copy.sort((a, b) => new Date(a.creationDate) - new Date(b.creationDate));
            case 'date-desc':
                return copy.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
            case 'title-asc':
                return copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            case 'title-desc':
                return copy.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            case 'priority':
                const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
                return copy.sort((a, b) => {
                    const pa = priorityOrder[a.priority] ?? 3;
                    const pb = priorityOrder[b.priority] ?? 3;
                    return pa - pb;
                });
            default:
                return copy;
        }
    }

    /**
     * Exportar en el formato seleccionado
     */
    async exportInFormat(config, issues) {
        const projectName = AppState.currentProject?.name || 'Export';

        switch (config.format) {
            case 'bcfzip':
                await this.exportAsBCFZip(issues, projectName, config);
                break;
            case 'bcf-xml':
                BCFSimpleExporter.exportAsXML(issues, projectName);
                break;
            case 'json':
                BCFSimpleExporter.exportAsJSON(issues, projectName);
                break;
            case 'csv':
                BCFSimpleExporter.exportAsCSV(issues, projectName);
                break;
            case 'excel':
                await exportToExcel();
                break;
            case 'pdf':
                await exportToPDF(false);
                break;
            default:
                throw new Error(`Formato no soportado: ${config.format}`);
        }
    }

    /**
     * Exportar como BCF ZIP
     */
    async exportAsBCFZip(issues, projectName, config) {
        const exporter = new BCFExporter({
            bcfVersion: config.bcfVersion,
            includeSnapshots: config.includeSnapshots,
            onProgress: (progress) => {
                BCFDebugger.log('EXPORT', `Progreso: ${progress.percentage}%`);
            }
        });

        const blob = await exporter.exportTopics(issues, projectName);
        const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_BCF${config.bcfVersion}_${new Date().toISOString().split('T')[0]}.bcfzip`;

        BCFExporter.downloadBlob(blob, filename);
    }
}

// Instancia global
export const advancedExport = new AdvancedExport();

// Exponer globalmente para debugging
window.AdvancedExport = AdvancedExport;
window.advancedExport = advancedExport;
