/**
 * ISSUE DETAIL - Gestión del modal de detalle de incidencia y sus acciones
 */

import { AppState, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from './state.js';
import { $, $$, escapeHtml, notify } from './ui-utils.js';
import { BCFParser } from './bcf-parser.js';
import { Storage } from './storage.js';

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
            snapshotContainer.innerHTML = `
                <img src="${issue.snapshot}" alt="Snapshot" style="cursor: pointer;" 
                     id="detail-snapshot-img">
            `;
            const img = $('#detail-snapshot-img');
            if (img) {
                img.onclick = () => {
                    const snapshotImg = $('#snapshot-image');
                    const snapshotModal = $('#modal-snapshot');
                    if (snapshotImg && snapshotModal) {
                        snapshotImg.src = issue.snapshot;
                        snapshotModal.classList.add('active');
                    }
                };
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
    }
}

/**
 * Renderiza la lista de comentarios en el modal
 */
export function renderComments(issue) {
    const commentsList = $('#comments-list');
    if (!commentsList) return;

    const allComments = [
        ...(issue.bcfComments || []).map(c => ({ ...c, isLocal: false })),
        ...(issue.localComments || []).map(c => ({ ...c, isLocal: true }))
    ];

    if (allComments.length === 0) {
        commentsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Sin comentarios</p>';
        return;
    }

    commentsList.innerHTML = allComments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">
                    ${escapeHtml(comment.author)}${comment.isLocal ? ' (local)' : ''}
                </span>
                <span class="comment-date">${comment.dateFormatted || comment.date || 'Sin fecha'}</span>
            </div>
            <p class="comment-text">${escapeHtml(comment.comment || comment.text || '')}</p>
        </div>
    `).join('');
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
    await Storage.saveAll();
    
    if (typeof onUpdate === 'function') {
        onUpdate();
    }
    
    notify('Comentario añadido', 'success');
}
