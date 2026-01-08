/**
 * BCF SIMPLE EXPORT - Exportador simplificado sin dependencias complejas
 * Alternativa para diagnosticar problemas con JSZip
 */

import { BCFDebugger } from './bcf-debug.js';

/**
 * Exportador simplificado que genera JSON del BCF
 */
export class BCFSimpleExporter {
    /**
     * Exporta topics como JSON (para debugging)
     */
    static exportAsJSON(topics, projectName = 'Export') {
        BCFDebugger.log('EXPORT', '📄 Exportando como JSON (modo simple)');

        const bcfData = {
            version: '3.0',
            project: {
                name: projectName,
                projectId: crypto.randomUUID()
            },
            topics: topics.map(topic => ({
                guid: topic.guid || crypto.randomUUID(),
                title: topic.title || 'Sin título',
                creationDate: topic.creationDate || new Date().toISOString(),
                creationAuthor: topic.creationAuthor || 'Desconocido',
                modifiedDate: topic.modifiedDate || topic.creationDate,
                topicType: topic.topicType || 'Issue',
                topicStatus: topic.topicStatus || 'Open',
                priority: topic.priority || 'Normal',
                assignedTo: topic.assignedTo || null,
                description: topic.description || '',
                dueDate: topic.dueDate || null,
                labels: topic.labels || [],
                comments: topic.comments || []
            }))
        };

        const jsonString = JSON.stringify(bcfData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_bcf_export_${Date.now()}.json`;

        BCFDebugger.log('SUCCESS', 'JSON generado', {
            size: blob.size,
            topicsCount: topics.length
        });

        this.downloadBlob(blob, filename);
        return { blob, filename };
    }

    /**
     * Exporta como XML individual (sin ZIP)
     */
    static exportAsXML(topics, projectName = 'Export') {
        BCFDebugger.log('EXPORT', '📝 Exportando como XML (sin comprimir)');

        const xmlParts = [];

        // Header
        xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
        xmlParts.push('<BCFExport version="3.0">');
        xmlParts.push(`  <Project name="${this.escapeXML(projectName)}"/>`);
        xmlParts.push('  <Topics>');

        // Topics
        topics.forEach(topic => {
            xmlParts.push('    <Topic>');
            xmlParts.push(`      <Guid>${topic.guid || crypto.randomUUID()}</Guid>`);
            xmlParts.push(`      <Title>${this.escapeXML(topic.title || 'Sin título')}</Title>`);
            xmlParts.push(`      <CreationDate>${topic.creationDate || new Date().toISOString()}</CreationDate>`);
            xmlParts.push(`      <CreationAuthor>${this.escapeXML(topic.creationAuthor || 'Desconocido')}</CreationAuthor>`);
            xmlParts.push(`      <TopicType>${this.escapeXML(topic.topicType || 'Issue')}</TopicType>`);
            xmlParts.push(`      <TopicStatus>${this.escapeXML(topic.topicStatus || 'Open')}</TopicStatus>`);

            if (topic.priority) {
                xmlParts.push(`      <Priority>${this.escapeXML(topic.priority)}</Priority>`);
            }

            if (topic.assignedTo) {
                xmlParts.push(`      <AssignedTo>${this.escapeXML(topic.assignedTo)}</AssignedTo>`);
            }

            if (topic.description) {
                xmlParts.push(`      <Description>${this.escapeXML(topic.description)}</Description>`);
            }

            if (topic.dueDate) {
                xmlParts.push(`      <DueDate>${topic.dueDate}</DueDate>`);
            }

            xmlParts.push('    </Topic>');
        });

        xmlParts.push('  </Topics>');
        xmlParts.push('</BCFExport>');

        const xmlString = xmlParts.join('\n');
        const blob = new Blob([xmlString], { type: 'application/xml' });
        const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_bcf_export_${Date.now()}.xml`;

        BCFDebugger.log('SUCCESS', 'XML generado', {
            size: blob.size,
            topicsCount: topics.length
        });

        this.downloadBlob(blob, filename);
        return { blob, filename };
    }

    /**
     * Exporta como CSV para máxima compatibilidad
     */
    static exportAsCSV(topics, projectName = 'Export') {
        BCFDebugger.log('EXPORT', '📊 Exportando como CSV');

        const headers = [
            'GUID',
            'Título',
            'Estado',
            'Prioridad',
            'Tipo',
            'Asignado a',
            'Fecha Creación',
            'Autor',
            'Fecha Modificación',
            'Fecha Vencimiento',
            'Descripción'
        ];

        const rows = [headers];

        topics.forEach(topic => {
            rows.push([
                topic.guid || '',
                topic.title || '',
                topic.topicStatus || '',
                topic.priority || '',
                topic.topicType || '',
                topic.assignedTo || '',
                topic.creationDate || '',
                topic.creationAuthor || '',
                topic.modifiedDate || '',
                topic.dueDate || '',
                (topic.description || '').replace(/\n/g, ' ').replace(/"/g, '""')
            ]);
        });

        const csvString = rows.map(row =>
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_bcf_export_${Date.now()}.csv`;

        BCFDebugger.log('SUCCESS', 'CSV generado', {
            size: blob.size,
            topicsCount: topics.length
        });

        this.downloadBlob(blob, filename);
        return { blob, filename };
    }

    /**
     * Descarga un blob
     */
    static downloadBlob(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            BCFDebugger.log('SUCCESS', `✓ Descarga iniciada: ${filename}`);
        } catch (error) {
            BCFDebugger.error('EXPORT', 'Error al descargar archivo', error);
            throw error;
        }
    }

    /**
     * Escapa caracteres XML
     */
    static escapeXML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

// Exponer globalmente para pruebas
window.BCFSimpleExporter = BCFSimpleExporter;
