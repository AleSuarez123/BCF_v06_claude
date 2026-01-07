/**
 * ACCESS REQUEST DATABASE - Gestión de solicitudes de acceso
 */

const ACCESS_REQUEST_DB_KEY = 'bcf_access_requests';

/**
 * Estructura de solicitud:
 * {
 *   id: string (UUID),
 *   name: string,
 *   email: string,
 *   domain: string,
 *   status: 'pending' | 'approved' | 'denied',
 *   requestDate: timestamp,
 *   processedDate: timestamp | null,
 *   processedBy: string | null (email del admin),
 *   notes: string
 * }
 */

class AccessRequestDatabase {
    constructor() {
        this.initializeDB();
    }

    initializeDB() {
        if (!localStorage.getItem(ACCESS_REQUEST_DB_KEY)) {
            localStorage.setItem(ACCESS_REQUEST_DB_KEY, JSON.stringify([]));
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
     * Obtener todas las solicitudes
     */
    getAllRequests() {
        const data = localStorage.getItem(ACCESS_REQUEST_DB_KEY);
        return JSON.parse(data) || [];
    }

    /**
     * Guardar solicitudes
     */
    saveRequests(requests) {
        localStorage.setItem(ACCESS_REQUEST_DB_KEY, JSON.stringify(requests));
    }

    /**
     * Crear nueva solicitud
     */
    createRequest({ name, email }) {
        const requests = this.getAllRequests();

        // Verificar si ya existe una solicitud pendiente
        const existing = requests.find(r =>
            r.email.toLowerCase() === email.toLowerCase() &&
            r.status === 'pending'
        );

        if (existing) {
            throw new Error('Ya existe una solicitud pendiente para este email');
        }

        const domain = email.split('@')[1];

        const newRequest = {
            id: this.generateUUID(),
            name,
            email: email.toLowerCase(),
            domain,
            status: 'pending',
            requestDate: Date.now(),
            processedDate: null,
            processedBy: null,
            notes: ''
        };

        requests.push(newRequest);
        this.saveRequests(requests);

        return newRequest;
    }

    /**
     * Obtener solicitud por ID
     */
    getRequestById(id) {
        const requests = this.getAllRequests();
        return requests.find(r => r.id === id);
    }

    /**
     * Obtener solicitudes pendientes
     */
    getPendingRequests() {
        const requests = this.getAllRequests();
        return requests.filter(r => r.status === 'pending');
    }

    /**
     * Aprobar solicitud
     */
    approveRequest(id, adminEmail, notes = '') {
        const requests = this.getAllRequests();
        const index = requests.findIndex(r => r.id === id);

        if (index === -1) {
            throw new Error('Solicitud no encontrada');
        }

        if (requests[index].status !== 'pending') {
            throw new Error('La solicitud ya fue procesada');
        }

        requests[index].status = 'approved';
        requests[index].processedDate = Date.now();
        requests[index].processedBy = adminEmail;
        requests[index].notes = notes;

        this.saveRequests(requests);

        return requests[index];
    }

    /**
     * Denegar solicitud
     */
    denyRequest(id, adminEmail, notes = '') {
        const requests = this.getAllRequests();
        const index = requests.findIndex(r => r.id === id);

        if (index === -1) {
            throw new Error('Solicitud no encontrada');
        }

        if (requests[index].status !== 'pending') {
            throw new Error('La solicitud ya fue procesada');
        }

        requests[index].status = 'denied';
        requests[index].processedDate = Date.now();
        requests[index].processedBy = adminEmail;
        requests[index].notes = notes;

        this.saveRequests(requests);

        return requests[index];
    }

    /**
     * Eliminar solicitud
     */
    deleteRequest(id) {
        const requests = this.getAllRequests();
        const filtered = requests.filter(r => r.id !== id);
        this.saveRequests(filtered);
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        const requests = this.getAllRequests();
        return {
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            approved: requests.filter(r => r.status === 'approved').length,
            denied: requests.filter(r => r.status === 'denied').length
        };
    }

    /**
     * Limpiar solicitudes procesadas antiguas (más de 90 días)
     */
    cleanOldRequests(daysToKeep = 90) {
        const requests = this.getAllRequests();
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        const filtered = requests.filter(r => {
            // Mantener todas las pendientes
            if (r.status === 'pending') return true;

            // Eliminar procesadas antiguas
            return r.processedDate && r.processedDate > cutoffTime;
        });

        this.saveRequests(filtered);
        return requests.length - filtered.length;
    }
}

// Exportar instancia única
export const AccessRequestDB = new AccessRequestDatabase();
