# Google Cloud Deployment Guide — TubeForge

> Reference for hackathon deployment | 2026-02-27

## Recommended Stack: Cloud Run

Cloud Run is the clear winner for this hackathon:
- WebSocket support (critical for Gemini Live API)
- One-command deploy
- Auto-scales to zero (no cost when idle)
- Free tier: 2M requests/month

## GCP Setup

### 1. Create Project
```bash
gcloud projects create tubeforge-hackathon --name="TubeForge"
gcloud config set project tubeforge-hackathon
```

### 2. Enable APIs
```bash
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  storage.googleapis.com \
  texttospeech.googleapis.com \
  cloudbuild.googleapis.com
```

### 3. Create Storage Bucket
```bash
gsutil mb -l us-central1 gs://tubeforge-assets
```

### 4. Deploy to Cloud Run
```bash
gcloud run deploy tubeforge \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 1Gi \
  --cpu 1 \
  --port 8080
```

## Dockerfile

```dockerfile
FROM python:3.11-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080
CMD ["python", "app.py"]
```

## Terraform (Bonus Points)

```hcl
# terraform/main.tf
terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" { default = "tubeforge-hackathon" }
variable "region" { default = "us-central1" }

resource "google_project_service" "apis" {
  for_each = toset([
    "aiplatform.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
    "texttospeech.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
  service = each.key
}

resource "google_storage_bucket" "assets" {
  name     = "${var.project_id}-assets"
  location = var.region
}

resource "google_cloud_run_v2_service" "tubeforge" {
  name     = "tubeforge"
  location = var.region

  template {
    containers {
      image = "gcr.io/${var.project_id}/tubeforge"
      ports { container_port = 8080 }
      resources {
        limits = { memory = "1Gi", cpu = "1" }
      }
    }
    timeout = "300s"
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.tubeforge.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

## Proving GCP Deployment (Hackathon Requirement)

### Option 1: Screen Recording
1. Open GCP Console → Cloud Run
2. Show `tubeforge` service running
3. Click into Logs → show live requests
4. Optionally run: `gcloud run services describe tubeforge --region us-central1`

### Option 2: Code File
Show Vertex AI initialization in `app.py`:
```python
client = genai.Client(vertexai=True, project="tubeforge-hackathon", location="us-central1")
```

## Cost Estimate: $0
- $300 free credits for new GCP accounts
- Cloud Run free tier covers all hackathon usage
- Gemini 2.0 Flash: ~$0.075/1M input tokens
- Full hackathon development: well under $10 total
