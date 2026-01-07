# Phase-1 Scaffold — Shopify MVP (LLM-Powered Agents + Admin UI)

This is an automated dropshipping platform powered by AI agents using OpenAI models:
- **Orchestrator Agent** (GPT-4o): Plans workflows and coordinates specialized agents
- **SourcingAgent** (GPT-4o-mini): Analyzes products and recommends suppliers
- More agents coming: ResearchAgent, ListingAgent, PricingAgent, OrderAgent, etc.

## Quickstart (local dev)

**Prereqs:**
- Node 20+, npm
- Docker Desktop (for RabbitMQ & Postgres)
- OpenAI API key (REQUIRED for AI agents)

**1) Configure environment:**

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY=sk-...
```

**2) Start infra:**

```bash
cd infra
docker-compose up -d
```

**3) Install dependencies and start Orchestrator:**

```bash
cd apps/orchestrator
npm ci
npm run dev
```

**4) Start Worker (SourcingAgent):**

```bash
cd apps/worker
npm ci
npm run dev
```

**5) Serve Admin UI:**

```bash
cd apps/admin/public
npx http-server -p 5173
```

**6) Test the AI agents:**

Visit Admin UI at `http://localhost:5173` or use curl:

```bash
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{"action":"find suppliers","product":"portable blender","target_price":15}'
```

The Orchestrator (GPT-4o) will reason about your command, create a plan, and route messages to the appropriate agents. The SourcingAgent (GPT-4o-mini) will analyze the request and return supplier recommendations with reasoning.

Check the terminal logs to see the AI agents thinking and responding!

## Environment Variables

**Required:**
- `OPENAI_API_KEY` — Your OpenAI API key (agents won't start without it)

**Optional (with defaults):**
- `RABBITMQ_URL` (default: `amqp://app:changeme@localhost:5672/`)
- `ORCH_EXCHANGE` (default: `app.commands`)
- `WORKER_QUEUE` (default: `app.worker.sourcing`)
- `PORT` (default: `3000`)
- `DATABASE_URL` (for future persistence)

**Shopify (when ready to test integrations):**
- `SHOPIFY_SHOP`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_ACCESS_TOKEN`

See `.env.example` for full reference.

## Next Steps

- Add ResearchAgent and ListingAgent with LLM intelligence
- Implement Shopify integration for automated product listings
- Add Admin UI endpoints for human approval workflows
- Set up database persistence for agent state and decisions
- Add CI/CD and Docker images for deployment

