FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend
COPY dist/ dist/

# Copy server code
COPY server/ server/

# Copy ADK package
COPY resolve/ resolve/

# Copy Chrome extension (served as static download)
COPY extension/ extension/

# Note: env vars are set via Cloud Run --set-env-vars, not .env file

EXPOSE 8080

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8080"]
