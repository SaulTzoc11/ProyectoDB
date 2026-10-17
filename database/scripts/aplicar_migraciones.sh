#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRASENA="${MSSQL_SA_PASSWORD:-Pintureria#2026Sa}"
CONTENEDOR="${CONTENEDOR:-sqlserver-pintureria}"

for archivo in "$RAIZ"/database/migrations/[0-9]*.sql; do
  echo "Aplicando $(basename "$archivo")"
  docker exec -i "$CONTENEDOR" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$CONTRASENA" -C -b < "$archivo"
done

docker exec -i "$CONTENEDOR" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$CONTRASENA" -C -b < "$RAIZ/database/tests/pruebas_basicas.sql"
