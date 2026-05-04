module "dns" {
  source  = "terraform-modules.cbhq.net/terraform/cb-dns/main"
  version = "~> 0.1, >= 0.1.5"

  records = [
    {{- if and $.EnableDevelopmentConfiguration (not $.SetToInfraSharedDev) }}
    {
      name = "placeholder-url-name-dev.cbhq.net"
      values = [
        "placeholder-dev-k8s-cluster.aws-use1.mesh.cbhq.net"
      ]
    },
    {{- end }}
    {{- if $.EnableStagingConfiguration }}
    {
      name = "placeholder-url-name-staging.cbhq.net"
      values = [
        "placeholder-staging-k8s-cluster.aws-use1.mesh.cbhq.net"
      ]
    },
    {{- end }}
  ]
}

{{- if $.SetToInfraSharedDev }}
module "main" {
  source = "../main"

  configuration_name = "development"

  dns = {
    name  = "placeholder-url-name-dev.cbhq.net"
    value = "placeholder-dev-k8s-cluster.aws-use1.mesh.cbhq.net"
  }
}
{{- end }}