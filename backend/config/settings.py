import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def cargar_env(ruta):
    if not ruta.is_file():
        return
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        nombre, valor = linea.split("=", 1)
        os.environ.setdefault(nombre.strip(), valor.strip().strip('"').strip("'"))


cargar_env(BASE_DIR.parent / ".env")


def variable(nombre, defecto=None, obligatoria=False):
    valor = os.environ.get(nombre, defecto)
    if obligatoria and not valor:
        raise ImproperlyConfigured(f"Falta la variable de entorno {nombre}.")
    return valor


def lista(nombre, defecto=""):
    return [x.strip() for x in variable(nombre, defecto).split(",") if x.strip()]


DEBUG = variable("DJANGO_DEBUG", "0") == "1"

SECRET_KEY = variable(
    "DJANGO_SECRET_KEY",
    "clave-solo-para-desarrollo" if DEBUG else None,
    obligatoria=True,
)

ALLOWED_HOSTS = lista("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = lista("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "rest_framework",
    "apps.nucleo",
    "apps.seguridad",
    "apps.catalogo",
    "apps.clientes",
    "apps.compras",
    "apps.ventas",
    "apps.inventario",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

if variable("DB_ENGINE", "mssql") == "sqlite":
    DATABASES = {
        "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "mssql",
            "NAME": variable("DB_NAME", "PintureriaDB"),
            "HOST": variable("DB_HOST", obligatoria=True),
            "PORT": variable("DB_PORT", "1433"),
            "USER": variable("DB_USER", obligatoria=True),
            "PASSWORD": variable("DB_PASSWORD", obligatoria=True),
            "OPTIONS": {
                "driver": variable("DB_DRIVER", "ODBC Driver 18 for SQL Server"),
                "extra_params": variable(
                    "DB_EXTRA_PARAMS", "TrustServerCertificate=yes"
                ),
            },
        }
    }

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.seguridad.authentication.SesionUsuarioAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

FRONTEND_DIR = BASE_DIR.parent / "frontend"
SERVIR_FRONTEND = variable("SERVIR_FRONTEND", "1" if DEBUG else "0") == "1"

DESCUENTO_CLAVE_AUTORIZACION = variable("DESCUENTO_CLAVE", "")

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
COOKIES_SEGURAS = variable("DJANGO_COOKIES_SEGURAS", "0" if DEBUG else "1") == "1"
SESSION_COOKIE_SECURE = COOKIES_SEGURAS
CSRF_COOKIE_SECURE = COOKIES_SEGURAS

if variable("DJANGO_PROXY_SSL", "0") == "1":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
