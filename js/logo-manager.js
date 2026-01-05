/**
 * LOGO MANAGER - Gestión de logos dinámicos según dominio del usuario
 */

export class LogoManager {
    static LOGOS = {
        'gocsa.es': {
            name: 'GOCSA',
            image: '/img/logos/G azul@8x.png',
            color: '#2c7aae',  // Azul GOCSA
            svgFallback: `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#2c7aae" opacity="0.1"/>
                    <text x="50" y="70" font-family="DM Sans, sans-serif" font-size="60" font-weight="700" fill="#2c7aae" text-anchor="middle">G</text>
                </svg>
            `
        },
        'proyeco.es': {
            name: 'PROYECO',
            image: '/img/logos/P roja@8x-8.png',
            color: '#c93238',  // Rojo PROYECO
            svgFallback: `
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#c93238" opacity="0.1"/>
                    <text x="50" y="70" font-family="DM Sans, sans-serif" font-size="60" font-weight="700" fill="#c93238" text-anchor="middle">P</text>
                </svg>
            `
        },
        'default': {
            name: 'BCF Viewer Pro',
            svgFallback: `
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="14" height="14" rx="2" fill="currentColor" opacity="0.9"/>
                    <rect x="22" y="4" width="14" height="14" rx="2" fill="currentColor" opacity="0.6"/>
                    <rect x="4" y="22" width="14" height="14" rx="2" fill="currentColor" opacity="0.6"/>
                    <rect x="22" y="22" width="14" height="14" rx="2" fill="currentColor" opacity="0.3"/>
                </svg>
            `
        }
    };

    /**
     * Obtener configuración del logo según el dominio del usuario
     * @param {string} userEmail - Email del usuario actual
     * @returns {Object} Configuración del logo
     */
    static getLogoConfig(userEmail) {
        if (!userEmail) return this.LOGOS.default;

        const domain = userEmail.split('@')[1]?.toLowerCase();

        return this.LOGOS[domain] || this.LOGOS.default;
    }

    /**
     * Generar HTML del logo
     * @param {string} userEmail - Email del usuario actual
     * @param {Object} options - Opciones adicionales
     * @returns {string} HTML del logo
     */
    static getLogoHTML(userEmail, options = {}) {
        const config = this.getLogoConfig(userEmail);
        const { width = 40, height = 40, useSVG = false } = options;

        // Intentar usar imagen PNG primero
        if (config.image && !useSVG) {
            return `<img src="${config.image}" alt="${config.name}" width="${width}" height="${height}" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; width: ${width}px; height: ${height}px;">${config.svgFallback}</div>`;
        }

        // Usar SVG fallback
        return `<div style="width: ${width}px; height: ${height}px;">${config.svgFallback}</div>`;
    }

    /**
     * Actualizar todos los logos en la página actual
     * @param {string} userEmail - Email del usuario actual
     */
    static updateAllLogos(userEmail) {
        const config = this.getLogoConfig(userEmail);

        // Actualizar logo en dashboard header (index.html)
        const dashboardLogo = document.querySelector('.logo-icon');
        if (dashboardLogo) {
            dashboardLogo.innerHTML = this.getLogoHTML(userEmail, { width: 40, height: 40 });
        }

        // Actualizar logo en admin header (admin.html)
        const adminLogo = document.querySelector('.admin-logo');
        if (adminLogo) {
            adminLogo.innerHTML = this.getLogoHTML(userEmail, { width: 48, height: 48 });
        }

        // Actualizar logo en login (login.html)
        const loginLogo = document.querySelector('.login-logo');
        if (loginLogo) {
            loginLogo.innerHTML = this.getLogoHTML(userEmail, { width: 64, height: 64 });
        }

        // Actualizar variables CSS si es necesario
        if (config.color) {
            document.documentElement.style.setProperty('--brand-color', config.color);
        }

        console.log(`✅ Logos actualizados para: ${config.name}`);
    }
}

// Export default
export default LogoManager;
