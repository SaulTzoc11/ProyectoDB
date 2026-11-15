"""Deja la base lista para la aplicación en cualquier entorno (local, Dokploy, Kubernetes).

Pasos, todos idempotentes:
1. Espera a que SQL Server acepte conexiones.
2. Si la base no existe, ejecuta database/schema/PintureriaDB.sql.
3. Crea o actualiza el login de la aplicación (DB_USER) con los permisos que necesita.
4. Ejecuta database/migrations/NNNN_*.sql en orden (cada script se salta solo si ya se aplicó).
5. Crea las tablas propias de Django (sesiones) con `migrate`.
6. Si GERENTE_CONTRASENA está definida y el usuario no existe, crea el primer gerente.

Se conecta como administrador (DB_ADMIN_USER / DB_ADMIN_PASSWORD) y toma un bloqueo
en SQL Server, así que varias réplicas pueden ejecutarlo a la vez sin pisarse.
"""

import os
import re
import time
from pathlib import Path

import pyodbc
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

SEPARADOR_GO = re.compile(r"^\s*GO\s*(?:--.*)?$", re.IGNORECASE | re.MULTILINE)
NOMBRE_BLOQUEO = "pintureria_inicializar_bd"


def _leer(ruta):
    try:
        return ruta.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return ruta.read_text(encoding="cp1252")


def _lotes(texto):
    return [lote for lote in SEPARADOR_GO.split(texto) if lote.strip()]


def _texto_sql(valor):
    return valor.replace("'", "''")


class Command(BaseCommand):
    help = "Crea/migra la base PintureriaDB y el usuario de la aplicación (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--espera", type=int, default=180,
                            help="Segundos máximos esperando a SQL Server.")
        parser.add_argument("--pruebas", action="store_true",
                            help="Ejecutar database/tests/pruebas_basicas.sql al final.")

    def handle(self, *args, **opciones):
        bd = settings.DATABASES["default"]
        if bd["ENGINE"] != "mssql":
            raise CommandError("inicializar_bd solo aplica con SQL Server.")

        self.nombre_bd = bd["NAME"]
        self.dir_sql = Path(os.environ.get("DIR_SQL", settings.BASE_DIR.parent / "database"))
        if not (self.dir_sql / "migrations").is_dir():
            raise CommandError(f"No se encontró la carpeta de migraciones en {self.dir_sql}.")

        admin_usuario = os.environ.get("DB_ADMIN_USER", "sa")
        admin_clave = os.environ.get("DB_ADMIN_PASSWORD")
        if not admin_clave:
            raise CommandError("Falta la variable de entorno DB_ADMIN_PASSWORD.")

        cadena = (
            f"DRIVER={{{bd['OPTIONS']['driver']}}};"
            f"SERVER={bd['HOST']},{bd['PORT']};DATABASE=master;"
            f"UID={admin_usuario};PWD={admin_clave};"
            f"{bd['OPTIONS'].get('extra_params', '')}"
        )
        conexion = self._conectar(cadena, opciones["espera"])
        cursor = conexion.cursor()

        self._ejecutar(cursor,
                       "DECLARE @r INT; EXEC @r = sp_getapplock @Resource = ?, "
                       "@LockMode = 'Exclusive', @LockOwner = 'Session', @LockTimeout = 600000; "
                       "IF @r < 0 THROW 50000, 'No se obtuvo el bloqueo de inicialización.', 1;",
                       NOMBRE_BLOQUEO)
        try:
            self._crear_base(cursor)
            if bd["USER"].lower() != admin_usuario.lower():
                self._crear_login(cursor, bd["USER"], bd["PASSWORD"])
            self._migraciones(cursor)
            if opciones["pruebas"]:
                self._archivo(cursor, self.dir_sql / "tests" / "pruebas_basicas.sql")

            self.stdout.write("Tablas de Django (sesiones)...")
            call_command("migrate", interactive=False, verbosity=0)
            self._crear_gerente()
        finally:
            cursor.execute("USE master; EXEC sp_releaseapplock @Resource = ?, @LockOwner = 'Session';",
                           NOMBRE_BLOQUEO)
            conexion.close()

        self.stdout.write(self.style.SUCCESS("Base de datos lista."))

    # ------------------------------------------------------------------ pasos

    def _conectar(self, cadena, espera):
        limite = time.monotonic() + espera
        while True:
            try:
                return pyodbc.connect(cadena, autocommit=True, timeout=5)
            except pyodbc.Error as error:
                if time.monotonic() > limite:
                    raise CommandError(f"SQL Server no respondió: {error}")
                self.stdout.write("Esperando a SQL Server...")
                time.sleep(5)

    def _crear_base(self, cursor):
        cursor.execute("SELECT DB_ID(?)", self.nombre_bd)
        if cursor.fetchone()[0] is not None:
            self.stdout.write(f"La base {self.nombre_bd} ya existe.")
            return
        self.stdout.write(f"Creando {self.nombre_bd} desde el esquema base...")
        self._archivo(cursor, self.dir_sql / "schema" / "PintureriaDB.sql")

    def _crear_login(self, cursor, usuario, clave):
        if not clave:
            raise CommandError("Falta DB_PASSWORD para el usuario de la aplicación.")
        self.stdout.write(f"Login y permisos de {usuario}...")
        login = usuario.replace("]", "]]")
        clave_sql = _texto_sql(clave)
        nombre_sql = _texto_sql(usuario)
        self._ejecutar(cursor, f"""
            USE master;
            IF SUSER_ID(N'{nombre_sql}') IS NULL
                CREATE LOGIN [{login}] WITH PASSWORD = N'{clave_sql}', DEFAULT_DATABASE = [{self.nombre_bd}];
            ELSE
                ALTER LOGIN [{login}] WITH PASSWORD = N'{clave_sql}';
        """)
        self._ejecutar(cursor, f"""
            USE [{self.nombre_bd}];
            IF DATABASE_PRINCIPAL_ID(N'{nombre_sql}') IS NULL
                CREATE USER [{login}] FOR LOGIN [{login}];
            ELSE
                ALTER USER [{login}] WITH LOGIN = [{login}];
            ALTER ROLE db_datareader ADD MEMBER [{login}];
            ALTER ROLE db_datawriter ADD MEMBER [{login}];
            ALTER ROLE db_ddladmin ADD MEMBER [{login}];
            GRANT EXECUTE TO [{login}];
            USE master;
        """)

    def _migraciones(self, cursor):
        for ruta in sorted((self.dir_sql / "migrations").glob("[0-9]*.sql")):
            self.stdout.write(f"Migración {ruta.name}")
            self._archivo(cursor, ruta)

    def _crear_gerente(self):
        contrasena = os.environ.get("GERENTE_CONTRASENA")
        if not contrasena:
            return
        from apps.seguridad.models import Usuario

        usuario = os.environ.get("GERENTE_USUARIO", "gerente")
        if Usuario.objects.filter(nombreusuario=usuario).exists():
            return
        call_command("crear_gerente", usuario=usuario, contrasena=contrasena)

    # ---------------------------------------------------------------- ayudas

    def _archivo(self, cursor, ruta):
        try:
            for lote in _lotes(_leer(ruta)):
                self._ejecutar(cursor, lote)
        except pyodbc.Error as error:
            raise CommandError(f"Error en {ruta.name}: {error}")
        finally:
            cursor.execute("SET NOEXEC OFF; USE master;")

    @staticmethod
    def _ejecutar(cursor, sql, *parametros):
        cursor.execute(sql, *parametros)
        # Recorre todos los resultados: pyodbc solo lanza los errores de
        # sentencias posteriores al avanzar con nextset().
        while cursor.nextset():
            pass
