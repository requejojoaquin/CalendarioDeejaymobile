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

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json());

// Ejemplo de ruta segura que oculta lógica del backend
app.get('/api/status', (req, res) => {
  res.json({ status: 'Servidor funcionando correctamente y protegido.' });
});

// Ejemplo: Proxy para ocultar APIs externas (como el buscador de direcciones)
app.get('/api/buscar-direccion', async (req, res) => {
  const { q } = req.query;
  try {
    // Agregamos User-Agent para cumplir con la política de Nominatim
    // Priorizamos Argentina usando un viewbox (caja delimitadora) pero sin restringir (bounded=0)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&viewbox=-73.5,-21.8,-53.6,-55.2&bounded=0`, {
      headers: {
        'User-Agent': 'MiCalendarioApp/1.0 (mi-calendario-project)'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error al buscar dirección:', error);
    res.status(500).json({ error: 'Error al consultar el servicio de mapas.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de seguridad corriendo en http://localhost:${PORT}`);
});
