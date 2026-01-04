/**
 * SESSION TOKEN MANAGER - Gestión de tokens de sesión persistente
 * Sistema "Remember Me" para mantener sesiones por 30 días
 */

const REFRESH_TOKEN_KEY = 'bcf_refresh_token';
const TOKEN_EXPIRY_DAYS = 30;

class SessionTokenManager {
    constructor() {
        this.cleanExpiredTokens();
    }

    /**
     * Generar token de refresh seguro
     */
    generateRefreshToken(userId, email) {
        const token = {
            id: this.generateSecureToken(),
            userId,
            email,
            createdAt: Date.now(),
            expiresAt: Date.now() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            deviceInfo: this.getDeviceInfo()
        };

        return token;
    }

    /**
     * Guardar token de refresh
     */
    saveRefreshToken(token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, JSON.stringify(token));
    }

    /**
     * Obtener token de refresh
     */
    getRefreshToken() {
        const data = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!data) return null;

        try {
            const token = JSON.parse(data);

            // Verificar si expiró
            if (Date.now() > token.expiresAt) {
                this.clearRefreshToken();
                return null;
            }

            return token;
        } catch (e) {
            this.clearRefreshToken();
            return null;
        }
    }

    /**
     * Verificar si hay token válido
     */
    hasValidToken() {
        return this.getRefreshToken() !== null;
    }

    /**
     * Limpiar token de refresh
     */
    clearRefreshToken() {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }

    /**
     * Renovar token (extender expiración)
     */
    renewToken() {
        const token = this.getRefreshToken();
        if (!token) return null;

        token.expiresAt = Date.now() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        this.saveRefreshToken(token);

        return token;
    }

    /**
     * Limpiar tokens expirados
     */
    cleanExpiredTokens() {
        const token = this.getRefreshToken();
        if (token && Date.now() > token.expiresAt) {
            this.clearRefreshToken();
        }
    }

    /**
     * Generar token seguro
     */
    generateSecureToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Obtener información del dispositivo
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${screen.width}x${screen.height}`
        };
    }

    /**
     * Obtener tiempo restante del token
     */
    getTokenTimeRemaining() {
        const token = this.getRefreshToken();
        if (!token) return 0;

        const remaining = token.expiresAt - Date.now();
        return Math.max(0, remaining);
    }

    /**
     * Formatear tiempo restante
     */
    formatTimeRemaining() {
        const ms = this.getTokenTimeRemaining();
        if (ms === 0) return 'Expirado';

        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        if (days > 0) {
            return `${days} día${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hora${hours > 1 ? 's' : ''} restante${hours > 1 ? 's' : ''}`;
        } else {
            return 'Menos de 1 hora';
        }
    }
}

// Exportar instancia única
export const SessionTokenMgr = new SessionTokenManager();
