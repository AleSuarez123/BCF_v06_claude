/**
 * AUTH MANAGER - Core de autenticación y validación
 */

import { UserDB } from './user-db.js';
import { SessionDB } from './session-db.js';
import { AccessRequestDB } from './access-request-db.js';
import { NotificationDB } from './notification-db.js';

const CURRENT_USER_KEY = 'bcf_current_user';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
    }

    /**
     * Inicializar AuthManager
     */
    async initialize() {
        // Cargar usuario actual si existe sesión
        const userData = localStorage.getItem(CURRENT_USER_KEY);
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }

        this.initialized = true;
        return this.currentUser;
    }

    /**
     * Verificar si usuario está autenticado
     */
    isAuthenticated() {
        return this.currentUser !== null && SessionDB.getCurrentSession() !== null;
    }

    /**
     * Obtener usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Validar email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Extraer dominio de email
     */
    extractDomain(email) {
        return email.split('@')[1]?.toLowerCase();
    }

    /**
     * Verificar si el dominio está permitido
     */
    isDomainAllowed(email) {
        const domain = this.extractDomain(email);
        return UserDB.isDomainAllowed(domain);
    }

    /**
     * Intentar login
     * Retorna: { success: boolean, user?: object, message: string, action: 'login' | 'request_created' | 'error' }
     */
    async login(name, email) {
        try {
            // Validar inputs
            if (!name || name.trim().length === 0) {
                return {
                    success: false,
                    message: 'El nombre es requerido',
                    action: 'error'
                };
            }

            if (!this.validateEmail(email)) {
                return {
                    success: false,
                    message: 'Email inválido',
                    action: 'error'
                };
            }

            email = email.toLowerCase().trim();
            name = name.trim();

            // Verificar si el usuario ya existe
            let user = UserDB.getUserByEmail(email);

            if (user) {
                // Usuario existe - verificar estado
                if (user.status === 'blocked') {
                    return {
                        success: false,
                        message: 'Tu cuenta ha sido bloqueada. Contacta al administrador.',
                        action: 'error'
                    };
                }

                // Login exitoso - registrar login
                user = UserDB.recordLogin(email);
                const session = SessionDB.createSession(user);

                this.currentUser = user;
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

                // Crear notificación de bienvenida
                NotificationDB.createNotification({
                    userId: user.id,
                    type: 'system',
                    title: '¡Bienvenido de nuevo!',
                    message: `Has iniciado sesión correctamente.`
                });

                return {
                    success: true,
                    user,
                    message: `Bienvenido de nuevo, ${user.name}`,
                    action: 'login'
                };
            }

            // Usuario no existe - verificar dominio
            const domain = this.extractDomain(email);

            if (this.isDomainAllowed(email)) {
                // Dominio permitido - crear usuario automáticamente
                user = UserDB.createUser({ name, email, role: 'user' });
                const session = SessionDB.createSession(user);

                this.currentUser = user;
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

                // Crear notificación de bienvenida
                NotificationDB.createNotification({
                    userId: user.id,
                    type: 'system',
                    title: '¡Cuenta creada!',
                    message: `Bienvenido a BCF Viewer, ${user.name}. Tu cuenta ha sido creada exitosamente.`
                });

                return {
                    success: true,
                    user,
                    message: `¡Bienvenido, ${user.name}! Tu cuenta ha sido creada.`,
                    action: 'login'
                };
            }

            // Dominio NO permitido - crear solicitud de acceso
            try {
                const request = AccessRequestDB.createRequest({ name, email });

                // Enviar email al administrador (simulado)
                await this.sendAccessRequestEmail(request);

                return {
                    success: false,
                    message: `Tu dominio @${domain} requiere aprobación. Hemos enviado una solicitud al administrador. Te notificaremos cuando sea aprobada.`,
                    action: 'request_created'
                };
            } catch (error) {
                // Ya existe una solicitud pendiente
                if (error.message.includes('solicitud pendiente')) {
                    return {
                        success: false,
                        message: 'Ya tienes una solicitud de acceso pendiente. El administrador la revisará pronto.',
                        action: 'error'
                    };
                }
                throw error;
            }

        } catch (error) {
            console.error('Error en login:', error);
            return {
                success: false,
                message: 'Error inesperado. Por favor, inténtalo de nuevo.',
                action: 'error'
            };
        }
    }

    /**
     * Cerrar sesión
     */
    logout() {
        SessionDB.endSession();
        this.currentUser = null;
        localStorage.removeItem(CURRENT_USER_KEY);

        return true;
    }

    /**
     * Verificar si el usuario es administrador
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    /**
     * Enviar email al administrador (simulado)
     * En producción, esto haría una llamada a un endpoint backend
     */
    async sendAccessRequestEmail(request) {
        console.log('📧 EMAIL ENVIADO AL ADMINISTRADOR:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Para: asuarez@gocsa.es`);
        console.log(`Asunto: Nueva solicitud de acceso - BCF Viewer`);
        console.log('');
        console.log('Se ha recibido una nueva solicitud de acceso:');
        console.log('');
        console.log(`Nombre: ${request.name}`);
        console.log(`Email: ${request.email}`);
        console.log(`Dominio: ${request.domain}`);
        console.log(`Fecha: ${new Date(request.requestDate).toLocaleString('es-ES')}`);
        console.log('');
        console.log('Accede al panel de administración para aprobar o denegar esta solicitud.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Crear notificación para el administrador
        const admin = UserDB.getUserByEmail('asuarez@gocsa.es');
        if (admin) {
            NotificationDB.createNotification({
                userId: admin.id,
                type: 'warning',
                title: 'Nueva solicitud de acceso',
                message: `${request.name} (${request.email}) ha solicitado acceso.`,
                link: '/admin.html',
                data: { requestId: request.id }
            });
        }

        // Simular delay de envío
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    /**
     * Enviar notificación de aprobación (simulado)
     */
    async sendApprovalEmail(request) {
        console.log('📧 EMAIL ENVIADO AL USUARIO:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Para: ${request.email}`);
        console.log(`Asunto: Acceso aprobado - BCF Viewer`);
        console.log('');
        console.log(`Hola ${request.name},`);
        console.log('');
        console.log('Tu solicitud de acceso ha sido aprobada.');
        console.log('Ya puedes acceder a BCF Viewer con tu email.');
        console.log('');
        console.log('Saludos,');
        console.log('El equipo de BCF Viewer');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return new Promise(resolve => setTimeout(resolve, 500));
    }

    /**
     * Recargar usuario actual desde la base de datos
     */
    refreshCurrentUser() {
        if (!this.currentUser) return null;

        const user = UserDB.getUserById(this.currentUser.id);
        if (user) {
            this.currentUser = user;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        }

        return user;
    }
}

// Exportar instancia única
export const AuthMgr = new AuthManager();

// Inicializar automáticamente
AuthMgr.initialize();
