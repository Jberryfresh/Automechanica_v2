# Local development quickstart

## Step-by-Step Setup Instructions

### Part 1: Prerequisites Installation

#### Step 1: Install Docker Desktop
1. **Windows**:
   - Download Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
   - Run the installer
   - During installation, ensure "Use WSL 2 instead of Hyper-V" is selected (recommended for Windows)
   - Restart computer if prompted
   - Launch Docker Desktop
   - Wait for Docker to start (watch system tray icon)

2. **Verify Installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

#### Step 2: Install Node.js
1. Download Node.js 20 (LTS) from [nodejs.org](https://nodejs.org/)
2. Run the installer
3. Accept default settings (includes npm)
4. Verify installation:
   ```bash
   node --version  # Should show v20.x.x
   npm --version   # Should show 10.x.x or higher
   ```

#### Step 3: Install Git (if not already installed)
1. Download from [git-scm.com](https://git-scm.com/)
2. Run installer with default settings
3. Verify:
   ```bash
   git --version
   ```

#### Step 4: Install ngrok (Optional, for Shopify webhooks)
1. **Option A: Using Chocolatey** (Windows):
   ```bash
   choco install ngrok
   ```

2. **Option B: Manual Installation**:
   - Go to [ngrok.com/download](https://ngrok.com/download)
   - Download the Windows version
   - Extract to a folder in your PATH
   - Or add the folder to your PATH

3. **Verify**:
   ```bash
   ngrok version
   ```

4. **Sign up and authenticate** (optional but recommended for persistent URLs):
   - Create account at [ngrok.com](https://ngrok.com)
   - Get your authtoken from dashboard
   - Run:
     ```bash
     ngrok config add-authtoken YOUR_AUTHTOKEN
     ```

#### Step 5: Install Code Editor (if needed)
- **Visual Studio Code** (recommended): [code.visualstudio.com](https://code.visualstudio.com/)
- Install useful extensions:
  - ESLint
  - Prettier
  - Docker
  - REST Client

### Part 2: Project Setup

#### Step 1: Clone the Repository
1. Open terminal/command prompt
2. Navigate to your projects folder:
   ```bash
   cd C:\Users\YourName\Projects  # Windows
   # or
   cd ~/projects  # macOS/Linux
   ```

3. Clone the repository:
   ```bash
   git clone <repository-url>
   cd automechanica-v2
   ```

#### Step 2: Create Environment File
1. Copy the example environment file:
   ```bash
   cp .env.example .env  # macOS/Linux
   # or
   copy .env.example .env  # Windows
   ```

2. Open `.env` file in your editor

3. Fill in the required values (see template below)

### Part 3: Environment Configuration

#### Step 1: Configure .env File
Open `.env` and add your actual values:

```env
# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Shopify Configuration
# Get these from SHOPIFY_ONBOARDING.md setup
SHOPIFY_SHOP=your-store.myshopify.com
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_secret_here
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2025-04

# Database
# Use local PostgreSQL running in Docker
DATABASE_URL=postgres://app:changeme@localhost:5432/appdb
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=app
POSTGRES_PASSWORD=changeme
POSTGRES_DB=appdb

# RabbitMQ
# Use local RabbitMQ running in Docker
RABBITMQ_URL=amqp://app:changeme@localhost:5672/app
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=app
RABBITMQ_PASSWORD=changeme
RABBITMQ_VHOST=/app

# OpenAI
# Get API key from platform.openai.com
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7

# Webhook Configuration
# For local dev, use ngrok URL (we'll set this up later)
SHOPIFY_WEBHOOK_URL=http://localhost:3000
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Admin UI
ADMIN_UI_URL=http://localhost:5173

# Optional: Monitoring
SENTRY_DSN=
LOG_LEVEL=debug
```

#### Step 2: Verify .env is in .gitignore
1. Open `.gitignore`
2. Verify it contains:
   ```
   .env
   .env.local
   .env.*.local
   ```

### Part 4: Infrastructure Setup

#### Step 1: Review docker-compose Configuration
1. Open `infra/docker-compose.yml`
2. Verify it contains PostgreSQL and RabbitMQ services
3. If not, create it with the following content:
   ```yaml
   version: '3.8'

   services:
     postgres:
       image: postgres:15
       container_name: automechanica-postgres
       ports:
         - "5432:5432"
       environment:
         POSTGRES_USER: app
         POSTGRES_PASSWORD: changeme
         POSTGRES_DB: appdb
       volumes:
         - pgdata:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U app"]
         interval: 10s
         timeout: 5s
         retries: 5

     rabbitmq:
       image: rabbitmq:3.11-management
       container_name: automechanica-rabbitmq
       ports:
         - "5672:5672"
         - "15672:15672"
       environment:
         RABBITMQ_DEFAULT_USER: app
         RABBITMQ_DEFAULT_PASS: changeme
         RABBITMQ_DEFAULT_VHOST: /app
       healthcheck:
         test: ["CMD", "rabbitmq-diagnostics", "ping"]
         interval: 10s
         timeout: 5s
         retries: 5

   volumes:
     pgdata:
   ```

#### Step 2: Start Infrastructure Services
1. Open terminal in the `infra/` directory:
   ```bash
   cd infra
   ```

2. Start services:
   ```bash
   docker-compose up -d
   ```

3. Verify services are running:
   ```bash
   docker-compose ps
   ```
   
   You should see:
   - `automechanica-postgres` - Up
   - `automechanica-rabbitmq` - Up

4. Check logs if needed:
   ```bash
   docker-compose logs postgres
   docker-compose logs rabbitmq
   ```

#### Step 3: Verify Database Connection
1. Install PostgreSQL client (optional):
   ```bash
   # Windows (using chocolatey)
   choco install postgresql
   
   # Or use Docker exec
   ```

2. Test connection:
   ```bash
   docker exec -it automechanica-postgres psql -U app -d appdb
   ```

3. If successful, you should see PostgreSQL prompt:
   ```sql
   appdb=# 
   ```

4. Type `\q` to exit

#### Step 4: Verify RabbitMQ
1. Open browser and go to: `http://localhost:15672`
2. Log in with:
   - Username: `app`
   - Password: `changeme`
3. You should see the RabbitMQ Management dashboard

### Part 5: Application Setup

#### Step 1: Install Root Dependencies
1. From project root:
   ```bash
   npm install
   ```

2. This installs dependencies for all workspaces (apps/*)

#### Step 2: Install Dependencies for Each App
```bash
# If using workspaces, npm install should handle this
# Otherwise, install for each app:

cd apps/orchestrator
npm install
cd ../..

cd apps/worker
npm install
cd ../..

cd apps/admin
npm install
cd ../..
```

#### Step 3: Set Up Database Schema
1. **If using Prisma**:
   ```bash
   cd apps/orchestrator  # or wherever your prisma schema is
   npx prisma generate
   npx prisma migrate dev --name init
   ```

2. **If using TypeORM**:
   ```bash
   cd apps/orchestrator
   npm run migration:run
   ```

#### Step 4: Build TypeScript Projects
```bash
# From root
npm run build --workspaces --if-present
```

Or build individually:
```bash
cd apps/orchestrator
npm run build

cd ../worker
npm run build
```

### Part 6: Starting the Application

#### Step 1: Start Orchestrator/API Service
1. Open a new terminal
2. Navigate to orchestrator:
   ```bash
   cd apps/orchestrator
   ```

3. Start in development mode:
   ```bash
   npm run start:dev
   ```

4. Watch for output:
   ```
   [Nest] INFO [NestFactory] Starting Nest application...
   [Nest] INFO [InstanceLoader] AppModule dependencies initialized
   [Nest] INFO Application is running on: http://localhost:3000
   ```

#### Step 2: Test API Endpoint
1. Open a new terminal
2. Test health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

3. Expected response:
   ```json
   {"status":"ok","timestamp":"2025-12-31T..."}
   ```

#### Step 3: Start Worker Service
1. Open another new terminal
2. Navigate to worker:
   ```bash
   cd apps/worker
   ```

3. Start worker:
   ```bash
   npm run start:dev
   ```

4. Watch for RabbitMQ connection logs:
   ```
   [Worker] Connected to RabbitMQ
   [Worker] Listening on queue: app.worker.fulfillments.dev
   ```

#### Step 4: Start Admin UI
1. Open another terminal
2. Navigate to admin:
   ```bash
   cd apps/admin
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Admin UI should be available at: `http://localhost:5173`

### Part 7: Webhook Setup (Optional for Shopify Integration)

#### Step 1: Start ngrok
1. Open a new terminal
2. Start ngrok tunnel:
   ```bash
   ngrok http 3000
   ```

3. Note the HTTPS forwarding URL:
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3000
   ```

#### Step 2: Update Environment Variable
1. Update `.env` file:
   ```env
   SHOPIFY_WEBHOOK_URL=https://abc123.ngrok.io
   ```

2. Restart your API/orchestrator service for changes to take effect

#### Step 3: Register Webhooks
1. Run webhook setup script (if you created one):
   ```bash
   cd apps/orchestrator
   ts-node scripts/setup-webhooks.ts
   ```

2. Or manually register in Shopify admin (see SHOPIFY_ONBOARDING.md)

### Part 8: Verification and Testing

#### Step 1: Run Sanity Checks
1. **Database Connection**:
   ```bash
   # From orchestrator directory
   npm run db:check  # if you have this script
   ```

2. **RabbitMQ Connection**:
   - Check RabbitMQ management UI at `http://localhost:15672`
   - Go to "Connections" tab
   - Should see connections from your apps

3. **API Health**:
   ```bash
   curl http://localhost:3000/health
   ```

#### Step 2: Test Shopify Integration
1. Create a test product via API:
   ```bash
   cd apps/orchestrator
   ts-node scripts/test-product-creation.ts
   ```

2. Verify in Shopify admin:
   - Log in to your dev store
   - Go to Products
   - Check if test product was created

#### Step 3: Test RabbitMQ Message Flow
1. Send a test message to RabbitMQ:
   ```bash
   curl -X POST http://localhost:3000/api/test/publish \
     -H "Content-Type: application/json" \
     -d '{"test": "message"}'
   ```

2. Check worker logs to see if message was consumed

#### Step 4: Test Admin UI
1. Open browser to `http://localhost:5173`
2. Verify UI loads
3. Test navigation
4. Check if API calls work (check browser console for errors)

### Part 9: Common Development Tasks

#### Stop All Services
```bash
# Stop infrastructure
cd infra
docker-compose down

# Stop applications: Ctrl+C in each terminal
```

#### Restart Database
```bash
cd infra
docker-compose restart postgres
```

#### Reset Database
```bash
cd infra
docker-compose down postgres
docker volume rm infra_pgdata
docker-compose up -d postgres

# Then re-run migrations
cd ../apps/orchestrator
npx prisma migrate dev
```

#### View Logs
```bash
# Docker services
docker-compose logs -f postgres
docker-compose logs -f rabbitmq

# Application logs: check the terminal where services are running
```

#### Install New Package
```bash
# For specific app
cd apps/orchestrator
npm install package-name

# For root
npm install -w @automechanica/orchestrator package-name
```

### Part 10: Troubleshooting

#### Issue 1: Port Already in Use
```bash
# Check what's using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000  # macOS/Linux

# Kill the process or change PORT in .env
```

#### Issue 2: Docker Services Won't Start
```bash
# Check Docker is running
docker info

# Restart Docker Desktop
# Then try again:
docker-compose up -d
```

#### Issue 3: Database Connection Error
1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check DATABASE_URL in `.env` is correct

3. Try connecting manually:
   ```bash
   docker exec -it automechanica-postgres psql -U app -d appdb
   ```

#### Issue 4: RabbitMQ Connection Failed
1. Check RabbitMQ is running:
   ```bash
   docker-compose ps rabbitmq
   ```

2. Verify management UI accessible: `http://localhost:15672`

3. Check RABBITMQ_URL in `.env`

#### Issue 5: Module Not Found Errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Or for specific workspace
cd apps/orchestrator
rm -rf node_modules
npm install
```

#### Issue 6: TypeScript Compilation Errors
```bash
# Rebuild
npm run build

# Check tsconfig.json is correct
# Verify all required @types/* packages are installed
```

#### Issue 7: ngrok URL Changes
- Get a free ngrok account for persistent URLs
- Or update webhooks each time ngrok restarts
- Or use a local webhook testing tool

### Part 11: Development Workflow

#### Daily Workflow
1. **Morning Startup**:
   ```bash
   # Start infrastructure
   cd infra && docker-compose up -d
   
   # Start services (in separate terminals)
   cd apps/orchestrator && npm run start:dev
   cd apps/worker && npm run start:dev
   cd apps/admin && npm run dev
   
   # Start ngrok (if needed)
   ngrok http 3000
   ```

2. **Make Changes**:
   - Edit code
   - Services auto-reload (watch mode)
   - Test changes

3. **Before Committing**:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

4. **End of Day Shutdown**:
   - Ctrl+C to stop all services
   - `cd infra && docker-compose down` (optional, can leave running)

### Part 12: Next Steps

Once your local environment is running:

1. **Review Documentation**:
   - Read SHOPIFY_ONBOARDING.md for Shopify integration
   - Read RABBITMQ_SETUP.md for message queue patterns
   - Read POSTGRES_SETUP.md for database management

2. **Set Up Testing**:
   - Configure test database
   - Write unit tests
   - Set up integration tests

3. **Configure Linting**:
   - ESLint
   - Prettier
   - Pre-commit hooks with husky

4. **Set Up Debugging**:
   - Configure VS Code debugger
   - Add breakpoints
   - Use Chrome DevTools for frontend

## Prereqs
- Docker Desktop (Windows WSL2 recommended)
- Node 20+, npm
- ngrok (optional for Shopify webhooks)

## `.env.example`
```env
NODE_ENV=development
PORT=3000
SHOPIFY_SHOP=my-store.myshopify.com
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
SHOPIFY_ACCESS_TOKEN=your_token
DATABASE_URL=postgres://app:changeme@localhost:5432/appdb
RABBITMQ_URL=amqp://app:changeme@localhost:5672/
OPENAI_API_KEY=sk-...
```

## Start environment
1. Copy `.env.example` → `.env` and fill secrets.
2. Start local infra:
```bash
docker-compose up -d postgres rabbitmq
```
3. Start apps:
```bash
# API
cd apps/api
npm ci
npm run start:dev

# Worker
cd apps/worker
npm run start:dev
```

## Sanity checks
- `curl http://localhost:3000/health` → should return 200
- `curl` create sample product with `SHOPIFY_ACCESS_TOKEN` (see SHOPIFY_ONBOARDING.md)
- Verify RabbitMQ queues in management UI at `http://localhost:15672`

## Admin UI local
- `cd apps/admin` → `npm ci` → `npm run dev`
- Admin UI should connect to `API_URL=http://localhost:3000`.

Notes: use ngrok to expose `http://localhost:3000/webhooks/shopify` for Shopify dev store webhook tests.