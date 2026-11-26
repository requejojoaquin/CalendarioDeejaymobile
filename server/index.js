// NOTA: Requiere Node.js >= 18 (usa el fetch global nativo, sin node-fetch).
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de Rate Limiting
// Esto previene que te tiren la página con miles de solicitudes (DDoS/Spam)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 solicitudes por IP
  message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo en 15 minutos.'
});

// Rate Limiting más estricto para el envío de invitaciones por email.
// Mandar correos es caro y abusable, así que lo limitamos más fuerte que el resto.
const limiterInvitaciones = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // Límite de 30 envíos por IP cada 15 minutos
  message: 'Demasiadas invitaciones enviadas desde esta IP, por favor intenta de nuevo en 15 minutos.'
});

// CORS con allowlist por variable de entorno.
// NO dejamos cors() abierto: solo permitimos los orígenes declarados en
// ALLOWED_ORIGINS (coma-separado). Por defecto, los puertos de Vite en local.
const origenesPermitidos = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitimos peticiones sin Origin (ej.: curl, apps móviles, healthchecks)
    // y las de la allowlist. Cualquier otro origen se rechaza: devolvemos
    // `false` (sin lanzar error) para no responder con las cabeceras CORS, de
    // modo que el navegador bloquee la respuesta sin generar un 500 ruidoso.
    if (!origin || origenesPermitidos.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }
};

// Middleware
app.use(limiter);
app.use(cors(corsOptions));
app.use(express.json());

// Ejemplo de ruta segura que oculta lógica del backend
app.get('/api/status', (req, res) => {
  res.json({ status: 'Servidor funcionando correctamente y protegido.' });
});

// Expande abreviaturas comunes de direcciones (AR) para mejorar el match de
// Nominatim: "av cabildo" -> "avenida cabildo", "gral paz" -> "general paz".
function normalizarConsulta(q) {
  const reglas = [
    [/\bav\.?\b/gi, 'avenida'],
    [/\bavda\.?\b/gi, 'avenida'],
    [/\bgral\.?\b/gi, 'general'],
    [/\bpte\.?\b/gi, 'presidente'],
    [/\bdr\.?\b/gi, 'doctor'],
    [/\bbv\.?\b/gi, 'bulevar'],
  ];
  let s = q;
  for (const [re, full] of reglas) s = s.replace(re, full);
  return s.replace(/\s+/g, ' ').trim();
}

// Consulta a Nominatim filtrando a Argentina (countrycodes) y pidiendo más
// resultados. Devuelve siempre un array (vacío ante respuesta inesperada).
async function buscarEnNominatim(consulta) {
  const params = new URLSearchParams({
    format: 'json',
    q: consulta,
    limit: '8',
    addressdetails: '1',
    dedupe: '1',
    countrycodes: 'ar',
    'accept-language': 'es',
  });
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { 'User-Agent': 'MiCalendarioApp/1.0 (mi-calendario-project)' },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

// Proxy del buscador de direcciones (oculta Nominatim, normaliza y filtra AR).
app.get('/api/buscar-direccion', async (req, res) => {
  const { q } = req.query;

  // Validación del parámetro de búsqueda: debe ser un string de 3 a 200 chars.
  // Esto evita consultas vacías/basura y abuso del servicio externo.
  if (typeof q !== 'string' || q.length < 3 || q.length > 200) {
    return res.status(400).json({
      error: 'El parámetro "q" es obligatorio y debe tener entre 3 y 200 caracteres.'
    });
  }

  try {
    // Normalizamos abreviaturas y filtramos a Argentina (countrycodes=ar).
    const consulta = normalizarConsulta(q);
    let data = await buscarEnNominatim(consulta);
    // Fallback para POIs ("mcdonalds avenida cabildo"): reintenta con ", Argentina".
    if (data.length === 0 && !/argentina/i.test(consulta)) {
      data = await buscarEnNominatim(`${consulta}, Argentina`);
    }
    res.json(data);
  } catch (error) {
    console.error('Error al buscar dirección:', error);
    res.status(500).json({ error: 'Error al consultar el servicio de mapas.' });
  }
});

// ---------------------------------------------------------------------------
// Utilidades para generar archivos ICS (calendario) a mano según RFC 5545.
// No usamos dependencias externas: armamos el string nosotros.
// ---------------------------------------------------------------------------

// Escapa los caracteres especiales de un valor de texto ICS (RFC 5545 §3.3.11):
// backslash, coma, punto y coma se escapan; los saltos de línea pasan a "\n".
function escaparICS(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

// Convierte "YYYY-MM-DD" a "YYYYMMDD" (formato DATE de ICS para eventos de día completo).
function fechaSoloDia(fecha) {
  return String(fecha).replace(/-/g, '').slice(0, 8);
}

// Convierte "YYYY-MM-DD" + "HH:MM" a "YYYYMMDDTHHMMSS" (hora local, sin Z).
function fechaConHora(fecha, hora) {
  const dia = String(fecha).replace(/-/g, '').slice(0, 8);
  const hhmm = String(hora).replace(/:/g, '').slice(0, 4);
  return `${dia}T${hhmm}00`;
}

// Marca de tiempo en UTC para DTSTAMP: "YYYYMMDDTHHMMSSZ".
function ahoraUTC() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Genera el contenido completo de un VCALENDAR/VEVENT.
function generarICS(evento, invitados, organizador, presupuesto) {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@mi-calendario`;
  const dtstamp = ahoraUTC();

  // Si hay hora, usamos DTSTART/DTEND con fecha y hora local.
  // Si no, es un evento de día completo: VALUE=DATE.
  let dtStart;
  let dtEnd;
  const fechaFin = evento.fechaFin || evento.fechaInicio;
  if (evento.hora) {
    dtStart = `DTSTART:${fechaConHora(evento.fechaInicio, evento.hora)}`;
    dtEnd = `DTEND:${fechaConHora(fechaFin, evento.hora)}`;
  } else {
    dtStart = `DTSTART;VALUE=DATE:${fechaSoloDia(evento.fechaInicio)}`;
    dtEnd = `DTEND;VALUE=DATE:${fechaSoloDia(fechaFin)}`;
  }

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mi-calendario//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${escaparICS(evento.titulo)}`,
  ];

  // La DESCRIPTION del .ics combina las notas del evento y, solo si el
  // organizador lo eligió, la info de presupuesto.
  const partesDescripcion = [];
  if (evento.descripcion) partesDescripcion.push(evento.descripcion);
  if (presupuesto) partesDescripcion.push(`Presupuesto: ${presupuesto}`);
  if (partesDescripcion.length > 0) {
    lineas.push(`DESCRIPTION:${escaparICS(partesDescripcion.join('\n\n'))}`);
  }
  if (evento.ubicacion) {
    lineas.push(`LOCATION:${escaparICS(evento.ubicacion)}`);
  }
  if (organizador) {
    lineas.push(`ORGANIZER:mailto:${organizador}`);
  }
  for (const inv of invitados) {
    const nombre = inv.name ? `;CN=${escaparICS(inv.name)}` : '';
    lineas.push(`ATTENDEE;RSVP=TRUE${nombre}:mailto:${inv.email}`);
  }

  lineas.push('END:VEVENT', 'END:VCALENDAR');

  // RFC 5545 exige terminadores CRLF entre líneas.
  return lineas.join('\r\n');
}

// Regex de email razonable, igual criterio que el del frontend.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Consulta un registro DNS vía DNS-over-HTTPS (Google Public DNS). Usamos
// HTTPS en vez de una consulta UDP cruda (node:dns) porque muchas redes
// corporativas/firewalls bloquean DNS crudo pero sí dejan pasar HTTPS: así
// el chequeo funciona en más entornos, incluido el del propio usuario.
async function consultarDNS(dominio, tipo) {
  const resp = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(dominio)}&type=${tipo}`,
    { signal: AbortSignal.timeout(3000) }
  );
  if (!resp.ok) throw new Error(`DNS-over-HTTPS respondió ${resp.status}`);
  return resp.json();
}

// Devuelve true/false si pudo determinar que el dominio recibe correo, o
// null si no pudo verificar (timeout, red caída): en ese caso no bloqueamos.
async function existeDominioDeCorreo(dominio) {
  try {
    const mx = await consultarDNS(dominio, 'MX');
    if (mx.Status === 0 && Array.isArray(mx.Answer) && mx.Answer.length > 0) return true;
    if (mx.Status === 3) return false; // NXDOMAIN: el dominio no existe.
    // Sin MX: algunos dominios chicos reciben mail solo vía registro A/AAAA.
    const a = await consultarDNS(dominio, 'A');
    return a.Status === 0 && Array.isArray(a.Answer) && a.Answer.length > 0;
  } catch (error) {
    console.error('Error verificando dominio de email:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /api/verificar-email
// No existe forma confiable ni ética de confirmar que UNA casilla puntual
// "existe de verdad" sin mandarle un mail real (probing SMTP es abusivo, lo
// bloquean casi todos los proveedores, y da falsos positivos/negativos) ni
// sin pagar un servicio externo de verificación (requiere alta y API key
// del usuario). Lo que sí podemos chequear gratis y sin tocar datos de
// terceros: 1) el FORMATO del email, 2) si el DOMINIO tiene registros
// MX/A que indiquen que puede recibir correo (consulta DNS pública, igual
// a la que hace cualquier servidor de mail — no es un dato personal).
// ---------------------------------------------------------------------------
app.get('/api/verificar-email', async (req, res) => {
  const { email } = req.query;
  if (typeof email !== 'string' || email.length === 0 || email.length > 254) {
    return res.status(400).json({ error: 'El parámetro "email" es obligatorio.' });
  }

  const limpio = email.trim();
  const formatoValido = REGEX_EMAIL.test(limpio);
  if (!formatoValido) {
    return res.json({ formatoValido: false, dominioExiste: false });
  }

  const dominio = limpio.split('@')[1].toLowerCase();
  const dominioExiste = await existeDominioDeCorreo(dominio);
  return res.json({ formatoValido: true, dominioExiste });
});

// ---------------------------------------------------------------------------
// POST /api/enviar-invitacion
// Genera un .ics del evento y lo manda por email a los invitados vía Resend.
// ---------------------------------------------------------------------------
app.post('/api/enviar-invitacion', limiterInvitaciones, async (req, res) => {
  try {
    const { evento, invitados, organizador, presupuesto } = req.body || {};

    // --- Validación de entrada ---
    const errores = [];

    if (!evento || typeof evento !== 'object') {
      errores.push('Falta el objeto "evento".');
    } else {
      if (typeof evento.titulo !== 'string' || evento.titulo.trim().length === 0) {
        errores.push('El evento necesita un "titulo".');
      } else if (evento.titulo.length > 100) {
        errores.push('El "titulo" no puede superar los 100 caracteres.');
      }
      if (evento.descripcion && String(evento.descripcion).length > 1000) {
        errores.push('La "descripcion" no puede superar los 1000 caracteres.');
      }
      if (evento.ubicacion && String(evento.ubicacion).length > 200) {
        errores.push('La "ubicacion" no puede superar los 200 caracteres.');
      }
      if (!evento.fechaInicio || typeof evento.fechaInicio !== 'string') {
        errores.push('El evento necesita una "fechaInicio".');
      }
    }

    if (!Array.isArray(invitados) || invitados.length === 0) {
      errores.push('Se necesita al menos un invitado en "invitados".');
    } else {
      for (const inv of invitados) {
        if (!inv || typeof inv.email !== 'string' || !REGEX_EMAIL.test(inv.email.trim())) {
          errores.push(`Email de invitado inválido: ${inv && inv.email ? inv.email : '(vacío)'}.`);
        }
      }
    }

    if (organizador && (typeof organizador !== 'string' || !REGEX_EMAIL.test(organizador.trim()))) {
      errores.push('El "organizador" debe ser un email válido.');
    }

    // El presupuesto es opcional. Si viene, validamos tipo y largo.
    if (presupuesto !== undefined && presupuesto !== null && presupuesto !== '') {
      if (typeof presupuesto !== 'string') {
        errores.push('El "presupuesto" debe ser texto.');
      } else if (presupuesto.length > 200) {
        errores.push('El "presupuesto" no puede superar los 200 caracteres.');
      }
    }

    if (errores.length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }

    // --- Si no hay API key configurada, salimos prolijo (esperado en Fase 1) ---
    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({
        error: 'EMAIL_NO_CONFIGURADO',
        mensaje: 'Falta RESEND_API_KEY en server/.env'
      });
    }

    // --- Generamos el ICS y lo codificamos en base64 para el adjunto ---
    const ics = generarICS(evento, invitados, organizador, presupuesto);
    const icsBase64 = Buffer.from(ics, 'utf-8').toString('base64');

    const destinatarios = invitados.map((inv) => inv.email.trim());
    const titulo = evento.titulo.trim();

    // HTML simple con los datos del evento.
    const html = `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Invitación: ${escaparHTML(titulo)}</h2>
        <p><strong>Fecha de inicio:</strong> ${escaparHTML(evento.fechaInicio || '')}</p>
        ${evento.fechaFin ? `<p><strong>Fecha de fin:</strong> ${escaparHTML(evento.fechaFin)}</p>` : ''}
        ${evento.hora ? `<p><strong>Hora:</strong> ${escaparHTML(evento.hora)}</p>` : ''}
        ${evento.ubicacion ? `<p><strong>Ubicación:</strong> ${escaparHTML(evento.ubicacion)}</p>` : ''}
        ${evento.descripcion ? `<p><strong>Descripción:</strong> ${escaparHTML(evento.descripcion)}</p>` : ''}
        ${presupuesto ? `<p><strong>Presupuesto:</strong> ${escaparHTML(presupuesto)}</p>` : ''}
        <p>Se adjunta un archivo .ics para agregar el evento a tu calendario.</p>
      </div>
    `;

    // --- Enviamos vía Resend REST API con fetch nativo (sin SDK) ---
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: destinatarios,
        subject: `Invitación: ${titulo}`,
        html,
        attachments: [
          {
            filename: 'evento.ics',
            content: icsBase64,
            // Declarar el tipo como text/calendar con METHOD=REQUEST hace que
            // Gmail/Google Calendar muestren la tarjeta RSVP y agreguen el evento,
            // en vez de tratarlo como un adjunto genérico descargable.
            contentType: 'text/calendar; method=REQUEST; charset=utf-8'
          }
        ]
      })
    });

    if (!respuesta.ok) {
      // No exponemos el cuerpo crudo de Resend al cliente; lo logueamos del lado server.
      const detalle = await respuesta.text().catch(() => '');
      console.error('Error de Resend al enviar invitación:', respuesta.status, detalle);
      return res.status(502).json({ error: 'No se pudo enviar la invitación por email.' });
    }

    const data = await respuesta.json().catch(() => ({}));
    return res.json({ ok: true, id: data.id || null, enviadosA: destinatarios });
  } catch (error) {
    // Nunca exponemos el stack trace al cliente.
    console.error('Error inesperado en /api/enviar-invitacion:', error);
    return res.status(500).json({ error: 'Error interno al procesar la invitación.' });
  }
});

// Escapa HTML para evitar inyección en el cuerpo del email.
function escaparHTML(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.listen(PORT, () => {
  console.log(`Servidor de seguridad corriendo en http://localhost:${PORT}`);
});
