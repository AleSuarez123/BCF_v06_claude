/**
 * FORM VALIDATION - Sistema de validación de formularios
 * ========================================================
 *
 * Proporciona validación en tiempo real con feedback visual
 * y sanitización de inputs.
 *
 * Uso:
 * ```javascript
 * import { FormValidator } from './form-validation.js';
 *
 * const validator = new FormValidator('#my-form', {
 *   projectName: {
 *     required: true,
 *     minLength: 3,
 *     maxLength: 100
 *   },
 *   email: {
 *     required: true,
 *     pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
 *     message: 'Email inválido'
 *   }
 * });
 *
 * if (validator.validate()) {
 *   const data = validator.getData();
 *   // Procesar datos
 * }
 * ```
 */

import { validators } from './config.js';
import { sanitizeHTML } from './sanitizer.js';

/**
 * Reglas de validación predefinidas
 */
export const ValidationRules = {
    required: {
        validate: (value) => value !== null && value !== undefined && value.toString().trim() !== '',
        message: 'Este campo es obligatorio'
    },

    minLength: {
        validate: (value, min) => value.toString().length >= min,
        message: (min) => `Mínimo ${min} caracteres`
    },

    maxLength: {
        validate: (value, max) => value.toString().length <= max,
        message: (max) => `Máximo ${max} caracteres`
    },

    min: {
        validate: (value, min) => parseFloat(value) >= min,
        message: (min) => `Valor mínimo: ${min}`
    },

    max: {
        validate: (value, max) => parseFloat(value) <= max,
        message: (max) => `Valor máximo: ${max}`
    },

    pattern: {
        validate: (value, pattern) => pattern.test(value),
        message: 'Formato inválido'
    },

    email: {
        validate: (value) => validators.email(value),
        message: 'Email inválido'
    },

    url: {
        validate: (value) => validators.url(value),
        message: 'URL inválida'
    },

    guid: {
        validate: (value) => validators.guid(value),
        message: 'GUID inválido'
    },

    alphanumeric: {
        validate: (value) => /^[a-zA-Z0-9]+$/.test(value),
        message: 'Solo letras y números'
    },

    noSpecialChars: {
        validate: (value) => /^[a-zA-Z0-9\s\-_.]+$/.test(value),
        message: 'Caracteres especiales no permitidos'
    },

    date: {
        validate: (value) => {
            const date = new Date(value);
            return !isNaN(date.getTime());
        },
        message: 'Fecha inválida'
    },

    futureDate: {
        validate: (value) => {
            const date = new Date(value);
            return date > new Date();
        },
        message: 'La fecha debe ser futura'
    },

    custom: {
        validate: (value, fn) => fn(value),
        message: 'Validación fallida'
    }
};

/**
 * FormValidator - Valida formularios con feedback visual
 */
export class FormValidator {
    constructor(formSelector, rules = {}, options = {}) {
        this.form = typeof formSelector === 'string'
            ? document.querySelector(formSelector)
            : formSelector;

        if (!this.form) {
            throw new Error(`Formulario no encontrado: ${formSelector}`);
        }

        this.rules = rules;
        this.options = {
            liveValidation: true,      // Validar mientras escribe
            sanitize: true,             // Sanitizar inputs
            showErrors: true,           // Mostrar errores visualmente
            scrollToError: true,        // Scroll al primer error
            ...options
        };

        this.errors = {};
        this.touched = {}; // Campos que el usuario ha tocado

        if (this.options.liveValidation) {
            this._attachLiveValidation();
        }
    }

    /**
     * Valida todo el formulario
     * @returns {boolean} true si es válido
     */
    validate() {
        this.errors = {};
        let isValid = true;

        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (!field) {
                console.warn(`Campo no encontrado: ${fieldName}`);
                return;
            }

            const fieldErrors = this._validateField(field, this.rules[fieldName]);

            if (fieldErrors.length > 0) {
                this.errors[fieldName] = fieldErrors;
                isValid = false;

                if (this.options.showErrors) {
                    this._showFieldError(field, fieldErrors[0]);
                }
            } else if (this.options.showErrors) {
                this._clearFieldError(field);
            }
        });

        // Scroll al primer error
        if (!isValid && this.options.scrollToError) {
            const firstErrorField = Object.keys(this.errors)[0];
            const field = this.form.querySelector(`[name="${firstErrorField}"]`);
            if (field) {
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                field.focus();
            }
        }

        return isValid;
    }

    /**
     * Valida un campo específico
     * @param {HTMLElement} field - Campo a validar
     * @param {Object} rules - Reglas del campo
     * @returns {Array} Array de mensajes de error
     * @private
     */
    _validateField(field, rules) {
        const errors = [];
        const value = field.value;
        const fieldType = field.type;

        // Si el campo está vacío y NO es required, skip otras validaciones
        if (!value && !rules.required) {
            return errors;
        }

        // Validar cada regla
        Object.keys(rules).forEach(ruleName => {
            const ruleValue = rules[ruleName];
            const rule = ValidationRules[ruleName];

            if (!rule) {
                console.warn(`Regla desconocida: ${ruleName}`);
                return;
            }

            let isValid;

            // Manejar reglas booleanas vs con parámetros
            if (ruleName === 'required' || ruleName === 'email' || ruleName === 'url' ||
                ruleName === 'guid' || ruleName === 'alphanumeric' || ruleName === 'noSpecialChars' ||
                ruleName === 'date' || ruleName === 'futureDate') {
                isValid = rule.validate(value);
            } else {
                isValid = rule.validate(value, ruleValue);
            }

            if (!isValid) {
                // Mensaje custom o default
                const message = rules.message ||
                    (typeof rule.message === 'function'
                        ? rule.message(ruleValue)
                        : rule.message);

                errors.push(message);
            }
        });

        return errors;
    }

    /**
     * Muestra error visual en un campo
     * @private
     */
    _showFieldError(field, message) {
        // Remover error previo
        this._clearFieldError(field);

        // Agregar clase de error
        field.classList.add('error', 'invalid');

        // Crear elemento de mensaje
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error-message';
        errorEl.textContent = message;
        errorEl.setAttribute('role', 'alert');

        // Insertar después del campo
        field.parentNode.insertBefore(errorEl, field.nextSibling);

        // Marcar label si existe
        const label = this.form.querySelector(`label[for="${field.id}"]`);
        if (label) {
            label.classList.add('error');
        }
    }

    /**
     * Limpia error visual de un campo
     * @private
     */
    _clearFieldError(field) {
        field.classList.remove('error', 'invalid');

        // Remover mensaje de error
        const errorMsg = field.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('field-error-message')) {
            errorMsg.remove();
        }

        // Limpiar label
        const label = this.form.querySelector(`label[for="${field.id}"]`);
        if (label) {
            label.classList.remove('error');
        }
    }

    /**
     * Configura validación en tiempo real
     * @private
     */
    _attachLiveValidation() {
        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            // Blur event - validar cuando pierde el foco
            field.addEventListener('blur', () => {
                this.touched[fieldName] = true;
                this._validateAndShowError(field, this.rules[fieldName]);
            });

            // Input event - validar mientras escribe (solo si ya tocó el campo)
            field.addEventListener('input', () => {
                if (this.touched[fieldName]) {
                    // Debounce la validación
                    clearTimeout(field._validationTimeout);
                    field._validationTimeout = setTimeout(() => {
                        this._validateAndShowError(field, this.rules[fieldName]);
                    }, 300);
                }

                // Sanitizar en tiempo real si está habilitado
                if (this.options.sanitize && field.type === 'text') {
                    field.value = sanitizeHTML(field.value);
                }
            });
        });
    }

    /**
     * Valida y muestra error de un campo
     * @private
     */
    _validateAndShowError(field, rules) {
        const errors = this._validateField(field, rules);

        if (errors.length > 0) {
            this._showFieldError(field, errors[0]);
        } else {
            this._clearFieldError(field);
        }
    }

    /**
     * Obtiene los datos del formulario (sanitizados si está habilitado)
     * @returns {Object} Datos del formulario
     */
    getData() {
        const data = {};

        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            let value = field.type === 'checkbox' ? field.checked : field.value;

            // Sanitizar si está habilitado
            if (this.options.sanitize && typeof value === 'string') {
                value = sanitizeHTML(value);
            }

            data[fieldName] = value;
        });

        return data;
    }

    /**
     * Limpia todos los errores
     */
    clearErrors() {
        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this._clearFieldError(field);
            }
        });

        this.errors = {};
    }

    /**
     * Resetea el formulario
     */
    reset() {
        this.form.reset();
        this.clearErrors();
        this.touched = {};
    }

    /**
     * Obtiene los errores actuales
     * @returns {Object} Objeto con errores por campo
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Verifica si un campo es válido
     * @param {string} fieldName - Nombre del campo
     * @returns {boolean}
     */
    isFieldValid(fieldName) {
        return !this.errors[fieldName] || this.errors[fieldName].length === 0;
    }
}

/**
 * Helper para validación rápida inline
 */
export function validateField(value, rules) {
    const errors = [];

    Object.keys(rules).forEach(ruleName => {
        const ruleValue = rules[ruleName];
        const rule = ValidationRules[ruleName];

        if (!rule) return;

        let isValid;
        if (typeof ruleValue === 'boolean') {
            isValid = rule.validate(value);
        } else {
            isValid = rule.validate(value, ruleValue);
        }

        if (!isValid) {
            const message = typeof rule.message === 'function'
                ? rule.message(ruleValue)
                : rule.message;
            errors.push(message);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Exportar reglas para uso directo
 */
export { ValidationRules as Rules };
