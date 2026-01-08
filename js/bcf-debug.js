/**
 * BCF DEBUG - Sistema de debugging para exportación BCF
 * Genera logs detallados para identificar problemas
 */

export class BCFDebugger {
    static logs = [];
    static enabled = true;

    static log(category, message, data = null) {
        if (!this.enabled) return;

        const entry = {
            timestamp: new Date().toISOString(),
            category,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null
        };

        this.logs.push(entry);

        // Log en consola con color
        const colors = {
            'DOM': 'color: #3b82f6',
            'EVENT': 'color: #10b981',
            'MODAL': 'color: #8b5cf6',
            'EXPORT': 'color: #f59e0b',
            'ERROR': 'color: #ef4444',
            'SUCCESS': 'color: #22c55e',
            'JSZIP': 'color: #06b6d4'
        };

        console.log(
            `%c[BCF-DEBUG][${category}] ${message}`,
            colors[category] || 'color: #6b7280',
            data || ''
        );
    }

    static error(category, message, error) {
        this.log('ERROR', `${category}: ${message}`, {
            error: error?.message,
            stack: error?.stack
        });
        console.error(`[BCF-DEBUG][${category}]`, message, error);
    }

    static checkDOM(selector, description) {
        const element = document.querySelector(selector);
        const exists = !!element;

        this.log('DOM', `${description} (${selector}): ${exists ? '✓ EXISTE' : '✗ NO EXISTE'}`, {
            selector,
            exists,
            element: exists ? {
                tagName: element.tagName,
                id: element.id,
                classList: Array.from(element.classList)
            } : null
        });

        return element;
    }

    static checkJSZip() {
        const available = typeof JSZip !== 'undefined';
        this.log('JSZIP', `JSZip disponible: ${available ? '✓ SÍ' : '✗ NO'}`, {
            available,
            type: available ? typeof JSZip : null,
            version: available && JSZip.version ? JSZip.version : null
        });
        return available;
    }

    static exportLogs() {
        const json = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bcf-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.log('SUCCESS', `Logs exportados: ${this.logs.length} entradas`);
    }

    static printReport() {
        console.group('📊 BCF DEBUG REPORT');
        console.log(`Total de logs: ${this.logs.length}`);

        const categories = {};
        this.logs.forEach(log => {
            categories[log.category] = (categories[log.category] || 0) + 1;
        });

        console.table(categories);
        console.groupEnd();
    }

    static testButtonClick() {
        this.log('EVENT', '🧪 Iniciando test manual del botón BCF...');

        // 1. Verificar botón
        const btn = this.checkDOM('#btn-export-bcf', 'Botón BCF Export');
        if (!btn) {
            this.error('EVENT', 'Botón no encontrado en DOM', new Error('Button not found'));
            return false;
        }

        // 2. Verificar modal
        const modal = this.checkDOM('#modal-export-bcf', 'Modal BCF Export');
        if (!modal) {
            this.error('EVENT', 'Modal no encontrado en DOM', new Error('Modal not found'));
            return false;
        }

        // 3. Verificar dropdown parent
        const dropdown = this.checkDOM('#export-dropdown', 'Dropdown Export');

        // 4. Intentar click programático
        this.log('EVENT', 'Ejecutando click programático en botón...');
        try {
            btn.click();
            this.log('EVENT', '✓ Click ejecutado correctamente');
        } catch (error) {
            this.error('EVENT', 'Error al ejecutar click', error);
            return false;
        }

        return true;
    }

    static async testExportFunction() {
        this.log('EXPORT', '🧪 Iniciando test de función de exportación...');

        // Verificar AppState
        if (typeof AppState === 'undefined') {
            this.error('EXPORT', 'AppState no definido', new Error('AppState undefined'));
            return false;
        }

        this.log('EXPORT', 'AppState disponible', {
            currentProject: AppState.currentProject?.name,
            currentIssues: AppState.currentIssues?.length,
            filteredIssues: AppState.filteredIssues?.length
        });

        // Verificar JSZip
        if (!this.checkJSZip()) {
            return false;
        }

        // Verificar BCFExporter
        if (typeof BCFExporter === 'undefined') {
            this.error('EXPORT', 'BCFExporter no disponible', new Error('BCFExporter undefined'));
            return false;
        }

        this.log('SUCCESS', '✓ Todas las dependencias disponibles');
        return true;
    }
}

// Exponer globalmente para debugging manual
window.BCFDebugger = BCFDebugger;

// Auto-iniciar verificaciones
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('%c🔍 BCF Debugger Cargado', 'font-size: 16px; color: #3b82f6; font-weight: bold');
            console.log('%cUsa BCFDebugger.testButtonClick() para probar el botón', 'color: #6b7280');
            console.log('%cUsa BCFDebugger.testExportFunction() para probar exportación', 'color: #6b7280');
            console.log('%cUsa BCFDebugger.exportLogs() para exportar logs', 'color: #6b7280');

            BCFDebugger.log('DOM', 'Página cargada, iniciando verificaciones...');
        }, 1000);
    });
} else {
    setTimeout(() => {
        BCFDebugger.log('DOM', 'Página ya cargada, iniciando verificaciones...');
    }, 100);
}
