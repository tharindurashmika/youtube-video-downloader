# ======================================================================
# CineCast TV - Multi-Stage Container Image
# Stage 1: Build React/TypeScript frontend
# Stage 2: Python 3.11 + FFmpeg + FastAPI runtime
# ======================================================================

# --- Stage 1: Frontend Build ---
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package.json ./
RUN npm install --silent

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Runtime Environment ---
FROM python:3.11-slim-bookworm AS runtime

# Install system dependencies & FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create unprivileged user for security
RUN groupadd -r cinecast && useradd -r -g cinecast -d /app cinecast

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /build/dist ./frontend/dist

# Create storage volumes with appropriate permissions
RUN mkdir -p /app/downloads /app/temp_downloads && \
    chown -R cinecast:cinecast /app

USER cinecast

# Environment defaults
ENV PORT=8000 \
    HOST=0.0.0.0 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Health check verifies the server and FFmpeg responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/system/diagnostics')" || exit 1

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
