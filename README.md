# 🎓 Sistema de Certificados — CertiFlow

Sistema web para la gestión y descarga de certificados de participación en eventos. Los usuarios pueden autenticarse y descargar sus certificados en PDF; los administradores pueden gestionar usuarios, eventos, participaciones y configurar visualmente la posición de los campos en cada certificado.

---

## 📁 Estructura del proyecto

```
CertiFlow-proyecto/
├── Dockerfile                    ← Imagen PHP 8.2 + Apache + Composer
├── docker-compose.yml            ← Orquesta PHP, MySQL y phpMyAdmin
├── database/
│   ├── init.sql                  ← Dump de la BD (se importa automáticamente en Docker)
│   └── backup/                   ← Backups generados por main.py (creada automáticamente)
├── backend/                      ← API REST en PHP
│   ├── .env                      ← Credenciales de BD (no subir al repo)
│   ├── conexion.php
│   └── src/
│       ├── login.php
│       ├── certificados.php
│       ├── download.php
│       ├── admin.php             ← Router principal (delega a los handlers)
│       ├── handlers/             ← Lógica de negocio separada por dominio
│       │   ├── UsuariosHandler.php
│       │   ├── EventosHandler.php
│       │   └── ParticipacionesHandler.php
│       ├── certificates/
│       └── library/
├── frontend/                     ← Interfaz web (Astro + React + Tailwind)
│   ├── .env                      ← URL de la API (no subir al repo)
│   ├── package.json
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── styles/
│       └── utils/
├── utils/                        ← Herramientas de mantenimiento
│   ├── .env                      ← Configuración para los scripts
│   ├── requirements.txt          ← Dependencias Python (python-dotenv)
│   └── main.py                   ← Script interactivo de gestión de la BD
└── docs/
    ├── backend/
    │   └── README.md             ← Documentación del backend
    ├── frontend/
    │   └── README.MD             ← Documentación del frontend
    └── docker/
        └── installation_Docker.md← Guía de instalación con Docker
```

---

## 🧩 Componentes del sistema

| Componente        | Tecnología               | Descripción                                                |
|-------------------|--------------------------|------------------------------------------------------------|
| **Backend**       | PHP 8.2 + PDO + TCPDF    | API REST para autenticación, certificados y administración |
| **Frontend**      | Astro + React + Tailwind | Interfaz de usuario (login, descarga de PDFs, panel admin) |
| **Base de datos** | MySQL 8.0                | Usuarios, eventos, participaciones y configuraciones       |
| **Docker**        | Docker Compose           | Entorno de desarrollo local reproducible                   |
| **Utils**         | Python 3                 | Scripts de mantenimiento de la base de datos               |

---

## 🚀 Inicio rápido

### Prerrequisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (para el frontend)

### 1. Clonar el repositorio
```bash
git clone https://github.com/CristianRC7/CertiFlow.git
cd CertiFlow
```

### 2. Configurar variables de entorno

**Backend** — edita `backend/.env`:
```dotenv
DB_HOST=db
DB_NAME=certiflow
DB_USER=root
DB_PASS=
```

**Frontend** — edita `frontend/.env`:
```dotenv
VITE_API_BASE_URL=http://localhost/certiflow/backend/src/
```

### 3. Preparar la base de datos
Coloca el dump SQL exportado desde tu entorno anterior en:
```
database/init.sql
```

### 4. Levantar el backend con Docker
```bash
docker compose up -d
```

### 5. Instalar dependencias de PHP (solo la primera vez)
```bash
docker compose run --rm php composer install -d /var/www/html/certiflow/backend/src/library
```

### 6. Levantar el frontend
```bash
cd frontend
npm install
npm run dev
```

### 7. Verificar servicios

| Servicio    | URL                                                        |
|-------------|------------------------------------------------------------|
| Frontend    | http://localhost:4321                                      |
| Backend PHP | http://localhost/certiflow/backend/src/login.php           |
| phpMyAdmin  | http://localhost:8080                                      |
| MySQL       | localhost:3306 (usuario: `root`, sin contraseña)           |

---

## 🔧 Utils — Herramientas de mantenimiento

La carpeta `utils/` contiene scripts de soporte para gestionar la base de datos.

### `main.py`
Script interactivo con un menú de tres opciones para gestionar la base de datos. Funciona tanto en entornos Docker como en servidores directos (XAMPP, hosting, etc.).

**Opciones del menú:**
1. **Cargar datos iniciales** — Elimina todas las tablas e importa `database/init.sql` desde cero. Útil después de un `git pull` con cambios en la estructura de la BD.
2. **Crear backup** — Genera un dump SQL con fecha y hora en `database/backup/`. Usa `mysqldump` con transacción consistente.
3. **Restaurar desde backup** — Lista los backups disponibles ordenados por fecha y permite seleccionar cuál importar.

**Configuración** — edita `utils/.env`:
```dotenv
# Docker
CONTAINER_NAME=certiflow_db
DOCKER_DB_NAME=certiflow
DOCKER_DB_USER=root
DOCKER_DB_PASS=

# Servidor directo (XAMPP / hosting)
SERVER_DB_HOST=localhost
SERVER_DB_NAME=certiflow
SERVER_DB_USER=root
SERVER_DB_PASS=

INIT_SQL_PATH=../database/init.sql
BACKUP_DIR=../database/backup
```

**Uso:**
```bash
cd utils
pip install -r requirements.txt
python main.py
```

El script pregunta en qué entorno ejecutar (Docker o servidor directo) antes de cada operación y solicita confirmación antes de realizar cambios destructivos.

> ⚠️ Las opciones de carga inicial y restauración **borran todos los datos actuales** de la BD. Úsalas solo en entorno de desarrollo o con un backup reciente.

---

## 📚 Documentación detallada

| Sección  | Archivo                                                                              |
|----------|--------------------------------------------------------------------------------------|
| Backend  | [docs/backend/README.md](docs/backend/README.md)                                     |
| Frontend | [docs/frontend/README.MD](docs/frontend/README.MD)                                   |
| Docker   | [docs/docker/installation_Docker.md](docs/docker/installation_Docker.md)             |

---

## 🐛 Problemas comunes

**"Error de conexión a BD"**
→ Verifica que `backend/.env` tenga `DB_HOST=db` y no `DB_HOST=localhost`

**"Puerto 80 o 3306 en uso"**
→ Detén Apache y MySQL de XAMPP desde su panel de control

**"TCPDF not found"**
→ Ejecuta el paso 5 del inicio rápido para instalar dependencias con Composer

**"Tablas no existen / BD vacía"**
→ Asegúrate de tener `database/init.sql` antes del primer `docker compose up -d`, o usa `main.py` opción 1

**"El frontend no llega al backend"**
→ Verifica que `VITE_API_BASE_URL` en `frontend/.env` apunte a la URL correcta