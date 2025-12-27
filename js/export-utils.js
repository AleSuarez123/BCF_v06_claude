/**
 * EXPORT UTILS - Funciones para exportar datos (PDF, Excel, CSV, JSON)
 */

import { AppState, STATUS_LABELS, PRIORITY_LABELS } from './state.js';
import { notify } from './ui-utils.js';
import { BCFParser } from './bcf-parser.js';

/**
 * Obtiene los datos a exportar basados en la selección
 * @param {boolean} selectedOnly 
 * @returns {Array}
 */
function getExportData(selectedOnly = false) {
    const issues = selectedOnly 
        ? AppState.filteredIssues.filter(i => AppState.selectedIssues.has(i.guid))
        : AppState.filteredIssues;
    return issues;
}

/**
 * Exporta a PDF detallado o resumen
 * @param {boolean} detailed 
 * @param {boolean} selectedOnly 
 */
export async function exportToPDF(detailed = false, selectedOnly = false) {
    const issues = getExportData(selectedOnly);
    if (issues.length === 0) {
        notify('No hay datos para exportar', 'warning');
        return;
    }

    try {
        notify('Generando PDF...', 'info', 2000);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: detailed ? 'portrait' : 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const projectName = AppState.currentProject?.name || 'Informe BCF';
        const date = new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Título
        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235);
        doc.text(projectName, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado: ${date} | Total: ${issues.length} incidencias`, 14, 28);

        // Resumen estadístico
        const stats = BCFParser.getIssueStats(issues);
        let yPos = 38;

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Resumen', 14, yPos);
        yPos += 8;

        doc.setFontSize(9);
        const summaryText = [
            `Abiertas: ${stats.byStatus['Open'] || 0}`,
            `En Proceso: ${stats.byStatus['In Progress'] || 0}`,
            `Resueltas: ${stats.byStatus['Resolved'] || 0}`,
            `Cerradas: ${stats.byStatus['Closed'] || 0}`
        ].join('  |  ');
        doc.text(summaryText, 14, yPos);
        yPos += 10;

        if (detailed) {
            // PDF detallado con snapshots
            for (let i = 0; i < issues.length; i++) {
                const issue = issues[i];
                if (i > 0) doc.addPage();

                yPos = 20;
                doc.setFontSize(14);
                doc.setTextColor(0);
                const titleText = issue.title.substring(0, 80);
                doc.text(`${i + 1}. ${titleText}`, 14, yPos);
                yPos += 10;

                // Metadatos
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text(`Estado: ${STATUS_LABELS[issue.topicStatus] || issue.topicStatus} | Prioridad: ${PRIORITY_LABELS[issue.priority] || issue.priority} | Tipo: ${issue.topicType}`, 14, yPos);
                yPos += 8;

                // Descripción
                if (issue.description) {
                    doc.setFontSize(10);
                    doc.setTextColor(50);
                    const descLines = doc.splitTextToSize(issue.description, 180);
                    const linesToShow = descLines.slice(0, 5);
                    doc.text(linesToShow, 14, yPos);
                    yPos += linesToShow.length * 5 + 5;
                }

                // Metadatos adicionales
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text(`Autor: ${issue.creationAuthor} | Fecha: ${issue.creationDateFormatted || '-'} | Archivo: ${issue.bcfFile}`, 14, yPos);
                yPos += 10;

                // Snapshot si existe
                if (issue.snapshot && yPos < 200) {
                    try {
                        const response = await fetch(issue.snapshot);
                        const blob = await response.blob();
                        const dataUrl = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        doc.addImage(dataUrl, 'PNG', 14, yPos, 120, 75);
                    } catch (e) {
                        console.warn('Error añadiendo imagen:', e);
                    }
                }
            }
        } else {
            // PDF tabla resumen
            const tableData = issues.map(i => [
                i.title.substring(0, 50),
                STATUS_LABELS[i.topicStatus] || i.topicStatus,
                PRIORITY_LABELS[i.priority] || i.priority,
                i.topicType,
                i.creationAuthor.substring(0, 20),
                i.creationDateFormatted || '-'
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Título', 'Estado', 'Prioridad', 'Tipo', 'Autor', 'Fecha']],
                body: tableData,
                headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 35 },
                    5: { cellWidth: 30 }
                },
                alternateRowStyles: { fillColor: [245, 247, 250] }
            });
        }

        const fileName = `${projectName}_${detailed ? 'detallado_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        document.body.style.cursor = 'default';
        notify(`PDF exportado: ${fileName}`, 'success');
    } catch (error) {
        document.body.style.cursor = 'default';
        console.error('Error generando PDF:', error);
        notify(`Error generando PDF: ${error.message}`, 'error');
    }
}

/**
 * Exporta a Excel
 * @param {boolean} selectedOnly 
 */
export function exportToExcel(selectedOnly = false) {
    const issues = getExportData(selectedOnly);
    if (issues.length === 0) {
        notify('No hay datos para exportar', 'warning');
        return;
    }

    try {
        const data = issues.map(i => ({
            'Título': i.title,
            'Descripción': i.description,
            'Estado': STATUS_LABELS[i.topicStatus] || i.topicStatus,
            'Prioridad': PRIORITY_LABELS[i.priority] || i.priority,
            'Tipo': i.topicType,
            'Autor': i.creationAuthor,
            'Asignado': i.assignedTo || '',
            'Fecha Creación': i.creationDateFormatted || '',
            'Archivo BCF': i.bcfFile,
            'GUID': i.guid,
            'Etiquetas': (i.labels || []).join(', ')
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Ajustar anchos de columna
        ws['!cols'] = [
            { wch: 40 }, { wch: 50 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
            { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 38 }, { wch: 30 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Incidencias');

        // Hoja de resumen
        const stats = BCFParser.getIssueStats(issues);
        const summaryData = [
            { 'Concepto': 'Total Incidencias', 'Valor': stats.total },
            { 'Concepto': '', 'Valor': '' },
            { 'Concepto': 'Por Estado', 'Valor': '' },
            ...Object.entries(stats.byStatus).map(([k, v]) => ({ 
                'Concepto': STATUS_LABELS[k] || k, 
                'Valor': v 
            })),
            { 'Concepto': '', 'Valor': '' },
            { 'Concepto': 'Por Prioridad', 'Valor': '' },
            ...Object.entries(stats.byPriority).map(([k, v]) => ({ 
                'Concepto': PRIORITY_LABELS[k] || k, 
                'Valor': v 
            })),
            { 'Concepto': '', 'Valor': '' },
            { 'Concepto': 'Por Tipo', 'Valor': '' },
            ...Object.entries(stats.byType).map(([k, v]) => ({ 
                'Concepto': k, 
                'Valor': v 
            }))
        ];

        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

        const fileName = `${AppState.currentProject?.name || 'BCF'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        notify(`Exportado: ${fileName}`, 'success');
    } catch (error) {
        console.error('Error exportando Excel:', error);
        notify(`Error exportando Excel: ${error.message}`, 'error');
    }
}

/**
 * Exporta a CSV
 * @param {boolean} selectedOnly 
 */
export function exportToCSV(selectedOnly = false) {
    const issues = getExportData(selectedOnly);
    if (issues.length === 0) {
        notify('No hay datos para exportar', 'warning');
        return;
    }

    try {
        const headers = ['Título', 'Descripción', 'Estado', 'Prioridad', 'Tipo', 'Autor', 'Asignado', 'Fecha Creación', 'Archivo BCF', 'GUID'];
        const rows = issues.map(i => [
            i.title,
            i.description,
            STATUS_LABELS[i.topicStatus] || i.topicStatus,
            PRIORITY_LABELS[i.priority] || i.priority,
            i.topicType,
            i.creationAuthor,
            i.assignedTo || '',
            i.creationDateFormatted || '',
            i.bcfFile,
            i.guid
        ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${AppState.currentProject?.name || 'BCF'}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        
        notify('CSV exportado', 'success');
    } catch (error) {
        console.error('Error exportando CSV:', error);
        notify(`Error exportando CSV: ${error.message}`, 'error');
    }
}

/**
 * Exporta a JSON
 */
export function exportToJSON() {
    try {
        const data = {
            project: AppState.currentProject ? {
                name: AppState.currentProject.name,
                description: AppState.currentProject.description
            } : null,
            exportDate: new Date().toISOString(),
            totalIssues: AppState.filteredIssues.length,
            issues: AppState.filteredIssues.map(i => ({
                guid: i.guid,
                title: i.title,
                description: i.description,
                status: i.topicStatus,
                priority: i.priority,
                type: i.topicType,
                author: i.creationAuthor,
                assignedTo: i.assignedTo,
                creationDate: i.creationDate,
                modifiedDate: i.modifiedDate,
                bcfFile: i.bcfFile,
                labels: i.labels,
                localComments: i.localComments
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${AppState.currentProject?.name || 'BCF'}_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        notify('JSON exportado', 'success');
    } catch (error) {
        console.error('Error exportando JSON:', error);
        notify(`Error exportando JSON: ${error.message}`, 'error');
    }
}
