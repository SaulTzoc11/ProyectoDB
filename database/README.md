# Base de datos

- `schema/`: esquema base (`PintureriaDB.sql`) y diagrama (`PintureriaDB.dbml`).
- `migrations/`: un script por cambio, numerado. Cada uno es idempotente, corre en transaccion y se registra en `dbo.MIGRACION`, por lo que puede ejecutarse varias veces en la base central sin romper nada.
- `tests/`: pruebas basicas de integridad que se ejecutan despues de migrar.
- `scripts/`: levantar una instancia local con Docker y aplicar migraciones.

Para un cambio nuevo, copiar `migrations/_plantilla.sql` con el siguiente numero.

Migraciones actuales:

- `0001_control_versiones`: tabla `dbo.MIGRACION`.
- `0002_columnas_bloqueo_usuario`: columnas `intentosFallidos` y `bloqueadoHasta` en `USUARIO`. Ya existían en la base real pero no en el esquema base.
- `0003_objetos_seguridad_existentes`: versiona funciones, procedimientos y vista de seguridad que ya existían en la base (`CREATE OR ALTER`, sin cambio de comportamiento). La aplicación ya no los invoca.
