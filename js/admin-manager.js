/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADMIN-MANAGER.JS - Módulo de gestión de administración (FUTURO)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Versión: 3.1.0
 * Última actualización: 2024-12-22
 * 
 * Este módulo proporciona funcionalidades de administración para BCF Viewer Pro.
 * Incluye gestión de usuarios, permisos, auditoría y configuración avanzada.
 * 
 * NOTA: Módulo preparado para activación futura. Requiere backend para
 * funcionalidad completa.
 * 
 * FUNCIONALIDADES PLANEADAS:
 * - Sistema de roles y permisos
 * - Gestión de usuarios
 * - Registro de auditoría
 * - Configuración de proyecto
 * - Estadísticas y reportes
 * - Backup y restore
 */

import { CONFIG, logger } from './config.js';
import { AppState } from './state.js';
import { notify } from './ui-utils.js';
import { Storage } from './storage.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEFINICIONES DE ROLES Y PERMISOS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Roles disponibles en el sistema
 */
export const UserRoles = {
    ADMIN: 'admin',           // Acceso total
    MANAGER: 'manager',       // Gestión de proyectos y usuarios
    COORDINATOR: 'coordinator', // Gestión de issues
    EDITOR: 'editor',         // Edición de issues
    VIEWER: 'viewer'          // Solo lectura
};

/**
 * Permisos por rol
 */
export const RolePermissions = {
    [UserRoles.ADMIN]: [
        'projects.create',
        'projects.edit',
        'projects.delete',
        'projects.view',
        'issues.create',
        'issues.edit',
        'issues.delete',
        'issues.view',
        'issues.assign',
        'issues.close',
        'users.manage',
        'users.view',
        'settings.edit',
        'settings.view',
        'export.all',
        'audit.view'
    ],
    [UserRoles.MANAGER]: [
        'projects.create',
        'projects.edit',
        'projects.view',
        'issues.create',
        'issues.edit',
        'issues.view',
        'issues.assign',
        'issues.close',
        'users.view',
        'settings.view',
        'export.all'
    ],
    [UserRoles.COORDINATOR]: [
        'projects.view',
        'issues.create',
        'issues.edit',
        'issues.view',
        'issues.assign',
        'export.own'
    ],
    [UserRoles.EDITOR]: [
        'projects.view',
        'issues.edit',
        'issues.view',
        'export.own'
    ],
    [UserRoles.VIEWER]: [
        'projects.view',
        'issues.view'
    ]
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLASE ADMINISTRADOR
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class AdminManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.auditLog = [];
        this.isEnabled = CONFIG.FEATURES?.ENABLE_ADMIN_PANEL || false;
        
        // Cargar desde storage
        this.loadAdminData();
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * GESTIÓN DE USUARIOS
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Establece el usuario actual
     */
    setCurrentUser(user) {
        if (!user || !user.email || !user.role) {
            logger.error('Usuario inválido');
            return false;
        }
        
        this.currentUser = {
            id: user.id || crypto.randomUUID(),
            email: user.email,
            name: user.name || user.email,
            role: user.role,
            permissions: RolePermissions[user.role] || RolePermissions[UserRoles.VIEWER],
            createdAt: user.createdAt || new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        this.logAction('user.login', { userId: this.currentUser.id });
        logger.info('Usuario establecido:', this.currentUser.email);
        
        return true;
    }
    
    /**
     * Obtiene el usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Crea un nuevo usuario (solo admin)
     */
    createUser(userData) {
        if (!this.hasPermission('users.manage')) {
            throw new Error('Sin permisos para crear usuarios');
        }
        
        const newUser = {
            id: crypto.randomUUID(),
            email: userData.email,
            name: userData.name,
            role: userData.role || UserRoles.VIEWER,
            permissions: RolePermissions[userData.role] || RolePermissions[UserRoles.VIEWER],
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser?.id,
            active: true
        };
        
        this.users.push(newUser);
        this.saveAdminData();
        this.logAction('user.create', { userId: newUser.id, role: newUser.role });
        
        logger.info('Usuario creado:', newUser.email);
        return newUser;
    }
    
    /**
     * Actualiza un usuario
     */
    updateUser(userId, updates) {
        if (!this.hasPermission('users.manage')) {
            throw new Error('Sin permisos para actualizar usuarios');
        }
        
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        
        Object.assign(user, updates);
        user.modifiedAt = new Date().toISOString();
        user.modifiedBy = this.currentUser?.id;
        
        this.saveAdminData();
        this.logAction('user.update', { userId, updates });
        
        logger.info('Usuario actualizado:', userId);
        return user;
    }
    
    /**
     * Desactiva un usuario
     */
    deactivateUser(userId) {
        if (!this.hasPermission('users.manage')) {
            throw new Error('Sin permisos para desactivar usuarios');
        }
        
        return this.updateUser(userId, { active: false });
    }
    
    /**
     * Lista todos los usuarios
     */
    listUsers() {
        if (!this.hasPermission('users.view')) {
            throw new Error('Sin permisos para ver usuarios');
        }
        
        return this.users;
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * SISTEMA DE PERMISOS
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Verifica si el usuario actual tiene un permiso
     */
    hasPermission(permission) {
        if (!this.isEnabled) {
            return true; // Si admin está deshabilitado, todos tienen permisos
        }
        
        if (!this.currentUser) {
            return false;
        }
        
        return this.currentUser.permissions.includes(permission);
    }
    
    /**
     * Verifica si el usuario tiene un rol específico
     */
    hasRole(role) {
        if (!this.currentUser) {
            return false;
        }
        
        return this.currentUser.role === role;
    }
    
    /**
     * Verifica si el usuario es admin
     */
    isAdmin() {
        return this.hasRole(UserRoles.ADMIN);
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * REGISTRO DE AUDITORÍA
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Registra una acción en el log de auditoría
     */
    logAction(action, details = {}) {
        const entry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: this.currentUser?.id || 'anonymous',
            userEmail: this.currentUser?.email || 'anonymous',
            action,
            details,
            ip: null, // Se podría obtener del servidor
            userAgent: navigator.userAgent
        };
        
        this.auditLog.push(entry);
        
        // Mantener solo los últimos 1000 registros
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
        
        this.saveAdminData();
        logger.debug('Acción registrada:', action, details);
    }
    
    /**
     * Obtiene el log de auditoría
     */
    getAuditLog(filters = {}) {
        if (!this.hasPermission('audit.view')) {
            throw new Error('Sin permisos para ver auditoría');
        }
        
        let logs = [...this.auditLog];
        
        // Aplicar filtros
        if (filters.userId) {
            logs = logs.filter(l => l.userId === filters.userId);
        }
        
        if (filters.action) {
            logs = logs.filter(l => l.action === filters.action);
        }
        
        if (filters.dateFrom) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.dateFrom));
        }
        
        if (filters.dateTo) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.dateTo));
        }
        
        return logs.reverse(); // Más recientes primero
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * ESTADÍSTICAS Y REPORTES
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Obtiene estadísticas de uso
     */
    getUsageStats() {
        if (!this.hasPermission('settings.view')) {
            throw new Error('Sin permisos para ver estadísticas');
        }
        
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const recentLogs = this.auditLog.filter(l => 
            new Date(l.timestamp) >= last30Days
        );
        
        const stats = {
            totalUsers: this.users.filter(u => u.active).length,
            totalProjects: AppState.projects?.length || 0,
            totalIssues: AppState.projects?.reduce((sum, p) => sum + (p.bcfFiles?.length || 0), 0) || 0,
            
            last30Days: {
                totalActions: recentLogs.length,
                uniqueUsers: new Set(recentLogs.map(l => l.userId)).size,
                topActions: this.getTopActions(recentLogs, 10)
            },
            
            usersByRole: this.getUsersByRole(),
            
            storageUsage: this.getStorageUsage()
        };
        
        return stats;
    }
    
    /**
     * Obtiene las acciones más frecuentes
     */
    getTopActions(logs, limit = 10) {
        const actionCounts = {};
        
        logs.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        });
        
        return Object.entries(actionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([action, count]) => ({ action, count }));
    }
    
    /**
     * Obtiene distribución de usuarios por rol
     */
    getUsersByRole() {
        const distribution = {};
        
        this.users.forEach(user => {
            distribution[user.role] = (distribution[user.role] || 0) + 1;
        });
        
        return distribution;
    }
    
    /**
     * Obtiene uso de almacenamiento
     */
    getStorageUsage() {
        try {
            if (navigator.storage && navigator.storage.estimate) {
                return navigator.storage.estimate();
            }
        } catch (error) {
            logger.error('Error obteniendo uso de storage:', error);
        }
        
        return { quota: 0, usage: 0 };
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * PERSISTENCIA
     * ═══════════════════════════════════════════════════════════════════════
     */
    
    /**
     * Carga datos de administración
     */
    loadAdminData() {
        try {
            const data = localStorage.getItem('bcf_admin_data');
            if (data) {
                const parsed = JSON.parse(data);
                this.users = parsed.users || [];
                this.auditLog = parsed.auditLog || [];
                this.currentUser = parsed.currentUser || null;
                
                logger.debug('Datos de administración cargados');
            }
        } catch (error) {
            logger.error('Error cargando datos de admin:', error);
        }
    }
    
    /**
     * Guarda datos de administración
     */
    saveAdminData() {
        try {
            const data = {
                users: this.users,
                auditLog: this.auditLog.slice(-1000), // Últimos 1000
                currentUser: this.currentUser
            };
            
            localStorage.setItem('bcf_admin_data', JSON.stringify(data));
            logger.debug('Datos de administración guardados');
        } catch (error) {
            logger.error('Error guardando datos de admin:', error);
        }
    }
    
    /**
     * Exporta configuración de admin
     */
    exportAdminData() {
        if (!this.hasPermission('settings.view')) {
            throw new Error('Sin permisos para exportar');
        }
        
        return {
            users: this.users,
            auditLog: this.auditLog,
            exportedAt: new Date().toISOString(),
            exportedBy: this.currentUser?.id
        };
    }
    
    /**
     * Importa configuración de admin
     */
    importAdminData(data) {
        if (!this.hasPermission('settings.edit')) {
            throw new Error('Sin permisos para importar');
        }
        
        if (data.users) this.users = data.users;
        if (data.auditLog) this.auditLog = data.auditLog;
        
        this.saveAdminData();
        this.logAction('admin.import', { itemsCount: data.users?.length || 0 });
        
        logger.info('Datos de admin importados');
    }
}

/**
 * Instancia singleton
 */
export const adminManager = new AdminManager();

/**
 * Helper para verificar permisos fácilmente en otros módulos
 */
export function hasPermission(permission) {
    return adminManager.hasPermission(permission);
}

/**
 * Helper para verificar si es admin
 */
export function isAdmin() {
    return adminManager.isAdmin();
}
