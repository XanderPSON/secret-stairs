module "dns" {
  source  = "terraform-modules.cbhq.net/terraform/cb-dns/main"
  version = "~> 0.1"

  records = [
    {{- if $.EnableDevelopmentConfiguration }}
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
    {{- if $.EnableProductionConfiguration }}
    {
      name = "placeholder-url-name.cbhq.net"
      values = [
        "placeholder-prod-k8s-cluster.aws-use1.mesh.cbhq.net"
      ]
    },
    {{- end }}
  ]
}
