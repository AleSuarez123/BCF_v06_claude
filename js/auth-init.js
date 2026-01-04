/**
 * AUTH INITIALIZATION - Integración del sistema de autenticación con la aplicación
 * Este archivo debe cargarse al inicio de la aplicación
 */

import { AuthMgr } from './auth-manager.js';
import { NotificationCenter } from './notification-center.js';

/**
 * Verificar autenticación y redirigir si es necesario
 */
export function initializeAuth() {
    // Verificar si estamos en la página de login o admin
    const currentPage = window.location.pathname;
    const isLoginPage = currentPage.includes('login.html');
    const isAdminPage = currentPage.includes('admin.html');

    // Si estamos en login.html, no hacer nada (ya se maneja ahí)
    if (isLoginPage) {
        return;
    }

    // Si NO está autenticado, redirigir a login
    if (!AuthMgr.isAuthenticated()) {
        // Guardar URL actual para volver después del login
        sessionStorage.setItem('bcf_return_url', window.location.href);
        window.location.href = '/login.html';
        return;
    }

    // Si está autenticado, inicializar componentes
    const user = AuthMgr.getCurrentUser();

    // Añadir información del usuario al header
    addUserInfoToHeader(user);

    // Inicializar centro de notificaciones
    if (!window.notificationCenter) {
        window.notificationCenter = new NotificationCenter().initialize();
    }

    // Si es administrador, añadir botón de admin
    if (AuthMgr.isAdmin() && !isAdminPage) {
        addAdminButton();
    }

    console.log(`✅ Usuario autenticado: ${user.name} (${user.email})`);
}

/**
 * Añadir información del usuario al header
 */
function addUserInfoToHeader(user) {
    const header = document.querySelector('.header, header, .app-header');
    if (!header) return;

    // Verificar si ya existe
    if (document.getElementById('user-info-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'user-info-widget';
    widget.className = 'user-info-widget';
    widget.innerHTML = `
        <div class="user-avatar-sm" title="${escapeHtml(user.name)}">${getInitials(user.name)}</div>
        <div class="user-menu" id="user-menu">
            <div class="user-menu-header">
                <div class="user-avatar-lg">${getInitials(user.name)}</div>
                <div>
                    <div class="user-menu-name">${escapeHtml(user.name)}</div>
                    <div class="user-menu-email">${escapeHtml(user.email)}</div>
                </div>
            </div>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item" onclick="window.authHelpers.viewProfile()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Mi Perfil
            </button>
            ${AuthMgr.isAdmin() ? `
                <button class="user-menu-item" onclick="window.authHelpers.goToAdmin()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v6m0 4v10m-7-7h14m-7-7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5z"/>
                    </svg>
                    Panel de Admin
                </button>
            ` : ''}
            <div class="user-menu-divider"></div>
            <button class="user-menu-item text-danger" onclick="window.authHelpers.logout()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Cerrar Sesión
            </button>
        </div>
    `;

    // Buscar el lugar adecuado para insertar
    const nav = header.querySelector('nav, .header-nav, .nav');
    if (nav) {
        nav.appendChild(widget);
    } else {
        header.appendChild(widget);
    }

    // Toggle menu
    const avatar = widget.querySelector('.user-avatar-sm');
    const menu = widget.querySelector('.user-menu');

    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!widget.contains(e.target)) {
            menu.classList.remove('show');
        }
    });

    // Añadir estilos
    addUserWidgetStyles();

    // Añadir helpers globales
    window.authHelpers = {
        logout: () => {
            if (confirm('¿Cerrar sesión?')) {
                AuthMgr.logout();
                window.location.href = '/login.html';
            }
        },
        viewProfile: () => {
            alert('Función de perfil en desarrollo');
        },
        goToAdmin: () => {
            window.location.href = '/admin.html';
        }
    };
}

/**
 * Añadir botón de administración
 */
function addAdminButton() {
    const header = document.querySelector('.header, header, .app-header');
    if (!header) return;

    if (document.getElementById('admin-quick-btn')) return;

    const btn = document.createElement('a');
    btn.id = 'admin-quick-btn';
    btn.href = '/admin.html';
    btn.className = 'btn btn-sm btn-admin';
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v10m-7-7h14"/>
        </svg>
        Admin
    `;

    const nav = header.querySelector('nav, .header-nav, .nav');
    if (nav) {
        nav.insertBefore(btn, nav.firstChild);
    } else {
        header.appendChild(btn);
    }
}

/**
 * Añadir estilos del widget de usuario
 */
function addUserWidgetStyles() {
    if (document.getElementById('user-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'user-widget-styles';
    style.textContent = `
        .user-info-widget {
            position: relative;
        }

        .user-avatar-sm {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .user-avatar-sm:hover {
            transform: scale(1.05);
        }

        .user-avatar-lg {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
        }

        .user-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            min-width: 240px;
            display: none;
            flex-direction: column;
            z-index: 1000;
        }

        .user-menu.show {
            display: flex;
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .user-menu-header {
            padding: 16px;
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .user-menu-name {
            font-weight: 600;
            font-size: 14px;
            color: #1a202c;
        }

        .user-menu-email {
            font-size: 12px;
            color: #718096;
        }

        .user-menu-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 4px 0;
        }

        .user-menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: none;
            border: none;
            text-align: left;
            cursor: pointer;
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            color: #2d3748;
            transition: background 0.2s;
            width: 100%;
        }

        .user-menu-item:hover {
            background: #f7fafc;
        }

        .user-menu-item.text-danger {
            color: #e53e3e;
        }

        .btn-admin {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .btn-admin:hover {
            opacity: 0.9;
        }
    `;

    document.head.appendChild(style);
}

/**
 * Utilidades
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}
