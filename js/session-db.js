/**
 * SESSION DATABASE - Tracking de sesiones y conexiones
 */

const SESSION_DB_KEY = 'bcf_sessions';
const CURRENT_SESSION_KEY = 'bcf_current_session';

/**
 * Estructura de sesión:
 * {
 *   id: string (UUID),
 *   userId: string,
 *   userEmail: string,
 *   userName: string,
 *   startTime: timestamp,
 *   lastActivity: timestamp,
 *   endTime: timestamp | null,
 *   duration: number (ms),
 *   active: boolean,
 *   userAgent: string,
 *   ip: string (opcional, requiere backend)
 * }
 */

class SessionDatabase {
    constructor() {
        this.initializeDB();
    }

    initializeDB() {
        if (!localStorage.getItem(SESSION_DB_KEY)) {
            localStorage.setItem(SESSION_DB_KEY, JSON.stringify([]));
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
     * Obtener todas las sesiones
     */
    getAllSessions() {
        const data = localStorage.getItem(SESSION_DB_KEY);
        return JSON.parse(data) || [];
    }

    /**
     * Guardar sesiones
     */
    saveSessions(sessions) {
        localStorage.setItem(SESSION_DB_KEY, JSON.stringify(sessions));
    }

    /**
     * Crear nueva sesión
     */
    createSession(user) {
        const now = Date.now();

        const session = {
            id: this.generateUUID(),
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            startTime: now,
            lastActivity: now,
            endTime: null,
            duration: 0,
            active: true,
            userAgent: navigator.userAgent
        };

        const sessions = this.getAllSessions();
        sessions.push(session);
        this.saveSessions(sessions);

        // Guardar sesión actual
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));

        return session;
    }

    /**
     * Obtener sesión actual
     */
    getCurrentSession() {
        const data = localStorage.getItem(CURRENT_SESSION_KEY);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Actualizar actividad de sesión
     */
    updateActivity() {
        const currentSession = this.getCurrentSession();
        if (!currentSession) return null;

        const sessions = this.getAllSessions();
        const index = sessions.findIndex(s => s.id === currentSession.id);

        if (index !== -1) {
            sessions[index].lastActivity = Date.now();
            sessions[index].duration = Date.now() - sessions[index].startTime;
            this.saveSessions(sessions);

            // Actualizar sesión actual
            localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(sessions[index]));

            return sessions[index];
        }

        return null;
    }

    /**
     * Cerrar sesión
     */
    endSession() {
        const currentSession = this.getCurrentSession();
        if (!currentSession) return null;

        const sessions = this.getAllSessions();
        const index = sessions.findIndex(s => s.id === currentSession.id);

        if (index !== -1) {
            const endTime = Date.now();
            sessions[index].endTime = endTime;
            sessions[index].duration = endTime - sessions[index].startTime;
            sessions[index].active = false;
            this.saveSessions(sessions);
        }

        // Limpiar sesión actual
        localStorage.removeItem(CURRENT_SESSION_KEY);

        return sessions[index];
    }

    /**
     * Obtener sesiones por usuario
     */
    getSessionsByUser(userId) {
        const sessions = this.getAllSessions();
        return sessions.filter(s => s.userId === userId);
    }

    /**
     * Obtener sesiones activas
     */
    getActiveSessions() {
        const sessions = this.getAllSessions();
        return sessions.filter(s => s.active);
    }

    /**
     * Obtener estadísticas de sesiones
     */
    getStats() {
        const sessions = this.getAllSessions();
        const activeSessions = sessions.filter(s => s.active);

        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

        return {
            totalSessions: sessions.length,
            activeSessions: activeSessions.length,
            avgDuration: Math.round(avgDuration / 1000 / 60), // minutos
            totalDuration: Math.round(totalDuration / 1000 / 60) // minutos
        };
    }

    /**
     * Limpiar sesiones antiguas (más de 30 días)
     */
    cleanOldSessions(daysToKeep = 30) {
        const sessions = this.getAllSessions();
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        const filtered = sessions.filter(s => {
            const sessionTime = s.endTime || s.lastActivity;
            return sessionTime > cutoffTime;
        });

        this.saveSessions(filtered);
        return sessions.length - filtered.length; // número de sesiones eliminadas
    }
}

// Exportar instancia única
export const SessionDB = new SessionDatabase();

// Auto-update de actividad cada 5 minutos
setInterval(() => {
    const session = SessionDB.getCurrentSession();
    if (session) {
        SessionDB.updateActivity();
    }
}, 5 * 60 * 1000);
