# Deploying RentVision on Render

This guide deploys the RentVision monorepo to [Render](https://render.com) with the
[`render.yaml`](../render.yaml) Blueprint. It is an **additional** deployment target:
the AWS CDK stack, local development workflow, and existing features are unchanged.

The Render deployment is a self-contained public demo. It does not require AWS
credentials, but its API uses an in-memory data store, so data is intentionally
ephemeral (see [Data and persistence](#data-and-persistence)).

---

## 1. What gets deployed

The Blueprint creates three free-tier web services in the `frankfurt` region:

| Service | Runtime | Public role | Health check |
| --- | --- | --- | --- |
| `rentvision-web` | Node.js 22 | Next.js frontend and the only origin the browser needs | `/api/health` |
| `rentvision-api` | Node.js 22 | TypeScript/Node API backed by the in-memory store | `/health` |
| `rentvision-ai` | Python 3.12 | FastAPI listing extraction, lease Q&A, and assistant service | `/health` |

```text
Browser
  │
  └── https://rentvision-web.onrender.com
        ├── /api/v1/*      ──► rentvision-api  (Render private host:port)
        └── /api/ai/chat   ──► rentvision-ai   (Render private host:port)
```

The browser calls the Next.js service for normal API traffic. Next.js Route
Handlers proxy requests over Render's private network, so the API and AI hosts do
not need to be known when the frontend is built. Direct browser requests to the
API are only used for the short-lived media upload/download URLs returned by the
API.

### Monorepo build context

The Blueprint deliberately leaves `rootDir` unset. `apps/web` and `services/api`
import files from `shared/contracts`, so builds must run with the repository root
as their build context. Each `buildCommand` changes into the relevant package
directory:

```yaml
buildCommand: cd services/api && npm ci --include=dev && npm run build
startCommand: cd services/api && npm start
```

Do not add a service-level `rootDir` unless the shared-contract imports are
restructured first.

---

## 2. Prerequisites

- A Render account.
- This repository pushed to GitHub or GitLab, with `render.yaml` at the repo root.
- Optional: a Gemini API key for live assistant answers. The deployment is fully
  functional without one; see [AI provider configuration](#5-ai-provider-configuration).

No AWS account, AWS credentials, or CDK bootstrap is needed for this path.

---

## 3. Deploy the Blueprint

1. Commit and push the repository, including `render.yaml`.
2. In the Render Dashboard, choose **New +** → **Blueprint**.
3. Connect the repository and select the branch to deploy.
4. Review the three services Render discovers. Keep the `frankfurt` region so the
   services share a private network.
5. When Render prompts for `GEMINI_API_KEY`, either paste a key or leave it blank.
   The value is stored as a secret and is never written to the repository.
6. Click **Apply**. Render creates the services, generates `AUTH_TOKEN_SECRET`,
   and starts the first builds.

The first deploy can take several minutes: the web app runs a full Next.js build,
the API compiles TypeScript, and the AI service installs its Python dependencies.
Wait for all three services to report **Live** before testing.

Open the `rentvision-web` URL shown in the dashboard. The application starts with
the seeded demo listings.

> Free instances spin down after a period of inactivity and take extra time to
> start on the next request. The proxies return `503`/`504` if a cold start takes
> longer than their timeout; retrying usually succeeds.

---

## 4. Service configuration

All values below are set by `render.yaml`; the tables explain why they matter.
Change them in the Render Dashboard or in the Blueprint, not in a committed
`.env` file.

### `rentvision-web`

| Variable | Value | Notes |
| --- | --- | --- |
| `NODE_VERSION` | `22.22.0` | Build and runtime Node version. |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/v1` | Relative path; baked into the client build. The API host is not needed at build time. |
| `NEXT_PUBLIC_AUTH_MODE` | `local` | Enables the API-backed demo session flow. See [Authentication](#6-authentication). |
| `API_INTERNAL_URL` | `rentvision-api` private `hostport` | Read at request time by `src/app/api/v1/[...path]/route.ts`. |
| `RENTVISION_AI_BASE_URL` | `rentvision-ai` private `hostport` | Used by the assistant proxy when `RENTVISION_AI_CHAT_URL` is not set. |
| `RENTVISION_AI_CHAT_TIMEOUT_MS` | `20000` | Assistant upstream timeout, clamped to 1,000–60,000 ms. |
| `NEXT_PUBLIC_MAP_*`, `NEXT_PUBLIC_DEFAULT_*` | OpenStreetMap/Addis Ababa | Map tile and initial view configuration. |

`NEXT_PUBLIC_*` values are inlined by Next.js **at build time**. Changing one
requires a new build/deploy; changing a server-only variable only requires a
service restart.

### `rentvision-api`

| Variable | Value | Notes |
| --- | --- | --- |
| `NODE_VERSION` | `22.22.0` | Build and runtime Node version. |
| `NODE_ENV` | `production` | Enables production behavior, including rejecting unsigned legacy tokens. |
| `DATA_STORE` | `memory` | Seeds demo listings on boot; no DynamoDB/S3 calls. |
| `API_LOCAL_MODE` | `false` | **Required.** Disables trust of client-supplied `x-user-id`/`x-user-role` headers. |
| `AUTH_TOKEN_SECRET` | generated | HMAC-SHA256 key for signed session tokens. Render generates it once and preserves it across deploys. |
| `CORS_ALLOWED_ORIGINS` | `*` | Used for direct media upload/download requests. No cookies or credentials are used. |
| `AI_SERVICE_HOST`, `AI_SERVICE_PORT` | `rentvision-ai` private `host`/`port` | Used by the lease Q&A handler. |

The API reads `PORT` from Render and serves `/health` and `/api/v1/health`.
Its production start command is:

```bash
node dist/services/api/src/local-server.js
```

The compiled entry point includes `services/api/src` and the imported
`shared/contracts` files, which is why the path includes `services/api/src`.

Optional:

- `API_PUBLIC_BASE_URL` — overrides the base URL used in returned upload/download
  URLs. If unset, the API uses `RENDER_EXTERNAL_URL`, then
  `http://localhost:${PORT}`.
- `CORS_ALLOWED_ORIGINS` — replace `*` with a comma-separated list (for example,
  your custom web domain) if you want to restrict direct media requests.

### `rentvision-ai`

| Variable | Value | Notes |
| --- | --- | --- |
| `PYTHON_VERSION` | `3.12.8` | Render builds and runs the service with this version. |
| `AI_SERVICE_ENV` | `production` | Deployment mode marker. |
| `CORS_ALLOWED_ORIGINS` | `*` | The service is normally reached server-to-server; the wildcard is safe because credentialed CORS is automatically disabled. |
| `MAX_DOCUMENT_UPLOAD_MB` | `25` | Upload-size configuration hint. |
| `AI_MODEL_NAME` | `models/gemini-3.5-flash` | Default Gemini model used with `GEMINI_API_KEY`. |
| `GEMINI_API_KEY` | unset/prompted | Optional live-provider credential. |

Start command:

```bash
uvicorn rentvision_ai.api:app --app-dir src --host 0.0.0.0 --port $PORT
```

`--app-dir src` is required because the Python package lives under
`services/ai/src`.

---

## 5. AI provider configuration

The AI service has two modes:

- **No provider key** — `GET /health` reports `"provider": "mock"` and
  `"mock_mode": true`. Listing extraction and lease helpers use the deterministic
  mock client, so the demo remains usable. General assistant chat deliberately
  returns `503 not_configured` instead of inventing an answer.
- **`GEMINI_API_KEY` set** — the service uses Gemini's OpenAI-compatible endpoint.
  The default model is `models/gemini-3.5-flash`; the client can fall back to the
  lite variant when the primary model is unavailable.

Set or rotate the key in the Render Dashboard under the `rentvision-ai` service's
**Environment** tab, then redeploy/restart the service. Never expose it through a
`NEXT_PUBLIC_*` variable.

The browser only talks to the web service's `/api/ai/chat` proxy; the AI service
receives conversation text, not account tokens, lease PDFs, or listing media.
See [AI Assistant Guide](ai-assistant.md) for the request/response contract.

To use OpenAI instead of Gemini, set `OPENAI_API_KEY` (or `AI_MODEL_API_KEY`) and
override `AI_MODEL_NAME` / `AI_MODEL_BASE_URL` for the AI service. The Blueprint's
prompt is for Gemini; the underlying client supports either provider.

---

## 6. Authentication

The Blueprint uses the API-backed demo authentication flow because it does not
provision Cognito or a JWT authorizer in front of the Node API:

1. The signup/login pages call `/api/v1/auth/signup` or `/api/v1/auth/login`
   through the Next.js proxy.
2. The API hashes passwords with `scrypt` and returns a compact
   `payload.signature` token signed with HMAC-SHA256 using `AUTH_TOKEN_SECRET`.
3. The web app stores the session in `localStorage` and sends the token as
   `Authorization: Bearer <token>` on API requests.
4. The API verifies the signature and expiry before resolving the user. With
   `API_LOCAL_MODE=false`, spoofed `x-user-id`/`x-user-role` headers are ignored.

Public signup creates `user` accounts by default and may request the `landlord`
role used by the listing owner checks. It cannot create `admin` accounts; the
API rejects `role: "admin"` with `403 FORBIDDEN`. Provision admins explicitly
(for example, in DynamoDB on the AWS deployment) rather than through the public
form.

Tokens expire after 30 days. If the API restarts, its in-memory users are also
cleared, so old tokens no longer resolve to a user; sign up again.

### Cognito and the AWS path

The AWS CDK deployment still uses Cognito and API Gateway authorizers. That path
is documented in the root [README](../README.md#10-deployment) and
[Backend Integration Guide](backend-integration.md).

Do **not** set `NEXT_PUBLIC_COGNITO_*` variables on the Render web service unless
you also add Cognito JWT verification in front of the Node API. The web app would
send a Cognito ID token, but the standalone API only verifies its own signed
tokens or API Gateway authorizer claims, so requests would be rejected. This
Blueprint intentionally avoids that ambiguous state.

The demo auth flow is not suitable for real accounts or sensitive data. It stores
bearer tokens in browser storage and has no email verification, password reset
delivery, rate limiting, or account recovery.

---

## 7. Data and persistence

The Render API runs with `DATA_STORE=memory`:

- Demo listings are seeded from `services/api/src/data/seed.ts` on every boot.
- Users, listings created in the UI, leases, and uploaded objects live in process
  memory.
- **Everything resets on a restart, redeploy, crash, or free-tier spin-down.**
  Uploaded media and lease files are lost with the process.
- No persistent disk or managed database is provisioned by this Blueprint.

This is intentional for a public, self-contained demo. To preserve data, either:

- deploy the API with DynamoDB and S3 (the existing AWS/CDK path), or
- provision a Render Postgres/Key Value instance or external database and extend
  the API data layer; or
- add an S3-compatible object store for media and leases.

Media upload URLs are short-lived (15 minutes) and point at the API's public URL;
the API's `RENDER_EXTERNAL_URL` is used automatically. Direct uploads work because
the Blueprint sets `CORS_ALLOWED_ORIGINS=*`.

---

## 8. Verify the deployment

Replace `<web-url>` with the `rentvision-web` URL from the Render Dashboard.

```bash
# Web liveness
curl -i https://<web-url>/api/health

# Proxied API health (this traverses the Next.js gateway)
curl -i https://<web-url>/api/v1/health

# Public demo listings
curl -s https://<web-url>/api/v1/listings | jq '.data.items | length'

# AI service health (use the rentvision-ai URL from the dashboard)
curl -i https://<ai-url>/health
```

Expected responses:

- Web health: `{"status":"ok","service":"rentvision-web",...}`
- API health through the proxy: `{"status":"ok","time":"..."}`
- Listings: a successful envelope with the seeded demo listings.
- AI `/health`: `{"status":"healthy","version":"0.1.0","provider":"mock"|"gemini","mock_mode":...}`

Authenticated smoke test:

1. Open `<web-url>/signup`, create an account, and confirm you land signed in.
2. Open the landlord area and create a listing.
3. Refresh the page; the listing should remain until the API restarts.
4. Open the assistant. With no `GEMINI_API_KEY`, general questions show an honest
   "not configured" message; listing/lease helpers still work.

Render's own health checks use the exact paths in the service table. A failing
health check blocks a deploy from going live, so check the service logs if a
deploy stays in **Deploying**.

---

## 9. Updating the deployment

- Push to the connected branch. Render rebuilds services whose
  `buildFilter.paths` match the changed files: `apps/web/**`,
  `services/api/**`, `services/ai/**`, `shared/contracts/**`, or `render.yaml`.
- To apply Blueprint changes (new env vars, plans, filters), push `render.yaml` or
  use **Manual Sync** on the Blueprint page.
- Changing a runtime environment variable restarts/redeploys the affected
  service. Changing a `NEXT_PUBLIC_*` value requires a new web build.
- Rotating `AUTH_TOKEN_SECRET` invalidates all existing sessions; users must sign
  in again.
- Deleting the Render services does not modify AWS resources. The CDK stack is
  managed separately.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/api/v1/*` returns `503 API_NOT_CONFIGURED` | `API_INTERNAL_URL` is missing from the web service. | Re-sync the Blueprint; confirm the env var is set to the API's private `hostport`. |
| `/api/v1/*` returns `503 API_UNAVAILABLE` or `504 UPSTREAM_TIMEOUT` | API is asleep, still starting, crashed, or in a different region. | Check the API service logs and `/health`; retry after the cold start. Keep all services in `frankfurt`. |
| `/api/v1/auth/me` returns `401` after it worked before | Token expired, `AUTH_TOKEN_SECRET` changed, or the API restarted and lost in-memory users. | Sign up/in again. |
| Users/listings/uploads disappear | Expected with `DATA_STORE=memory`. | Use a persistent store or the AWS deployment; see [Data and persistence](#7-data-and-persistence). |
| Assistant returns `503 not_configured` | No valid model key, or the key is invalid. | Set `GEMINI_API_KEY` on `rentvision-ai` and redeploy. |
| Assistant returns `504 timeout` | Model response exceeded `RENTVISION_AI_CHAT_TIMEOUT_MS` (default 20 s; max 60 s). | Retry, raise the timeout within the 60 s cap, or use a faster model. |
| AI service health shows `mock_mode: true` unexpectedly | `GEMINI_API_KEY` is not set on the AI service. | Add the key in the Render Dashboard, not in the web service. |
| API build fails with imports from `shared/contracts` | A service-level `rootDir` was added, hiding files outside the package. | Remove `rootDir`; keep the repo root as build context and `cd` in the commands. |
| Python service exits immediately | Wrong start directory/module path. | Use `cd services/ai` and `uvicorn rentvision_ai.api:app --app-dir src ...` as in the Blueprint. |
| Web build succeeds locally but not on Render | Local `.env.local` masked a missing env var, or Node version differs. | Match Node `22.22.0`; keep `NEXT_PUBLIC_API_BASE_URL=/api/v1`; check the build log. |
| Media upload fails with CORS | `CORS_ALLOWED_ORIGINS` does not include the browser origin, or the API is asleep. | Use `*` for the demo, or add the web/custom domain; retry after wake-up. |
| Health check fails although the app runs | The configured health path is wrong. | Web: `/api/health`; API: `/health`; AI: `/health`. |

Logs are available per service in the Render Dashboard. Use **Events** to see
build/deploy failures and **Logs** for runtime errors.

---

## 11. Security notes

- `AUTH_TOKEN_SECRET` is generated by Render and stored outside the repository.
  Never commit a real secret to `render.yaml` or `.env.example`.
- `API_LOCAL_MODE=false` is important. Without it, the API would trust
  caller-supplied identity headers.
- `CORS_ALLOWED_ORIGINS=*` is safe for this demo because requests do not use
  cookies or credentialed CORS. Restrict it if you add cookies or custom domains.
- The API and AI services are public web services. The AI service's CORS wildcard
  is harmless for the same reason; normal traffic still goes through Next.js.
- The demo has no rate limiting, email verification, password reset delivery, or
  durable audit trail. Do not put real personal, lease, or payment data in it.
- Render provisions HTTPS automatically for `onrender.com` URLs and custom
  domains.
