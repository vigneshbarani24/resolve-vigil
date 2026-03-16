#!/usr/bin/env bash
# Deploy Resolve to Cloud Run
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID environment variable}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-resolve}"

echo "==> Building frontend..."
cd frontend && npm run build && cd ..

echo "==> Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "PROJECT_ID=$PROJECT_ID,LOCATION=$REGION" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 600 \
  --max-instances 10

echo "==> Deployment complete!"
gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format "value(status.url)"
