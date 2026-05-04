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

variable "pipeline_id" {
  description = "The unique identifier for the pipeline"
  type        = string
}

variable "master_pipeline_urn" {
  description = "The URN of the master pipeline"
  type        = string
}

variable "branch" {
  description = "The branch name for the PR pipeline"
  type        = string
}

variable "pr_number" {
  description = "The pull request number"
  type        = string
}

variable "pr_author" {
  description = "The author of the pull request"
  type        = string
}

variable "pr_repo" {
  description = "The repository name for the pull request"
  type        = string
}

locals {
  project_urn    = "placeholder-project-console-urn"
  full_repo_name = "placeholder-github-domain/placeholder-org/placeholder-name"
}

data "pipelines_stack" "development" {
  stack_urn = "urn:cb:pipeline-service:stack:placeholder-name-development"
}

module "source_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  stack_id     = "placeholder-org-placeholder-name:src-${var.pr_number}"
  display_name = "Source"

  targets = [
    provider::pipelines::github_repository({
      id             = "placeholder-name-src"
      display_name   = "placeholder-org/placeholder-name:${var.pr_number}"
      full_repo_name = local.full_repo_name
      branch         = var.branch
    })
  ]
}

module "build_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  stack_id     = "placeholder-org-placeholder-name:build-${var.pr_number}"
  display_name = "Build"

  targets = [
    provider::pipelines::baldur_ecr_build({
      id             = "placeholder-name-build"
      display_name   = "placeholder-display-name"
      full_repo_name = local.full_repo_name
      build_name     = "placeholder-name"
      source_target  = "placeholder-name-src"
      branch         = var.branch
    })
  ]
}

module "pr_pipeline" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/pipeline"
  version = "~> 2.0"

  project_urn  = local.project_urn
  pipeline_id  = var.pipeline_id
  display_name = "placeholder-display-name #${var.pr_number}"

  master_pipeline_urn = var.master_pipeline_urn
  pr_number           = var.pr_number
  pr_author           = var.pr_author
  pr_repo             = var.pr_repo

  subscriptions = [
    {
      automatic  = false
      from_stack = module.source_stack.stack
      to_stack   = module.build_stack.stack
    },
    {
      automatic  = true
      from_stack = module.build_stack.stack
      to_stack   = data.pipelines_stack.development
    }
  ]
}
