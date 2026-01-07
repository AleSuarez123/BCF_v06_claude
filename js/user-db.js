/**
 * USER DATABASE - Gestión de usuarios con localStorage
 * Sistema escalable preparado para migrar a backend
 */

const USER_DB_KEY = 'bcf_users';
const ALLOWED_DOMAINS_KEY = 'bcf_allowed_domains';
const ADMIN_EMAIL = 'asuarez@gocsa.es';

// Dominios permitidos por defecto
const DEFAULT_ALLOWED_DOMAINS = ['gocsa.es', 'proyeco.es'];

/**
 * Estructura de usuario:
 * {
 *   id: string (UUID),
 *   name: string,
 *   email: string,
 *   domain: string,
 *   status: 'active' | 'blocked',
 *   role: 'user' | 'admin',
 *   createdAt: timestamp,
 *   lastLogin: timestamp,
 *   loginCount: number
 * }
 */

class UserDatabase {
    constructor() {
        this.initializeDB();
    }

    /**
     * Inicializar base de datos
     */
    initializeDB() {
        if (!localStorage.getItem(USER_DB_KEY)) {
            localStorage.setItem(USER_DB_KEY, JSON.stringify([]));
        }

        if (!localStorage.getItem(ALLOWED_DOMAINS_KEY)) {
            localStorage.setItem(ALLOWED_DOMAINS_KEY, JSON.stringify(DEFAULT_ALLOWED_DOMAINS));
        }

        // Crear usuario administrador si no existe
        const admin = this.getUserByEmail(ADMIN_EMAIL);
        if (!admin) {
            this.createUser({
                name: 'Alejandro Suárez',
                email: ADMIN_EMAIL,
                role: 'admin'
            });
        }
    }

    /**
     * Generar UUID simple
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Obtener todos los usuarios
     */
    getAllUsers() {
        const data = localStorage.getItem(USER_DB_KEY);
        return JSON.parse(data) || [];
    }

    /**
     * Guardar usuarios
     */
    saveUsers(users) {
        localStorage.setItem(USER_DB_KEY, JSON.stringify(users));
    }

    /**
     * Obtener usuario por email
     */
    getUserByEmail(email) {
        const users = this.getAllUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    /**
     * Obtener usuario por ID
     */
    getUserById(id) {
        const users = this.getAllUsers();
        return users.find(u => u.id === id);
    }

    /**
     * Crear nuevo usuario
     */
    createUser({ name, email, role = 'user' }) {
        const users = this.getAllUsers();

        // Verificar si ya existe
        if (this.getUserByEmail(email)) {
            throw new Error('El usuario ya existe');
        }

        const domain = email.split('@')[1];
        const now = Date.now();

        const newUser = {
            id: this.generateUUID(),
            name,
            email: email.toLowerCase(),
            domain,
            status: 'active',
            role,
            createdAt: now,
            lastLogin: now,
            loginCount: 1
        };

        users.push(newUser);
        this.saveUsers(users);

        return newUser;
    }

    /**
     * Actualizar usuario
     */
    updateUser(id, updates) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === id);

        if (index === -1) {
            throw new Error('Usuario no encontrado');
        }

        users[index] = { ...users[index], ...updates };
        this.saveUsers(users);

        return users[index];
    }

    /**
     * Registrar login
     */
    recordLogin(email) {
        const user = this.getUserByEmail(email);

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (user.status === 'blocked') {
            throw new Error('Usuario bloqueado');
        }

        return this.updateUser(user.id, {
            lastLogin: Date.now(),
            loginCount: (user.loginCount || 0) + 1
        });
    }

    /**
     * Bloquear usuario
     */
    blockUser(id) {
        return this.updateUser(id, { status: 'blocked' });
    }

    /**
     * Desbloquear usuario
     */
    unblockUser(id) {
        return this.updateUser(id, { status: 'active' });
    }

    /**
     * Eliminar usuario
     */
    deleteUser(id) {
        const users = this.getAllUsers();
        const filtered = users.filter(u => u.id !== id);
        this.saveUsers(filtered);
    }

    /**
     * Obtener dominios permitidos
     */
    getAllowedDomains() {
        const data = localStorage.getItem(ALLOWED_DOMAINS_KEY);
        return JSON.parse(data) || DEFAULT_ALLOWED_DOMAINS;
    }

    /**
     * Añadir dominio permitido
     */
    addAllowedDomain(domain) {
        const domains = this.getAllowedDomains();
        if (!domains.includes(domain.toLowerCase())) {
            domains.push(domain.toLowerCase());
            localStorage.setItem(ALLOWED_DOMAINS_KEY, JSON.stringify(domains));
        }
    }

    /**
     * Eliminar dominio permitido
     */
    removeAllowedDomain(domain) {
        const domains = this.getAllowedDomains();
        const filtered = domains.filter(d => d !== domain.toLowerCase());
        localStorage.setItem(ALLOWED_DOMAINS_KEY, JSON.stringify(filtered));
    }

    /**
     * Verificar si dominio está permitido
     */
    isDomainAllowed(domain) {
        const domains = this.getAllowedDomains();
        return domains.includes(domain.toLowerCase());
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        const users = this.getAllUsers();
        return {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === 'active').length,
            blockedUsers: users.filter(u => u.status === 'blocked').length,
            admins: users.filter(u => u.role === 'admin').length,
            totalLogins: users.reduce((sum, u) => sum + (u.loginCount || 0), 0)
        };
    }
}

// Exportar instancia única
export const UserDB = new UserDatabase();
