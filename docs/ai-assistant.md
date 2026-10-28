# RentVision AI Assistant

The floating assistant in `apps/web` is a hybrid chat surface. It answers
property-search, trust, and lease-guidance questions from the app's own data and
routes, and only calls a language model for general rental questions. It never
fabricates a successful model response when the AI service is unavailable.

## Architecture

```text
Browser
  └─ RentVisionAssistant (client component)
       ├─ deterministic intents ──> app listings / routes
       └─ general intent ──> POST /api/ai/chat (Next.js route handler)
                                └─ POST /api/v1/assistant/chat (FastAPI)
                                     └─ configured LLM provider
```

- The browser only knows the same-origin `/api/ai/chat` route.
- Provider keys, the private AI service URL, and the optional upstream token stay
  on the Next.js server.
- The FastAPI endpoint uses the existing LLM client abstraction and a strict
  system prompt. It has no live listing, account, verification, or lease-document
  access.

## Behavior

| User intent | Source | Notes |
| --- | --- | --- |
| Greeting, platform help | Local deterministic copy | No model call. |
| Property search | `listListings()` + local filtering | Shows real app data. When the app is in mock mode, cards and copy are labelled as demo data. An empty result stays empty. |
| Trust / verification | Local deterministic copy | Explains platform behavior only. It never claims a specific listing is verified or safe. |
| Lease question | Local guidance + links | Sends the user to the existing `/listings/{id}/lease` Q&A flow for live listings, or `/properties/{id}/lease` for demo properties. The floating chat does not accept lease files or text. |
| General rental question | AI service | Requires a live model provider. Missing credentials produce a recoverable error, not an invented answer. |

## Browser proxy contract

`POST /api/ai/chat`

```json
{
  "messages": [
    { "role": "user", "content": "What should I check before signing a lease?" }
  ],
  "locale": "en"
}
```

Constraints:

- 1–20 messages.
- Each message is at most 4,000 characters.
- The conversation is at most 12,000 characters.
- The last message must be from the user.
- The request body is limited to 32 KB.
- `locale` is `en` or `am`; invalid values fall back to `en`.

Success:

```json
{
  "reply": "Start with the rent, deposit, notice period, and utility terms.",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```

Error:

```json
{
  "error": {
    "code": "unavailable",
    "message": "The AI service is unavailable right now. Please try again.",
    "retryable": true
  }
}
```

Error codes: `bad_request`, `not_configured`, `timeout`, `rate_limited`,
`upstream_error`, `unavailable`, `empty_response`, `network_error`.

## AI service contract

`POST /api/v1/assistant/chat`

The request and success payloads match the browser proxy. The FastAPI endpoint
also accepts an `Accept-Language` header when `locale` is omitted.

Status mapping:

| Upstream status | Browser code | Retryable |
| --- | --- | --- |
| 400 / 422 | `bad_request` | No |
| 401 / 403 | `not_configured` | No |
| 408 / 504 | `timeout` | Yes |
| 429 | `rate_limited` | Yes |
| 503 | `unavailable` | Yes |
| 502 / other | `upstream_error` | Yes |

`AI_USE_MOCK_CLIENT=true` is deliberately **not** enough to power general chat.
The assistant service rejects a mock provider unless a test explicitly opts in,
so a local mock-mode deployment returns an honest 401 instead of a simulated
model answer. Deterministic property, trust, and lease features keep working.

## Configuration

Server-only variables (never prefix with `NEXT_PUBLIC_`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `RENTVISION_AI_CHAT_URL` | `http://127.0.0.1:8000/api/v1/assistant/chat` in development; required in production | Explicit private AI service endpoint. Takes precedence over `RENTVISION_AI_BASE_URL`. |
| `RENTVISION_AI_BASE_URL` | unset | Base URL or `host:port` of the AI service; the proxy appends `/api/v1/assistant/chat`. The Render Blueprint sets this to the AI service's private `hostport`. |
| `RENTVISION_AI_CHAT_TIMEOUT_MS` | `20000` | Upstream timeout, clamped to 1,000–60,000 ms. |
| `RENTVISION_AI_CHAT_TOKEN` | unset | Optional bearer token for a protected AI gateway. |

The Next.js app loads `apps/web/.env*`, not the repository-root `.env`. Put local
server-only values in `apps/web/.env.local`. On Render these values are injected
at runtime by `render.yaml`; see [Render Deployment Guide](deployment-render.md).

AI service provider variables:

- `OPENAI_API_KEY`, `AI_MODEL_API_KEY`, or `GEMINI_API_KEY`
- `AI_MODEL_NAME` (optional)
- `AI_MODEL_BASE_URL` (optional)

## Local development

```bash
# Terminal 1: AI service
cd services/ai
.venv/bin/uvicorn rentvision_ai.api:app --host 127.0.0.1 --port 8000

# Terminal 2: web app
cd apps/web
npm run dev
```

Without a provider key, general questions return the honest
`not_configured`/authentication error in the chat. Property search, trust
guidance, and lease links do not depend on the model provider.

## Privacy and persistence

- Conversation history is stored in `sessionStorage` under
  `rentvision.assistant.chat.v1:<scope>`.
- The scope is the signed-in user ID, or `guest`. Switching accounts clears
  other scopes and loads the current scope only.
- Storage is skipped for long messages and content that looks like secrets,
  tokens, PDFs, passwords, or full lease text. Auth tokens are never stored.
- Closing and reopening the panel preserves the in-memory conversation.
- The AI service receives conversation text only. It never receives lease
  documents, account tokens, or listing media from this chat.

## Testing

```bash
cd apps/web
npm test
npm run lint
npm run build

cd services/ai
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 .venv/bin/python -m pytest
```

`PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` avoids loading unrelated system pytest
plugins in this environment.
