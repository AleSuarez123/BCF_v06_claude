/**
 * APP CONFIG - Configuración centralizada de la aplicación
 * Permite personalizar marca, colores, logos y mensajes
 */

export const AppConfig = {
    // Información de la empresa/marca
    branding: {
        appName: 'BCF Viewer Pro',
        companyName: 'GOCSA',
        tagline: 'Gestor de Incidencias BIM',
        welcomeMessage: '¡Bienvenido!',
        loginMessage: 'Accede a tu cuenta',
    },

    // Colores de marca (CSS custom properties)
    colors: {
        primary: '#667eea',      // Color principal
        primaryDark: '#5568d3',  // Hover del principal
        secondary: '#764ba2',    // Color secundario (para gradientes)
        accent: '#48bb78',       // Color de acentos/success
        danger: '#f56565',       // Color de error/peligro
        warning: '#f59e0b',      // Color de advertencia
        info: '#3b82f6',         // Color informativo
    },

    // Logo (puede ser URL, ruta relativa o base64)
    logo: {
        // Opción 1: Usar iniciales (por defecto)
        type: 'initials',
        initials: 'BCF',

        // Opción 2: URL de imagen
        // type: 'image',
        // url: '/assets/logo.png',

        // Opción 3: Base64
        // type: 'image',
        // url: 'data:image/svg+xml;base64,...',
    },

    // Footer personalizable
    footer: {
        year: new Date().getFullYear(),
        companyName: 'BCF Viewer Pro',
        allRightsReserved: true,
        links: [
            // { text: 'Privacidad', url: '/privacy' },
            // { text: 'Términos', url: '/terms' },
        ]
    },

    // Dominios permitidos (sincronizado con user-db.js)
    allowedDomains: ['gocsa.es', 'proyeco.es'],

    // Email del administrador
    adminEmail: 'asuarez@gocsa.es',

    // Features habilitadas/deshabilitadas
    features: {
        ssoMicrosoft365: false,  // Habilitar SSO con Microsoft 365
        ssoGoogle: false,        // Habilitar SSO con Google
        invitationSystem: true,  // Sistema de invitaciones
        darkMode: false,         // Modo oscuro
        multiLanguage: false,    // Múltiples idiomas
    },

    // Configuración de sesión
    session: {
        rememberMeDays: 30,      // Días de sesión persistente
        sessionTimeoutMinutes: 480, // Timeout de sesión inactiva (8 horas)
    }
};

/**
 * Aplicar configuración de colores a CSS
 */
export function applyBrandingColors() {
    const root = document.documentElement;

    Object.entries(AppConfig.colors).forEach(([key, value]) => {
        const cssVar = `--color-${key}`;
        root.style.setProperty(cssVar, value);
    });

    // Generar gradiente automático
    const gradient = `linear-gradient(135deg, ${AppConfig.colors.primary} 0%, ${AppConfig.colors.secondary} 100%)`;
    root.style.setProperty('--gradient-primary', gradient);
}

/**
 * Obtener logo HTML
 */
export function getLogoHTML(size = 'medium') {
    const sizeMap = {
        small: { width: 32, height: 32, fontSize: 16 },
        medium: { width: 64, height: 64, fontSize: 32 },
        large: { width: 96, height: 96, fontSize: 48 }
    };

    const dimensions = sizeMap[size] || sizeMap.medium;

    if (AppConfig.logo.type === 'initials') {
        return `
            <div class="app-logo app-logo-initials" style="
                width: ${dimensions.width}px;
                height: ${dimensions.height}px;
                background: var(--gradient-primary, ${getGradient()});
                color: white;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${dimensions.fontSize}px;
                font-weight: 700;
                margin: 0 auto;
            ">
                ${AppConfig.logo.initials}
            </div>
        `;
    } else if (AppConfig.logo.type === 'image') {
        return `
            <img src="${AppConfig.logo.url}"
                 alt="${AppConfig.branding.appName}"
                 class="app-logo app-logo-image"
                 style="width: ${dimensions.width}px; height: ${dimensions.height}px; object-fit: contain; margin: 0 auto;">
        `;
    }

    return '';
}

/**
 * Obtener gradiente CSS
 */
function getGradient() {
    return `linear-gradient(135deg, ${AppConfig.colors.primary} 0%, ${AppConfig.colors.secondary} 100%)`;
}

/**
 * Obtener footer HTML
 */
export function getFooterHTML() {
    const footer = AppConfig.footer;
    let html = `© ${footer.year} ${footer.companyName}`;

    if (footer.allRightsReserved) {
        html += ' - Todos los derechos reservados';
    }

    if (footer.links && footer.links.length > 0) {
        const linksHTML = footer.links.map(link =>
            `<a href="${link.url}" class="footer-link">${link.text}</a>`
        ).join(' • ');
        html += `<br><div class="footer-links" style="margin-top: 8px;">${linksHTML}</div>`;
    }

    return html;
}

// Aplicar branding al cargar
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        applyBrandingColors();
    });
}
