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

{{- if $.EnableDevelopmentConfiguration }}
// --- Development Deploy Config Stack: Creates development deploy configuration ---
module "dev_deploy_configs" {
  source  = "terraform-modules.cbhq.net/terraform/citadel-modules/sif"
  version = "~> 1.0"

  project_name    = "placeholder-org/placeholder-name"
  target          = "placeholder-dev-aws-account"
  configuration   = "development"
  deployable_name = "development"

  chart_path  = "apps/placeholder-name/chart"
  build_names = ["placeholder-name"]
}
{{- end }}

{{- if $.EnableStagingConfiguration }}
// --- Staging Deploy Config Stack: Creates staging deploy configuration ---
module "staging_deploy_configs" {
  source  = "terraform-modules.cbhq.net/terraform/citadel-modules/sif"
  version = "~> 1.0"

  project_name    = "placeholder-org/placeholder-name"
  target          = "placeholder-staging-aws-account"
  configuration   = "staging"
  deployable_name = "staging"

  chart_path  = "apps/placeholder-name/chart"
  build_names = ["placeholder-name"]
}
{{- end }}

{{- if $.EnableProductionConfiguration }}
// --- Production Deploy Config Stack ---
module "production_deploy_configs" {
  source  = "terraform-modules.cbhq.net/terraform/citadel-modules/sif"
  version = "~> 1.0"

  project_name    = "placeholder-org/placeholder-name"
  target          = "placeholder-prod-aws-account"
  configuration   = "production"
  deployable_name = "production"

  chart_path  = "apps/placeholder-name/chart"
  build_names = ["placeholder-name"]
}
{{- end }}
