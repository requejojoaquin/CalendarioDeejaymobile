# Puesta en marcha y pruebas — mi-calendario

Guía para desplegar la seguridad y verificar todas las funciones. Seguila en orden.

---

## 1. Variables de entorno (local)

Ya tenés `.env` (frontend) y `server/.env` (backend). Si clonás en otra máquina, copiá las plantillas:

```bash
cp .env.example .env                 # completá tus claves VITE_FIREBASE_*
cp server/.env.example server/.env   # PORT, ALLOWED_ORIGINS, (RESEND_API_KEY opcional)
```

Frontend `.env` necesita además: `VITE_API_URL=http://localhost:5000`.

---

## 2. Correr la app en local

```bash
npm install
npm run dev      # levanta frontend (Vite ~5173) + backend (Express 5000) juntos
```

> Si el 5173 está ocupado Vite usa 5174. Asegurate de que ese origen esté en `ALLOWED_ORIGINS` de `server/.env`.

---

## 3. Desplegar las reglas de seguridad de Firestore  ⚠️ IMPRESCINDIBLE

Sin esto, la seguridad (ocultar presupuesto, bloquear a trabajadores) **no está activa** en tu proyecto.

```bash
npm i -g firebase-tools
firebase login
# Editá .firebaserc y reemplazá TU_PROJECT_ID por tu Project ID real
#   (lo ves en .env -> VITE_FIREBASE_PROJECT_ID o en la consola de Firebase)
firebase deploy --only firestore:rules
# (opcional) índices:
firebase deploy --only firestore:indexes
```

Qué garantizan las reglas (`firestore.rules`):
- `eventos`: cualquiera logueado **lee**; **solo admin crea/edita/borra**.
- `presupuestos`: **solo admin lee/escribe** → un trabajador NO puede ver presupuestos ni desde la consola del navegador (no es solo ocultarlo en la UI).
- `calendarios`: logueados leen; solo admin escribe.
- `logs`: append-only; solo admin lee.
- `users`: cada uno lee lo suyo, admin lee todo; escritura bloqueada (se gestiona desde consola).

---

## 4. Crear usuarios y asignar roles

Para cada persona (cliente, socia, trabajadores):

1. **Authentication → Users → Add user** (email + contraseña).
2. Copiá el **UID** que se genera.
3. **Firestore → colección `users` → Add document** con **ID = ese UID** y campos:
   - `email` (string) — el mismo email
   - `name` (string) — nombre visible
   - `role` (string) — **`admin`** (cliente y socia) o **`trabajador`** (empleados)

> El rol se lee en login. `admin` = CRUD completo + ve presupuestos. `trabajador` = solo lectura, sin presupuestos, sin papelera, sin crear/editar/borrar.

---

## 5. (Opcional) Email de invitaciones — Resend

Hoy el endpoint responde 503 (inerte) hasta que cargues la clave:

1. Crear cuenta en https://resend.com y generar una API key.
2. En `server/.env`:
   - `RESEND_API_KEY=re_xxx`
   - `FROM_EMAIL=Calendario <onboarding@resend.dev>` (o tu dominio verificado)
3. Reiniciar el backend. Al crear un evento con invitados, cada uno recibe un mail con un `.ics` para añadir a Google/Apple/Outlook.

---

## 6. Checklist de pruebas funcionales

Logueate como **admin** y probá:
- [ ] Crear evento (título, fecha/hora, calendario+color, ubicación, descripción, invitados). Aparece en la grilla.
- [ ] Presupuesto: cargás un monto → se guarda en `presupuestos` (verificá en consola Firestore que el doc del evento NO tiene `precio`).
- [ ] Editar evento; cambia en la grilla.
- [ ] Borrar evento → va a **Papelera** (Ajustes → Papelera), no se elimina.
- [ ] En Papelera: restaurar y eliminar definitivo / vaciar.
- [ ] Crear/editar color/eliminar calendario (se guarda en Firestore, ya no en localStorage).
- [ ] Cambiar vistas Mes/Semana/Día/Año (incl. eventos multi-día y de todo el día).
- [ ] Modo claro/oscuro (Ajustes → Aspecto).
- [ ] Buscador de eventos.

Logueate como **trabajador** y verificá (seguridad):
- [ ] NO ve botón Crear, ni añadir/editar/eliminar calendario, ni Papelera.
- [ ] NO puede editar/eliminar eventos (sin botones en el visor).
- [ ] **NO ve el presupuesto** en ningún evento.
- [ ] En la consola del navegador, intentar leer `presupuestos` da `permission-denied` (lo bloquean las reglas, no solo la UI).

---

## 7. Estado de seguridad implementado

✅ Claves Firebase y de email por **variables de entorno** (`.env`, nunca en el navegador la de Resend).
✅ **Rate limiting** 100/15min global + 30/15min en el endpoint de invitaciones (Express).
✅ **CORS** restringido por `ALLOWED_ORIGINS`.
✅ **Validación de inputs** (cliente con `utils/validacion.js` + servidor en el endpoint).
✅ **Reglas Firestore** reales (control de acceso por rol; presupuesto en colección separada solo-admin).
✅ Soft-delete (papelera) en vez de borrado directo.

---

## 8. Pendiente / Fase 2 (cuando quieras)

- **Sincronización 2 vías con Google Calendar** (leer eventos que le mandan a tu cliente + crear invitaciones reales de Google): requiere proyecto en Google Cloud + pantalla OAuth + que cada admin conecte su Google. Es un sub-proyecto aparte.
- **Verificación del ID token de Firebase en el backend** antes de enviar emails (hoy el backend valida inputs + CORS + rate-limit; agregar `firebase-admin` con service account lo endurece más).
- **Logout**: la app no tiene botón de cerrar sesión todavía (fácil de agregar).
- Despliegue del backend Express (Render/Railway gratis) y del frontend (Firebase Hosting: `firebase deploy --only hosting` tras `npm run build`).
