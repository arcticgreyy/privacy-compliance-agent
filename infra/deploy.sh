#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
APP_SERVICE="privacy-compliance-app"
WORKER_SERVICE="privacy-compliance-worker"
REPO="privacy-compliance"

echo "==> Deploying to project: $PROJECT_ID, region: $REGION"

# ─── Create Artifact Registry (once) ────────────────────────────────
gcloud artifacts repositories describe "$REPO" \
  --project="$PROJECT_ID" --location="$REGION" 2>/dev/null || \
gcloud artifacts repositories create "$REPO" \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --repository-format=docker

IMAGE_PREFIX="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO"

# ─── Build & Push Images ────────────────────────────────────────────
echo "==> Building app image..."
gcloud builds submit \
  --project="$PROJECT_ID" \
  --tag="$IMAGE_PREFIX/$APP_SERVICE" \
  --dockerfile=Dockerfile .

echo "==> Building worker image..."
gcloud builds submit \
  --project="$PROJECT_ID" \
  --tag="$IMAGE_PREFIX/$WORKER_SERVICE" \
  --dockerfile=Dockerfile.worker .

# ─── Deploy App to Cloud Run ────────────────────────────────────────
echo "==> Deploying app service..."
gcloud run deploy "$APP_SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE_PREFIX/$APP_SERVICE" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars="NODE_ENV=production"

APP_URL=$(gcloud run services describe "$APP_SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" \
  --format='value(status.url)')
echo "==> App deployed at: $APP_URL"

# ─── Deploy Worker to Cloud Run ─────────────────────────────────────
echo "==> Deploying worker service..."
gcloud run deploy "$WORKER_SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE_PREFIX/$WORKER_SERVICE" \
  --platform=managed \
  --no-allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production"

WORKER_URL=$(gcloud run services describe "$WORKER_SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" \
  --format='value(status.url)')
echo "==> Worker deployed at: $WORKER_URL"

echo ""
echo "==> Next steps:"
echo "   1. Set environment variables on both services via the Cloud Console or:"
echo "      gcloud run services update $APP_SERVICE --set-env-vars=DATABASE_URL=...,CRON_SECRET=...,WORKER_SERVICE_URL=$WORKER_URL"
echo "   2. Run: bash infra/setup-scheduler.sh"
