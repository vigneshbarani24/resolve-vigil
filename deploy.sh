#!/usr/bin/env bash
# Deploy Resolve to Cloud Run
#
# Usage:
#   ./deploy.sh              # Standard deploy (FastAPI + Gemini Live)
#   ./deploy.sh --adk        # ADK deploy (multi-agent with google_search sub-agent)
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID environment variable}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-resolve}"

# ─── ADK Deploy Mode ───
if [[ "${1:-}" == "--adk" ]]; then
    echo "==> ADK Deploy: multi-agent with built-in UI"
    echo "    Agent: Theepa (8 FunctionTools) + Researcher (google_search)"

    adk deploy cloud_run \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --service_name="${SERVICE_NAME}-adk" \
        --with_ui \
        resolve/

    echo "==> ADK deployment complete!"
    exit 0
fi

# ─── Standard Deploy Mode ───
echo "==> Building frontend..."
cd frontend && npm run build && cd ..

echo "==> Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "PROJECT_ID=$PROJECT_ID,LOCATION=$REGION,ENABLE_ADK=true,GOOGLE_GENAI_USE_VERTEXAI=TRUE" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 600 \
  --max-instances 10

echo "==> Deployment complete!"
gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format "value(status.url)"
