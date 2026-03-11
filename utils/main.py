"""
Herramienta de gestión de base de datos - CertiFlow

Uso:
    1. Crear entorno virtual (solo la primera vez):
        python -m venv .venv

        macOS:
        python3 -m venv .venv

    2. Activar el entorno virtual:
        - Windows (CMD):        .venv\\Scripts\\activate.bat
        - Windows (PowerShell): .venv\\Scripts\\Activate.ps1
        - macOS / Linux:        source .venv/bin/activate

    3. Instalar dependencias (con el entorno activado):
        pip install -r requirements.txt

    4. Ejecutar el script:
        python main.py

    5. (Opcional) Desactivar el entorno virtual al terminar:
        deactivate

Variables de entorno (.env):
    # Docker
    CONTAINER_NAME=certiflow_db
    DOCKER_DB_NAME=certiflow
    DOCKER_DB_USER=root
    DOCKER_DB_PASS=

    # Servidor directo
    SERVER_DB_HOST=localhost
    SERVER_DB_NAME=mi_base_datos
    SERVER_DB_USER=mi_usuario
    SERVER_DB_PASS=mi_password

    # Común
    INIT_SQL_PATH=../database/init.sql
    BACKUP_DIR=../database/backup
"""

import subprocess
import sys
import os
from datetime import datetime
from dotenv import load_dotenv

# ── Cargar .env ───────────────────────────────────────────────────────────────
load_dotenv()

# Configuración Docker
CONTAINER_NAME = os.getenv("CONTAINER_NAME")
DOCKER_DB_NAME = os.getenv("DOCKER_DB_NAME")
DOCKER_DB_USER = os.getenv("DOCKER_DB_USER")
DOCKER_DB_PASS = os.getenv("DOCKER_DB_PASS", "")

# Configuración servidor directo
SERVER_DB_HOST = os.getenv("SERVER_DB_HOST")
SERVER_DB_NAME = os.getenv("SERVER_DB_NAME")
SERVER_DB_USER = os.getenv("SERVER_DB_USER")
SERVER_DB_PASS = os.getenv("SERVER_DB_PASS", "")

# Rutas
INIT_SQL_PATH = os.getenv("INIT_SQL_PATH", "../database/init.sql")
BACKUP_DIR    = os.getenv("BACKUP_DIR",    "../database/backup")

# Variables activas según modo (se asignan en seleccionar_modo)
USE_DOCKER = None
DB_HOST    = None
DB_NAME    = None
DB_USER    = None
DB_PASS    = None


# ══════════════════════════════════════════════════════════════════════════════
# UTILIDADES GENERALES
# ══════════════════════════════════════════════════════════════════════════════

def separador(char="─", ancho=60):
    print(char * ancho)


def titulo(texto):
    separador("═")
    print(f"    {texto}")
    separador("═")


def seccion(texto):
    print(f"\n{'─' * 60}")
    print(f"  {texto}")
    print(f"{'─' * 60}")


def ok(msg):    print(f"  [OK] {msg}")
def err(msg):   print(f"  [ERROR] {msg}")
def info(msg):  print(f"  [INFO] {msg}")
def warn(msg):  print(f"  [!] {msg}")


def run_command(cmd, capture_output=True):
    """Ejecuta un comando de shell y retorna (success, stdout, stderr)."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=capture_output, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)


# ══════════════════════════════════════════════════════════════════════════════
# CONEXIÓN Y MODO
# ══════════════════════════════════════════════════════════════════════════════

def seleccionar_modo(accion="conectarte a la base de datos"):
    """Pregunta al usuario qué modo usar y asigna las credenciales correspondientes."""
    global USE_DOCKER, DB_HOST, DB_NAME, DB_USER, DB_PASS

    print(f"\n¿Cómo deseas {accion}?")
    print("  [1] Contenedor Docker")
    print("  [2] Servidor directo (XAMPP, servidor remoto, etc.)")
    print()

    while True:
        opcion = input("  Elige una opción (1 o 2): ").strip()
        if opcion == "1":
            USE_DOCKER = True
            DB_NAME    = DOCKER_DB_NAME
            DB_USER    = DOCKER_DB_USER
            DB_PASS    = DOCKER_DB_PASS
            break
        elif opcion == "2":
            USE_DOCKER = False
            DB_HOST    = SERVER_DB_HOST
            DB_NAME    = SERVER_DB_NAME
            DB_USER    = SERVER_DB_USER
            DB_PASS    = SERVER_DB_PASS
            break
        else:
            warn("Opción inválida, escribe 1 o 2.")

    # Validar variables necesarias
    faltantes = []
    if USE_DOCKER:
        if not CONTAINER_NAME: faltantes.append("CONTAINER_NAME")
        if not DOCKER_DB_NAME: faltantes.append("DOCKER_DB_NAME")
        if not DOCKER_DB_USER: faltantes.append("DOCKER_DB_USER")
    else:
        if not SERVER_DB_HOST: faltantes.append("SERVER_DB_HOST")
        if not SERVER_DB_NAME: faltantes.append("SERVER_DB_NAME")
        if not SERVER_DB_USER: faltantes.append("SERVER_DB_USER")

    if faltantes:
        err(f"Faltan estas variables en el .env: {', '.join(faltantes)}")
        info("Revisa tu archivo .env y vuelve a intentarlo.")
        sys.exit(1)

    modo = "Docker" if USE_DOCKER else f"Servidor directo ({DB_HOST})"
    ok(f"Modo seleccionado: {modo}  |  BD: {DB_NAME}  |  Usuario: {DB_USER}")


def get_mysql_cmd(sql_query=None, execute_file=None):
    """Construye el comando MySQL según el modo activo."""
    password_part = f"-p{DB_PASS}" if DB_PASS else ""

    if USE_DOCKER:
        base = f"docker exec {CONTAINER_NAME} mysql -u{DB_USER} {password_part}"
        if sql_query:
            return f'{base} -e "{sql_query}" {DB_NAME}'
        return f"{base} {DB_NAME}"
    else:
        base = f"mysql -h{DB_HOST} -u{DB_USER} {password_part}"
        if sql_query:
            return f'{base} -e "{sql_query}" {DB_NAME}'
        if execute_file:
            return f'{base} {DB_NAME} < "{execute_file}"'
        return f"{base} {DB_NAME}"


def check_connection():
    """Verifica que se pueda conectar antes de operar."""
    if USE_DOCKER:
        print(f"\n  Verificando que el contenedor '{CONTAINER_NAME}' esté corriendo...")
        success, stdout, _ = run_command(
            f'docker ps --filter "name={CONTAINER_NAME}" --format "{{{{.Names}}}}"'
        )
        if success and CONTAINER_NAME in stdout:
            ok(f"Contenedor '{CONTAINER_NAME}' está corriendo")
            return True
        err(f"El contenedor '{CONTAINER_NAME}' no está corriendo")
        info("Ejecuta primero: docker compose up -d")
        return False
    else:
        print(f"\n  Verificando conexión a '{DB_HOST}'...")
        password_part = f"-p{DB_PASS}" if DB_PASS else ""
        cmd = f'mysql -h{DB_HOST} -u{DB_USER} {password_part} -e "SELECT 1" {DB_NAME}'
        success, _, stderr = run_command(cmd)
        if success:
            ok(f"Conectado a MySQL en {DB_HOST}")
            return True
        err(f"No se pudo conectar: {stderr.strip()}")
        info("Verifica que MySQL esté corriendo y las credenciales en el .env sean correctas.")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# OPERACIONES DE BASE DE DATOS
# ══════════════════════════════════════════════════════════════════════════════

def get_all_tables():
    cmd = get_mysql_cmd(sql_query="SHOW TABLES;")
    success, stdout, stderr = run_command(cmd)
    if not success:
        err(f"No se pudo obtener las tablas: {stderr.strip()}")
        return []
    lines = stdout.strip().split("\n")
    return lines[1:] if len(lines) > 1 else []


def drop_all_tables():
    print("\n  Obteniendo lista de tablas...")
    tables = get_all_tables()

    if not tables:
        info("No hay tablas para eliminar")
        return True

    info(f"Encontradas {len(tables)} tabla(s): {', '.join(tables)}")
    print("\n  Eliminando tablas...")

    drop_statements = ", ".join([f"`{t}`" for t in tables])
    drop_sql = (
        f"SET FOREIGN_KEY_CHECKS = 0; "
        f"DROP TABLE IF EXISTS {drop_statements}; "
        f"SET FOREIGN_KEY_CHECKS = 1;"
    )

    success, _, stderr = run_command(get_mysql_cmd(sql_query=drop_sql))

    if success:
        ok(f"{len(tables)} tabla(s) eliminada(s)")
    else:
        warn("Falló el drop en bloque, intentando tabla por tabla...")
        run_command(get_mysql_cmd(sql_query="SET FOREIGN_KEY_CHECKS = 0;"))
        for t in tables:
            s, _, se = run_command(get_mysql_cmd(sql_query=f"DROP TABLE IF EXISTS `{t}`;"))
            if s: ok(f"'{t}' eliminada")
            else: err(f"No se pudo eliminar '{t}': {se.strip()}")
        run_command(get_mysql_cmd(sql_query="SET FOREIGN_KEY_CHECKS = 1;"))

    return True


def import_sql_file(sql_path):
    """Importa un archivo .sql a la base de datos activa."""
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    sql_full     = os.path.normpath(os.path.join(script_dir, sql_path))

    if not os.path.exists(sql_full):
        err(f"No se encontró el archivo: {sql_full}")
        return False

    info(f"Archivo: {sql_full}")

    if USE_DOCKER:
        print("  Copiando archivo al contenedor...")
        s, _, se = run_command(f'docker cp "{sql_full}" {CONTAINER_NAME}:/tmp/import.sql')
        if not s:
            err(f"No se pudo copiar: {se.strip()}")
            return False
        ok("Archivo copiado al contenedor")

        print("  Ejecutando SQL...")
        password_part = f"-p{DB_PASS}" if DB_PASS else ""
        exec_cmd = (
            f'docker exec {CONTAINER_NAME} mysql -u{DB_USER} {password_part} '
            f'{DB_NAME} -e "source /tmp/import.sql"'
        )
        success, _, stderr = run_command(exec_cmd)
        run_command(f"docker exec {CONTAINER_NAME} rm /tmp/import.sql")
    else:
        print("  Ejecutando SQL...")
        cmd     = get_mysql_cmd(execute_file=sql_full)
        success, _, stderr = run_command(cmd)

    if success:
        ok("SQL importado correctamente")
        return True

    if "ERROR" in stderr.upper():
        err(f"Falló la importación: {stderr.strip()}")
        return False

    ok("SQL importado (con advertencias menores)")
    return True


def verify_tables():
    tables = get_all_tables()
    if tables:
        ok(f"Base de datos tiene {len(tables)} tabla(s): {', '.join(tables)}")
        return True
    err("La base de datos está vacía después de la importación")
    return False


def get_backup_dir():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(script_dir, BACKUP_DIR))


# ══════════════════════════════════════════════════════════════════════════════
# OPCIÓN 1 — Cargar base de datos con datos iniciales
# ══════════════════════════════════════════════════════════════════════════════

def opcion_cargar_inicial():
    seccion("CARGAR BASE DE DATOS CON DATOS INICIALES")

    seleccionar_modo("conectarte a la base de datos")

    if not check_connection():
        sys.exit(1)

    print()
    warn("Esto eliminará TODOS los datos actuales y cargará el init.sql")
    respuesta = input("\n  ¿Continuar? (s/N): ").strip().lower()
    if respuesta != "s":
        print("\n  Operación cancelada.")
        return

    print()
    if not drop_all_tables():
        err("Falló al eliminar tablas")
        return

    print()
    print("  Importando datos iniciales...")
    if not import_sql_file(INIT_SQL_PATH):
        err("Falló al importar init.sql")
        return

    print()
    print("  Verificando importación...")
    if not verify_tables():
        err("La verificación falló")
        return

    print()
    separador("═")
    ok("¡Base de datos cargada con datos iniciales exitosamente!")
    separador("═")


# ══════════════════════════════════════════════════════════════════════════════
# OPCIÓN 2 — Realizar backup de la base de datos actual
# ══════════════════════════════════════════════════════════════════════════════

def opcion_realizar_backup():
    seccion("REALIZAR BACKUP DE LA BASE DE DATOS ACTUAL")

    seleccionar_modo("realizar el backup")

    if not check_connection():
        sys.exit(1)

    # Crear carpeta de backups si no existe
    backup_dir = get_backup_dir()
    os.makedirs(backup_dir, exist_ok=True)

    # Nombre del archivo con timestamp
    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"backup_{DB_NAME}_{timestamp}.sql")

    print(f"\n  Destino: {backup_file}")
    print()

    password_part = f"-p{DB_PASS}" if DB_PASS else ""

    if USE_DOCKER:
        print("  Generando dump dentro del contenedor...")
        dump_cmd = (
            f'docker exec {CONTAINER_NAME} mysqldump -u{DB_USER} {password_part} '
            f'--single-transaction --routines --triggers {DB_NAME} > "{backup_file}"'
        )
    else:
        print("  Generando dump...")
        dump_cmd = (
            f'mysqldump -h{DB_HOST} -u{DB_USER} {password_part} '
            f'--single-transaction --routines --triggers {DB_NAME} > "{backup_file}"'
        )

    success, _, stderr = run_command(dump_cmd)

    if not success or ("ERROR" in stderr.upper()):
        err(f"Falló el backup: {stderr.strip()}")
        # Borrar archivo vacío si se creó
        if os.path.exists(backup_file) and os.path.getsize(backup_file) == 0:
            os.remove(backup_file)
        return

    size_kb = os.path.getsize(backup_file) // 1024
    print()
    separador("═")
    ok(f"Backup realizado exitosamente!")
    ok(f"Archivo : {os.path.basename(backup_file)}")
    ok(f"Tamaño  : {size_kb} KB")
    ok(f"Ubicación: {backup_dir}")
    separador("═")


# ══════════════════════════════════════════════════════════════════════════════
# OPCIÓN 3 — Poblar la base de datos desde un backup
# ══════════════════════════════════════════════════════════════════════════════

def opcion_cargar_backup():
    seccion("POBLAR BASE DE DATOS DESDE UN BACKUP")

    # Listar backups disponibles
    backup_dir = get_backup_dir()

    if not os.path.exists(backup_dir):
        err(f"No existe la carpeta de backups: {backup_dir}")
        info("Primero genera un backup con la opción 2.")
        return

    archivos = sorted([
        f for f in os.listdir(backup_dir)
        if f.endswith(".sql")
    ], reverse=True)  # más recientes primero

    if not archivos:
        err("No hay archivos de backup en la carpeta.")
        info(f"Carpeta: {backup_dir}")
        info("Primero genera un backup con la opción 2.")
        return

    print(f"\n  Backups disponibles en: {backup_dir}\n")
    for i, archivo in enumerate(archivos, 1):
        ruta     = os.path.join(backup_dir, archivo)
        size_kb  = os.path.getsize(ruta) // 1024
        mtime    = datetime.fromtimestamp(os.path.getmtime(ruta)).strftime("%Y-%m-%d %H:%M:%S")
        print(f"  [{i}] {archivo}  ({size_kb} KB  |  {mtime})")

    print(f"  [0] Cancelar")
    print()

    while True:
        try:
            eleccion = input("  Selecciona el número del backup a cargar: ").strip()
            if eleccion == "0":
                print("\n  Operación cancelada.")
                return
            idx = int(eleccion) - 1
            if 0 <= idx < len(archivos):
                backup_elegido = archivos[idx]
                break
            else:
                warn(f"Número inválido. Ingresa entre 1 y {len(archivos)}, o 0 para cancelar.")
        except ValueError:
            warn("Ingresa solo un número.")

    print(f"\n  Backup seleccionado: {backup_elegido}")

    seleccionar_modo("cargar el backup")

    if not check_connection():
        sys.exit(1)

    print()
    warn(f"Esto eliminará TODOS los datos actuales y cargará '{backup_elegido}'")
    respuesta = input("\n  ¿Continuar? (s/N): ").strip().lower()
    if respuesta != "s":
        print("\n  Operación cancelada.")
        return

    print()
    if not drop_all_tables():
        err("Falló al eliminar tablas")
        return

    print()
    print("  Importando backup...")
    backup_rel = os.path.join(BACKUP_DIR, backup_elegido)
    if not import_sql_file(backup_rel):
        err(f"Falló al importar '{backup_elegido}'")
        return

    print()
    print("  Verificando importación...")
    if not verify_tables():
        err("La verificación falló")
        return

    print()
    separador("═")
    ok(f"¡Base de datos restaurada desde '{backup_elegido}' exitosamente!")
    separador("═")


# ══════════════════════════════════════════════════════════════════════════════
# MENÚ PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════════

def menu_principal():
    titulo("GESTOR DE BASE DE DATOS — CertiFlow")
    print()
    print("  ¿Qué deseas hacer?\n")
    print("  [1]  Cargar base de datos con datos iniciales")
    print("  [2]  Realizar backup de la base de datos actual")
    print("  [3]  Poblar la base de datos desde un backup")
    print("  [0]  Salir")
    print("====================Cristian Ramirez====================")
    print()

    while True:
        opcion = input("  Selecciona una opción: ").strip()
        if opcion in ("0", "1", "2", "3"):
            return opcion
        warn("Opción inválida. Escribe 0, 1, 2 o 3.")


def main():
    try:
        while True:
            opcion = menu_principal()

            if opcion == "0":
                print("\n  ¡Hasta luego :D!\n")
                break
            elif opcion == "1":
                opcion_cargar_inicial()
            elif opcion == "2":
                opcion_realizar_backup()
            elif opcion == "3":
                opcion_cargar_backup()

            # Después de cada acción, pausa antes de volver al menú
            print()
            input("  Presiona Enter para volver al menú principal...")

    except KeyboardInterrupt:
        print("\n\n  Operación interrumpida. ¡Hasta luego :D\n")
        sys.exit(0)


if __name__ == "__main__":
    main()