import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Registra un log en Firestore.
 * @param {string} accion - El tipo de acción (LOGIN, CREAR_EVENTO, etc.)
 * @param {Object} detalles - Detalles adicionales del evento.
 */
export const registrarLog = async (accion, detalles) => {
  try {
    await addDoc(collection(db, 'logs'), {
      accion,
      ...detalles,
      fecha: new Date().toISOString()
    });
    console.log(`Log registrado: ${accion}`);
  } catch (error) {
    console.error("Error al registrar log en Firebase:", error);
  }
};
