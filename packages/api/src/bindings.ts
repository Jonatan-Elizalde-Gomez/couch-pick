export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  CACHE: KVNamespace;
  ENVIRONMENT: string;
  /** Lista de correos permitidos (separados por coma). Si no se define, se usa el usuario mock. */
  ALLOWED_EMAILS?: string;
  /** Contraseña compartida para login. Definir como secret: wrangler secret put APP_PASSWORD */
  APP_PASSWORD?: string;
}
