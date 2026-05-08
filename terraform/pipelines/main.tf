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
  project_urn    = "urn:cb:project-console:project:4121aa939a"
  full_repo_name = "coinbase.ghe.com/bootcamp/secret-phrase"
  pipeline_id    = "bootcamp:secret-phrase"
  pipeline_urn   = "urn:cb:pipeline-service:pipeline:${local.pipeline_id}"
}

// --- Source Stack: Watches the Git repository ---
module "source_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  display_name = "Source"
  stack_id = "secret-phrase-src"

  targets = [
    provider::pipelines::github_repository({
      id             = "secret-phrase-src"
      display_name   = "bootcamp/secret-phrase:master"
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
  stack_id = "secret-phrase-build"

  targets = [
    provider::pipelines::baldur_ecr_build({
      id             = "secret-phrase-build"
      display_name   = "Secret Phrase"
      full_repo_name = local.full_repo_name
      build_name     = "secret-phrase"
      source_target  = "secret-phrase-src"
    })
  ]
}
// --- Development Stack: Deploys to development environment ---
module "development_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn         = local.project_urn
  master_pipeline_urn = local.pipeline_urn
  display_name        = "Development"
  stack_id            = "secret-phrase-development"

  targets = [
    provider::pipelines::sif_deploy({
      id              = "secret-phrase-development"
      display_name    = "Secret Phrase Development"
      full_repo_name  = local.full_repo_name
      account_alias   = "platforms-shared-dev"
      configuration   = "development"
      deployable_name = "development"
      build_target    = "secret-phrase-build"
    })
  ]
}

// --- Pipeline: Connects stacks with subscriptions ---
module "pipeline" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/pipeline"
  version = "~> 2.0"

  project_urn  = local.project_urn
  display_name = "Secret Phrase"
  pipeline_id  = "bootcamp:secret-phrase"

  subscriptions = [
    {
      automatic          = true
      from_stack         = module.source_stack.stack
      to_stack           = module.build_stack.stack
      external_execution = true
    },
    {
      automatic  = true
      from_stack = module.build_stack.stack
      to_stack   = module.development_stack.stack
    },
  ]
}
