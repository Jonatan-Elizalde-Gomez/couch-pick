output "d1_database_id" {
  value       = cloudflare_d1_database.couchpick.id
  description = "D1 database ID para binding en Worker"
}

output "d1_database_name" {
  value       = cloudflare_d1_database.couchpick.name
  description = "D1 database name"
}

output "r2_bucket_name" {
  value       = cloudflare_r2_bucket.couchpick_media.name
  description = "R2 bucket name para media"
}

output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.couchpick_metadata_cache.id
  description = "KV namespace ID para cache de metadata"
}

output "access_application_id" {
  value       = try(cloudflare_access_application.couchpick[0].id, null)
  description = "Access application ID (null si no se usó zone)"
}
