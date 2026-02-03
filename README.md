# CouchPick

Biblioteca personal de contenido (watchlist + shuffle) con filtros avanzados (incluir/excluir), búsqueda automática o manual, y “¿qué vemos?” con animación. Modo oscuro, cards por tipo (película, serie, anime, YouTube), exportar/importar respaldo.

---

## Índice

1. [Requisitos](#requisitos)
2. [Configuración](#configuración)
3. [Comandos](#comandos)
4. [Guía paso a paso: producción](#guía-paso-a-paso-producción)
5. [Endpoints API](#endpoints-api)
6. [Seguridad y rate limiting](#seguridad-y-rate-limiting)
7. [Coste estimado](#coste-estimado)

---

## Requisitos

- **Node.js** 18+ y **npm** (o pnpm/yarn)
- **Cuenta en Cloudflare** (plan Free suficiente)
- **Terraform** 1.x (opcional; para crear D1, R2, KV y Access desde código)
- **Wrangler** (viene como devDependency en `packages/api`)

---

## Configuración

### 1. Variables de entorno del frontend (`packages/web`)

Copia el ejemplo y rellena:

```bash
cd packages/web
cp env.example .env
```

Edita `.env`:

| Variable | Descripción | Ejemplo |
|---------|-------------|---------|
| `VITE_API_URL` | URL base de la API. En local el proxy de Vite usa `/api`; en producción, la **URL del Worker** (ver abajo cómo obtenerla). | `/api` (local) o `https://couchpick-api.TU_SUBDOMINIO.workers.dev` |
| `VITE_TMDB_API_KEY` | API key de TMDB para autocompletar películas/series. Opcional. | 1) Crea cuenta en `themoviedb.org` → 2) **Profile** (icono arriba derecha) → **Settings** → pestaña **API** → botón **Create** / **Request an API key**. |

- **Desarrollo**: `VITE_API_URL=/api` (Vite redirige `/api` → `http://localhost:8787`).
- **Producción**: `VITE_API_URL=https://couchpick-api.TU_SUBDOMINIO.workers.dev` (sin `/api` al final; el frontend ya añade `/api` en el client si lo usas así, revisa `packages/web/src/api/client.ts`).

Revisa `packages/web/src/api/client.ts`: si la base URL es `VITE_API_URL` y en producción apuntas al Worker, el Worker debe servir en la raíz (ej. `/health`, `/items`). Si tu Worker está en `https://xxx.workers.dev` y el client hace `fetch(VITE_API_URL + '/items')`, entonces `VITE_API_URL` debe ser `https://xxx.workers.dev` (sin `/api`).

#### Cómo obtener la URL del Worker

La URL del Worker es la que usarás como `VITE_API_URL` en producción. Puedes conseguirla de dos formas:

1. **Al desplegar desde la terminal**  
   Desde `packages/api` ejecuta:
   ```bash
   npx wrangler deploy
   ```
   Al final del proceso Wrangler escribe algo como:
   ```text
   Published couchpick-api (1.23 sec)
   https://couchpick-api.<TU_SUBDOMINIO>.workers.dev
   ```
   Esa línea **es** la URL del Worker. Cópiala (sin barra final).

2. **Desde el panel de Cloudflare**  
   - Entra en [dash.cloudflare.com](https://dash.cloudflare.com).  
   - Menú lateral: **Workers & Pages**.  
   - Pestaña **Workers**.  
   - Haz clic en el nombre de tu Worker (ej. `couchpick-api`).  
   - En la parte superior de la página verás **"Preview"** o la URL pública del Worker, por ejemplo `https://couchpick-api.<subdominio>.workers.dev`.  
   Esa es la URL que debes poner en `VITE_API_URL` (y en las variables de entorno de Pages en producción).

### 2. Terraform (`terraform/`)

Para crear D1, R2, KV y (opcional) Access:

1. Copia el ejemplo de variables:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edita `terraform.tfvars`:

| Variable | Descripción |
|----------|-------------|
| `cloudflare_api_token` | Token de API con permisos: Account – D1, R2, Workers KV, Access, Workers Scripts, Account Settings (lectura). Crear en: Cloudflare Dashboard → My Profile → API Tokens. |
| `cloudflare_account_id` | ID de cuenta. Dashboard → Workers & Pages → Overview; en la URL o en el panel derecho. |
| `project_name` | Nombre del proyecto (D1, R2, KV). Por defecto: `couchpick`. |
| `access_allowed_emails` | Lista de emails que podrán entrar (ej. pareja). Ej: `["a@ejemplo.com", "b@ejemplo.com"]`. |
| `zone_id` | (Opcional) Zone ID del dominio en Cloudflare si quieres proteger un dominio propio con Access. |
| `pages_domain` | (Opcional) Dominio de la app (ej. `app.tudominio.com` o `couchpick.pages.dev`). Necesario para crear la aplicación Access con Terraform. |

Si no usas dominio propio, deja `zone_id` y `pages_domain` vacíos y configura Access más tarde desde Zero Trust para `*.pages.dev`.

### 3. Worker API (`packages/api/wrangler.toml`)

Después de aplicar Terraform (o crear recursos a mano), rellena los bindings:

| Binding | Dónde obtener el valor |
|---------|-------------------------|
| `database_id` en `[[d1_databases]]` | Ver abajo (D1). Sin un ID válido, el Worker no puede usar la base. |
| `id` en `[[kv_namespaces]]` | Ver abajo (KV). Sin un ID válido, `wrangler deploy` falla. |
| R2: `bucket_name` | Ver abajo (R2). Nombre del bucket; Wrangler puede crearlo en el primer deploy. |

**Auth (login por lista de correos + contraseña):**  
- **Correos permitidos:** en el Dashboard del Worker → **Settings** → **Variables** → añade `ALLOWED_EMAILS` = `tu@email.com, pareja@email.com` (separados por coma).  
- **Contraseña:** no se pone en el código. Desde `packages/api` ejecuta `npx wrangler secret put APP_PASSWORD` y escribe la contraseña cuando pida.  
- **Cambiar la contraseña:** vuelve a ejecutar `npx wrangler secret put APP_PASSWORD` con la nueva contraseña; las sesiones antiguas dejan de valer a los 24 h (o al cerrar sesión).  
- Si no defines `ALLOWED_EMAILS` ni `APP_PASSWORD`, sigue funcionando el usuario de desarrollo `couch@pick.dev` / `couchpick`.

**Si usaste Terraform:** ejecuta `terraform output d1_database_id` y `terraform output kv_namespace_id` y pega los valores en `wrangler.toml` en `<D1_DATABASE_ID>` y `<KV_NAMESPACE_ID>`. El bucket R2 se crea con Terraform; el nombre en `wrangler.toml` debe ser el mismo (`couchpick-media` por defecto).

**Si no usaste Terraform** (crear recursos a mano):

1. **D1 database**  
   Desde `packages/api`:
   ```bash
   npx wrangler d1 create couchpick-db
   ```
   En la salida verás algo como `database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`. Copia ese **database_id** (solo el valor) y en `wrangler.toml`, en `[[d1_databases]]`, sustituye `<D1_DATABASE_ID>` por ese valor.  
   *Alternativa:* Dashboard → **Workers & Pages** → **D1** → **Create database** → nombre `couchpick-db` → crear → en la tabla, copia la columna **ID** de esa base.

2. **KV namespace (cache de metadata)**  
   Desde `packages/api`:
   ```bash
   npx wrangler kv namespace create "couchpick-metadata-cache"
   ```
   Wrangler imprimirá un bloque con un `id`. Copia ese **id** y en `wrangler.toml` sustituye `<KV_NAMESPACE_ID>` por ese valor.  
   *Alternativa:* Dashboard → **Workers & Pages** → **KV** → **Create namespace** → título `couchpick-metadata-cache` → crear → copia el **Namespace ID**.

3. **R2 bucket**  
   En `wrangler.toml` solo se usa `bucket_name = "couchpick-media"` (no hay ID que pegar). En el **primer** `wrangler deploy`, Wrangler puede crear el bucket automáticamente si no existe.  
   *Alternativa:* Dashboard → **R2** → **Create bucket** → nombre `couchpick-media` → crear. Luego el deploy enlazará el Worker a ese bucket por nombre.

---

## Comandos

Desde la **raíz del repo** (salvo que se indique otra cosa):

| Comando | Descripción |
|---------|-------------|
| `npm install` | Instala dependencias de todos los workspaces. |
| `npm run dev` | Levanta API (Wrangler dev) y Web (Vite) a la vez. |
| `npm run dev:api` | Solo API: `http://localhost:8787`. |
| `npm run dev:web` | Solo frontend: `http://localhost:5173` (proxy `/api` → 8787). |
| `npm run build:web` | Build de producción del frontend → `packages/web/dist`. |
| `npm run build:api` | Despliega el Worker (equivale a `wrangler deploy` en `packages/api`). |
| `npm run infra:init` | `terraform init` en `terraform/`. |
| `npm run infra:plan` | `terraform plan`. |
| `npm run infra:apply` | `terraform apply`. |

Solo API (`packages/api`):

| Comando | Descripción |
|---------|-------------|
| `npx wrangler dev` | Desarrollo local del Worker. |
| `npx wrangler deploy` | Despliega el Worker a Cloudflare. |
| `npx wrangler d1 create couchpick-db` | Crea base D1 (si no usas Terraform). |
| `npx wrangler d1 execute couchpick-db --local --file=./drizzle/migrations/0000_initial.sql` | Aplica migración en local. |
| `npx wrangler d1 execute couchpick-db --remote --file=./drizzle/migrations/0000_initial.sql` | Aplica migración en la base remota (producción). |

---

## Guía paso a paso: producción

Sigue estos pasos en orden para dejar CouchPick en producción (Cloudflare).

### Paso 1: Cuenta y token de Cloudflare

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) con tu cuenta.
2. Anota tu **Account ID**: menú lateral **Workers & Pages** → pestaña **Overview** → en la parte derecha verás “Account ID”.
3. Crea un **API Token**: arriba a la derecha tu avatar → **My Profile** → pestaña **API Tokens** → botón **Create Token**. Usa la plantilla **Edit Cloudflare Workers** o un token personalizado con:
   - Account: D1, R2, Workers KV, Workers Scripts, Access, Account Settings (read).
4. Guarda el token en un lugar seguro (solo se muestra una vez).

### Paso 2: Clonar repo e instalar

```bash
git clone <URL_DEL_REPO> CouchPick
cd CouchPick
npm install
```

### Paso 3: Crear recursos en Cloudflare con Terraform

1. Entra en `terraform` y configura variables:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```
   Edita `terraform.tfvars`: pon `cloudflare_api_token`, `cloudflare_account_id`, `access_allowed_emails` (emails que podrán loguearse). Si tienes dominio y zona en Cloudflare, rellena `zone_id` y `pages_domain`; si no, déjalos vacíos.

2. Inicializa y aplica Terraform:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
   Confirma con `yes`. Anota los outputs:
   ```bash
   terraform output d1_database_id
   terraform output d1_database_name
   terraform output kv_namespace_id
   terraform output r2_bucket_name
   ```

### Paso 4: Configurar el Worker (API)

1. Entra en `packages/api`:
   ```bash
   cd ../packages/api
   ```

2. Abre `wrangler.toml` y sustituye:
   - `<D1_DATABASE_ID>` → valor de `terraform output d1_database_id`.
   - `<KV_NAMESPACE_ID>` → valor de `terraform output kv_namespace_id`.
   El nombre de D1 debe coincidir con el de Terraform (ej. `couchpick-db`).

3. Crea la base D1 en Cloudflare (si Terraform ya la creó, no hace falta crear otra; solo enlaza el `database_id`). Si usaste Terraform, el nombre es `couchpick-db` y el ID es el del output.

4. Aplica la migración en la base **remota** (producción):
   ```bash
   npx wrangler d1 execute couchpick-db --remote --file=./drizzle/migrations/0000_initial.sql
   ```

5. Despliega el Worker:
   ```bash
   npx wrangler deploy
   ```
   Al final verás la URL del Worker, por ejemplo: `https://couchpick-api.TU_SUBDOMINIO.workers.dev`.  
   También puedes verla en **Cloudflare Dashboard** → **Workers & Pages** → pestaña **Workers** → haz clic en tu script (`couchpick-api`) → en la parte superior aparece la URL pública. **Cópiala**: la usarás como `VITE_API_URL` en producción.

### Paso 5: Conectar el frontend a la API en producción

1. En `packages/web`, crea `.env.production` (o usa variables de entorno en Cloudflare Pages):
   ```
   VITE_API_URL=https://couchpick-api.TU_SUBDOMINIO.workers.dev
   VITE_TMDB_API_KEY=tu_api_key_si_la_tienes
   ```
   Sustituye `TU_SUBDOMINIO` por el que te dio Wrangler. La URL no debe llevar `/api` al final si tu cliente ya concatena la ruta (revisa `client.ts`).

2. Comprueba en `packages/web/src/api/client.ts` cómo se usa `VITE_API_URL`. Si las peticiones son `fetch(VITE_API_URL + '/items')`, entonces `VITE_API_URL` debe ser solo la base (sin `/api`). Si el Worker está en la raíz, esa base es `https://couchpick-api....workers.dev`.

### Paso 6: Desplegar el frontend en Cloudflare Pages

1. En Cloudflare Dashboard: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Conecta el repositorio de CouchPick.
3. Configuración de build:
   - **Framework preset**: None (o Vite si lo detecta).
   - **Build command**: `npm run build -w @couchpick/web` (o `npm ci && npm run build -w @couchpick/web`).
   - **Build output directory**: `packages/web/dist`.
   - **Root directory**: deja vacío (raíz del repo).

4. Variables de entorno (Settings → Environment variables):
   - `VITE_API_URL` = `https://couchpick-api.TU_SUBDOMINIO.workers.dev` (producción).
   - `VITE_TMDB_API_KEY` = tu clave TMDB (opcional).
   Añádelas para **Production** (y si quieres para Preview).

5. Guarda y despliega. Pages te dará una URL tipo `https://<nombre-proyecto>.pages.dev`.

### Paso 7: Proteger la app con Cloudflare Access (recomendado)

Para que solo los emails de `access_allowed_emails` puedan entrar:

**Opción A – Dominio en Cloudflare (ya tienes `zone_id` y `pages_domain` en Terraform)**  
Terraform ya habrá creado la aplicación Access. Solo verifica en Zero Trust → Access → Applications que la política permite esos emails.

**Opción B – Solo Pages (*.pages.dev)**  
1. Zero Trust → Access → Applications → Add an application.
2. Tipo: **Self-hosted**.
3. **Application domain**: `https://<tu-proyecto>.pages.dev` (la URL de Pages).
4. **Session duration**: 24 hours (o la que prefieras).
5. En **Application appearance** (opcional): nombre “CouchPick”.
6. En **Policies**: Add a policy – nombre “Allow emails”, Action **Allow**, Include → **Emails** → los mismos que pusiste en `access_allowed_emails`.

Así, al abrir la URL de Pages, Cloudflare pedirá login (por email/OTP o IdP) y solo los permitidos llegarán a la app.

### Paso 8: CORS (si el frontend y la API están en orígenes distintos)

La API (Hono) ya suele tener CORS. Si tu frontend está en `https://xxx.pages.dev` y la API en `https://yyy.workers.dev`, revisa en `packages/api/src/index.ts` que el origen de Pages esté permitido (por ejemplo en la configuración de `cors()`). Si usas `origin: '*'` en desarrollo, en producción puedes restringir a `https://<tu-proyecto>.pages.dev`.

### Paso 9: Comprobar producción

1. Abre la URL de Pages (con Access, inicia sesión).
2. Inicia sesión en la app (login simulado: cualquier email/contraseña si no has cambiado la lógica de auth).
3. Prueba: añadir contenido, shuffle, filtros, exportar/importar.

### Paso 10: Resumen de URLs y variables

| Dónde | Qué |
|-------|-----|
| **Frontend (Pages)** | `https://<proyecto>.pages.dev` |
| **API (Worker)** | `https://couchpick-api.<subdominio>.workers.dev` |
| **Pages env** | `VITE_API_URL` = URL del Worker; `VITE_TMDB_API_KEY` opcional |
| **wrangler.toml** | `database_id` (D1), `id` (KV); bucket R2 si lo usas |

---

## Endpoints API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Health check. |
| POST | `/auth/login` | No | Login por lista de correos (`ALLOWED_EMAILS`) + contraseña (`APP_PASSWORD`). Body: `{ email, password, remember? }`. |
| GET | `/items` | Sí | Lista con filtros. Query: `tipo`, `tipoExcluir`, `genero`, `generoExcluir`, `tag`, `tagExcluir`, `soloNoVistos`, `page`, `limit`. |
| GET | `/items/export` | Sí | Exporta todos los ítems (respaldo JSON). |
| POST | `/items/import` | Sí | Importa respaldo. Body: `{ items: [...] }`. |
| GET | `/items/:id` | Sí | Detalle de un ítem. |
| POST | `/items` | Sí | Crear ítem. |
| PATCH | `/items/:id` | Sí | Actualizar ítem. |
| DELETE | `/items/:id` | Sí | Eliminar ítem. |
| POST | `/shuffle` | Sí | Devuelve un ítem aleatorio. Mismos query params que `GET /items`. |

Sesión: header `x-couchpick-session`. El frontend guarda el token en `localStorage` y lo envía en cada petición.

---

## Seguridad y rate limiting

- **DDoS a nivel de red**: Cloudflare protege por defecto el tráfico que pasa por su red ( Workers/Pages detrás de su proxy ).
- **Rate limiting en la API**: El Worker aplica límites por IP usando KV (el mismo binding `CACHE`):
  - **Global**: 100 peticiones por minuto por IP (todas las rutas).
  - **Health** (`/health`): 5 peticiones por minuto por IP (evita abuso de healthchecks).
  - **Auth** (`/auth/*`): 10 peticiones por minuto por IP (protege login/registro).
- Si se supera el límite, la API responde **429** con `Retry-After: 60` y un mensaje en español. Los contadores se reinician cada minuto (ventana fija).

---

## Coste estimado

Con el plan **Free** de Cloudflare:

- **Pages**: builds y tráfico incluidos.
- **Workers**: 100.000 peticiones/día gratis.
- **D1**: 5 GB almacenamiento, millones de lecturas.
- **R2**: 10 GB almacenamiento, sin egress fees.
- **KV**: 100.000 lecturas/día.
- **Access**: hasta 50 usuarios gratis.

Para uso en pareja/familiar, el coste esperado es **0 €/mes**. Access limita el acceso a los emails que configures.

---

## Estructura del proyecto

```
CouchPick/
├── packages/
│   ├── api/                 # Worker Hono + D1 + Drizzle
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/      # auth, items, shuffle
│   │   │   ├── db/          # schema, migrations
│   │   │   └── lib/
│   │   ├── drizzle/migrations/
│   │   └── wrangler.toml
│   └── web/                 # React SPA (Vite)
│       ├── src/
│       │   ├── api/        # client, auth, items, search
│       │   ├── components/
│       │   ├── pages/      # Landing, Main, Crud
│       │   └── context/
│       ├── env.example
│       └── vite.config.ts
├── terraform/              # D1, R2, KV, Access
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── package.json            # Workspaces
└── README.md
```
