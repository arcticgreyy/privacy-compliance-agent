#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
APP_SERVICE="privacy-compliance-app"
CRON_SECRET="${CRON_SECRET:?Set CRON_SECRET}"

APP_URL=$(gcloud run services describe "$APP_SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" \
  --format='value(status.url)')

echo "==> App URL: $APP_URL"

# ─── Create Cloud Tasks Queue ────────────────────────────────────────
echo "==> Creating Cloud Tasks queue..."
gcloud tasks queues describe privacy-scans \
  --project="$PROJECT_ID" --location="$REGION" 2>/dev/null || \
gcloud tasks queues create privacy-scans \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --max-dispatches-per-second=5 \
  --max-concurrent-dispatches=3 \
  --max-attempts=3 \
  --min-backoff=30s \
  --max-backoff=300s

# ─── Create Cloud Scheduler Job ──────────────────────────────────────
# Runs hourly to check for websites due for scanning
JOB_NAME="trigger-privacy-scans"

echo "==> Creating Cloud Scheduler job: $JOB_NAME"
gcloud scheduler jobs describe "$JOB_NAME" \
  --project="$PROJECT_ID" --location="$REGION" 2>/dev/null && \
gcloud scheduler jobs update http "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --schedule="0 * * * *" \
  --uri="$APP_URL/api/cron/trigger-scans" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --time-zone="UTC" \
  --attempt-deadline=60s || \
gcloud scheduler jobs create http "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --schedule="0 * * * *" \
  --uri="$APP_URL/api/cron/trigger-scans" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --time-zone="UTC" \
  --attempt-deadline=60s

echo ""
echo "==> Cloud Scheduler setup complete!"
echo "   Job '$JOB_NAME' will call POST $APP_URL/api/cron/trigger-scans every hour."
echo "   The cron endpoint checks scan frequencies and dispatches due scans to Cloud Tasks."
echo ""
echo "   To test immediately: gcloud scheduler jobs run $JOB_NAME --project=$PROJECT_ID --location=$REGION"
