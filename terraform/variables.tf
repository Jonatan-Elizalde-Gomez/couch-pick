variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Cloudflare API token (Account permissions: D1, R2, Workers, Access, Pages)"
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "zone_id" {
  type        = string
  default     = ""
  description = "Zone ID si usas dominio propio para la app (opcional)"
}

variable "access_allowed_emails" {
  type        = list(string)
  description = "Lista de emails autorizados (máx 2 para la pareja)"
}

variable "project_name" {
  type        = string
  default     = "couchpick"
  description = "Nombre del proyecto (D1, R2, Worker)"
}

variable "pages_domain" {
  type        = string
  default     = ""
  description = "Dominio de la app (ej: couchpick.pages.dev o app.tudominio.com). Para Access con zona."
}
