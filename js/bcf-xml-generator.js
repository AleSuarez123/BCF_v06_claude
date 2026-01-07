/**
 * BCF XML GENERATOR - Generación de archivos XML conforme a estándares buildingSMART
 * Soporta BCF 2.1 y 3.0
 */

import { escapeXML, normalizeToISO8601 } from './bcf-validator.js';
import { LogManager } from './log-manager.js';

const logger = LogManager.getLogger('BCFXMLGenerator');

/**
 * Namespaces oficiales buildingSMART
 */
const NAMESPACES = {
    '2.1': {
        // BCF 2.1 no usa namespaces en elementos raíz
        version: '',
        markup: ''
    },
    '3.0': {
        version: 'http://www.buildingsmart-tech.org/xmlschemas/BCF/3.0',
        markup: 'http://www.buildingsmart-tech.org/xmlschemas/BCF/3.0'
    }
};

/**
 * Genera el archivo bcf.version
 */
export function generateVersionXML(bcfVersion = '3.0') {
    const versionId = bcfVersion;
    const detailedVersion = bcfVersion;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

    if (bcfVersion === '3.0') {
        xml += `<Version VersionId="${versionId}" xmlns="${NAMESPACES['3.0'].version}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
        xml += `  <DetailedVersion>${detailedVersion}</DetailedVersion>\n`;
        xml += `</Version>`;
    } else {
        // BCF 2.1
        xml += `<Version VersionId="${versionId}">\n`;
        xml += `  <DetailedVersion>${detailedVersion}</DetailedVersion>\n`;
        xml += `</Version>`;
    }

    return xml;
}

/**
 * Genera elemento XML simple
 */
function element(tagName, content, indent = 0) {
    const spaces = '  '.repeat(indent);

    if (content === null || content === undefined || content === '') {
        return ''; // Omitir elementos vacíos
    }

    const escapedContent = escapeXML(String(content));
    return `${spaces}<${tagName}>${escapedContent}</${tagName}>\n`;
}

/**
 * Genera elemento XML con atributos
 */
function elementWithAttrs(tagName, content, attrs = {}, indent = 0) {
    const spaces = '  '.repeat(indent);
    const attrStr = Object.entries(attrs)
        .filter(([k, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}="${escapeXML(String(v))}"`)
        .join(' ');

    const attrPart = attrStr ? ` ${attrStr}` : '';

    if (content === null || content === undefined || content === '') {
        return `${spaces}<${tagName}${attrPart}/>\n`;
    }

    if (typeof content === 'string') {
        const escapedContent = escapeXML(content);
        return `${spaces}<${tagName}${attrPart}>${escapedContent}</${tagName}>\n`;
    }

    // Content es XML anidado
    return `${spaces}<${tagName}${attrPart}>\n${content}${spaces}</${tagName}>\n`;
}

/**
 * Genera elemento self-closing con atributos
 */
function selfClosingElement(tagName, attrs = {}, indent = 0) {
    const spaces = '  '.repeat(indent);
    const attrStr = Object.entries(attrs)
        .filter(([k, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}="${escapeXML(String(v))}"`)
        .join(' ');

    return `${spaces}<${tagName} ${attrStr}/>\n`;
}

/**
 * Genera sección de labels
 */
function generateLabels(labels, indent = 0) {
    if (!labels || labels.length === 0) return '';

    const spaces = '  '.repeat(indent);
    let xml = `${spaces}<Labels>\n`;

    labels.forEach(label => {
        if (label) {
            xml += element('Label', label, indent + 1);
        }
    });

    xml += `${spaces}</Labels>\n`;
    return xml;
}

/**
 * Genera sección de reference links
 */
function generateReferenceLinks(links, indent = 0) {
    if (!links || links.length === 0) return '';

    const spaces = '  '.repeat(indent);
    let xml = `${spaces}<ReferenceLinks>\n`;

    links.forEach(link => {
        if (link) {
            xml += element('ReferenceLink', link, indent + 1);
        }
    });

    xml += `${spaces}</ReferenceLinks>\n`;
    return xml;
}

/**
 * Genera sección de comentarios
 */
function generateComments(comments, indent = 0) {
    if (!comments || comments.length === 0) return '';

    let xml = '';

    comments.forEach(comment => {
        xml += elementWithAttrs('Comment', (
            element('Date', comment.date, indent + 1) +
            element('Author', comment.author, indent + 1) +
            element('Comment', comment.comment, indent + 1) +
            (comment.modifiedDate ? element('ModifiedDate', comment.modifiedDate, indent + 1) : '') +
            (comment.modifiedAuthor ? element('ModifiedAuthor', comment.modifiedAuthor, indent + 1) : '')
        ), { Guid: comment.guid }, indent);
    });

    return xml;
}

/**
 * Genera sección de viewpoints BCF 2.1
 */
function generateViewpoints21(viewpoints, indent = 0) {
    if (!viewpoints || viewpoints.length === 0) return '';

    const spaces = '  '.repeat(indent);
    let xml = `${spaces}<Viewpoints>\n`;

    viewpoints.forEach(vp => {
        xml += elementWithAttrs('ViewPoint', (
            (vp.viewpoint ? element('Viewpoint', vp.viewpoint, indent + 2) : '') +
            (vp.snapshot ? element('Snapshot', vp.snapshot, indent + 2) : '')
        ), { Guid: vp.guid }, indent + 1);
    });

    xml += `${spaces}</Viewpoints>\n`;
    return xml;
}

/**
 * Genera sección de viewpoints BCF 3.0
 */
function generateViewpoints30(viewpoints, indent = 0) {
    if (!viewpoints || viewpoints.length === 0) return '';

    const spaces = '  '.repeat(indent);
    let xml = `${spaces}<Viewpoints>\n`;

    viewpoints.forEach(vp => {
        xml += elementWithAttrs('ViewPoint', (
            (vp.viewpoint ? element('Viewpoint', vp.viewpoint, indent + 2) : '') +
            (vp.snapshot ? element('Snapshot', vp.snapshot, indent + 2) : '') +
            (vp.index !== undefined ? element('Index', vp.index, indent + 2) : '')
        ), { Guid: vp.guid }, indent + 1);
    });

    xml += `${spaces}</Viewpoints>\n`;
    return xml;
}

/**
 * Genera sección Topic BCF 2.1
 */
function generateTopic21(topic, indent = 0) {
    const spaces = '  '.repeat(indent);

    // BCF 2.1: TopicType y TopicStatus son ELEMENTOS, no atributos
    let xml = `${spaces}<Topic Guid="${escapeXML(topic.guid)}">\n`;

    // Campos obligatorios
    xml += element('Title', topic.title, indent + 1);
    xml += element('CreationDate', topic.creationDate, indent + 1);
    xml += element('CreationAuthor', topic.creationAuthor, indent + 1);

    // Campos opcionales
    if (topic.topicType) {
        xml += element('TopicType', topic.topicType, indent + 1);
    }

    if (topic.topicStatus) {
        xml += element('TopicStatus', topic.topicStatus, indent + 1);
    }

    if (topic.priority) {
        xml += element('Priority', topic.priority, indent + 1);
    }

    if (topic.description) {
        xml += element('Description', topic.description, indent + 1);
    }

    if (topic.assignedTo) {
        xml += element('AssignedTo', topic.assignedTo, indent + 1);
    }

    if (topic.dueDate) {
        xml += element('DueDate', topic.dueDate, indent + 1);
    }

    if (topic.modifiedDate) {
        xml += element('ModifiedDate', topic.modifiedDate, indent + 1);
    }

    if (topic.modifiedAuthor) {
        xml += element('ModifiedAuthor', topic.modifiedAuthor, indent + 1);
    }

    // Labels
    xml += generateLabels(topic.labels, indent + 1);

    // Reference Links
    xml += generateReferenceLinks(topic.referenceLinks, indent + 1);

    xml += `${spaces}</Topic>\n`;

    return xml;
}

/**
 * Genera sección Topic BCF 3.0
 */
function generateTopic30(topic, indent = 0) {
    const spaces = '  '.repeat(indent);

    // BCF 3.0: TopicType y TopicStatus son ATRIBUTOS
    const attrs = {
        Guid: topic.guid,
        TopicType: topic.topicType || 'Issue',
        TopicStatus: topic.topicStatus || 'Open'
    };

    let xml = `${spaces}<Topic Guid="${escapeXML(attrs.Guid)}" TopicType="${escapeXML(attrs.TopicType)}" TopicStatus="${escapeXML(attrs.TopicStatus)}">\n`;

    // Campos obligatorios
    xml += element('Title', topic.title, indent + 1);
    xml += element('CreationDate', topic.creationDate, indent + 1);
    xml += element('CreationAuthor', topic.creationAuthor, indent + 1);

    // Campos opcionales
    if (topic.priority) {
        xml += element('Priority', topic.priority, indent + 1);
    }

    if (topic.description) {
        xml += element('Description', topic.description, indent + 1);
    }

    if (topic.assignedTo) {
        xml += element('AssignedTo', topic.assignedTo, indent + 1);
    }

    if (topic.dueDate) {
        xml += element('DueDate', topic.dueDate, indent + 1);
    }

    if (topic.modifiedDate) {
        xml += element('ModifiedDate', topic.modifiedDate, indent + 1);
    }

    if (topic.modifiedAuthor) {
        xml += element('ModifiedAuthor', topic.modifiedAuthor, indent + 1);
    }

    // Labels
    xml += generateLabels(topic.labels, indent + 1);

    // Reference Links
    xml += generateReferenceLinks(topic.referenceLinks, indent + 1);

    xml += `${spaces}</Topic>\n`;

    return xml;
}

/**
 * Genera el archivo markup.bcf completo
 */
export function generateMarkupXML(topic, bcfVersion = '3.0') {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

    if (bcfVersion === '3.0') {
        // BCF 3.0 con namespace
        xml += `<Markup xmlns="${NAMESPACES['3.0'].markup}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;

        // Topic
        xml += generateTopic30(topic, 1);

        // Comments
        if (topic.bcfComments && topic.bcfComments.length > 0) {
            xml += generateComments(topic.bcfComments, 1);
        }

        // Viewpoints
        if (topic.viewpoints && topic.viewpoints.length > 0) {
            xml += generateViewpoints30(topic.viewpoints, 1);
        }

        xml += `</Markup>`;
    } else {
        // BCF 2.1 sin namespace
        xml += `<Markup>\n`;

        // Topic
        xml += generateTopic21(topic, 1);

        // Comments
        if (topic.bcfComments && topic.bcfComments.length > 0) {
            xml += generateComments(topic.bcfComments, 1);
        }

        // Viewpoints
        if (topic.viewpoints && topic.viewpoints.length > 0) {
            xml += generateViewpoints21(topic.viewpoints, 1);
        }

        xml += `</Markup>`;
    }

    logger.debug(`Generated markup.bcf for topic ${topic.guid} (${topic.title})`);
    return xml;
}

/**
 * Genera el archivo project.bcfp (opcional)
 */
export function generateProjectXML(project, bcfVersion = '3.0') {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

    if (bcfVersion === '3.0') {
        xml += `<ProjectInfo xmlns="${NAMESPACES['3.0'].version}">\n`;
    } else {
        xml += `<ProjectInfo>\n`;
    }

    if (project.name) {
        xml += element('Name', project.name, 1);
    }

    if (project.id) {
        xml += element('ProjectId', project.id, 1);
    }

    xml += `</ProjectInfo>`;

    return xml;
}

/**
 * Genera el archivo extensions.xsd (BCF 3.0)
 */
export function generateExtensionsXSD() {
    // Este es el schema de extensiones mínimo
    return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Extensions">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="TopicType" minOccurs="0" maxOccurs="unbounded"/>
        <xs:element name="TopicStatus" minOccurs="0" maxOccurs="unbounded"/>
        <xs:element name="Priority" minOccurs="0" maxOccurs="unbounded"/>
        <xs:element name="SnippetType" minOccurs="0" maxOccurs="unbounded"/>
        <xs:element name="TopicLabel" minOccurs="0" maxOccurs="unbounded"/>
        <xs:element name="Stage" minOccurs="0" maxOccurs="unbounded"/>
        <xs:element name="UserIdType" minOccurs="0" maxOccurs="unbounded"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
}
