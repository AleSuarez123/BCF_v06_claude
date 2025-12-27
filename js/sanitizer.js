/**
 * HTML SANITIZER - Prevención de ataques XSS
 * ============================================
 *
 * Proporciona funciones para sanitizar HTML y prevenir inyección de scripts.
 *
 * Uso:
 * ```javascript
 * import { sanitizeHTML, sanitizeAttribute, stripTags } from './sanitizer.js';
 *
 * // Sanitizar HTML completo
 * element.innerHTML = sanitizeHTML(userInput);
 *
 * // Sanitizar atributo
 * element.href = sanitizeAttribute(userUrl);
 *
 * // Remover todas las etiquetas
 * const plainText = stripTags(userInput);
 * ```
 */

import { logger } from './config.js';

/**
 * Etiquetas permitidas (whitelist)
 */
const ALLOWED_TAGS = new Set([
    'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'code', 'pre',
    'table', 'tr', 'td', 'th', 'thead', 'tbody',
    'img'
]);

/**
 * Atributos permitidos por etiqueta
 */
const ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'span': ['class'],
    'div': ['class'],
    'p': ['class'],
    'code': ['class'],
    'pre': ['class']
};

/**
 * Protocolos permitidos en URLs
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Sanitiza HTML eliminando scripts y contenido peligroso
 * @param {string} html - HTML a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {string} HTML sanitizado
 */
export function sanitizeHTML(html, options = {}) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    const {
        allowedTags = ALLOWED_TAGS,
        allowedAttributes = ALLOWED_ATTRIBUTES,
        allowedProtocols = ALLOWED_PROTOCOLS,
        stripAll = false
    } = options;

    // Si se pide strip all, remover todas las etiquetas
    if (stripAll) {
        return stripTags(html);
    }

    // Crear un elemento temporal para parsear
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Función recursiva para limpiar nodos
    const cleanNode = (node) => {
        // Si es un nodo de texto, retornarlo tal cual
        if (node.nodeType === Node.TEXT_NODE) {
            return node;
        }

        // Si es un comentario, eliminarlo
        if (node.nodeType === Node.COMMENT_NODE) {
            return null;
        }

        // Si no es un elemento, eliminarlo
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        const tagName = node.tagName.toLowerCase();

        // Si la etiqueta no está permitida, preservar solo el contenido
        if (!allowedTags.has(tagName)) {
            logger.debug(`Sanitizer: Etiqueta no permitida removida: ${tagName}`);

            // Crear un fragment con los hijos
            const fragment = document.createDocumentFragment();
            Array.from(node.childNodes).forEach(child => {
                const cleaned = cleanNode(child);
                if (cleaned) {
                    fragment.appendChild(cleaned);
                }
            });
            return fragment;
        }

        // Crear nuevo elemento limpio
        const cleanElement = document.createElement(tagName);

        // Limpiar atributos
        const allowedAttrs = allowedAttributes[tagName] || [];
        Array.from(node.attributes).forEach(attr => {
            if (allowedAttrs.includes(attr.name)) {
                // Validar URLs en atributos que las contienen
                if (['href', 'src'].includes(attr.name)) {
                    const sanitizedUrl = sanitizeURL(attr.value, allowedProtocols);
                    if (sanitizedUrl) {
                        cleanElement.setAttribute(attr.name, sanitizedUrl);
                    }
                } else {
                    // Otros atributos permitidos
                    cleanElement.setAttribute(attr.name, attr.value);
                }
            }
        });

        // Agregar atributos de seguridad para links
        if (tagName === 'a') {
            // Prevenir window.opener attacks
            cleanElement.setAttribute('rel', 'noopener noreferrer');
        }

        // Procesar hijos recursivamente
        Array.from(node.childNodes).forEach(child => {
            const cleaned = cleanNode(child);
            if (cleaned) {
                cleanElement.appendChild(cleaned);
            }
        });

        return cleanElement;
    };

    // Limpiar el body del documento parseado
    const cleanedBody = cleanNode(doc.body);

    if (!cleanedBody) {
        return '';
    }

    return cleanedBody.innerHTML || '';
}

/**
 * Sanitiza una URL verificando protocolo y contenido
 * @param {string} url - URL a sanitizar
 * @param {Array} allowedProtocols - Protocolos permitidos
 * @returns {string|null} URL sanitizada o null si es peligrosa
 */
export function sanitizeURL(url, allowedProtocols = ALLOWED_PROTOCOLS) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    // Normalizar
    url = url.trim();

    // Detectar javascript: data: y otros protocolos peligrosos
    const dangerousPatterns = [
        /^javascript:/i,
        /^data:(?!image\/)/i,  // data: solo permitido para imágenes
        /^vbscript:/i,
        /^file:/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(url))) {
        logger.warn(`Sanitizer: URL peligrosa bloqueada: ${url.substring(0, 50)}...`);
        return null;
    }

    // Si es una URL relativa, permitirla
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return url;
    }

    // Si es una data URL de imagen, permitirla
    if (url.startsWith('data:image/')) {
        return url;
    }

    // Si es un blob URL, permitirlo (ya está gestionado por blobManager)
    if (url.startsWith('blob:')) {
        return url;
    }

    // Validar protocolo para URLs absolutas
    try {
        const urlObj = new URL(url);
        if (!allowedProtocols.includes(urlObj.protocol)) {
            logger.warn(`Sanitizer: Protocolo no permitido: ${urlObj.protocol}`);
            return null;
        }
        return urlObj.href;
    } catch (e) {
        // Si no es una URL válida, puede ser relativa
        return url;
    }
}

/**
 * Sanitiza un atributo HTML
 * @param {string} value - Valor del atributo
 * @returns {string} Valor sanitizado
 */
export function sanitizeAttribute(value) {
    if (!value || typeof value !== 'string') {
        return '';
    }

    // Remover caracteres peligrosos
    return value
        .replace(/[<>"']/g, (char) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return entities[char];
        })
        // Remover event handlers
        .replace(/on\w+\s*=/gi, '');
}

/**
 * Remueve todas las etiquetas HTML
 * @param {string} html - HTML con etiquetas
 * @returns {string} Texto plano
 */
export function stripTags(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

/**
 * Escapa HTML para uso en textContent
 * Nota: Esta función ya existe en ui-utils.js como escapeHtml
 * Se mantiene aquí por completitud del módulo
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
export function escapeHTML(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitiza contenido para uso en innerHTML de manera segura
 * Modo estricto: solo permite texto plano
 * @param {string} content - Contenido a sanitizar
 * @returns {string} Contenido escapado
 */
export function sanitizeForInnerHTML(content) {
    if (!content || typeof content !== 'string') {
        return '';
    }

    return escapeHTML(content)
        // Permitir saltos de línea
        .replace(/\n/g, '<br>');
}

/**
 * Verifica si un string contiene HTML potencialmente peligroso
 * @param {string} html - String a verificar
 * @returns {boolean} True si contiene HTML peligroso
 */
export function containsDangerousHTML(html) {
    if (!html || typeof html !== 'string') {
        return false;
    }

    const dangerousPatterns = [
        /<script/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /on\w+\s*=/i,  // event handlers
        /javascript:/i,
        /<link/i,
        /<meta/i,
        /<style/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(html));
}

/**
 * Wrapper para uso directo con elementos DOM
 */
export const safeSetHTML = (element, html, options = {}) => {
    if (!element || !element instanceof HTMLElement) {
        logger.warn('safeSetHTML: elemento inválido');
        return;
    }

    // Verificar si contiene HTML peligroso
    if (containsDangerousHTML(html)) {
        logger.warn('safeSetHTML: HTML peligroso detectado, sanitizando...');
    }

    element.innerHTML = sanitizeHTML(html, options);
};

/**
 * Sanitizador específico para contenido de usuario BCF
 * (títulos, descripciones, comentarios)
 */
export function sanitizeBCFContent(content, allowBasicFormatting = false) {
    if (!content || typeof content !== 'string') {
        return '';
    }

    if (allowBasicFormatting) {
        // Permitir solo negrita, cursiva, y saltos de línea
        return sanitizeHTML(content, {
            allowedTags: new Set(['b', 'i', 'em', 'strong', 'br', 'p']),
            allowedAttributes: {}
        });
    }

    // Modo estricto: solo texto plano
    return escapeHTML(content).replace(/\n/g, '<br>');
}

// Exportar configuración para que pueda ser modificada si es necesario
export const config = {
    ALLOWED_TAGS,
    ALLOWED_ATTRIBUTES,
    ALLOWED_PROTOCOLS
};
