module "main" {
  source = "../main"

  configuration_name = "development"

  dns = {
    name  = "secret-phrase-dev.cbhq.net"
    value = "platforms-shared-dev.aws-use1.mesh.cbhq.net"
  }
}