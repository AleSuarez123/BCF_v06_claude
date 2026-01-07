/**
 * AUTH INITIALIZATION - Integración del sistema de autenticación con la aplicación
 * Este archivo debe cargarse al inicio de la aplicación
 */

import { AuthMgr } from './auth-manager.js';
import { NotificationCenter } from './notification-center.js';
import { LogoManager } from './logo-manager.js';

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

    // Actualizar logos según el dominio del usuario
    LogoManager.updateAllLogos(user.email);

    // Inicializar centro de notificaciones
    if (!window.notificationCenter) {
        window.notificationCenter = new NotificationCenter().initialize();
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
            ${AuthMgr.isAdmin() ? `
                <button class="user-menu-item" onclick="window.authHelpers.goToAdmin()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Panel de Admin
                </button>
            ` : ''}
            <button class="user-menu-item" onclick="window.authHelpers.showSupport()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Soporte
            </button>
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

    // Buscar el lugar adecuado para insertar el widget de usuario (header-actions)
    const headerActions = header.querySelector('.header-actions');
    if (headerActions) {
        // Insertar widget de usuario al final
        headerActions.appendChild(widget);
    } else {
        // Fallback: buscar nav o añadir directamente al header
        const nav = header.querySelector('nav, .header-nav, .nav');
        if (nav) {
            nav.appendChild(widget);
        } else {
            header.appendChild(widget);
        }
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
        goToAdmin: () => {
            window.location.href = '/admin.html';
        },
        showSupport: () => {
            createSupportModal();
        }
    };

    // Crear modal de soporte
    function createSupportModal() {
        // Verificar si ya existe el modal
        let modal = document.getElementById('support-modal');
        if (modal) {
            modal.classList.add('active');
            return;
        }

        // Crear modal
        modal = document.createElement('div');
        modal.id = 'support-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Soporte Técnico</h3>
                    <button class="modal-close" onclick="closeSupportModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #718096;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <form id="support-form" onsubmit="submitSupportForm(event)">
                        <div class="form-group">
                            <label class="form-label">Tipo de incidencia *</label>
                            <select id="support-category" class="form-input support-select" required style="
                                width: 100%;
                                padding: 12px 16px;
                                border: 2px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 14px;
                                font-family: 'DM Sans', sans-serif;
                                background: white;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                appearance: none;
                                background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23718096%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e');
                                background-repeat: no-repeat;
                                background-position: right 12px center;
                                background-size: 16px;
                                padding-right: 40px;
                            ">
                                <option value="" disabled selected>Selecciona una categoría...</option>
                                <option value="error">🐛 Error / Bug</option>
                                <option value="feature">✨ Solicitud de funcionalidad</option>
                                <option value="performance">⚡ Problema de rendimiento</option>
                                <option value="ui">🎨 Problema de interfaz</option>
                                <option value="data">📊 Problema con datos</option>
                                <option value="other">💬 Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Descripción del problema *</label>
                            <textarea id="support-description" class="form-input" rows="6" placeholder="Describe detalladamente el problema que estás experimentando..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Captura de pantalla (opcional)</label>
                            <input type="file" id="support-screenshot" class="form-input" accept="image/*">
                            <small style="color: #718096; font-size: 12px; display: block; margin-top: 4px;">Formatos permitidos: PNG, JPG, GIF (máx. 5MB)</small>
                        </div>
                        <div style="background: #f7fafc; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                            <small style="color: #4a5568; font-size: 12px;">
                                <strong>Información del sistema:</strong><br>
                                Navegador: <span id="browser-info"></span><br>
                                Sistema operativo: <span id="os-info"></span><br>
                                URL actual: <span id="url-info"></span>
                            </small>
                        </div>
                        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                            <button type="button" class="btn btn-secondary" onclick="closeSupportModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Enviar Reporte</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Rellenar información del sistema
        document.getElementById('browser-info').textContent = getBrowserInfo();
        document.getElementById('os-info').textContent = getOSInfo();
        document.getElementById('url-info').textContent = window.location.href;

        // Añadir estilos hover/focus al selector
        const selectElement = document.getElementById('support-category');
        selectElement.addEventListener('focus', function() {
            this.style.borderColor = '#667eea';
            this.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        });
        selectElement.addEventListener('blur', function() {
            this.style.borderColor = '#e2e8f0';
            this.style.boxShadow = 'none';
        });
        selectElement.addEventListener('mouseover', function() {
            if (document.activeElement !== this) {
                this.style.borderColor = '#cbd5e0';
            }
        });
        selectElement.addEventListener('mouseout', function() {
            if (document.activeElement !== this) {
                this.style.borderColor = '#e2e8f0';
            }
        });

        // Mostrar modal
        setTimeout(() => modal.classList.add('active'), 10);

        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                closeSupportModal();
            }
        });
    }

    // Función global para cerrar modal de soporte
    window.closeSupportModal = function() {
        const modal = document.getElementById('support-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    // Función global para enviar formulario de soporte
    window.submitSupportForm = async function(event) {
        event.preventDefault();

        const user = AuthMgr.getCurrentUser();
        const category = document.getElementById('support-category').value;
        const description = document.getElementById('support-description').value;
        const screenshot = document.getElementById('support-screenshot').files[0];

        // Preparar datos del reporte
        const reportData = {
            usuario: {
                nombre: user.name,
                email: user.email,
                rol: user.role
            },
            incidencia: {
                categoria: category,
                descripcion: description
            },
            sistema: {
                navegador: getBrowserInfo(),
                sistemaOperativo: getOSInfo(),
                url: window.location.href,
                fecha: new Date().toLocaleString('es-ES'),
                userAgent: navigator.userAgent
            }
        };

        // Simular envío de email
        console.log('📧 EMAIL DE SOPORTE ENVIADO A: asuarez@gocsa.es');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('REPORTE DE SOPORTE - BCF Viewer Pro');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('INFORMACIÓN DEL USUARIO:');
        console.log(`  Nombre: ${reportData.usuario.nombre}`);
        console.log(`  Email: ${reportData.usuario.email}`);
        console.log(`  Rol: ${reportData.usuario.rol}`);
        console.log('');
        console.log('DETALLES DE LA INCIDENCIA:');
        console.log(`  Categoría: ${getCategoryLabel(category)}`);
        console.log(`  Descripción: ${description}`);
        console.log('');
        console.log('INFORMACIÓN DEL SISTEMA:');
        console.log(`  Navegador: ${reportData.sistema.navegador}`);
        console.log(`  Sistema Operativo: ${reportData.sistema.sistemaOperativo}`);
        console.log(`  URL: ${reportData.sistema.url}`);
        console.log(`  Fecha y Hora: ${reportData.sistema.fecha}`);
        console.log(`  User Agent: ${reportData.sistema.userAgent}`);
        console.log('');
        if (screenshot) {
            console.log(`  Captura adjunta: ${screenshot.name} (${(screenshot.size / 1024).toFixed(2)} KB)`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Mostrar confirmación
        alert('✅ Reporte de soporte enviado correctamente.\n\nNos pondremos en contacto contigo lo antes posible.');

        // Cerrar modal
        closeSupportModal();
    };

    // Helpers para detectar navegador y SO
    function getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Firefox') > -1) return 'Mozilla Firefox';
        if (ua.indexOf('Chrome') > -1) return 'Google Chrome';
        if (ua.indexOf('Safari') > -1) return 'Safari';
        if (ua.indexOf('Edge') > -1) return 'Microsoft Edge';
        if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
        return 'Desconocido';
    }

    function getOSInfo() {
        const ua = navigator.userAgent;
        if (ua.indexOf('Win') > -1) return 'Windows';
        if (ua.indexOf('Mac') > -1) return 'macOS';
        if (ua.indexOf('Linux') > -1) return 'Linux';
        if (ua.indexOf('Android') > -1) return 'Android';
        if (ua.indexOf('iOS') > -1) return 'iOS';
        return 'Desconocido';
    }

    function getCategoryLabel(category) {
        const labels = {
            'error': 'Error / Bug',
            'feature': 'Solicitud de funcionalidad',
            'performance': 'Problema de rendimiento',
            'ui': 'Problema de interfaz',
            'data': 'Problema con datos',
            'other': 'Otro'
        };
        return labels[category] || category;
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
