/**
 * INVITATION MANAGER - Sistema de invitaciones con tokens únicos
 * Permite a admins generar links de invitación de un solo uso
 */

const INVITATION_DB_KEY = 'bcf_invitations';

/**
 * Estructura de invitación:
 * {
 *   id: string (UUID),
 *   token: string (token único seguro),
 *   createdBy: string (email del admin),
 *   createdAt: timestamp,
 *   expiresAt: timestamp,
 *   usedBy: string | null (email del usuario que lo usó),
 *   usedAt: timestamp | null,
 *   status: 'pending' | 'used' | 'expired',
 *   maxUses: number (por defecto 1),
 *   currentUses: number,
 *   allowedDomain: string | null (restringir a un dominio específico)
 * }
 */

class InvitationManager {
    constructor() {
        this.initializeDB();
    }

    initializeDB() {
        if (!localStorage.getItem(INVITATION_DB_KEY)) {
            localStorage.setItem(INVITATION_DB_KEY, JSON.stringify([]));
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Generar token seguro de 32 caracteres
     */
    generateSecureToken() {
        const array = new Uint8Array(24);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Obtener todas las invitaciones
     */
    getAllInvitations() {
        const data = localStorage.getItem(INVITATION_DB_KEY);
        return JSON.parse(data) || [];
    }

    /**
     * Guardar invitaciones
     */
    saveInvitations(invitations) {
        localStorage.setItem(INVITATION_DB_KEY, JSON.stringify(invitations));
    }

    /**
     * Crear nueva invitación
     */
    createInvitation({ createdBy, expiryDays = 7, maxUses = 1, allowedDomain = null }) {
        const invitations = this.getAllInvitations();

        const now = Date.now();
        const invitation = {
            id: this.generateUUID(),
            token: this.generateSecureToken(),
            createdBy,
            createdAt: now,
            expiresAt: now + (expiryDays * 24 * 60 * 60 * 1000),
            usedBy: null,
            usedAt: null,
            status: 'pending',
            maxUses,
            currentUses: 0,
            allowedDomain
        };

        invitations.push(invitation);
        this.saveInvitations(invitations);

        return invitation;
    }

    /**
     * Obtener invitación por token
     */
    getInvitationByToken(token) {
        const invitations = this.getAllInvitations();
        return invitations.find(inv => inv.token === token);
    }

    /**
     * Verificar si token es válido
     */
    isTokenValid(token) {
        const invitation = this.getInvitationByToken(token);

        if (!invitation) return { valid: false, reason: 'Token no encontrado' };

        if (invitation.status === 'used' && invitation.currentUses >= invitation.maxUses) {
            return { valid: false, reason: 'Token ya utilizado' };
        }

        if (invitation.status === 'expired' || Date.now() > invitation.expiresAt) {
            return { valid: false, reason: 'Token expirado' };
        }

        return { valid: true, invitation };
    }

    /**
     * Verificar si email puede usar token
     */
    canEmailUseToken(token, email) {
        const result = this.isTokenValid(token);

        if (!result.valid) return result;

        const invitation = result.invitation;

        // Si hay dominio restringido, verificar
        if (invitation.allowedDomain) {
            const domain = email.split('@')[1]?.toLowerCase();
            if (domain !== invitation.allowedDomain.toLowerCase()) {
                return {
                    valid: false,
                    reason: `Este token solo es válido para emails @${invitation.allowedDomain}`
                };
            }
        }

        return { valid: true, invitation };
    }

    /**
     * Usar invitación
     */
    useInvitation(token, userEmail) {
        const invitations = this.getAllInvitations();
        const index = invitations.findIndex(inv => inv.token === token);

        if (index === -1) {
            throw new Error('Token no encontrado');
        }

        const invitation = invitations[index];

        if (invitation.currentUses >= invitation.maxUses) {
            throw new Error('Token ya utilizado completamente');
        }

        if (Date.now() > invitation.expiresAt) {
            throw new Error('Token expirado');
        }

        // Marcar como usado
        invitation.currentUses++;
        invitation.usedBy = userEmail; // Último usuario que lo usó
        invitation.usedAt = Date.now();

        if (invitation.currentUses >= invitation.maxUses) {
            invitation.status = 'used';
        }

        this.saveInvitations(invitations);

        return invitation;
    }

    /**
     * Revocar invitación
     */
    revokeInvitation(id) {
        const invitations = this.getAllInvitations();
        const index = invitations.findIndex(inv => inv.id === id);

        if (index === -1) {
            throw new Error('Invitación no encontrada');
        }

        invitations[index].status = 'expired';
        this.saveInvitations(invitations);

        return invitations[index];
    }

    /**
     * Eliminar invitación
     */
    deleteInvitation(id) {
        const invitations = this.getAllInvitations();
        const filtered = invitations.filter(inv => inv.id !== id);
        this.saveInvitations(filtered);
    }

    /**
     * Obtener invitaciones pendientes
     */
    getPendingInvitations() {
        const invitations = this.getAllInvitations();
        const now = Date.now();

        return invitations.filter(inv => {
            if (inv.status === 'pending' && now <= inv.expiresAt && inv.currentUses < inv.maxUses) {
                return true;
            }

            // Auto-marcar como expiradas
            if (inv.status === 'pending' && now > inv.expiresAt) {
                inv.status = 'expired';
                return false;
            }

            return false;
        });
    }

    /**
     * Obtener invitaciones usadas
     */
    getUsedInvitations() {
        const invitations = this.getAllInvitations();
        return invitations.filter(inv => inv.status === 'used');
    }

    /**
     * Obtener invitaciones expiradas
     */
    getExpiredInvitations() {
        const invitations = this.getAllInvitations();
        const now = Date.now();

        return invitations.filter(inv => {
            return inv.status === 'expired' || (inv.status === 'pending' && now > inv.expiresAt);
        });
    }

    /**
     * Generar link de invitación
     */
    generateInvitationLink(token) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/login.html?invitation=${token}`;
    }

    /**
     * Limpiar invitaciones expiradas (más de 90 días)
     */
    cleanOldInvitations(daysToKeep = 90) {
        const invitations = this.getAllInvitations();
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        const filtered = invitations.filter(inv => {
            // Mantener pendientes
            if (inv.status === 'pending') return true;

            // Eliminar expiradas/usadas antiguas
            return inv.createdAt > cutoffTime;
        });

        this.saveInvitations(filtered);
        return invitations.length - filtered.length;
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        const all = this.getAllInvitations();
        return {
            total: all.length,
            pending: this.getPendingInvitations().length,
            used: this.getUsedInvitations().length,
            expired: this.getExpiredInvitations().length
        };
    }
}

// Exportar instancia única
export const InvitationMgr = new InvitationManager();
