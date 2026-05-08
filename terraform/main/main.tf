module "service" {
  source  = "terraform-modules.cbhq.net/terraform/cb-service/main"
  version = "~> 1.0"

  project_name       = local.project_name
  configuration_name = var.configuration_name
  name               = "secret-phrase"

  eks_config = {
    health_check_ports = [3001]
    mesh_ingress_ports = [3001]
  }

  role_config = {
    tags = {
      DataClassification       = local.data_classification
      ComplianceClassification = local.compliance_classification
    }
  }
}

module "dns" {
  source  = "terraform-modules.cbhq.net/terraform/cb-dns/main"
  version = "~> 0.1, >= 0.1.5"

  records = [
    {
      name = var.dns.name
      values = [
        var.dns.value
      ]
    }
  ]
}
