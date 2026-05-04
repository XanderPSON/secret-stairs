module "main" {
  source = "../main"

  configuration_name = "production"

  dns = {
    name  = "placeholder-url-name.cbhq.net"
    value = "placeholder-prod-k8s-cluster.aws-use1.mesh.cbhq.net"
  }
}