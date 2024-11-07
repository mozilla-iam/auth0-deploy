terraform {
  required_providers {
    auth0 = {
      source  = "auth0/auth0"
      version = "1.2.0"
    }
  }
  backend "gcs" {
    bucket = "iam-auth0-terraform-state"
    prefix = "terraform/prod/gcp-us-east1/auth0-deploy"
  }
}

provider "auth0" {}

provider "google" {
  project = "iam-auth0"
  region  = "us-east1"
}
