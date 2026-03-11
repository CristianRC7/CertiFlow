# Frontend — Sistema de Certificados

## Estructura del Frontend

```
frontend/
├── .env                            ← Variables de entorno (URL base de la API)
├── package.json                    ← Dependencias y scripts del proyecto
└── src/
    ├── styles/
    │   └── global.css              ← Estilos globales (importa Tailwind CSS)
    ├── utils/
    │   └── Config.js               ← Configuración centralizada de endpoints de la API
    ├── pages/
    │   ├── index.astro             ← Página principal (login)
    │   └── admin-panel.astro       ← Página del panel de administración (protegida)
    └── components/
        ├── LoginPage.jsx           ← Pantalla de login y descarga de certificados
        ├── AdminDashboard.jsx      ← Layout principal del panel admin (navbar + secciones)
        ├── AdminPanel.jsx          ← Sección de gestión de usuarios
        ├── EventsPanel.jsx         ← Sección de gestión de eventos
        ├── Modal.jsx               ← Componente modal base reutilizable
        ├── UserModal.jsx           ← Modal CRUD de usuarios (agregar/editar/eliminar)
        ├── ModalParticipaciones.jsx← Modal para gestionar participaciones de un usuario
        └── ModalPosicionCampos.jsx ← Editor visual de posición de campos en el certificado
```

---

## Descripción de archivos

### `.env`
Contiene la URL base de la API del backend. **No debe subirse al repositorio.**

```env
VITE_API_BASE_URL=https://tu-dominio.com/backend/src/
```

---

### `package.json`
Define las dependencias y scripts del proyecto. Stack principal:

| Paquete              | Versión   | Uso                                                    |
|----------------------|-----------|--------------------------------------------------------|
| `astro`              | ^5.16.3   | Framework principal (SSR + páginas)                    |
| `@astrojs/react`     | ^4.4.2    | Integración de React en Astro                          |
| `react`              | ^19.2.0   | Librería de UI                                         |
| `tailwindcss`        | ^4.1.17   | Estilos utilitarios                                    |
| `@tailwindcss/vite`  | ^4.1.17   | Plugin de Tailwind para Vite                           |
| `lucide-react`       | ^0.555.0  | Íconos                                                 |
| `sonner`             | ^2.0.7    | Notificaciones toast                                   |
| `xlsx`               | ^0.18.5   | Generación de archivos Excel (.xlsx) en el navegador   |

**Scripts disponibles:**
```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Vista previa del build
```

---

### `src/styles/global.css`
Punto de entrada de estilos. Únicamente importa Tailwind CSS v4.

---

### `src/utils/Config.js`
Objeto de configuración centralizado que expone la URL base de la API y los endpoints disponibles. Lee `VITE_API_BASE_URL` desde el `.env` y, si no existe, usa `http://localhost/certiflow/backend/src/` como fallback.

**Métodos disponibles:**
- `Config.getLoginUrl()` → URL del endpoint de login
- `Config.getCertificadosUrl()` → URL del endpoint de certificados
- `Config.getDownloadUrl()` → URL del endpoint de descarga PDF
- `Config.getAdminUrl()` → URL del endpoint de administración
- `Config.getCertificatesImageUrl(filename)` → URL de una imagen de certificado

---

### `src/pages/index.astro`
Página raíz del sitio (`/`). Renderiza el componente `LoginPage` en modo `client:only="react"`. No realiza ninguna verificación de sesión en el servidor.

---

### `src/pages/admin-panel.astro`
Página protegida (`/admin-panel`). Antes de renderizar, verifica en el servidor que la cookie `adminSession` exista y que el usuario sea un administrador verificado. Si no cumple las condiciones, redirige a `/`.

---

### `src/components/LoginPage.jsx`
Pantalla inicial del sistema. Cumple dos funciones:

1. **Login:** Permite al usuario autenticarse con usuario y contraseña. Si el usuario es administrador, solicita además un código secreto de verificación. Guarda la sesión en `localStorage` y en una cookie.
2. **Descarga de certificados:** Una vez autenticado, muestra la lista de certificados del usuario con su estado de pago. Los certificados con estado `pagado` permiten descargar el PDF.

---

### `src/components/AdminDashboard.jsx`
Layout principal del panel de administración. Contiene el header con logo, la navbar de navegación entre secciones y el botón de cerrar sesión. Renderiza `AdminPanel` o `EventsPanel` según la sección activa.

**Secciones disponibles:**
- `usuarios` → renderiza `AdminPanel`
- `eventos` → renderiza `EventsPanel`

Al cargar, verifica que la sesión en `localStorage` sea válida y que el usuario sea un administrador verificado. Si no, redirige a `/`.

---

### `src/components/AdminPanel.jsx`
Panel de gestión de usuarios. Permite al administrador:

- Listar todos los usuarios con paginación (20 por página) y búsqueda en tiempo real por nombre, apellido o usuario (se activa con botón **Buscar** o tecla Enter).
- Agregar, editar y eliminar usuarios individualmente.
- Carga masiva de usuarios desde un archivo CSV (botón **Subir Archivo**).
- Registrar participaciones en eventos de forma masiva (botón **Registrar en Eventos**):
  - Descarga un Excel de referencia con dos pestañas: **Usuarios** (con el campo `usuario` de cada estudiante) y **Eventos** (con sus IDs), para facilitar la preparación del CSV.
  - Sube un CSV con columnas `usuario`, `evento_id`, `nro_certificado`, `estado_pago` y muestra un panel de resultados con contadores de registradas, duplicados y errores por fila.
- Ver y gestionar las participaciones de cada usuario en eventos.
- Promover o remover permisos de administrador a un usuario.

---

### `src/components/EventsPanel.jsx`
Panel de gestión de eventos. Permite al administrador:

- Listar todos los eventos con paginación y búsqueda por nombre.
- Agregar, editar y eliminar eventos.
- Subir y reemplazar la imagen de fondo del certificado de cada evento.
- Acceder al editor visual de posición de campos (`ModalPosicionCampos`).
- Ver el indicador de si un evento ya tiene campos de posición configurados.

---

### `src/components/Modal.jsx`
Componente modal base completamente reutilizable. Todos los demás modales del sistema lo utilizan como esqueleto visual.

**Props disponibles:**

| Prop          | Tipo        | Default           | Descripción                                      |
|---------------|-------------|-------------------|--------------------------------------------------|
| `isOpen`      | `boolean`   | —                 | Controla visibilidad del modal                   |
| `onClose`     | `function`  | —                 | Callback al cerrar                               |
| `title`       | `string`    | —                 | Título del header                                |
| `icon`        | `ReactNode` | —                 | Ícono en el header                               |
| `iconBg`      | `string`    | `bg-[#cf152d]/10` | Clase Tailwind para fondo del ícono              |
| `maxWidth`    | `string`    | `max-w-md`        | Clase Tailwind de ancho máximo                   |
| `backdrop`    | `string`    | `bg-black/50`     | Clase Tailwind del overlay de fondo              |
| `zIndex`      | `string`    | `z-50`            | Clase Tailwind de z-index                        |
| `scrollable`  | `boolean`   | `false`           | Habilita scroll interno para contenido largo     |
| `titleAction` | `ReactNode` | —                 | Elemento extra junto al botón cerrar             |
| `children`    | `ReactNode` | —                 | Contenido del modal                              |

---

### `src/components/UserModal.jsx`
Modal CRUD para usuarios. Soporta tres modos controlados por la prop `mode`:

- **`add`** — Formulario para crear un nuevo usuario (nombre, apellido, usuario, contraseña requerida)
- **`edit`** — Formulario para editar un usuario existente (contraseña opcional)
- **`delete`** — Pantalla de confirmación para eliminar un usuario

Incluye validación de campos en el cliente y toggle para mostrar/ocultar contraseña.

---

### `src/components/ModalParticipaciones.jsx`
Modal para gestionar las participaciones de un usuario en eventos. Permite:

- Ver todas las participaciones del usuario (evento, número de certificado, estado de pago).
- Agregar una nueva participación a un evento.
- Editar el número de certificado y el estado de pago de una participación existente.
- Eliminar una participación.
- Descargar el certificado en PDF de participaciones con estado `pagado`.

---

### `src/components/ModalPosicionCampos.jsx`
Editor visual interactivo para configurar la posición de los campos de texto en el certificado. Muestra la imagen de fondo del evento y permite al administrador hacer clic o arrastrar para posicionar los campos. Las posiciones se guardan como porcentaje (x_pct, y_pct) relativo al tamaño real de la imagen, para que sean independientes de la resolución.

**Campos configurables:**
- `nombre_apellido` — Nombre completo (Nombre + Apellido)
- `apellido_nombre` — Nombre completo invertido (Apellido + Nombre)
- `nro_certificado` — Número de certificado

También permite configurar tamaño de fuente y estilo (`Normal`, `Negrita`, `Cursiva`, `Negrita+Cursiva`) para cada campo de forma independiente.