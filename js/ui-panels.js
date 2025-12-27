/**
 * UI PANELS - Gestión de Spotlight, Notificaciones y Ayuda de Teclado
 */

import { AppState, STATUS_LABELS } from './state.js';
import { $, $$, escapeHtml, debounce } from './ui-utils.js';

/**
 * Inicializa el panel de Spotlight
 * @param {Function} onSelectResult Callback cuando se selecciona un resultado
 */
export function initSpotlight(onSelectResult) {
    const spotlight = $('#spotlight');
    const input = $('#spotlight-input');
    const closeBtn = spotlight.querySelector('.spotlight-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSpotlight);
    }

    input.addEventListener('input', (e) => {
        debouncedSpotlightUpdate(e.target.value, onSelectResult);
    });

    // Cerrar al hacer clic fuera
    spotlight.addEventListener('click', (e) => {
        if (e.target === spotlight) closeSpotlight();
    });
}

export function openSpotlight() {
    const spotlight = $('#spotlight');
    const input = $('#spotlight-input');
    spotlight.classList.add('active');
    input.value = '';
    input.focus();
    updateSpotlightResults('', null);
}

export function closeSpotlight() {
    $('#spotlight').classList.remove('active');
}

const debouncedSpotlightUpdate = debounce((query, onSelectResult) => {
    updateSpotlightResults(query, onSelectResult);
}, 150);

function updateSpotlightResults(query, onSelectResult) {
    const results = [];
    const q = query.toLowerCase().trim();

    // Buscar en proyectos
    AppState.projects.forEach(project => {
        if (!q || project.name.toLowerCase().includes(q)) {
            const totalIssues = project.bcfFiles.reduce((sum, bcf) => sum + bcf.topics.length, 0);
            results.push({
                type: 'project',
                id: project.id,
                title: project.name,
                meta: `${totalIssues} incidencias`
            });
        }
    });

    // Buscar en incidencias del proyecto actual
    if (AppState.currentProject) {
        AppState.currentIssues.forEach(issue => {
            if (!q || issue.title.toLowerCase().includes(q) || (issue.description && issue.description.toLowerCase().includes(q))) {
                results.push({
                    type: 'issue',
                    id: issue.guid,
                    title: issue.title,
                    meta: `${STATUS_LABELS[issue.topicStatus] || issue.topicStatus} • ${issue.creationAuthor}`
                });
            }
        });
    }

    const container = $('#spotlight-results');
    
    if (results.length === 0) {
        container.innerHTML = '<div class="spotlight-empty">No se encontraron resultados</div>';
        return;
    }

    container.innerHTML = results.slice(0, 10).map((result, index) => `
        <div class="spotlight-result ${index === 0 ? 'selected' : ''}" data-type="${result.type}" data-id="${result.id}">
            <div class="spotlight-result-icon">
                ${result.type === 'project' ? '📁' : '📋'}
            </div>
            <div class="spotlight-result-info">
                <div class="spotlight-result-title">${escapeHtml(result.title)}</div>
                <div class="spotlight-result-meta">${escapeHtml(result.meta)}</div>
            </div>
        </div>
    `).join('');

    $$('.spotlight-result').forEach(resultEl => {
        resultEl.addEventListener('click', () => {
            closeSpotlight();
            if (onSelectResult) onSelectResult(resultEl.dataset.type, resultEl.dataset.id);
        });
    });
}

export function navigateSpotlight(direction) {
    const results = $$('.spotlight-result');
    if (results.length === 0) return;

    let currentIndex = Array.from(results).findIndex(r => r.classList.contains('selected'));
    if (currentIndex !== -1) {
        results[currentIndex].classList.remove('selected');
    }

    currentIndex += direction;
    if (currentIndex < 0) currentIndex = results.length - 1;
    if (currentIndex >= results.length) currentIndex = 0;

    results[currentIndex].classList.add('selected');
    results[currentIndex].scrollIntoView({ block: 'nearest' });
}

export function selectSpotlightResult(resultEl) {
    if (!resultEl) return;
    const type = resultEl.dataset.type;
    const id = resultEl.dataset.id;
    
    closeSpotlight();
    
    // Disparar evento personalizado para que main.js lo capture
    const event = new CustomEvent('spotlightSelect', { 
        detail: { type, id } 
    });
    document.dispatchEvent(event);
}

/**
 * Inicializa el panel de notificaciones
 */
export function initNotificationsPanel() {
    const btn = $('#btn-notifications');
    const panel = $('#notifications-panel');
    
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifications-panel') && !e.target.closest('#btn-notifications')) {
            panel.classList.remove('active');
        }
    });
}

export function updateNotificationsUI() {
    const container = $('#notifications-list');
    const badge = $('#notification-badge');
    const unreadCount = AppState.notifications.filter(n => !n.read).length;

    if (badge) {
        badge.textContent = unreadCount;
        badge.classList.toggle('hidden', unreadCount === 0);
    }

    if (!container) return;

    if (AppState.notifications.length === 0) {
        container.innerHTML = '<div class="notifications-empty">No hay notificaciones</div>';
        return;
    }

    container.innerHTML = AppState.notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notification-icon">${n.type === 'alert' ? '⚠️' : 'ℹ️'}</div>
            <div class="notification-content">
                <div class="notification-text">${escapeHtml(n.message)}</div>
                <div class="notification-time">${n.time}</div>
            </div>
        </div>
    `).join('');
}

/**
 * Ayuda de teclado
 */
export function toggleKeyboardHelp() {
    $('#keyboard-help').classList.toggle('active');
}
