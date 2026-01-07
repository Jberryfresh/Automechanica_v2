# RabbitMQ setup (local & conventions)

## Step-by-Step Setup Instructions

### Part 1: Local Development Setup

#### Step 1: Ensure Docker is Running
1. Open Docker Desktop on your machine
2. Wait for Docker to fully start (check the system tray icon)
3. Verify Docker is running:
   ```bash
   docker --version
   docker ps
   ```

#### Step 2: Configure docker-compose.yml
1. Navigate to your project's `infra/` directory
2. Open or create `docker-compose.yml`
3. Add the RabbitMQ service configuration (see snippet below)
4. Save the file

#### Step 3: Start RabbitMQ Container
1. From the `infra/` directory, run:
   ```bash
   docker-compose up -d rabbitmq
   ```
2. Verify the container is running:
   ```bash
   docker-compose ps
   ```
   You should see `rabbitmq` with status "Up"

#### Step 4: Verify RabbitMQ is Accessible
1. Open your browser and navigate to `http://localhost:15672`
   - **Note:** If localhost doesn't work, try `http://127.0.0.1:15672` instead
   - Some Windows browsers have issues resolving `localhost` for Docker containers
2. Log in with credentials:
   - Username: `app`
   - Password: `changeme`
3. You should see the RabbitMQ Management UI dashboard

**Troubleshooting:**
- If the page won't load, verify the container is running: `docker-compose ps`
- If you see a blank page, try clearing browser cache or use incognito mode
- If localhost doesn't work, use `http://127.0.0.1:15672`
- Check logs if needed: `docker-compose logs rabbitmq`

#### Step 5: Configure Environment Variables
1. In your application's `.env` file, add:
   ```env
   RABBITMQ_URL=amqp://app:changeme@localhost:5672/app
   RABBITMQ_USER=app
   RABBITMQ_PASSWORD=changeme
   RABBITMQ_VHOST=/app
   RABBITMQ_HOST=localhost
   RABBITMQ_PORT=5672
   ```
2. Save the `.env` file

#### Step 6: Test Connection from Your Application
1. Start your application (orchestrator or worker)
2. Check logs for successful RabbitMQ connection
3. In RabbitMQ Management UI, go to "Connections" tab to verify your app is connected

### Part 2: Production Setup (Managed RabbitMQ)

#### Option A: CloudAMQP Setup

##### Step 1: Create CloudAMQP Account
1. Go to [cloudamqp.com](https://www.cloudamqp.com)
2. Click "Sign Up" and create an account
3. Verify your email address

##### Step 2: Create a RabbitMQ Instance
1. Log in to CloudAMQP dashboard
2. Click "Create New Instance"
3. Choose a plan (start with "Little Lemur" for dev/staging, "Tough Tiger" or higher for production)
4. Select a region close to your application servers
5. Enter an instance name (e.g., `automechanica-prod`)
6. Click "Create Instance"

##### Step 3: Configure Instance Settings
1. Click on your new instance
2. Go to "Details" tab
3. Note the AMQP URL (format: `amqps://user:pass@host/vhost`)
4. Create a new vhost if needed:
   - Go to "RabbitMQ Manager" link
   - Navigate to "Admin" → "Virtual Hosts"
   - Add vhost `/prod` or `/staging`
5. Create dedicated user:
   - Go to "Users" tab
   - Click "Add a user"
   - Username: `service_user`
   - Generate a strong password
   - Set permissions for your vhost

##### Step 4: Configure Application for Production
1. Add secrets to your deployment environment (AWS Secrets Manager, GitHub Secrets, etc.):
   ```
   RABBITMQ_URL=amqps://service_user:password@instance.cloudamqp.com/prod
   RABBITMQ_USER=service_user
   RABBITMQ_PASSWORD=your_secure_password
   RABBITMQ_VHOST=/prod
   ```
2. Update your deployment configuration to use these secrets

##### Step 5: Set Up Monitoring and Alerts
1. In CloudAMQP dashboard, go to "Alarms" tab
2. Enable alerts for:
   - Connection failures
   - Queue depth exceeding threshold
   - Memory usage > 80%
   - Disk space low
3. Add email or webhook for notifications

#### Option B: Amazon MQ Setup

##### Step 1: Create Amazon MQ Broker
1. Log in to AWS Console
2. Navigate to Amazon MQ service
3. Click "Create brokers"
4. Choose "RabbitMQ" as broker engine
5. Select deployment mode (Single-instance for dev, Cluster for production)
6. Choose broker instance type (mq.t3.micro for dev, larger for prod)

##### Step 2: Configure Broker Settings
1. Set broker name: `automechanica-prod-mq`
2. Choose RabbitMQ version (latest stable)
3. Set username and password (save these securely)
4. Choose VPC and subnets (use private subnets)
5. Enable encryption at rest and in transit
6. Configure security group to allow access from your application subnet on port 5671

##### Step 3: Create Virtual Hosts and Users
1. Once broker is created, note the endpoints
2. Access RabbitMQ management console (provided in Amazon MQ console)
3. Create virtual host `/prod`
4. Create user `service_user` with appropriate permissions

##### Step 4: Update Application Configuration
1. Use the Amazon MQ endpoint in your application:
   ```
   RABBITMQ_URL=amqps://service_user:password@b-xxx.mq.region.amazonaws.com:5671/prod
   ```
2. Ensure SSL/TLS is enabled in your RabbitMQ client configuration

### Part 3: Setting Up Exchanges, Queues, and Bindings

#### Step 1: Define Your Message Flow
1. Identify the events your system produces (e.g., `orders.created`, `products.updated`)
2. Identify which services consume which events
3. Document the message flow

#### Step 2: Create Exchanges
1. Access RabbitMQ Management UI (local or production)
2. Go to "Exchanges" tab
3. Click "Add a new exchange"
4. Create exchanges following naming convention:
   - Name: `app.orders.events`
   - Type: `topic` (recommended for flexible routing)
   - Durability: `Durable` (check the box)
   - Auto delete: `No`
5. Repeat for other domains (e.g., `app.products.events`)

#### Step 3: Create Queues
1. Go to "Queues" tab
2. Click "Add a new queue"
3. Create queue following naming convention:
   - Name: `app.worker.fulfillments.dev` (or `.prod` for production)
   - Durability: `Durable`
   - Auto delete: `No`
4. Expand "Arguments" section and add dead-letter configuration:
   ```
   x-dead-letter-exchange: app.dlq
   x-dead-letter-routing-key: worker.fulfillments.failed
   ```
5. Click "Add queue"

#### Step 4: Create Dead Letter Queue (DLQ)
1. Create DLQ exchange:
   - Name: `app.dlq`
   - Type: `topic`
   - Durability: `Durable`
2. Create DLQ queue:
   - Name: `app.dlq.dev` (or environment-specific)
   - Durability: `Durable`
3. Bind DLQ queue to DLQ exchange with routing key `#` (catch all)

#### Step 5: Bind Queues to Exchanges
1. Go to "Exchanges" tab
2. Click on your exchange (e.g., `app.orders.events`)
3. Scroll to "Bindings" section
4. Add binding:
   - To queue: Select your queue (e.g., `app.worker.fulfillments.dev`)
   - Routing key: `orders.created` (or appropriate pattern)
5. Click "Bind"
6. Repeat for other routing patterns

#### Step 6: Verify Setup
1. Go to "Queues" tab
2. Click on your queue
3. Use "Publish message" section to send a test message
4. Verify message appears in queue
5. Delete test message

### Part 4: Application Integration

#### Step 1: Install RabbitMQ Client Library
1. For Node.js applications, install amqplib:
   ```bash
   npm install amqplib
   npm install --save-dev @types/amqplib  # if using TypeScript
   ```

#### Step 2: Create Connection Module
1. Create a file `src/rabbitmq/connection.ts`
2. Implement connection logic with retry and error handling
3. Export connection factory

#### Step 3: Implement Publisher
1. Create publisher class/function
2. Ensure messages are published with:
   - `persistent: true` (delivery_mode=2)
   - Confirm mode enabled
3. Handle publish errors and confirmations

#### Step 4: Implement Consumer
1. Create consumer class/function
2. Set `prefetch` count (e.g., 10) to limit concurrent processing
3. Use manual acknowledgments:
   - Call `channel.ack(msg)` only after successful processing
   - Call `channel.nack(msg, false, true)` to requeue on failure
   - Call `channel.nack(msg, false, false)` to send to DLQ

#### Step 5: Implement Health Checks
1. Create a health check endpoint in your API
2. Verify RabbitMQ connection is alive
3. Check critical queues exist
4. Return 200 if healthy, 503 if unhealthy

### Part 5: Monitoring and Maintenance

#### Step 1: Set Up Monitoring
1. Configure alerts for:
   - Queue depth > 1000 messages
   - Consumer count = 0 on critical queues
   - Connection failures
   - Message rate anomalies
2. Use RabbitMQ Prometheus exporter for metrics (optional)

#### Step 2: Regular Maintenance Tasks
1. Weekly: Review DLQ for failed messages
2. Monthly: Check queue/exchange configurations
3. Quarterly: Review and optimize queue settings
4. Before major releases: Verify all queues and bindings

#### Step 3: Backup Configuration
1. Document all exchanges, queues, bindings, and users
2. Store configuration as code (infrastructure as code)
3. Keep configuration in version control

## docker-compose snippet
```yaml
services:
  rabbitmq:
    image: rabbitmq:3.11-management
    ports: ["5672:5672","15672:15672"]
    environment:
      RABBITMQ_DEFAULT_USER: app
      RABBITMQ_DEFAULT_PASS: changeme
      RABBITMQ_DEFAULT_VHOST: /app
```

## Conventions
- Virtual host: `/{ENV}` (e.g. `/dev`, `/staging`, `/prod`) → env var `RABBITMQ_VHOST`
- User: `service_user` per environment → `RABBITMQ_USER`
- Exchange naming: `app.{domain}.{purpose}` (e.g. `app.orders.events`)
- Queue naming: `app.{service}.{purpose}.{env}` (e.g. `app.worker.fulfillments.dev`)
- Routing keys: `orders.created`, `products.updated`

## Durable / ack settings
- Exchanges: durable = true
- Queues: durable = true
- Consumers: use manual acks; ack only after successful processing
- Messages: set `delivery_mode=2` (persistent)

## Dead-letter queue (DLQ)
- Use `x-dead-letter-exchange` on primary queue to route to `app.dlq.{env}`
- Example queue args: `{'x-dead-letter-exchange':'app.dlq','x-dead-letter-routing-key':'orders.failed'}`

## Healthchecks & monitoring
- Use management UI on `15672` for quick checks
- Healthcheck: connect to `amqp://user:pass@host:5672/vhost` and assert `channel.checkQueue` for a small health queue
- Alerts: queue depth > threshold, consumer count = 0, connection failures

Notes: prefer managed RabbitMQ (CloudAMQP or Amazon MQ) for production to reduce ops burden.