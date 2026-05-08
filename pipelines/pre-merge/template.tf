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
  project_urn    = "urn:cb:project-console:project:4121aa939a"
  full_repo_name = "coinbase.ghe.com/bootcamp/secret-phrase"
}

data "pipelines_stack" "development" {
  stack_urn = "urn:cb:pipeline-service:stack:secret-phrase-development"
}

module "source_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  stack_id     = "bootcamp-secret-phrase:src-${var.pr_number}"
  display_name = "Source"

  targets = [
    provider::pipelines::github_repository({
      id             = "secret-phrase-src"
      display_name   = "bootcamp/secret-phrase:${var.pr_number}"
      full_repo_name = local.full_repo_name
      branch         = var.branch
    })
  ]
}

module "build_stack" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/stack"
  version = "~> 2.0"

  project_urn  = local.project_urn
  stack_id     = "bootcamp-secret-phrase:build-${var.pr_number}"
  display_name = "Build"

  targets = [
    provider::pipelines::baldur_ecr_build({
      id             = "secret-phrase-build"
      display_name   = "Secret Phrase"
      full_repo_name = local.full_repo_name
      build_name     = "secret-phrase"
      source_target  = "secret-phrase-src"
      branch         = var.branch
    })
  ]
}

module "pr_pipeline" {
  source  = "terraform-modules.cbhq.net/terraform/pipeline-modules/pipeline"
  version = "~> 2.0"

  project_urn  = local.project_urn
  pipeline_id  = var.pipeline_id
  display_name = "Secret Phrase #${var.pr_number}"

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
