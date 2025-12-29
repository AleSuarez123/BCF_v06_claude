/**
 * ISSUE DETAIL - Gestión del modal de detalle de incidencia y sus acciones
 */

import { AppState, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from './state.js';
import { $, $$, escapeHtml, notify } from './ui-utils.js';
import { sanitizeURL } from './utils/sanitizer.js';
import { BCFParser } from './bcf-parser.js';
import { Storage } from './storage.js';
import { getInitials, stringToColor } from './ui/helpers.js';

/**
 * Abre el modal de detalle para una incidencia específica
 */
export function openIssueDetail(guid, onUpdate) {
    const issue = AppState.currentIssues.find(i => i.guid === guid);
    if (!issue) return;

    AppState.currentIssueId = guid;
    AppState.focusedIndex = AppState.filteredIssues.findIndex(i => i.guid === guid);

    // Actualizar elementos del modal
    const modalTitle = $('#modal-issue-title');
    if (modalTitle) modalTitle.textContent = issue.title;
    
    const statusBadge = $('#issue-status-badge');
    if (statusBadge) {
        statusBadge.className = `badge badge-status-${STATUS_COLORS[issue.topicStatus] || 'open'}`;
        statusBadge.textContent = STATUS_LABELS[issue.topicStatus] || issue.topicStatus;
    }
    
    const priorityBadge = $('#issue-priority-badge');
    if (priorityBadge) {
        priorityBadge.className = `badge badge-priority-${PRIORITY_COLORS[issue.priority] || 'medium'}`;
        priorityBadge.textContent = PRIORITY_LABELS[issue.priority] || issue.priority;
    }
    
    const typeBadge = $('#issue-type-badge');
    if (typeBadge) typeBadge.textContent = issue.topicType;
    
    const description = $('#issue-description');
    if (description) description.textContent = issue.description || 'Sin descripción';
    
    const author = $('#issue-author');
    if (author) author.textContent = issue.creationAuthor || '-';
    
    const assigned = $('#issue-assigned');
    if (assigned) assigned.textContent = issue.assignedTo || 'Sin asignar';
    
    const created = $('#issue-created');
    if (created) created.textContent = issue.creationDateFormatted || '-';
    
    const modified = $('#issue-modified');
    if (modified) modified.textContent = issue.modifiedDateFormatted || '-';
    
    const bcfFile = $('#issue-bcf-file');
    if (bcfFile) bcfFile.textContent = issue.bcfFile || '-';
    
    const guidEl = $('#issue-guid');
    if (guidEl) guidEl.textContent = issue.guid;

    // Etiquetas
    const labelsContainer = $('#issue-labels');
    if (labelsContainer) {
        if (issue.labels && issue.labels.length > 0) {
            labelsContainer.innerHTML = issue.labels
                .map(label => `<span class="issue-label">${escapeHtml(label)}</span>`)
                .join('');
        } else {
            labelsContainer.innerHTML = '-';
        }
    }

    // Snapshot
    const snapshotContainer = $('#issue-snapshot');
    if (snapshotContainer) {
        if (issue.snapshot) {
            // Sanitizar URL para prevenir XSS
            const sanitizedUrl = sanitizeURL(issue.snapshot);

            if (sanitizedUrl) {
                snapshotContainer.innerHTML = `
                    <img src="${sanitizedUrl}" alt="Snapshot" style="cursor: pointer;"
                         id="detail-snapshot-img">
                `;
                const img = $('#detail-snapshot-img');
                if (img) {
                    img.onclick = () => {
                        const snapshotImg = $('#snapshot-image');
                        const snapshotModal = $('#modal-snapshot');
                        if (snapshotImg && snapshotModal) {
                            snapshotImg.src = sanitizedUrl;
                            snapshotModal.classList.add('active');
                        }
                    };
                }
            } else {
                // URL peligrosa bloqueada
                snapshotContainer.innerHTML = `
                    <div class="no-snapshot">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                        </svg>
                        <span>URL inválida</span>
                    </div>
                `;
            }
        } else {
            snapshotContainer.innerHTML = `
                <div class="no-snapshot">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                    <span>Sin imagen</span>
                </div>
            `;
        }
    }

    // Estado actual en selector
    const changeStatusSelect = $('#change-status');
    if (changeStatusSelect) changeStatusSelect.value = issue.topicStatus;

    // Renderizar comentarios
    renderComments(issue);

    // Abrir modal
    const modalIssue = $('#modal-issue');
    if (modalIssue) {
        modalIssue.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Inicializar panel de comentarios
        setTimeout(() => {
            initCommentsPanel();
        }, 100);
    }
}

/**
 * Renderiza la lista de comentarios en el modal
 */
export function renderComments(issue) {
    const commentsList = $('#comments-list');
    const commentsCount = $('#comments-count');

    if (!commentsList) return;

    const allComments = [
        ...(issue.bcfComments || []).map(c => ({ ...c, isLocal: false })),
        ...(issue.localComments || []).map(c => ({ ...c, isLocal: true }))
    ];

    // Actualizar contador
    if (commentsCount) {
        commentsCount.textContent = allComments.length;
    }

    if (allComments.length === 0) {
        commentsList.innerHTML = '';
        return;
    }

    commentsList.innerHTML = allComments.map(comment => {
        const author = comment.author || 'Anónimo';
        const initials = getInitials(author);
        const badgeClass = comment.isLocal ? 'local' : 'remote';
        const badgeText = comment.isLocal ? 'Local' : 'BCF';

        return `
            <div class="comment-item">
                <div class="comment-avatar">
                    ${initials}
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(author)}</span>
                        <span class="comment-badge ${badgeClass}">${badgeText}</span>
                        <span class="comment-date">${comment.dateFormatted || comment.date || 'Ahora'}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(comment.comment || comment.text || '')}</p>
                    <div class="comment-actions-hover">
                        <button class="comment-action-btn" title="Responder">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 17 4 12 9 7"></polyline>
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                            </svg>
                            <span>Responder</span>
                        </button>
                        ${comment.isLocal ? `
                        <button class="comment-action-btn" title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Editar</span>
                        </button>
                        <button class="comment-action-btn" title="Eliminar" style="color: var(--color-danger, #ef4444);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Eliminar</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    setTimeout(() => {
        commentsList.scrollTop = commentsList.scrollHeight;
    }, 100);
}

/**
 * Guarda el cambio de estado de la incidencia actual
 */
export async function saveIssueStatus(onUpdate) {
    if (!AppState.currentIssueId) return;

    const changeStatusSelect = $('#change-status');
    if (!changeStatusSelect) return;
    
    const newStatus = changeStatusSelect.value;

    if (!AppState.localChanges[AppState.currentIssueId]) {
        AppState.localChanges[AppState.currentIssueId] = {};
    }
    AppState.localChanges[AppState.currentIssueId].status = newStatus;

    const issue = AppState.currentIssues.find(i => i.guid === AppState.currentIssueId);
    if (issue) {
        issue.topicStatus = newStatus;
    }

    await Storage.saveAll();
    
    if (typeof onUpdate === 'function') {
        onUpdate();
    }

    const statusBadge = $('#issue-status-badge');
    if (statusBadge) {
        statusBadge.className = `badge badge-status-${STATUS_COLORS[newStatus] || 'open'}`;
        statusBadge.textContent = STATUS_LABELS[newStatus] || newStatus;
    }

    notify('Estado actualizado', 'success');
}

/**
 * Añade un comentario local a la incidencia actual
 */
export async function addLocalComment(onUpdate) {
    if (!AppState.currentIssueId) return;

    const newCommentInput = $('#new-comment');
    if (!newCommentInput) return;
    
    const text = newCommentInput.value.trim();
    if (!text) {
        notify('Escribe un comentario', 'warning');
        return;
    }

    const comment = {
        text,
        author: 'Usuario',
        date: new Date().toISOString(),
        dateFormatted: BCFParser.formatDate(new Date().toISOString())
    };

    if (!AppState.localChanges[AppState.currentIssueId]) {
        AppState.localChanges[AppState.currentIssueId] = {};
    }
    if (!AppState.localChanges[AppState.currentIssueId].comments) {
        AppState.localChanges[AppState.currentIssueId].comments = [];
    }
    AppState.localChanges[AppState.currentIssueId].comments.push(comment);

    const issue = AppState.currentIssues.find(i => i.guid === AppState.currentIssueId);
    if (issue) {
        if (!issue.localComments) issue.localComments = [];
        issue.localComments.push(comment);
        renderComments(issue);
    }

    newCommentInput.value = '';

    // Resetear contador
    const charCounter = $('#char-counter');
    if (charCounter) charCounter.textContent = '0';

    await Storage.saveAll();

    if (typeof onUpdate === 'function') {
        onUpdate();
    }

    notify('Comentario añadido', 'success');
}

/**
 * Inicializa los eventos del panel de comentarios
 */
export function initCommentsPanel() {
    const newCommentInput = $('#new-comment');
    const charCounter = $('#char-counter');

    if (!newCommentInput) return;

    // Contador de caracteres
    if (charCounter) {
        newCommentInput.addEventListener('input', () => {
            const length = newCommentInput.value.length;
            charCounter.textContent = length;

            // Cambiar color si supera cierto límite
            if (length > 500) {
                charCounter.style.color = 'var(--color-danger, #ef4444)';
            } else if (length > 300) {
                charCounter.style.color = 'var(--color-warning, #f59e0b)';
            } else {
                charCounter.style.color = 'var(--text-muted)';
            }
        });
    }

    // Auto-expand textarea
    newCommentInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    // Reset height when empty
    newCommentInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            this.style.height = '42px';
        }
    });
}
