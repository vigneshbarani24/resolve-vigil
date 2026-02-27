# TubeForge Infrastructure
# Usage: terraform init && terraform apply

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "aiplatform.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
    "texttospeech.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

# Cloud Storage bucket for assets
resource "google_storage_bucket" "assets" {
  name          = "${var.project_id}-tubeforge-assets"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true
}

# Cloud Run service (deployed via adk deploy, this is the infra scaffold)
# The actual deployment uses: adk deploy cloud_run --project=$PROJECT --region=$REGION tubeforge/
