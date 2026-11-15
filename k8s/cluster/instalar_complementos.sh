#!/usr/bin/env bash
# Instala en el cluster (una sola vez): ingress-nginx, cert-manager, metrics-server
# y Prometheus + Grafana. Requiere kubectl apuntando al cluster y helm.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace

helm upgrade --install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace --set crds.enabled=true
kubectl -n cert-manager rollout status deploy/cert-manager-webhook --timeout=180s
kubectl apply -f "$DIR/cluster-issuer.yaml"

# Algunos proveedores (DigitalOcean) ya traen metrics-server; no pasa nada si se reinstala.
helm upgrade --install metrics-server metrics-server/metrics-server -n kube-system || true

helm upgrade --install monitoreo prometheus-community/kube-prometheus-stack \
  -n monitoreo --create-namespace -f "$DIR/../monitoreo/valores-prometheus.yaml"

echo "IP pública del Ingress (apuntar el registro A del dominio aquí):"
kubectl -n ingress-nginx get svc ingress-nginx-controller
