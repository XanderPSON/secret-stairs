terraform {
  required_providers {
    citadel = {
      source  = "coinbase/citadel"
      version = "~> 0.0.1"
    }
  }
}

provider "citadel" {
  environment = "production"
}
// --- Development Deploy Config Stack: Creates development deploy configuration ---
module "dev_deploy_configs" {
  source  = "terraform-modules.cbhq.net/terraform/citadel-modules/sif"
  version = "~> 1.0"

  project_name    = "bootcamp/secret-phrase"
  target          = "platforms-shared-dev"
  configuration   = "development"
  deployable_name = "development"

  chart_path  = "apps/secret-phrase/chart"
  build_names = ["secret-phrase"]
}
