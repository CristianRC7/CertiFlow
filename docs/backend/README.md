# Backend — Sistema de Certificados

## Estructura del Backend

```
backend/
├── .env                        ← Variables de entorno
├── conexion.php                ← Clase de conexión a la base de datos
└── src/
    ├── login.php               ← Endpoint de autenticación de usuarios
    ├── certificados.php        ← Endpoint para obtener certificados de un usuario
    ├── download.php            ← Endpoint para generar y descargar certificados en PDF
    ├── admin.php               ← Router principal del panel de administración
    ├── handlers/               ← Lógica de negocio separada por dominio
    │   ├── UsuariosHandler.php     ← Usuarios, admins y carga masiva de usuarios
    │   ├── EventosHandler.php      ← Eventos, imágenes y campos de certificado
    │   └── ParticipacionesHandler.php ← Participaciones y carga masiva desde CSV
    ├── certificates/           ← Imágenes de fondo de certificados (JPG/PNG)
    └── library/
        ├── composer.json       ← Dependencias PHP (TCPDF)
        └── vendor/             ← Librerías instaladas (generado con composer install)
```

---

## Descripción de archivos

### `.env`
Archivo de configuración con las credenciales de la base de datos. **No debe subirse al repositorio.**

```env
DB_HOST=localhost
DB_NAME=nombre_base_de_datos
DB_USER=usuario
DB_PASS=contraseña
```

---

### `conexion.php`
Clase `Database` que gestiona la conexión a MySQL mediante PDO. Lee las credenciales desde el archivo `.env` y expone el método `getConnection()` que todos los endpoints utilizan.

---

### `src/login.php`
**Método:** `POST`  
**Descripción:** Autentica a un usuario con su nombre de usuario y contraseña (almacenada como MD5). Devuelve los datos del usuario y un indicador de si tiene permisos de administrador.

**Body esperado (JSON):**
```json
{
  "usuario": "nombre_de_usuario",
  "contrasena": "contraseña_en_texto_plano"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "nombre": "Cristian David",
    "apellido": "Ramirez Callejas",
    "usuario": "636443",
    "is_admin": false
  }
}
```

---

### `src/certificados.php`
**Método:** `POST`  
**Descripción:** Devuelve la lista de certificados asociados a un usuario, incluyendo el nombre del evento, número de certificado, estado de pago e imagen de fondo del certificado.

**Body esperado (JSON):**
```json
{
  "usuario_id": 1
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "total": 2,
  "certificados": [
    {
      "nro_certificado": "CERT-001",
      "evento_id": 3,
      "estado_pago": "pagado",
      "nombre_evento": "Jets 2024",
      "imagen_certificado": "archivo.jpg",
      "nombre": "Cristian David",
      "apellido": "Ramirez Callejas"
    }
  ]
}
```

---

### `src/download.php`
**Método:** `GET`  
**Descripción:** Genera y descarga un certificado en formato PDF. Usa TCPDF para renderizar la imagen de fondo del evento y superponer el nombre del participante y número de certificado en las posiciones configuradas desde el panel de administración. Solo permite la descarga si el estado de pago es `pagado`.

**Parámetros de URL:**
```
?userId=1&eventoId=3&certificateId=CERT-001
```

**Notas:**
- Las posiciones del texto se almacenan como porcentaje (x_pct, y_pct) relativo al tamaño de la imagen.
- Las dimensiones del PDF se calculan automáticamente en base al tamaño real de la imagen del evento (orientación dinámica).
- Campos soportados: `nombre_apellido`, `apellido_nombre`, `nro_certificado`.

---

### `src/admin.php`
**Método:** `POST`  
**Descripción:** Punto de entrada único del panel de administración. Actúa como router: valida que el solicitante sea un administrador activo (`admin_user_id`) y delega cada acción al handler correspondiente.

**Arquitectura interna:**

```
admin.php (router ~212 líneas)
  ├── UsuariosHandler     → obtener, agregar, editar, eliminar, dar/quitar admin, CSV masivo
  ├── EventosHandler      → obtener, agregar, editar, eliminar, imagen, campos certificado
  └── ParticipacionesHandler → obtener, agregar, editar, eliminar, CSV masivo
```

**Acciones disponibles:**

| `action`                              | Handler                  | Descripción                                                        |
|---------------------------------------|--------------------------|--------------------------------------------------------------------|
| `obtener_usuarios`                    | UsuariosHandler          | Lista paginada con búsqueda por nombre, apellido o usuario         |
| `agregar_usuario`                     | UsuariosHandler          | Crea un nuevo usuario                                              |
| `editar_usuario`                      | UsuariosHandler          | Edita nombre, apellido, usuario y/o contraseña                     |
| `eliminar_usuario`                    | UsuariosHandler          | Elimina un usuario junto con sus participaciones y permisos        |
| `dar_admin`                           | UsuariosHandler          | Promueve un usuario a administrador con un código                  |
| `quitar_admin`                        | UsuariosHandler          | Remueve los privilegios de administrador de un usuario             |
| `verificar_codigo_admin`              | UsuariosHandler          | Verifica el código secreto de un administrador al iniciar sesión   |
| `subir_usuarios_archivo`              | UsuariosHandler          | Carga masiva de usuarios desde un archivo CSV                      |
| `obtener_usuarios_eventos_referencia` | UsuariosHandler          | Devuelve usuarios (no admin) y eventos para generar Excel de referencia |
| `obtener_participaciones_usuario`     | ParticipacionesHandler   | Lista las participaciones de un usuario en eventos                 |
| `agregar_participacion`               | ParticipacionesHandler   | Asigna un usuario a un evento con su número de certificado         |
| `editar_participacion`                | ParticipacionesHandler   | Edita el número de certificado o estado de pago                    |
| `eliminar_participacion`              | ParticipacionesHandler   | Elimina una participación                                          |
| `subir_participaciones_archivo`       | ParticipacionesHandler   | Carga masiva de participaciones desde un archivo CSV               |
| `obtener_eventos`                     | EventosHandler           | Lista paginada de todos los eventos                                |
| `agregar_evento`                      | EventosHandler           | Crea un evento y opcionalmente sube su imagen de certificado       |
| `editar_evento`                       | EventosHandler           | Edita un evento y/o reemplaza su imagen                            |
| `eliminar_evento`                     | EventosHandler           | Elimina un evento (solo si no tiene participaciones)               |
| `eliminar_imagen_evento`              | EventosHandler           | Elimina solo la imagen de un evento y sus campos de posición       |
| `obtener_campos_evento`               | EventosHandler           | Obtiene los campos de posición configurados para un evento         |
| `guardar_campos_evento`               | EventosHandler           | Guarda o actualiza posiciones de campos (upsert)                   |
| `eliminar_campo_evento`               | EventosHandler           | Elimina un campo de posición específico                            |

**Ejemplo de body (JSON):**
```json
{
  "action": "agregar_usuario",
  "admin_user_id": 1,
  "user_data": {
    "nombre": "Ana",
    "apellido": "García",
    "usuario": "agarcia",
    "contrasena": "123456"
  }
}
```

---

### `src/handlers/UsuariosHandler.php`
Gestiona todo lo relacionado con usuarios y permisos de administrador. Incluye:
- CRUD completo de usuarios con validaciones de duplicados y longitud de campos.
- Verificación y asignación de permisos de administrador.
- Carga masiva desde CSV con reporte de errores por fila.
- Generación de datos de referencia (usuarios no-admin + eventos) para el Excel de ayuda.

---

### `src/handlers/EventosHandler.php`
Gestiona eventos, imágenes de certificado y configuración visual de campos. Incluye:
- CRUD completo de eventos.
- Subida, reemplazo y eliminación de imágenes de certificado (validación de tipo, tamaño y lectura de dimensiones reales).
- Al cambiar una imagen, elimina automáticamente los campos de posición configurados (ya no son válidos).
- Gestión de campos de posición por evento: guardar (upsert), obtener y eliminar campos individuales.

---

### `src/handlers/ParticipacionesHandler.php`
Gestiona las participaciones de usuarios en eventos. Incluye:
- CRUD completo con validaciones: existencia de usuario y evento, duplicados de certificado y de participación.
- Carga masiva desde CSV: valida cada fila independientemente, acumula errores sin detener el proceso y devuelve un reporte con contadores de exitosos, duplicados y errores.

**Formato del CSV para carga masiva de participaciones:**
```
usuario, evento_id, nro_certificado, estado_pago
636443, 3, CERT-001, pagado
636444, 3, CERT-002, pendiente
636443, 5, CERT-010, pagado
```

---

### `src/certificates/`
Carpeta donde se almacenan físicamente las imágenes de fondo de los certificados (JPG/PNG). Los archivos se guardan con nombres únicos generados automáticamente al crear o editar un evento desde el panel de administración.

---

### `src/library/`
Contiene las dependencias PHP del backend.

- **`composer.json`** — Define las dependencias del proyecto. Actualmente incluye `tecnickcom/tcpdf` para la generación de PDFs.
- **`vendor/`** — Directorio generado por Composer con todas las librerías instaladas. No debe subirse al repositorio; se genera ejecutando:

```bash
cd backend/src/library
composer install
```

---

## Tablas de base de datos utilizadas

| Tabla             | Descripción                                                                    |
|-------------------|--------------------------------------------------------------------------------|
| `usuarios`        | Usuarios registrados en el sistema                                             |
| `administradores` | Usuarios con permisos de administrador y su código secreto                     |
| `eventos`         | Eventos disponibles con su imagen de certificado y dimensiones                 |
| `participaciones` | Relación entre usuarios y eventos, con número de certificado y estado de pago  |
| `evento_campos`   | Posiciones (en %) y estilos de texto configurados por evento para el PDF       |

---

## Seguridad

- Los errores de PHP no se exponen al cliente (`error_reporting(0)`).
- Las contraseñas y códigos de administrador se almacenan como MD5.
- Se aplican headers de seguridad estándar en todos los endpoints (`X-Frame-Options`, `X-XSS-Protection`, etc.).
- Las rutas de archivo de imágenes son validadas con `realpath()` para prevenir path traversal.
- Los números de certificado aceptan únicamente caracteres alfanuméricos, guiones y guiones bajos.
- Toda acción en `admin.php` verifica que `admin_user_id` corresponda a un administrador activo en la BD antes de ejecutarse. La única excepción es `verificar_codigo_admin`, que es el propio mecanismo de autenticación al panel.