
# ==========================================
# Stage 1: Build frontend
# ==========================================
FROM node:20-bookworm AS frontend

WORKDIR /frontend

COPY frontend/package*.json ./
COPY frontend/public ./public
COPY frontend/ ./

RUN npm install

# Same-origin backend requests
ARG VITE_SYNBIOSUITE_API=""

# External services
ARG VITE_IBIOSIM_API="https://ibiosimconnector-api.azurewebsites.net/api/orchestrators/analyze"
ARG VITE_SBOL_CANVAS_URL="https://sbolcanvas.org"
ARG VITE_SEQIMPROVE_URL="https://seqimprove.org"

RUN NODE_OPTIONS="--max-old-space-size=8192" \
    VITE_SYNBIOSUITE_API="" \
    npm run build

# ==========================================
# Stage 2: Existing SynBioSuite backend
# ==========================================
FROM tiangolo/uwsgi-nginx-flask:python3.10

WORKDIR /app

ENV STATIC_PATH=/app/app/static
ENV LISTEN_PORT=5003

RUN mkdir -p /app/data /app/uploads

# Install existing backend dependencies
COPY backend/requirements.txt /app/

RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Preserve existing backend layout
COPY backend/sbs_server/ /app/

RUN chown -R www-data:www-data /app/uploads && \
    chmod 755 /app/uploads

# Install frontend
COPY --from=frontend /frontend/dist/ \
    /usr/share/nginx/html/synbiosuite/

# Additional Nginx listener for combined app
COPY docker/nginx.conf \
    /etc/nginx/conf.d/synbiosuite.conf

EXPOSE 5002

# Retain the base image's startup command
