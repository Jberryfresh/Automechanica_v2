# Production deployment notes (AWS focused)

## Step-by-Step Production Deployment Guide

### Part 1: Pre-Deployment Planning

#### Step 1: Architecture Decision
Choose your deployment architecture:

**Option A: ECS/Fargate** (Recommended for simplicity)
- Easier to manage
- Serverless containers
- Good for most workloads
- Lower operational overhead

**Option B: EKS** (For complex scenarios)
- Full Kubernetes features
- Better for complex autoscaling
- More control but higher complexity
- Better for multi-cloud strategy

This guide focuses on **ECS/Fargate** as the recommended approach.

#### Step 2: AWS Account Setup
1. Create AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Set up billing alerts:
   - Go to Billing Dashboard
   - Set up budget alerts (e.g., $50/month threshold)
3. Enable MFA on root account
4. Create IAM user for deployments:
   - Go to IAM → Users → Add user
   - Username: `deploy-user`
   - Access type: Programmatic access
   - Attach policies: `AdministratorAccess` (for initial setup, restrict later)
   - Save access key ID and secret

#### Step 3: Install AWS CLI
1. Download from [aws.amazon.com/cli](https://aws.amazon.com/cli/)
2. Install following instructions
3. Configure:
   ```bash
   aws configure
   ```
   - AWS Access Key ID: [your-access-key]
   - AWS Secret Access Key: [your-secret-key]
   - Default region: `us-east-1` (or your preferred region)
   - Default output format: `json`

4. Verify:
   ```bash
   aws sts get-caller-identity
   ```

### Part 2: Infrastructure Setup

#### Step 1: Create VPC
1. Go to AWS Console → VPC
2. Click "Create VPC"
3. Select "VPC and more" (creates subnets, route tables, etc.)
4. Configuration:
   - Name: `automechanica-vpc`
   - IPv4 CIDR: `10.0.0.0/16`
   - Number of AZs: `2`
   - Number of public subnets: `2`
   - Number of private subnets: `2`
   - NAT gateways: `1 per AZ` (production) or `In 1 AZ` (cost-saving)
   - VPC endpoints: None initially
5. Click "Create VPC"
6. Note the VPC ID, subnet IDs

#### Step 2: Set Up Security Groups
1. Go to EC2 → Security Groups
2. Create Application Load Balancer security group:
   - Name: `automechanica-alb-sg`
   - VPC: Select your VPC
   - Inbound rules:
     - HTTP (80) from `0.0.0.0/0`
     - HTTPS (443) from `0.0.0.0/0`
   - Outbound: All traffic

3. Create ECS Tasks security group:
   - Name: `automechanica-ecs-tasks-sg`
   - Inbound rules:
     - Custom TCP (3000) from ALB security group
     - PostgreSQL (5432) from itself (for RDS)
   - Outbound: All traffic

4. Create RDS security group:
   - Name: `automechanica-rds-sg`
   - Inbound rules:
     - PostgreSQL (5432) from ECS tasks security group
   - Outbound: All traffic

### Part 3: Database Setup (RDS)

Follow the detailed steps in [POSTGRES_SETUP.md](POSTGRES_SETUP.md#part-3-production-database-setup-aws-rds), then return here.

**Quick Summary**:
1. Create RDS PostgreSQL instance
2. Note the endpoint
3. Store credentials in Secrets Manager
4. Initialize database schema

#### After RDS Setup:
Save these values:
- RDS Endpoint: `_______________________`
- Database name: `appdb`
- Secret ARN: `_______________________`

### Part 4: RabbitMQ Setup

#### Option A: Amazon MQ (Recommended)
Follow detailed steps in [RABBITMQ_SETUP.md](RABBITMQ_SETUP.md#option-b-amazon-mq-setup)

**Quick Summary**:
1. Create Amazon MQ broker (RabbitMQ)
2. Choose deployment mode (Cluster for production)
3. Configure security groups
4. Note the endpoints

#### Option B: CloudAMQP
1. Sign up at [cloudamqp.com](https://cloudamqp.com)
2. Create instance
3. Get connection URL
4. Store in Secrets Manager

Save connection string: `_______________________`

### Part 5: Container Registry (ECR)

#### Step 1: Create ECR Repositories
For each service (orchestrator, worker, admin):

```bash
# Create repositories
aws ecr create-repository --repository-name automechanica/orchestrator --region us-east-1
aws ecr create-repository --repository-name automechanica/worker --region us-east-1
aws ecr create-repository --repository-name automechanica/admin --region us-east-1
```

#### Step 2: Note Repository URIs
```bash
aws ecr describe-repositories --region us-east-1
```

Save URIs:
- Orchestrator: `_______________________`
- Worker: `_______________________`
- Admin: `_______________________`

#### Step 3: Authenticate Docker to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Part 6: Build and Push Docker Images

#### Step 1: Create Dockerfiles

**apps/orchestrator/Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/orchestrator/package*.json ./apps/orchestrator/

# Install dependencies
RUN npm ci

# Copy source
COPY apps/orchestrator ./apps/orchestrator
COPY libs ./libs

# Build
WORKDIR /app/apps/orchestrator
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/apps/orchestrator/dist ./dist
COPY --from=builder /app/apps/orchestrator/package*.json ./

RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

Create similar Dockerfiles for worker and admin.

#### Step 2: Build Images Locally
```bash
# Build orchestrator
docker build -t automechanica/orchestrator:latest -f apps/orchestrator/Dockerfile .

# Build worker
docker build -t automechanica/worker:latest -f apps/worker/Dockerfile .

# Build admin
docker build -t automechanica/admin:latest -f apps/admin/Dockerfile .
```

#### Step 3: Tag Images for ECR
```bash
docker tag automechanica/orchestrator:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/automechanica/orchestrator:latest

docker tag automechanica/worker:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/automechanica/worker:latest

docker tag automechanica/admin:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/automechanica/admin:latest
```

#### Step 4: Push to ECR
```bash
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/automechanica/orchestrator:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/automechanica/worker:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/automechanica/admin:latest
```

### Part 7: Secrets Management

#### Step 1: Store Secrets in AWS Secrets Manager
```bash
# Database credentials (if not done in RDS setup)
aws secretsmanager create-secret \
  --name automechanica/prod/database \
  --secret-string '{"url":"postgres://user:pass@endpoint:5432/appdb?sslmode=require"}' \
  --region us-east-1

# Shopify credentials
aws secretsmanager create-secret \
  --name automechanica/prod/shopify \
  --secret-string '{"apiKey":"xxx","apiSecret":"xxx","accessToken":"xxx","shop":"store.myshopify.com"}' \
  --region us-east-1

# RabbitMQ credentials
aws secretsmanager create-secret \
  --name automechanica/prod/rabbitmq \
  --secret-string '{"url":"amqps://user:pass@host:5671/vhost"}' \
  --region us-east-1

# OpenAI API key
aws secretsmanager create-secret \
  --name automechanica/prod/openai \
  --secret-string '{"apiKey":"sk-..."}' \
  --region us-east-1
```

#### Step 2: Create IAM Role for ECS Task Execution
1. Go to IAM → Roles → Create role
2. Select "Elastic Container Service"
3. Select "Elastic Container Service Task"
4. Attach policies:
   - `AmazonECSTaskExecutionRolePolicy`
   - Create custom policy for Secrets Manager:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "secretsmanager:GetSecretValue"
           ],
           "Resource": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:automechanica/prod/*"
         }
       ]
     }
     ```
5. Name: `automechanica-ecs-task-execution-role`
6. Create role

### Part 8: ECS Cluster Setup

#### Step 1: Create ECS Cluster
1. Go to ECS → Clusters
2. Click "Create cluster"
3. Cluster configuration:
   - Cluster name: `automechanica-prod`
   - Infrastructure: AWS Fargate (serverless)
4. Click "Create"

#### Step 2: Create Task Definitions

**Create Orchestrator Task Definition**:

1. Go to ECS → Task Definitions → Create new task definition
2. Configuration:
   - Family: `automechanica-orchestrator`
   - Launch type: Fargate
   - Operating system: Linux
   - Task execution role: `automechanica-ecs-task-execution-role`
   - Task role: Create new or use existing with permissions for services

3. Task size:
   - CPU: 0.5 vCPU
   - Memory: 1 GB

4. Container definition:
   - Name: `orchestrator`
   - Image URI: `<account-id>.dkr.ecr.us-east-1.amazonaws.com/automechanica/orchestrator:latest`
   - Port mappings: `3000` (TCP)
   - Environment variables:
     - `NODE_ENV`: `production`
     - `PORT`: `3000`
   - Secrets (from Secrets Manager):
     - `DATABASE_URL`: `automechanica/prod/database:url`
     - `SHOPIFY_API_KEY`: `automechanica/prod/shopify:apiKey`
     - `SHOPIFY_API_SECRET`: `automechanica/prod/shopify:apiSecret`
     - (Add all required secrets)
   - Logging:
     - Log driver: `awslogs`
     - Log group: `/ecs/automechanica-orchestrator`
     - Region: `us-east-1`
     - Stream prefix: `ecs`

5. Create task definition

**Repeat for Worker and Admin** with appropriate configurations.

### Part 9: Application Load Balancer

#### Step 1: Create Target Group
1. Go to EC2 → Target Groups
2. Create target group:
   - Target type: IP addresses
   - Name: `automechanica-orchestrator-tg`
   - Protocol: HTTP
   - Port: 3000
   - VPC: Select your VPC
   - Health check path: `/health`
   - Health check interval: 30 seconds
3. Create target group

#### Step 2: Create Application Load Balancer
1. Go to EC2 → Load Balancers → Create load balancer
2. Choose Application Load Balancer
3. Configuration:
   - Name: `automechanica-alb`
   - Scheme: Internet-facing
   - IP address type: IPv4
   - VPC: Your VPC
   - Mappings: Select both public subnets
   - Security groups: `automechanica-alb-sg`

4. Listeners:
   - HTTP:80 → Forward to `automechanica-orchestrator-tg`
   - (HTTPS:443 will be added later with ACM certificate)

5. Create load balancer

6. Note the DNS name: `_______________________`

### Part 10: Certificate and HTTPS

#### Step 1: Request Certificate in ACM
1. Go to ACM (Certificate Manager)
2. Request certificate
3. Domain names:
   - `api.yourdomain.com`
   - `admin.yourdomain.com`
4. Validation: DNS validation (recommended)
5. Follow validation instructions (add CNAME to your DNS)
6. Wait for validation (5-30 minutes)

#### Step 2: Add HTTPS Listener to ALB
1. Go to Load Balancers → Your ALB → Listeners
2. Add listener:
   - Protocol: HTTPS
   - Port: 443
   - Default action: Forward to target group
   - Certificate: Select your ACM certificate
3. Add HTTP → HTTPS redirect:
   - Edit HTTP:80 listener
   - Change to redirect to HTTPS:443

### Part 11: Deploy ECS Services

#### Step 1: Create Orchestrator Service
1. Go to ECS → Clusters → automechanica-prod
2. Services → Create
3. Configuration:
   - Launch type: Fargate
   - Task definition: `automechanica-orchestrator:latest`
   - Service name: `orchestrator`
   - Number of tasks: `2` (for high availability)
   - Deployment type: Rolling update

4. Networking:
   - VPC: Your VPC
   - Subnets: Select private subnets
   - Security group: `automechanica-ecs-tasks-sg`
   - Public IP: DISABLED (using NAT)

5. Load balancing:
   - Type: Application Load Balancer
   - Load balancer: `automechanica-alb`
   - Container to load balance: `orchestrator:3000:3000`
   - Target group: `automechanica-orchestrator-tg`

6. Auto Scaling (optional):
   - Enable auto scaling
   - Min tasks: 2
   - Max tasks: 10
   - Scaling policy: Target tracking
   - Metric: CPU utilization
   - Target value: 70%

7. Create service

#### Step 2: Create Worker Service
Similar to above, but:
- No load balancer needed
- Can use spot instances for cost savings
- Scale based on queue depth

#### Step 3: Verify Deployment
1. Go to ECS → Clusters → Services
2. Check service status: ACTIVE
3. Check running tasks: 2/2
4. Test API:
   ```bash
   curl https://api.yourdomain.com/health
   ```

### Part 12: DNS Configuration

#### Step 1: Create Route 53 Hosted Zone (if needed)
1. Go to Route 53 → Hosted zones
2. Create hosted zone for your domain
3. Note nameservers
4. Update your domain registrar with these nameservers

#### Step 2: Create DNS Records
1. Create A record for API:
   - Name: `api.yourdomain.com`
   - Type: A - Alias
   - Alias target: Your ALB
   - Routing policy: Simple

2. Create A record for Admin UI:
   - Name: `admin.yourdomain.com`
   - Type: A - Alias
   - Alias target: Your CloudFront distribution (if using) or ALB

### Part 13: Admin UI Deployment (S3 + CloudFront)

#### Step 1: Build Admin UI
```bash
cd apps/admin
npm run build
```

#### Step 2: Create S3 Bucket
```bash
aws s3 mb s3://automechanica-admin-ui --region us-east-1
```

#### Step 3: Configure Bucket for Static Hosting
```bash
aws s3 website s3://automechanica-admin-ui \
  --index-document index.html \
  --error-document index.html
```

#### Step 4: Create CloudFront Distribution
1. Go to CloudFront → Create distribution
2. Origin:
   - Origin domain: S3 bucket
   - Origin access: Public
3. Default cache behavior:
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed methods: GET, HEAD, OPTIONS
4. Settings:
   - Alternate domain names: `admin.yourdomain.com`
   - Certificate: Select your ACM certificate
5. Create distribution

#### Step 5: Deploy Admin UI
```bash
cd apps/admin
aws s3 sync dist/ s3://automechanica-admin-ui --delete
aws cloudfront create-invalidation --distribution-id E123456 --paths "/*"
```

### Part 14: CI/CD with GitHub Actions

#### Step 1: Add AWS Credentials to GitHub Secrets
1. Go to GitHub repo → Settings → Secrets
2. Add:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`: `us-east-1`
   - `ECR_REGISTRY`: `<account-id>.dkr.ecr.us-east-1.amazonaws.com`

#### Step 2: Create Deployment Workflow
Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push orchestrator
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/automechanica/orchestrator:$IMAGE_TAG \
            -f apps/orchestrator/Dockerfile .
          docker push $ECR_REGISTRY/automechanica/orchestrator:$IMAGE_TAG
          docker tag $ECR_REGISTRY/automechanica/orchestrator:$IMAGE_TAG \
            $ECR_REGISTRY/automechanica/orchestrator:latest
          docker push $ECR_REGISTRY/automechanica/orchestrator:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster automechanica-prod \
            --service orchestrator \
            --force-new-deployment
```

### Part 15: Monitoring and Logging

#### Step 1: Set Up CloudWatch Alarms
1. Go to CloudWatch → Alarms
2. Create alarms for:
   - ECS CPU utilization > 80%
   - ECS Memory utilization > 80%
   - ALB 5XX errors > 10
   - RDS CPU > 80%
   - RDS storage < 20%

#### Step 2: Set Up SNS for Notifications
1. Create SNS topic: `automechanica-alerts`
2. Subscribe your email
3. Link alarms to this topic

#### Step 3: Enable Container Insights
```bash
aws ecs update-cluster-settings \
  --cluster automechanica-prod \
  --settings name=containerInsights,value=enabled
```

### Part 16: Security Hardening

#### Step 1: Enable WAF
1. Go to WAF & Shield
2. Create Web ACL
3. Add rules:
   - Rate limiting (1000 requests per 5 minutes)
   - Block known bad IPs
   - SQL injection protection
   - XSS protection
4. Associate with ALB

#### Step 2: Enable GuardDuty
1. Go to GuardDuty
2. Enable GuardDuty
3. Review findings regularly

#### Step 3: Regular Security Audits
- Review IAM permissions quarterly
- Rotate credentials every 90 days
- Update dependencies monthly
- Review security group rules

### Part 17: Backup and Disaster Recovery

#### Step 1: Automated Backups
- RDS: Already configured (7-day retention)
- Create snapshots before major deployments

#### Step 2: Disaster Recovery Plan
1. Document recovery procedures
2. Test quarterly
3. Maintain infrastructure as code (Terraform/CloudFormation)

### Part 18: Cost Optimization

#### Strategies
1. Use Savings Plans for predictable workloads
2. Use Spot instances for worker tasks
3. Right-size instances based on metrics
4. Set up budget alerts
5. Use S3 lifecycle policies for logs

### Part 19: Production Checklist

Before going live:
- [ ] All services deployed and healthy
- [ ] HTTPS configured with valid certificates
- [ ] DNS records pointing to production
- [ ] Database backups configured and tested
- [ ] Monitoring and alerts set up
- [ ] Secrets stored securely in Secrets Manager
- [ ] WAF rules enabled
- [ ] Auto-scaling configured
- [ ] CI/CD pipeline tested
- [ ] Disaster recovery plan documented
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Compliance requirements met
- [ ] Documentation updated

## High-level steps
1. Containerize services (API, worker, admin). Push to ECR.
2. Deploy containers to ECS/Fargate or EKS (preferred if complex autoscaling needed).
3. Use ALB + HTTPS (ACM) in front of API and Admin UI.
4. Use RDS/Aurora for Postgres and enable automated backups & multi-AZ.
5. Use managed RabbitMQ (CloudAMQP / Amazon MQ) or self-host on EKS with persistent storage.

## Secrets & configuration
- Store secrets in AWS Secrets Manager or Parameter Store. Do not bake secrets into images.
- Map secrets into containers via ECS task definitions or Kubernetes Secrets.

## Observability
- Centralize logs to CloudWatch/Elasticsearch.
- Add tracing (OpenTelemetry) and Sentry for errors.

## Model & API costs
- Route expensive model calls through a separate autoscaled service.
- Cache LLM outputs for deterministic responses. Use Redis for short TTL caches.

## CI/CD notes
- Use GitHub Actions to build, test, and push images to ECR.
- Use `deploy` job to update ECS task definitions or apply Kubernetes manifests.
- Require PR review and passing CI for `main` deployments.

## Managed options to reduce ops
- RabbitMQ: CloudAMQP or Amazon MQ
- Postgres: RDS or Aurora Serverless
- Object store: S3

Security & compliance: enable rate limiting, WAF rules, and periodic security reviews. Document data retention and deletion flows for merchant data.