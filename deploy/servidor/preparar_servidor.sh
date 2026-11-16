#!/usr/bin/env bash
# Prepara un Droplet Ubuntu 24.04 nuevo: actualizaciones, swap, Fail2ban y Dokploy.
# Uso (como root):  bash preparar_servidor.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "== Actualizando paquetes"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y fail2ban unattended-upgrades curl

echo "== Swap de 2 GB (SQL Server necesita memoria)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== Fail2ban"
install -m 644 "$DIR/jail.local" /etc/fail2ban/jail.local
systemctl enable --now fail2ban
systemctl restart fail2ban
for i in $(seq 1 20); do
  fail2ban-client ping >/dev/null 2>&1 && break
  sleep 1
done
fail2ban-client status || true

echo "== Dokploy"
if ! docker service ls 2>/dev/null | grep -q dokploy; then
  curl -sSL https://dokploy.com/install.sh | sh
fi

echo "Listo. Panel de Dokploy: http://$(curl -s ifconfig.me):3000"
