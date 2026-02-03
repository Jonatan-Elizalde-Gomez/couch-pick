# --- D1 Database ---
resource "cloudflare_d1_database" "couchpick" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-db"
}

# --- R2 Bucket (posters/thumbnails) ---
resource "cloudflare_r2_bucket" "couchpick_media" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-media"
  location   = "ENAM"
}

# --- KV Namespace (cache metadata TMDB/AniList/YouTube) ---
resource "cloudflare_workers_kv_namespace" "couchpick_metadata_cache" {
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}-metadata-cache"
}

# --- Access: Zero Trust Application (solo 2 usuarios) ---
# Solo se crea si zone_id y pages_domain están definidos.
# Si usas solo *.pages.dev sin dominio en Cloudflare, configura Access desde
# Zero Trust dashboard: Applications > Add an application > Self-hosted.
# Documentación: https://developers.cloudflare.com/cloudflare-one/applications/

resource "cloudflare_access_application" "couchpick" {
  count            = var.zone_id != "" && var.pages_domain != "" ? 1 : 0
  zone_id          = var.zone_id
  name             = "CouchPick"
  domain           = var.pages_domain
  type             = "self_hosted"
  session_duration = "24h"
}

resource "cloudflare_access_policy" "couchpick_allow_emails" {
  count            = var.zone_id != "" && var.pages_domain != "" ? 1 : 0
  zone_id          = var.zone_id
  application_id   = cloudflare_access_application.couchpick[0].id
  name             = "Allow allowed emails"
  precedence       = 1
  decision         = "allow"
  include {
    email = var.access_allowed_emails
  }
}
