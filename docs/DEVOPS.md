# Pipeline DevOps — Sapo Pinturas

Proyecto final: la aplicación (Django + SQL Server + nginx) se desarrolla en local con Docker,
se construye y publica en Docker Hub desde GitHub Actions y se despliega sola en producción
de dos formas: **Dokploy (Docker)** y **Kubernetes**.

```
 git push main ──► GitHub Actions ──► pruebas ──► build api + web ──► Docker Hub
                                                                     │
                                       ┌─────────────────────────────┴───────────────┐
                                       ▼                                             ▼
                          Opción B: Dokploy (Swarm)                     Opción A: Kubernetes
                   Traefik + Let's Encrypt → web ×2 → api ×2      Ingress + cert-manager → web ×2 → api ×2
                   SQL Server con volumen · Fail2ban              SQL Server con PVC · Prometheus/Grafana
                   Uptime Kuma + monitoreo de Dokploy             rolling update maxUnavailable 0
```

## Archivos

| Archivo | Para qué |
|---|---|
| `docker-compose.yml` | Desarrollo local: `db`, `migrador`, `api` (runserver con recarga), `web` (nginx). |
| `backend/Dockerfile` | Imagen `sapo-pinturas-api` (se construye desde la raíz; incluye los scripts SQL). |
| `deploy/web.Dockerfile` | Imagen `sapo-pinturas-web` (nginx + front). |
| `backend/apps/nucleo/management/commands/inicializar_bd.py` | Crea la base si no existe, el login `app_django`, aplica `database/migrations` y crea el gerente. Idempotente y con bloqueo, sirve en los tres entornos. |
| `backend/config/salud.py` | `/api/salud/` (vivo) y `/api/salud/bd/` (llega a la base): healthchecks. |
| `deploy/dokploy/docker-compose.yml` | Producción con Dokploy en modo Stack. |
| `deploy/servidor/` | Script para el Droplet: Fail2ban, swap y Dokploy. |
| `k8s/` | Manifiestos (kustomize). `k8s/cluster/`: ingress-nginx, cert-manager, monitoreo y cuenta de CI. |
| `.github/workflows/pipeline.yml` | El pipeline completo. |

## 1. Desarrollo local (cada integrante)

Requisitos: Docker Desktop (en Mac con chip M, activar *Use Rosetta* porque SQL Server es solo amd64).

```bash
cp .env.example .env
docker compose pull          # la imagen del equipo desde Docker Hub
docker compose up -d
docker compose logs -f migrador   # la primera vez crea PintureriaDB y aplica migraciones
```

- http://localhost:8080 → nginx (como en producción). http://localhost:8000 → Django directo.
- Usuario inicial: `gerente` / el valor de `GERENTE_CONTRASENA` en `.env`.
- Cambios en tiempo real: `backend/` y `frontend/` están montados como volúmenes; Django recarga solo y nginx sirve los archivos del disco.
- Volver a migrar después de agregar un `database/migrations/NNNN_*.sql`: `docker compose run --rm migrador`.
- Para trabajar contra la base central en lugar de la local, cambiar `DB_HOST` en `.env` y levantar solo `docker compose up -d --no-deps api web`.

**Dominio local** (punto 2 de la rúbrica): agregar `127.0.0.1 sapo.local` a `/etc/hosts`
(Windows: `C:\Windows\System32\drivers\etc\hosts`), agregar `sapo.local` a `DJANGO_ALLOWED_HOSTS`
y entrar a http://sapo.local:8080.

## 2. Docker Hub

1. Crear una cuenta (o una organización) en Docker Hub y dos repositorios **públicos**:
   `sapo-pinturas-api` y `sapo-pinturas-web`.
2. *Account settings → Personal access tokens*: crear un token con permiso Read & Write.
3. Poner el usuario en `.env` (`DOCKERHUB_USUARIO`) y en `k8s/kustomization.yaml` (`newName`).

## 3. GitHub: secretos y variables

*Settings → Secrets and variables → Actions*.

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `DOCKERHUB_USUARIO` | usuario de Docker Hub |
| Secreto | `DOCKERHUB_TOKEN` | token del paso 2 |
| Variable | `DESPLEGAR_DOKPLOY` | `true` cuando Dokploy esté listo |
| Variable | `DOMINIO_DOKPLOY` | `sapo.tudominio.com` |
| Secreto | `DOKPLOY_URL` | `https://panel.tudominio.com` |
| Secreto | `DOKPLOY_API_KEY` | Dokploy → Profile → API/CLI → Generate |
| Secreto | `DOKPLOY_COMPOSE_ID` | el id que aparece en la URL del servicio compose en Dokploy |
| Variable | `DESPLEGAR_K8S` | `true` cuando el cluster esté listo |
| Secreto | `KUBECONFIG` | salida de `bash k8s/cluster/kubeconfig_ci.sh` |
| Secretos | `DJANGO_SECRET_KEY`, `DB_PASSWORD`, `DB_ADMIN_PASSWORD`, `DESCUENTO_CLAVE`, `GERENTE_CONTRASENA` | para Kubernetes (sin comillas simples) |

El pipeline corre en cada push a **`main`**. El código hoy está en `feature/api-usuarios`: hay que
hacer merge a `main` (o cambiar la rama en `on.push.branches`).

Generar una `DJANGO_SECRET_KEY`: `python -c "import secrets; print(secrets.token_urlsafe(50))"`.
Las contraseñas de SQL Server necesitan 8+ caracteres con mayúsculas, minúsculas y números o símbolos.

## 4. Opción B — Dokploy (Docker simple)

**Servidor.** Droplet de DigitalOcean Ubuntu 24.04 con **4 GB de RAM** como mínimo (SQL Server
pide 2 GB). Con el crédito de GitHub Student Pack sale gratis.

```bash
scp -r deploy/servidor root@IP:/root/
ssh root@IP 'bash /root/servidor/preparar_servidor.sh'
```

Eso instala Fail2ban (jails `sshd` y `recidive`), swap y Dokploy. Comprobar: `fail2ban-client status sshd`.

**DNS** (en el proveedor del dominio, registros A hacia la IP del Droplet):
`sapo`, `estado` y `panel`. Sin dominio propio: un subdominio gratis de DuckDNS sirve.

**Dokploy** (http://IP:3000):

1. *Web Server → Server Domain*: `panel.tudominio.com` con Let's Encrypt.
2. *Settings → Git*: conectar GitHub (GitHub App) con acceso al repositorio.
3. Crear proyecto → *Create Service → Compose*:
   - Compose Type: **Stack**
   - Provider: GitHub, repositorio `ProyectoDB`, rama `main`, Compose Path `./deploy/dokploy/docker-compose.yml`
   - Auto Deploy: **apagado** (el pipeline avisa cuando las imágenes ya están en Docker Hub).
4. *Environment*:
   ```
   DOMINIO=sapo.tudominio.com
   DOCKERHUB_USUARIO=...
   DJANGO_SECRET_KEY=...
   DB_PASSWORD=...
   DB_ADMIN_PASSWORD=...
   DESCUENTO_CLAVE=...
   GERENTE_USUARIO=gerente
   GERENTE_CONTRASENA=...
   ```
5. *Domains*: `sapo.tudominio.com` → servicio `web`, puerto 80, HTTPS, Let's Encrypt;
   `estado.tudominio.com` → servicio `uptime-kuma`, puerto 3001, HTTPS.
6. *Deploy*. En *Logs* del servicio `migrador` debe salir "Base de datos lista.".

Qué cubre de la rúbrica:

- **HTTPS**: Traefik de Dokploy con certificado de Let's Encrypt.
- **Persistencia**: volumen `datos_sqlserver`. Demostración: crear un cliente, hacer *Redeploy* (o `docker service update --force <stack>_db`) y el cliente sigue ahí.
- **Fail2ban**: `fail2ban-client status sshd` muestra IPs bloqueadas (en un servidor público aparecen en horas).
- **Monitoreo**: pestaña *Monitoring* de Dokploy (CPU, RAM, red por contenedor) + Uptime Kuma con dos monitores: `https://sapo.tudominio.com` y `https://sapo.tudominio.com/api/salud/bd/`.
- **Sin cortes**: `api` y `web` usan `order: start-first` + healthcheck; Swarm levanta la tarea nueva, espera a que esté sana y luego baja la vieja.

> Si el modo Stack diera problemas, el mismo archivo funciona con Compose Type **Docker Compose**;
> lo único que se pierde es el start-first (habría unos segundos de reinicio al actualizar).

## 5. Opción A — Kubernetes

**Cluster.** Recomendado: DigitalOcean Kubernetes (DOKS), 2 nodos de 4 GB. Alternativa barata:
un Droplet de 4 GB con k3s instalado *sin* Traefik (`curl -sfL https://get.k3s.io | sh -s - --disable traefik`).
Un cluster local de Docker Desktop no es alcanzable desde GitHub Actions; para ese caso
se usa un *self-hosted runner* en la máquina o se ejecuta el paso 4 a mano.

Una sola vez (con `kubectl` y `helm` apuntando al cluster):

```bash
# 1. Cambiar el dominio en k8s/configmap.yaml, k8s/ingress.yaml y k8s/monitoreo/valores-prometheus.yaml,
#    y el correo en k8s/cluster/cluster-issuer.yaml
bash k8s/cluster/instalar_complementos.sh      # ingress-nginx, cert-manager, metrics-server, Prometheus+Grafana
# 2. Registro A de sapo.tudominio.com y grafana.tudominio.com → EXTERNAL-IP del ingress
bash k8s/cluster/kubeconfig_ci.sh > kubeconfig-ci.yaml   # contenido → secreto KUBECONFIG (no subir el archivo)
```

Después de eso cada push a `main` despliega solo. Despliegue manual equivalente:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl -n sapo-pinturas create secret generic sapo-secretos --from-literal=...   # ver k8s/secreto.ejemplo.yaml
kubectl apply -k k8s/
```

Qué cubre de la rúbrica:

- **Deployment con 2 réplicas** (`api` y `web`), **Service** e **Ingress** con **HTTPS** (cert-manager + Let's Encrypt).
- **Estrategia de rollout**: `RollingUpdate` con `maxUnavailable: 0`, `maxSurge: 1`, readiness probe contra la base y `preStop` para drenar conexiones.
- **Alta disponibilidad**: `kubectl -n sapo-pinturas delete pod -l app=api --wait=false` borra un pod; la página sigue respondiendo y Kubernetes crea otro. También `PodDisruptionBudget` de 1 pod mínimo.
- **Monitoreo**: Grafana en `https://grafana.tudominio.com` (dashboards *Kubernetes / Compute Resources / Namespace (Pods)*) y `kubectl top pods -n sapo-pinturas`.
- **Rollback**: `kubectl -n sapo-pinturas rollout undo deployment/api`.

## 6. Guion para el video

1. **Local** (5 pts): `docker compose ps` (db, api, web arriba; migrador terminó), entrar a http://localhost:8080, iniciar sesión, crear algo. Cambiar un texto de `frontend/pages/inicio.html` y recargar; cambiar una respuesta en Python y ver que runserver recarga.
2. **Dominio y HTTPS**: abrir `https://sapo.tudominio.com`, mostrar el candado y el certificado. Opcional: `sapo.local` con `/etc/hosts`.
3. **Producción** (10 pts): Kubernetes → `kubectl get deploy,svc,ingress,pods -n sapo-pinturas`, borrar un pod y mostrar que la app sigue. Docker → reinicio con datos persistentes y `fail2ban-client status sshd`.
4. **Actualización en caliente** (5 pts): en una terminal `while true; do curl -s -o /dev/null -w "%{http_code}\n" https://sapo.tudominio.com/api/salud/bd/; sleep 0.5; done`. Cambiar un texto visible, `git commit` y `git push`. Mostrar el pipeline en *Actions* (pruebas → build → Docker Hub → despliegue), la nueva etiqueta en Docker Hub, `kubectl rollout status` y el cambio en la página, con la terminal mostrando solo `200` todo el tiempo.
5. **Monitoreo**: Grafana / Dokploy Monitoring / Uptime Kuma.

## Problemas comunes

| Síntoma | Causa |
|---|---|
| `migrador` sale con "Password validation failed" | `DB_PASSWORD` no cumple la política de SQL Server. |
| `db` reinicia en bucle | Menos de 2 GB de RAM libres, o `DB_ADMIN_PASSWORD` débil. |
| 400 Bad Request en producción | El dominio no está en `DJANGO_ALLOWED_HOSTS`. |
| 403 CSRF al iniciar sesión | `DJANGO_CSRF_TRUSTED_ORIGINS` debe ser `https://` + dominio. |
| El certificado no se emite | El registro A todavía no apunta al servidor/ingress (revisar con `dig`). |
| El pipeline falla en "Pruebas" | Una prueba del backend falla: el despliegue se detiene a propósito. |
