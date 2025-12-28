/**
 * Developer Tools para Debugging
 *
 * Proporciona herramientas de debugging y testing accesibles desde
 * la consola del navegador durante el desarrollo.
 *
 * Uso: window.DevTools o simplemente DevTools en la consola
 *
 * @module debug/dev-tools
 */

import {
    createMockIssue,
    createMockProject,
    generateBulkIssues,
    generateBulkProjects,
    createMockBCFFile,
    TEST_DATASETS,
    clearMockData
} from '../test-helpers/mock-data.js';

/**
 * DevTools - Herramientas de desarrollo y debugging
 *
 * @namespace DevTools
 *
 * @example
 * // Inyectar 100 issues de prueba
 * DevTools.injectTestData(100);
 *
 * @example
 * // Ver estado actual de la aplicación
 * DevTools.logState();
 *
 * @example
 * // Exportar estado a JSON
 * DevTools.exportState();
 */
export const DevTools = {
    /**
     * Versión de DevTools
     */
    version: '1.0.0',

    /**
     * Inyecta datos de prueba en la aplicación
     *
     * @param {number|string} [countOrDataset=50] - Número de issues o nombre de dataset
     * @param {Object} [options={}] - Opciones adicionales
     * @param {boolean} [options.clearFirst=true] - Limpiar datos existentes primero
     * @param {boolean} [options.render=true] - Re-renderizar después de inyectar
     * @param {string} [options.projectName] - Nombre del proyecto a crear
     *
     * @example
     * DevTools.injectTestData(100); // 100 issues aleatorios
     *
     * @example
     * DevTools.injectTestData('large'); // Dataset grande (1000 issues)
     *
     * @example
     * DevTools.injectTestData('highPriority', { clearFirst: false });
     */
    injectTestData(countOrDataset = 50, options = {}) {
        const {
            clearFirst = true,
            render = true,
            projectName = 'Test Project'
        } = options;

        try {
            // Acceder al AppState global
            const AppState = window.AppState;
            if (!AppState) {
                console.error('❌ AppState no encontrado. Asegúrate de que la app esté inicializada.');
                return;
            }

            // Limpiar datos existentes si se solicita
            if (clearFirst) {
                clearMockData(AppState);
                console.log('🗑️ Datos existentes eliminados');
            }

            // Generar issues según el parámetro
            let issues;
            if (typeof countOrDataset === 'string' && TEST_DATASETS[countOrDataset]) {
                issues = TEST_DATASETS[countOrDataset]();
                console.log(`📊 Usando dataset: ${countOrDataset}`);
            } else if (typeof countOrDataset === 'number') {
                issues = generateBulkIssues(countOrDataset);
                console.log(`📊 Generando ${countOrDataset} issues aleatorios`);
            } else {
                console.error('❌ Parámetro inválido. Usa un número o nombre de dataset.');
                return;
            }

            // Crear proyecto mock
            const project = createMockProject({
                name: projectName,
                issueCount: issues.length
            });

            // Inyectar datos
            AppState.projects.push(project);
            AppState.currentProject = project;
            AppState.currentIssues = issues;
            AppState.filteredIssues = issues;

            console.log(`✅ Inyectados ${issues.length} issues en proyecto "${projectName}"`);

            // Re-renderizar si se solicita
            if (render && typeof window.renderProjects === 'function') {
                window.renderProjects();
                console.log('🎨 UI actualizada');
            }

            // Guardar en storage si está disponible
            if (window.Storage && typeof window.Storage.saveAll === 'function') {
                window.Storage.saveAll()
                    .then(() => console.log('💾 Datos guardados en storage'))
                    .catch(err => console.warn('⚠️ Error al guardar:', err));
            }

            return { project, issues };

        } catch (error) {
            console.error('❌ Error al inyectar datos:', error);
        }
    },

    /**
     * Imprime el estado actual de la aplicación en la consola
     *
     * @param {boolean} [detailed=false] - Mostrar detalles completos
     *
     * @example
     * DevTools.logState(); // Resumen básico
     *
     * @example
     * DevTools.logState(true); // Información detallada
     */
    logState(detailed = false) {
        const AppState = window.AppState;
        if (!AppState) {
            console.error('❌ AppState no encontrado');
            return;
        }

        console.group('📊 Estado Actual de la Aplicación');

        console.log('📁 Proyectos:', AppState.projects.length);
        console.log('📋 Issues totales:', AppState.currentIssues?.length || 0);
        console.log('🔍 Issues filtrados:', AppState.filteredIssues?.length || 0);
        console.log('✅ Issues seleccionados:', AppState.selectedIssues?.size || 0);
        console.log('⭐ Favoritos:', AppState.favorites?.size || 0);
        console.log('👁️ Modo de vista:', AppState.viewMode || 'N/A');
        console.log('🎨 Tema:', AppState.theme || 'N/A');

        if (AppState.currentProject) {
            console.group('📂 Proyecto Actual');
            console.log('Nombre:', AppState.currentProject.name);
            console.log('ID:', AppState.currentProject.id);
            console.log('Archivos BCF:', AppState.currentProject.bcfFiles?.length || 0);
            console.groupEnd();
        }

        if (detailed) {
            console.group('📝 Detalles Completos');
            console.log('AppState completo:', AppState);

            if (AppState.filters) {
                console.log('Filtros activos:', AppState.filters);
            }

            if (AppState.currentIssues?.length > 0) {
                console.table(AppState.currentIssues.slice(0, 10).map(i => ({
                    Título: i.title,
                    Estado: i.topicStatus,
                    Prioridad: i.priority,
                    Asignado: i.assignedTo || 'Sin asignar',
                    Autor: i.creationAuthor
                })));
            }

            console.groupEnd();
        }

        console.groupEnd();
    },

    /**
     * Exporta el estado actual a un archivo JSON descargable
     *
     * @param {string} [filename] - Nombre del archivo (por defecto: bcf-state-{timestamp}.json)
     *
     * @example
     * DevTools.exportState(); // Descarga bcf-state-1234567890.json
     *
     * @example
     * DevTools.exportState('mi-estado.json');
     */
    exportState(filename) {
        const AppState = window.AppState;
        if (!AppState) {
            console.error('❌ AppState no encontrado');
            return;
        }

        try {
            // Preparar datos para exportar (evitar referencias circulares)
            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                projects: AppState.projects || [],
                currentProject: AppState.currentProject || null,
                currentIssues: AppState.currentIssues || [],
                favorites: Array.from(AppState.favorites || []),
                selectedIssues: Array.from(AppState.selectedIssues || []),
                filters: AppState.filters || {},
                viewMode: AppState.viewMode || 'list',
                theme: AppState.theme || 'light'
            };

            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const defaultFilename = `bcf-state-${Date.now()}.json`;
            const finalFilename = filename || defaultFilename;

            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            a.click();

            URL.revokeObjectURL(url);

            console.log(`✅ Estado exportado a: ${finalFilename}`);
            console.log(`📦 Tamaño: ${(blob.size / 1024).toFixed(2)} KB`);

        } catch (error) {
            console.error('❌ Error al exportar estado:', error);
        }
    },

    /**
     * Importa estado desde un archivo JSON exportado previamente
     *
     * @param {File} file - Archivo JSON a importar
     * @returns {Promise<void>}
     *
     * @example
     * // Desde la consola, con input file:
     * const input = document.createElement('input');
     * input.type = 'file';
     * input.accept = 'application/json';
     * input.onchange = e => DevTools.importState(e.target.files[0]);
     * input.click();
     */
    async importState(file) {
        if (!file) {
            console.error('❌ No se proporcionó archivo');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const AppState = window.AppState;
            if (!AppState) {
                console.error('❌ AppState no encontrado');
                return;
            }

            // Restaurar datos
            AppState.projects = data.projects || [];
            AppState.currentProject = data.currentProject || null;
            AppState.currentIssues = data.currentIssues || [];
            AppState.filteredIssues = data.currentIssues || [];
            AppState.favorites = new Set(data.favorites || []);
            AppState.selectedIssues = new Set(data.selectedIssues || []);
            AppState.filters = data.filters || {};
            AppState.viewMode = data.viewMode || 'list';
            AppState.theme = data.theme || 'light';

            console.log(`✅ Estado importado desde: ${file.name}`);
            console.log(`📊 ${AppState.projects.length} proyectos, ${AppState.currentIssues.length} issues`);

            // Re-renderizar
            if (typeof window.renderProjects === 'function') {
                window.renderProjects();
            }

            // Guardar
            if (window.Storage && typeof window.Storage.saveAll === 'function') {
                await window.Storage.saveAll();
                console.log('💾 Estado guardado');
            }

        } catch (error) {
            console.error('❌ Error al importar estado:', error);
        }
    },

    /**
     * Mide el rendimiento de una función
     *
     * @param {Function} fn - Función a medir
     * @param {string} [label='Function'] - Etiqueta para el log
     * @param {number} [iterations=1] - Número de veces a ejecutar
     * @returns {Promise<any>} Resultado de la función
     *
     * @example
     * await DevTools.measurePerformance(() => {
     *   applyFiltersAndSort();
     *   renderIssues();
     * }, 'Filtrado y Renderizado');
     */
    async measurePerformance(fn, label = 'Function', iterations = 1) {
        console.group(`⏱️ Midiendo rendimiento: ${label}`);

        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            const end = performance.now();
            const duration = end - start;
            times.push(duration);

            if (iterations > 1) {
                console.log(`Iteración ${i + 1}: ${duration.toFixed(2)}ms`);
            }
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        console.log(`📊 Promedio: ${avg.toFixed(2)}ms`);
        if (iterations > 1) {
            console.log(`⬇️ Mínimo: ${min.toFixed(2)}ms`);
            console.log(`⬆️ Máximo: ${max.toFixed(2)}ms`);
        }

        console.groupEnd();

        return { avg, min, max, times };
    },

    /**
     * Limpia todos los datos de prueba y resetea la aplicación
     *
     * @example
     * DevTools.reset();
     */
    reset() {
        const AppState = window.AppState;
        if (!AppState) {
            console.error('❌ AppState no encontrado');
            return;
        }

        clearMockData(AppState);

        if (typeof window.renderProjects === 'function') {
            window.renderProjects();
        }

        if (window.Storage && typeof window.Storage.saveAll === 'function') {
            window.Storage.saveAll()
                .then(() => console.log('✅ Aplicación reseteada y guardada'))
                .catch(err => console.warn('⚠️ Error al guardar:', err));
        }

        console.log('🔄 Aplicación reseteada');
    },

    /**
     * Muestra ayuda con todos los comandos disponibles
     *
     * @example
     * DevTools.help();
     */
    help() {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    🛠️  BCF VIEWER PRO - DEV TOOLS                ║
║                          Versión ${this.version}                          ║
╚══════════════════════════════════════════════════════════════════╝

📝 COMANDOS DISPONIBLES:

  DevTools.injectTestData(count, options)
    Inyecta datos de prueba en la aplicación
    • count: número de issues o nombre de dataset
    • Datasets: 'small', 'medium', 'large', 'xlarge', 'highPriority', 'dueSoon', 'realistic'
    Ejemplo: DevTools.injectTestData(100)
    Ejemplo: DevTools.injectTestData('large')

  DevTools.logState(detailed)
    Muestra el estado actual de la aplicación
    • detailed: true para ver detalles completos
    Ejemplo: DevTools.logState()
    Ejemplo: DevTools.logState(true)

  DevTools.exportState(filename)
    Exporta el estado actual a JSON
    Ejemplo: DevTools.exportState()
    Ejemplo: DevTools.exportState('mi-backup.json')

  DevTools.importState(file)
    Importa estado desde archivo JSON
    Ejemplo: Ver código en consola

  DevTools.measurePerformance(fn, label, iterations)
    Mide rendimiento de una función
    Ejemplo: DevTools.measurePerformance(() => renderIssues(), 'Render', 10)

  DevTools.reset()
    Limpia todos los datos y resetea la app
    Ejemplo: DevTools.reset()

  DevTools.help()
    Muestra esta ayuda

╔══════════════════════════════════════════════════════════════════╗
║  💡 TIP: También puedes acceder a las factories directamente:   ║
║     • createMockIssue()                                          ║
║     • createMockProject()                                        ║
║     • generateBulkIssues(count)                                  ║
║     • TEST_DATASETS.large()                                      ║
╚══════════════════════════════════════════════════════════════════╝
        `);
    }
};

// Exportar también las factories para uso directo
export {
    createMockIssue,
    createMockProject,
    generateBulkIssues,
    generateBulkProjects,
    createMockBCFFile,
    TEST_DATASETS,
    clearMockData
};

// Exponer DevTools globalmente para acceso desde consola
if (typeof window !== 'undefined') {
    window.DevTools = DevTools;
    window.createMockIssue = createMockIssue;
    window.createMockProject = createMockProject;
    window.generateBulkIssues = generateBulkIssues;
    window.TEST_DATASETS = TEST_DATASETS;

    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🛠️  DevTools ${DevTools.version} cargado                              ║
║  Escribe DevTools.help() para ver comandos disponibles          ║
╚══════════════════════════════════════════════════════════════════╝
    `);
}

export default DevTools;
