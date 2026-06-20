// =============================================================================
// permisos.js - Helpers de control de acceso del lado del CLIENTE
// -----------------------------------------------------------------------------
// OJO: esto es solo para la UI (ocultar botones, no renderizar montos, etc.).
// La seguridad REAL vive en firestore.rules. Nunca confíes en estas funciones
// para proteger datos sensibles: un atacante no ejecuta tu JS.
// =============================================================================

/**
 * Roles válidos del sistema. Deben coincidir EXACTO con el campo `role`
 * guardado en cada documento de la colección `users` en Firestore.
 * @readonly
 * @enum {string}
 */
export const ROLES = {
  ADMIN: 'admin',
  TRABAJADOR: 'trabajador',
}

/**
 * ¿El rol corresponde a un administrador (cliente o socia)?
 * @param {string} rol - Rol del usuario, normalmente leído de su doc en `users`.
 * @returns {boolean}
 */
export const esAdmin = (rol) => rol === ROLES.ADMIN

/**
 * ¿El rol puede crear/editar/borrar eventos y calendarios?
 * Solo los admin. Los trabajadores son de SOLO LECTURA.
 * @param {string} rol
 * @returns {boolean}
 */
export const puedeEditar = (rol) => rol === ROLES.ADMIN

/**
 * ¿El rol puede VER el presupuesto de un evento?
 * Solo los admin. La UI debe ocultar el monto a los trabajadores, y además
 * Firestore les niega la lectura de la colección `presupuestos`.
 * @param {string} rol
 * @returns {boolean}
 */
export const puedeVerPresupuesto = (rol) => rol === ROLES.ADMIN
