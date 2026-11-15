#!/usr/bin/env bash
# Genera el kubeconfig que va en el secreto KUBECONFIG de GitHub.
#   bash k8s/cluster/kubeconfig_ci.sh > kubeconfig-ci.yaml
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

kubectl apply -f "$DIR/cuenta-ci.yaml" >&2
sleep 3

SERVIDOR=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.server}')
CA=$(kubectl -n kube-system get secret github-actions-token -o jsonpath='{.data.ca\.crt}')
TOKEN=$(kubectl -n kube-system get secret github-actions-token -o jsonpath='{.data.token}' | base64 -d)

cat <<KUBECONFIG
apiVersion: v1
kind: Config
clusters:
  - name: cluster
    cluster:
      server: ${SERVIDOR}
      certificate-authority-data: ${CA}
users:
  - name: github-actions
    user:
      token: ${TOKEN}
contexts:
  - name: ci
    context: {cluster: cluster, user: github-actions}
current-context: ci
KUBECONFIG
