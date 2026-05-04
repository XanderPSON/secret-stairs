module "main" {
  source = "../main"

  configuration_name = "staging"

  dns = {
    name  = "placeholder-url-name-staging.cbhq.net"
    value = "placeholder-staging-k8s-cluster.aws-use1.mesh.cbhq.net"
  }
}