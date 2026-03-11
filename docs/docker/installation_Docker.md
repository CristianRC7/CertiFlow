# 🐳 Backend CertiFlow — Docker

## ✅ Lo único que necesitas instalar
- **Docker Desktop** — [descargar aquí](https://www.docker.com/products/docker-desktop/)
- Nada más. No necesitas XAMPP, PHP, MySQL ni Composer en tu PC.

> ⚠️ Antes de levantar Docker, asegúrate de **detener Apache y MySQL en XAMPP** desde su panel de control. Ambos usan los puertos 80 y 3306 que Docker necesita.

---

## 📁 Estructura del proyecto

La carpeta puede estar **en cualquier lugar de tu PC** (Desktop, Documentos, etc.), no necesita estar en `htdocs`.

```
certiflow/                    ← carpeta raíz (puede estar en cualquier lugar)
├── Dockerfile                ← imagen PHP 8.2 + Apache + Composer
├── docker-compose.yml        ← orquesta PHP, MySQL y phpMyAdmin
├── database/
│   └── init.sql              ← dump de tu BD (se importa automáticamente)
└── backend/                  ← tu código PHP (sincronizado en vivo con Docker)
    ├── .env                  ← ⚠️ IMPORTANTE: ver sección de configuración abajo
    ├── conexion.php
    └── src/
        ├── login.php
        ├── certificados.php
        ├── download.php
        ├── admin.php
        ├── certificates/     ← imágenes de certificados (se sincronizan en vivo)
        └── library/
            ├── composer.json
            └── vendor/       ← TCPDF y dependencias (generado con composer install)
```

---

## 🐳 ¿Qué levanta Docker?

El `docker-compose.yml` orquesta tres servicios conectados en una red interna (`certiflow_net`):

| Contenedor           | Imagen base         | Puerto         | Descripción                        |
|----------------------|---------------------|----------------|------------------------------------|
| `certiflow_backend`     | `php:8.2-apache`    | `80:80`        | Servidor PHP + Apache              |
| `certiflow_db`          | `mysql:8.0`         | `3306:3306`    | Base de datos MySQL                |
| `certiflow_phpmyadmin`  | `phpmyadmin:latest` | `8080:80`      | Panel visual de base de datos      |

### Dockerfile — ¿qué instala?
El `Dockerfile` construye la imagen del servidor PHP con todo lo que el proyecto necesita:

- **PHP 8.2** con Apache incluido
- **Extensiones PHP:** `pdo`, `pdo_mysql`, `gd` (imágenes), `mbstring`
- **Librerías del sistema:** `libpng`, `libjpeg`, `libfreetype` (para procesamiento de imágenes con TCPDF)
- **Composer 2** (gestor de dependencias PHP)
- **mod_rewrite** de Apache habilitado
- `AllowOverride All` para soporte de `.htaccess`

> El código PHP **no se copia** dentro de la imagen. En su lugar viene del volumen montado en `docker-compose.yml`, lo que permite sincronización en vivo.

---

## ⚙️ Configuración del archivo `.env`

Este es el cambio más importante al pasar de XAMPP a Docker.

**Con XAMPP** el `.env` era así:
```dotenv
DB_HOST=localhost       ← ❌ esto NO funciona en Docker
DB_NAME=certiflow
DB_USER=root
DB_PASS=
```

**Con Docker** debe quedar así:
```dotenv
DB_HOST=db             ← ✅ nombre del servicio MySQL en docker-compose.yml
DB_NAME=certiflow
DB_USER=root
DB_PASS=
```

**¿Por qué?** En Docker los servicios se comunican entre sí por nombre, no por `localhost`. El contenedor PHP no puede encontrar MySQL en `localhost` porque son contenedores separados — pero sí puede encontrarlo por el nombre `db` definido en `docker-compose.yml`.

---

## 🚀 Instalación y primer arranque

### 1. Obtener el proyecto
```bash
git clone https://github.com/CristianRC7/CertiFlow.git
cd certiflow
```
O descomprime el ZIP en cualquier carpeta de tu PC.

### 2. Configurar el `.env`
Edita `backend/.env` y cambia `DB_HOST=localhost` por `DB_HOST=db`.

### 3. Importar la base de datos (solo la primera vez)
Exporta tu BD desde phpMyAdmin de XAMPP **antes de cerrar XAMPP**:
- Abre `http://localhost/phpmyadmin`
- Selecciona `certiflow_certificados` → Exportar → formato SQL
- Guarda el archivo como `database/init.sql`

Este archivo se importa **automáticamente** la primera vez que Docker crea el contenedor MySQL. En los siguientes arranques, los datos ya están guardados en el volumen `db_data` y no se reimportan.

### 4. Detener XAMPP
Desde el panel de XAMPP detén **Apache** y **MySQL**.

### 5. Levantar los contenedores
```bash
docker compose up -d
```

### 6. Instalar TCPDF (solo la primera vez)
No necesitas Composer instalado en tu PC. Se ejecuta **dentro del contenedor**:
```bash
docker compose run --rm php composer install -d /var/www/html/certiflow/backend/src/library
```

### 7. Verificar que todo funciona

| Servicio      | URL                                                                         |
|---------------|-----------------------------------------------------------------------------|
| Backend PHP   | http://localhost/certiflow/backend/src/login.php                            |
| phpMyAdmin    | http://localhost:8080                                                       |
| MySQL externo | localhost:3306 (usuario: `root`, sin contraseña)                            |

---

## 🔗 Conexión con el Frontend

El frontend **no necesita ningún cambio**. La URL del `Config.js` funciona igual que con XAMPP:

```javascript
API_BASE_URL: 'http://localhost/certiflow/backend/src/'
```

Para levantar el proyecto completo abre **dos terminales**:

```bash
# Terminal 1 — Backend Docker
docker compose up -d

# Terminal 2 — Frontend Astro
cd frontend
npm run dev
```

---

## ✏️ Sincronización en vivo (el "espejo")

En `docker-compose.yml` hay esta línea:
```yaml
volumes:
  - ./backend:/var/www/html/certiflow/backend
```

Significa:
```
./backend (tu PC)   →   /var/www/html/certiflow/backend (contenedor)
      ↑                              ↑
  Editas aquí             Se refleja aquí al instante
```

Cualquier cambio que hagas en `backend/` se refleja **instantáneamente** en el contenedor sin reiniciarlo. Funciona para editar PHP, subir imágenes de certificados, o agregar librerías con Composer.

---

## 🔄 Comandos útiles del día a día

```bash
# Levantar contenedores en segundo plano
docker compose up -d

# Ver logs en tiempo real del servidor PHP
docker compose logs -f php

# Instalar dependencias de Composer dentro del contenedor
docker compose run --rm php composer install -d /var/www/html/certiflow/backend/src/library

# Entrar al contenedor PHP (como una terminal SSH)
docker exec -it certiflow_backend bash

# Detener contenedores (sin borrar datos)
docker compose stop

# Detener y borrar contenedores (datos de MySQL se conservan en el volumen)
docker compose down

# Borrar TODO incluyendo la base de datos ⚠️
docker compose down -v
```

---

## 🐛 Problemas comunes

**"Error de conexión a BD"**
→ Verifica que `backend/.env` tenga `DB_HOST=db` y no `DB_HOST=localhost`

**"TCPDF not found"**
→ Corre el paso 6: `docker compose run --rm php composer install -d /var/www/html/certiflow/backend/src/library`

**"Puerto 80 ya está en uso"**
→ Detén Apache de XAMPP desde su panel de control

**"Puerto 3306 ya está en uso"**
→ Detén MySQL de XAMPP desde su panel de control

**"La BD está vacía / tablas no existen"**
→ Asegúrate de haber colocado el dump SQL en `database/init.sql` **antes** del primer `docker compose up -d`. Si ya levantaste los contenedores sin el archivo, ejecuta `docker compose down -v` y vuelve a levantarlos con el archivo en su lugar.