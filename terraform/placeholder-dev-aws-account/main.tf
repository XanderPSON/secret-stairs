module "main" {
  source = "../main"

  configuration_name = "development"

  dns = {
    name  = "placeholder-url-name-dev.cbhq.net"
    value = "placeholder-dev-k8s-cluster.aws-use1.mesh.cbhq.net"
  }
}