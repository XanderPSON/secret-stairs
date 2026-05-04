terraform {
  required_providers {
    pipelines = {
      source  = "coinbase/pipelines"
      version = "~> 2.0"
    }
  }
}

provider "pipelines" {
  environment = "production"
}

locals {
  project_urn    = "placeholder-project-console-urn"
  full_repo_name = "placeholder-github-domain/placeholder-org/placeholder-name"
  pipeline_id    = "placeholder-org:placeholder-name"
  pipeline_urn   = "urn:cb:pipeline-service:pipeline:${local.pipeline_id}"
}

// --- Source Stack: Watches the Git repository ---
module "source_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  display_name = "Source"
  stack_id = "placeholder-name-src"

  targets = [
    provider::pipelines::github_repository({
      id             = "placeholder-name-src"
      display_name   = "placeholder-org/placeholder-name:master"
      full_repo_name = local.full_repo_name
      branch         = "master"
    })
  ]
}

// --- Build Stack: Builds artifacts from source ---
module "build_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  display_name = "Build"
  stack_id = "placeholder-name-build"

  targets = [
    provider::pipelines::baldur_ecr_build({
      id             = "placeholder-name-build"
      display_name   = "placeholder-display-name"
      full_repo_name = local.full_repo_name
      build_name     = "placeholder-name"
      source_target  = "placeholder-name-src"
    })
  ]
}

{{- if $.EnableDevelopmentConfiguration }}
// --- Development Stack: Deploys to development environment ---
module "development_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn         = local.project_urn
  master_pipeline_urn = local.pipeline_urn
  display_name        = "Development"
  stack_id            = "placeholder-name-development"

  targets = [
    provider::pipelines::sif_deploy({
      id              = "placeholder-name-development"
      display_name    = "placeholder-display-name Development"
      full_repo_name  = local.full_repo_name
      account_alias   = "placeholder-dev-aws-account"
      configuration   = "development"
      deployable_name = "development"
      build_target    = "placeholder-name-build"
    })
  ]
}
{{- end }}

{{- if $.EnableStagingConfiguration }}
// --- Staging Stack: Deploys to staging environment ---
module "staging_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  display_name = "Staging"
  stack_id = "placeholder-name-staging"

  targets = [
    provider::pipelines::sif_deploy({
      id              = "placeholder-name-staging"
      display_name    = "placeholder-display-name Staging"
      full_repo_name  = local.full_repo_name
      account_alias   = "placeholder-staging-aws-account"
      configuration   = "staging"
      deployable_name = "staging"
      build_target    = "placeholder-name-build"
    })
  ]
}
{{- end }}

{{- if $.EnableProductionConfiguration }}
// --- Production Stack: Deploys to production ---
module "production_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  display_name = "Production"
  stack_id = "placeholder-name-production"

  targets = [
    provider::pipelines::sif_deploy({
      id              = "placeholder-name-production"
      display_name    = "placeholder-display-name Production"
      full_repo_name  = local.full_repo_name
      account_alias   = "placeholder-prod-aws-account"
      configuration   = "production"
      deployable_name = "production"
      build_target    = "placeholder-name-build"
    })
  ]
}
{{- end }}

// --- Pipeline: Connects stacks with subscriptions ---
module "pipeline" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/pipeline"
  version = "~> 2.0"

  project_urn  = local.project_urn
  display_name = "placeholder-display-name"
  pipeline_id  = "placeholder-org:placeholder-name"

  subscriptions = [
    {
      automatic          = true
      from_stack         = module.source_stack.stack
      to_stack           = module.build_stack.stack
      external_execution = true
    },
    {{- if $.EnableDevelopmentConfiguration }}
    {
      automatic  = true
      from_stack = module.build_stack.stack
      to_stack   = module.development_stack.stack
    },
    {{- end }}
    {{- if $.EnableStagingConfiguration }}
    {
      automatic  = true
      from_stack = module.build_stack.stack
      to_stack   = module.staging_stack.stack
    },
    {{- end }}
    {{- if $.EnableProductionConfiguration }}
    {{- if $.EnableStagingConfiguration }}
    {
      automatic  = false
      from_stack = module.staging_stack.stack
      to_stack   = module.production_stack.stack
    }
    {{- else }}
    {
      automatic  = false
      from_stack = module.build_stack.stack
      to_stack   = module.production_stack.stack
    }
    {{- end }}
    {{- end }}
  ]
}
