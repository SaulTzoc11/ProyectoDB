# Sapo Pinturas

Sistema comercial para Proyecto de DB, Programación Web, Redes e Ingeniería de Software.

## Estructura

| Carpeta | Contenido |
|---|---|
| `backend/` | API REST en Django, organizada por dominios y capas (ver `docs/ARQUITECTURA_Y_BD.md`). |
| `frontend/` | Aplicación web en HTML y CSS, con JavaScript mínimo para consumir la API. |
| `database/` | Esquema base, migraciones SQL numeradas, pruebas de integridad y scripts. |
| `deploy/` | Configuración de nginx. |
| `docs/` | Arquitectura y diagrama de la base de datos. |

## Requisitos

- Python 3.12 o superior.
- ODBC Driver for SQL Server (17 o 18) instalado en el equipo.
- Acceso a la base de datos `PintureriaDB`.

Docker es opcional (ver más abajo).

## Puesta en marcha (sin Docker)

Una sola vez:

```
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt        # Windows: .venv\Scripts\pip install -r requirements.txt
cp ../.env.example ../.env                        # Windows: copy ..\.env.example ..\.env
```

Editar `.env` en la raíz del proyecto: datos de la base (`DB_HOST`, `DB_USER`, `DB_PASSWORD`), `DB_DRIVER` según el driver instalado, `DJANGO_DEBUG=1`, `DJANGO_COOKIES_SEGURAS=0` y `DESCUENTO_CLAVE`. Ese archivo no se sube a git.

Cada vez que se quiera trabajar:

```
cd backend
.venv/bin/python manage.py runserver              # Windows: .venv\Scripts\python manage.py runserver
```

Abrir http://localhost:8000. Con `DJANGO_DEBUG=1`, Django sirve el front y la API en el mismo puerto; no hace falta nginx.

Crear el primer usuario:

```
.venv/bin/python manage.py crear_gerente --usuario gerente --contrasena 'Clave-2026'
```

Django lee el `.env` de la raíz automáticamente. Una variable ya definida en el sistema tiene prioridad sobre el archivo.

## Puesta en marcha con Docker (opcional)

`docker compose up -d --build api web` y abrir http://localhost:8080. En este modo nginx sirve el front y reenvía `/api` al backend. La base local de pruebas se levanta con `docker compose --profile bd-local up -d db`.

## Base de datos

Todo cambio en la base se entrega como un script en `database/migrations/` con el siguiente número. Los scripts son idempotentes: se pueden ejecutar varias veces sobre la base central sin romper nada.

Orden de despliegue en una base existente:

1. `database/scripts/aplicar_migraciones.sh` (o ejecutar cada `migrations/NNNN_*.sql` en orden con `sqlcmd`).
2. `python manage.py normalizar_contrasenas` (convierte contraseñas en texto plano a hash).
3. `database/tests/pruebas_basicas.sql`.

## Pruebas

Backend, sin base de datos externa (usa SQLite en memoria):

```
cd backend
DJANGO_SETTINGS_MODULE=config.settings_test python manage.py test apps
```

Contra la base real (revierte todo al terminar):

```
docker compose run --rm api python manage.py verificar_integracion
```

## Permisos por rol

| Recurso | Gerente | Digitador | Cajero |
|---|---|---|---|
| Usuarios y roles | Administrar | Sin acceso | Sin acceso |
| Catálogos, clientes y proveedores | Leer y modificar | Leer y modificar | Solo leer |
| Cotizaciones y autorización de descuento | Sí | Sí | Sí |

La definición está en `backend/apps/nucleo/roles.py` y `permissions.py`.

## Contraseñas y acceso

- Las contraseñas se guardan con el hash de Django. Las creadas con los procedimientos antiguos de la base (`PBKDF2-SHA512$...`) se verifican y se actualizan solas en el primer inicio de sesión.
- Después de 5 intentos fallidos la cuenta se bloquea 5 minutos.
- La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
- La clave para autorizar descuentos se configura con `DESCUENTO_CLAVE` y se valida en el servidor.
