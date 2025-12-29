/**
 * UI Helpers - Utilidades compartidas para componentes de interfaz
 *
 * Funciones reutilizables para generación de avatares, colores,
 * iniciales, badges y otros elementos de UI.
 *
 * @module ui-helpers
 */

import { COLORS } from '../utils/constants.js';

/**
 * Obtiene las iniciales de un nombre o email
 *
 * Versión mejorada que maneja:
 * - Nombres completos (FirstName LastName)
 * - Emails (user@domain.com → US)
 * - Nombres simples
 * - Casos edge (null, undefined, vacío)
 *
 * @param {string} name - Nombre o email del usuario
 * @returns {string} Iniciales en mayúsculas (2 caracteres max)
 *
 * @example
 * getInitials('John Doe'); // 'JD'
 * getInitials('user@example.com'); // 'US'
 * getInitials('Maria'); // 'MA'
 * getInitials(null); // '?'
 */
export function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';

    const trimmed = name.trim();
    if (!trimmed) return '?';

    // Caso 1: Email (user@domain.com)
    if (trimmed.includes('@')) {
        const localPart = trimmed.split('@')[0];
        if (localPart.length >= 2) {
            return localPart.substring(0, 2).toUpperCase();
        }
        return (localPart + '?').substring(0, 2).toUpperCase();
    }

    // Caso 2: Nombre completo (FirstName LastName)
    const parts = trimmed.split(/[\s.]+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // Caso 3: Nombre simple
    if (trimmed.length >= 2) {
        return trimmed.substring(0, 2).toUpperCase();
    }

    return (trimmed[0] + '?').toUpperCase();
}

/**
 * Genera un color consistente basado en un string (hash-based)
 *
 * Usa un algoritmo de hash simple para generar siempre el mismo
 * color para el mismo string, útil para avatares y badges.
 *
 * @param {string} str - String base para generar el color
 * @param {number} [saturation=65] - Saturación del color (0-100)
 * @param {number} [lightness=55] - Luminosidad del color (0-100)
 * @returns {string} Color en formato HSL
 *
 * @example
 * stringToColor('John Doe'); // 'hsl(234, 65%, 55%)'
 * stringToColor('Jane Smith'); // 'hsl(156, 65%, 55%)'
 * stringToColor('Same Name'); // Siempre el mismo color
 */
export function stringToColor(str, saturation = 65, lightness = 55) {
    if (!str) return 'hsl(200, 65%, 55%)'; // Azul por defecto

    // Hash simple del string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32-bit integer
    }

    // Convertir hash a hue (0-360)
    const hue = Math.abs(hash % 360);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Crea un avatar HTML con iniciales y color de fondo
 *
 * Genera el markup completo para un avatar circular con iniciales.
 *
 * @param {string} name - Nombre o email del usuario
 * @param {Object} [options={}] - Opciones de personalización
 * @param {number} [options.size=32] - Tamaño en px
 * @param {string} [options.className='user-avatar'] - Clase CSS adicional
 * @param {boolean} [options.withTooltip=true] - Incluir title tooltip
 * @returns {string} HTML del avatar
 *
 * @example
 * createAvatar('John Doe');
 * // '<div class="user-avatar" style="..." title="John Doe">JD</div>'
 *
 * @example
 * createAvatar('user@example.com', { size: 48, className: 'large-avatar' });
 */
export function createAvatar(name, options = {}) {
    const {
        size = 32,
        className = 'user-avatar',
        withTooltip = true
    } = options;

    const initials = getInitials(name);
    const color = stringToColor(name);
    const title = withTooltip ? ` title="${escapeHtml(name || 'Sin asignar')}"` : '';

    return `<div class="${className}" style="background-color: ${color}; width: ${size}px; height: ${size}px; line-height: ${size}px; font-size: ${size * 0.4}px;"${title}>${initials}</div>`;
}

/**
 * Crea un badge de usuario completo con avatar y nombre
 *
 * Incluye avatar circular + nombre del usuario en un contenedor.
 *
 * @param {string} name - Nombre o email del usuario
 * @param {Object} [options={}] - Opciones de personalización
 * @param {number} [options.avatarSize=24] - Tamaño del avatar
 * @param {string} [options.className='user-badge'] - Clase CSS del contenedor
 * @param {boolean} [options.showName=true] - Mostrar nombre además del avatar
 * @returns {string} HTML del badge completo
 *
 * @example
 * createUserBadge('John Doe');
 * // '<div class="user-badge">
 * //    <div class="user-avatar" ...>JD</div>
 * //    <span class="user-name">John Doe</span>
 * //  </div>'
 *
 * @example
 * createUserBadge('user@example.com', { showName: false });
 * // Solo avatar sin nombre
 */
export function createUserBadge(name, options = {}) {
    const {
        avatarSize = 24,
        className = 'user-badge',
        showName = true
    } = options;

    if (!name) {
        return '<span class="text-muted">Sin asignar</span>';
    }

    const avatar = createAvatar(name, { size: avatarSize });
    const nameSpan = showName ? `<span class="user-name">${escapeHtml(name)}</span>` : '';

    return `<div class="${className}" title="${escapeHtml(name)}">${avatar}${nameSpan}</div>`;
}

/**
 * Crea un chip/badge de label con color
 *
 * @param {string} label - Texto del label
 * @param {Object} [options={}] - Opciones
 * @param {string} [options.className='label-chip'] - Clase CSS
 * @param {boolean} [options.removable=false] - Incluir botón X para remover
 * @param {Function} [options.onRemove] - Callback al remover
 * @returns {string} HTML del chip
 *
 * @example
 * createLabelChip('Architecture');
 * // '<span class="label-chip" style="...">Architecture</span>'
 */
export function createLabelChip(label, options = {}) {
    const {
        className = 'label-chip',
        removable = false
    } = options;

    const color = stringToColor(label, 70, 45);
    const removeBtn = removable ? `<button class="chip-remove" data-label="${escapeHtml(label)}">&times;</button>` : '';

    return `<span class="${className}" style="background-color: ${color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; display: inline-block; margin: 2px;">${escapeHtml(label)}${removeBtn}</span>`;
}

/**
 * Crea un badge de prioridad con color semántico
 *
 * @param {string} priority - Prioridad (Low, Normal, High, Critical)
 * @returns {string} HTML del badge
 *
 * @example
 * createPriorityBadge('High');
 * // '<span class="priority-badge priority-high">High</span>'
 */
export function createPriorityBadge(priority) {
    if (!priority) return '<span class="text-muted">-</span>';

    const priorityMap = {
        'Critical': { class: 'priority-critical', color: '#dc2626' },
        'High': { class: 'priority-high', color: '#ea580c' },
        'Normal': { class: 'priority-normal', color: '#3b82f6' },
        'Low': { class: 'priority-low', color: '#64748b' }
    };

    const config = priorityMap[priority] || priorityMap['Normal'];

    return `<span class="priority-badge ${config.class}" style="color: ${config.color}; font-weight: 600; font-size: 0.75rem;">${escapeHtml(priority)}</span>`;
}

/**
 * Crea un badge de estado con color semántico
 *
 * @param {string} status - Estado (Open, In Progress, Resolved, Closed)
 * @returns {string} HTML del badge
 *
 * @example
 * createStatusBadge('Open');
 * // '<span class="status-badge status-open">Open</span>'
 */
export function createStatusBadge(status) {
    if (!status) return '<span class="text-muted">-</span>';

    const statusMap = {
        'Open': { class: 'status-open', color: '#ef4444', bgColor: '#fef2f2' },
        'In Progress': { class: 'status-in-progress', color: '#f59e0b', bgColor: '#fffbeb' },
        'Resolved': { class: 'status-resolved', color: '#10b981', bgColor: '#f0fdf4' },
        'Closed': { class: 'status-closed', color: '#6b7280', bgColor: '#f9fafb' }
    };

    const config = statusMap[status] || statusMap['Open'];

    return `<span class="status-badge ${config.class}" style="color: ${config.color}; background-color: ${config.bgColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${escapeHtml(status)}</span>`;
}

/**
 * Escapa HTML para prevenir XSS
 *
 * NOTA: Esta función ya existe en sanitizer.js, pero se incluye aquí
 * para que ui-helpers.js sea standalone y no dependa de otros módulos.
 *
 * @param {string} str - String a escapar
 * @returns {string} String escapado
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Formatea una fecha de forma legible
 *
 * @param {string|Date} date - Fecha a formatear
 * @param {Object} [options={}] - Opciones de formato
 * @param {boolean} [options.includeTime=false] - Incluir hora
 * @param {boolean} [options.relative=false] - Formato relativo ("hace 2 días")
 * @returns {string} Fecha formateada
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z');
 * // '15/01/2024'
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z', { includeTime: true });
 * // '15/01/2024 10:30'
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z', { relative: true });
 * // 'hace 3 días'
 */
export function formatDate(date, options = {}) {
    const {
        includeTime = false,
        relative = false
    } = options;

    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    // Formato relativo
    if (relative) {
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `hace ${diffDays} días`;
        if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
        if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
        return `hace ${Math.floor(diffDays / 365)} años`;
    }

    // Formato estándar
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let result = `${day}/${month}/${year}`;

    if (includeTime) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        result += ` ${hours}:${minutes}`;
    }

    return result;
}

/**
 * Trunca un texto largo y agrega puntos suspensivos
 *
 * @param {string} text - Texto a truncar
 * @param {number} [maxLength=50] - Longitud máxima
 * @param {string} [suffix='...'] - Sufijo a agregar
 * @returns {string} Texto truncado
 *
 * @example
 * truncateText('This is a very long text that needs truncation', 20);
 * // 'This is a very long...'
 */
export function truncateText(text, maxLength = 50, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Pluraliza una palabra según la cantidad
 *
 * @param {number} count - Cantidad
 * @param {string} singular - Forma singular
 * @param {string} [plural] - Forma plural (por defecto: singular + 's')
 * @returns {string} Palabra pluralizada con número
 *
 * @example
 * pluralize(1, 'issue'); // '1 issue'
 * pluralize(5, 'issue'); // '5 issues'
 * pluralize(1, 'person', 'people'); // '1 person'
 * pluralize(3, 'person', 'people'); // '3 people'
 */
export function pluralize(count, singular, plural) {
    const word = count === 1 ? singular : (plural || singular + 's');
    return `${count} ${word}`;
}

/**
 * Genera clases CSS condicionalmente
 *
 * @param {Object} classes - Objeto con clases y condiciones
 * @returns {string} String de clases CSS
 *
 * @example
 * classNames({
 *   'btn': true,
 *   'btn-primary': isPrimary,
 *   'btn-large': size === 'large'
 * });
 * // 'btn btn-primary' (si isPrimary es true y size no es 'large')
 */
export function classNames(classes) {
    return Object.entries(classes)
        .filter(([_, condition]) => condition)
        .map(([className]) => className)
        .join(' ');
}
