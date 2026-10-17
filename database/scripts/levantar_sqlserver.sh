#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRASENA="${MSSQL_SA_PASSWORD:-Pintureria#2026Sa}"

docker run -d --name sqlserver-pintureria --platform linux/amd64 \
  -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD="$CONTRASENA" \
  -p 1433:1433 -v "$RAIZ":/backup:ro \
  mcr.microsoft.com/mssql/server:2022-latest
