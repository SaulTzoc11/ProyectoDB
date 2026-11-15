# Imagen del front (nginx + HTML/CSS/JS). Se construye desde la raíz del repositorio:
#   docker build -f deploy/web.Dockerfile -t <usuario>/sapo-pinturas-web .
FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend /usr/share/nginx/html

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1/salud-web || exit 1
