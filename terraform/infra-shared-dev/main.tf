module "dns" {
  source  = "terraform-modules.cbhq.net/terraform/cb-dns/main"
  version = "~> 0.1, >= 0.1.5"

  records = [
    {
      name = "secret-phrase-dev.cbhq.net"
      values = [
        "platforms-shared-dev.aws-use1.mesh.cbhq.net"
      ]
    },
  ]
}