variable "configuration_name" {
  description = "The name of the configuration. Should match the deployment configuration in Codeflow."
  type        = string
}

variable "dns" {
  description = "The DNS record for the service."
  type = object({
    name  = string
    value = string
  })
}

# variable "tags" {
#   type = map(string)
#   default = {
#     cb-owning_team   = "infra/dx-server-foundations-guild",
#     cb-slack_channel = "<<slack-channel>>",
#   }
# }