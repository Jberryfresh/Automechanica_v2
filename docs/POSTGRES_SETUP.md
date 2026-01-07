# Postgres setup

## Step-by-Step Setup Instructions

### Part 1: Local Development Setup with Docker

#### Step 1: Verify Docker Installation
1. Ensure Docker Desktop is installed and running
2. Verify installation:
   ```bash
   docker --version
   docker ps
   ```

#### Step 2: Create PostgreSQL Configuration in docker-compose
1. Navigate to your project's `infra/` directory
2. Open or create `docker-compose.yml`
3. Add PostgreSQL service (see snippet below)
4. Save the file

#### Step 3: Start PostgreSQL Container
1. From the `infra/` directory, run:
   ```bash
   docker-compose up -d postgres
   ```
2. Verify container is running:
   ```bash
   docker-compose ps
   ```
   Should show postgres container as "Up"

#### Step 4: Verify PostgreSQL Connection

**Option A: Using docker-compose (Easiest - No psql installation needed)**
```bash
cd infra
docker-compose exec postgres psql -U app -d appdb
```
This connects directly using the service name. You should see the PostgreSQL prompt: `appdb=#`

**Option B: Using docker exec directly**
1. Find container name: `docker ps`
2. Connect: `docker exec -it infra-postgres-1 psql -U app -d appdb`
   (Replace `infra-postgres-1` with your actual container name from step 1)

**Option C: Using a GUI Database Client**

These connection details work for any PostgreSQL client:
   - Host: `localhost`
   - Port: `5432`
   - Database: `appdb`
   - Username: `app`
   - Password: `changeme`

**Popular GUI tools:**

1. **DBeaver (Free, recommended)**:
   - Download from https://dbeaver.io/download/
   - Click "New Database Connection" → Select PostgreSQL
   - Enter the connection details above
   - Click "Test Connection" → Should show "Connected"
   - Click "Finish"

2. **pgAdmin (Free)**:
   - Download from https://www.pgadmin.org/download/
   - Right-click "Servers" → Create → Server
   - General tab: Name = "Local Dev"
   - Connection tab: Enter the connection details above
   - Click "Save"

3. **VS Code PostgreSQL Extension**:
   - Install "PostgreSQL" extension (by Chris Kolkman) in VS Code
   - Click PostgreSQL icon in sidebar
   - Click "Add Connection" or "Create Connection"
   - Fill in the connection form:
     - **Connection name**: `Automechanica Dev` (or any name you want - this is just a label)
     - **Server name** or **Host**: `localhost`
     - **Port**: `5432`
     - **Database**: `appdb`
     - **Username**: `app`
     - **Password**: `changeme`
     - **SSL Mode**: `Disable` (for local dev)
   - Click "Connect" or "Save"
   - The connection should appear in the PostgreSQL sidebar

**Verify connection is working:**
Once connected, run a test query:
```sql
SELECT version();
```
Should return the PostgreSQL version (15.x)

**Troubleshooting VS Code Extension Connection Issues:**

If `docker exec` works but VS Code extensions can't connect:

1. **Check port mapping** - Ensure docker-compose.yml has ports exposed:
   ```yaml
   postgres:
     ports:
       - "5432:5432"
   ```

2. **Restart the container** after adding ports:
   ```bash
   cd infra
   docker-compose down
   docker-compose up -d
   ```

3. **Verify port is listening**:
   ```bash
   netstat -an | findstr :5432
   ```
   Should show `0.0.0.0:5432` or `[::]:5432` LISTENING

4. **Test with psql command line** (if installed):
   ```bash
   psql -h localhost -p 5432 -U app -d appdb
   ```
   If this works, the port mapping is correct and VS Code should work.

5. **Common VS Code extension issues**:
   - Make sure you're using `localhost` (not `127.0.0.1` or container name)
   - Password field is case-sensitive: `changeme`
   - Try disabling SSL mode or set to "prefer"
   - Some extensions need you to install PostgreSQL client tools separately

#### Step 5: Install PostgreSQL Extensions
1. Connect to the database
2. Run the following SQL commands:
   ```sql
   -- Enable UUID generation
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   
   -- Enable fuzzy text search
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   
   -- Enable case-insensitive text
   CREATE EXTENSION IF NOT EXISTS "citext";
   
   -- Optional: Enable PostGIS (only if location features needed)
   -- CREATE EXTENSION IF NOT EXISTS "postgis";
   ```

3. Verify extensions are installed:
   ```sql
   SELECT * FROM pg_extension;
   ```

#### Step 6: Configure Environment Variables
1. In your application's `.env` file, add:
   ```env
   DATABASE_URL=postgres://app:changeme@localhost:5432/appdb?schema=public
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=app
   POSTGRES_PASSWORD=changeme
   POSTGRES_DB=appdb
   ```
2. Save the file

### Part 2: Database Migrations Setup

#### Option A: Using TypeORM

##### Step 1: Install TypeORM Dependencies
```bash
npm install typeorm pg reflect-metadata
npm install --save-dev @types/node ts-node
```

##### Step 2: Create TypeORM Configuration
1. Create `ormconfig.json` in project root:
   ```json
   {
     "type": "postgres",
     "url": "postgres://app:changeme@localhost:5432/appdb",
     "synchronize": false,
     "logging": true,
     "entities": ["src/**/*.entity.ts"],
     "migrations": ["migrations/*.ts"],
     "cli": {
       "migrationsDir": "migrations"
     }
   }
   ```

##### Step 3: Add Migration Scripts to package.json
```json
{
  "scripts": {
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    "migration:generate": "npm run typeorm migration:generate -- -n",
    "migration:run": "npm run typeorm migration:run",
    "migration:revert": "npm run typeorm migration:revert"
  }
}
```

##### Step 4: Create Your First Migration
1. Generate migration:
   ```bash
   npm run migration:generate init
   ```
2. Edit the generated migration file in `migrations/` folder
3. Run migration:
   ```bash
   npm run migration:run
   ```

#### Option B: Using Prisma

##### Step 1: Install Prisma
```bash
npm install @prisma/client
npm install --save-dev prisma
```

##### Step 2: Initialize Prisma
```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Your database schema
- `.env` file with `DATABASE_URL`

##### Step 3: Configure Prisma Schema
1. Open `prisma/schema.prisma`
2. Update datasource configuration:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }
   ```

##### Step 4: Define Your Models
Add models to `schema.prisma`:
```prisma
model Product {
  id          String   @id @default(uuid())
  title       String
  description String?
  price       Decimal
  shopifyId   String?  @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

##### Step 5: Create and Run Migrations
1. Create migration for development:
   ```bash
   npx prisma migrate dev --name init
   ```

2. For production deployments:
   ```bash
   npx prisma migrate deploy
   ```

3. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

##### Step 6: Add Prisma Scripts to package.json
```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

### Part 3: Production Database Setup (AWS RDS)

#### Step 1: Create RDS Instance
1. Log in to AWS Console
2. Navigate to RDS service
3. Click "Create database"
4. Choose database creation method: "Standard create"
5. Select engine: "PostgreSQL"
6. Choose version: Latest stable (e.g., PostgreSQL 15.x)

#### Step 2: Configure Instance Settings
1. **Templates**: Choose based on environment:
   - Dev/Test: "Dev/Test"
   - Production: "Production"

2. **Settings**:
   - DB instance identifier: `automechanica-prod-db`
   - Master username: `admin` (or custom)
   - Master password: Generate strong password and save securely
   - Confirm password

3. **Instance configuration**:
   - DB instance class:
     - Dev/Staging: `db.t3.micro` or `db.t4g.micro`
     - Production: `db.t3.medium` or larger
   - Storage type: General Purpose SSD (gp3)
   - Allocated storage: 20 GB (minimum, can auto-scale)
   - Enable storage autoscaling: Yes
   - Maximum storage threshold: 100 GB

#### Step 3: Configure Connectivity
1. **Virtual Private Cloud (VPC)**: Select your application's VPC
2. **Subnet group**: Create new or select existing DB subnet group
3. **Public access**: No (keep private for security)
4. **VPC security group**: Create new or select existing
   - Configure to allow PostgreSQL (port 5432) from application security group
5. **Availability Zone**: No preference (or specific AZ)
6. **Database port**: 5432 (default)

#### Step 4: Configure Database Authentication
1. **Database authentication**: Password authentication
2. (Optional) Enable IAM database authentication for additional security

#### Step 5: Configure Additional Settings
1. **Initial database name**: `appdb`
2. **DB parameter group**: default.postgres15 (or custom)
3. **Option group**: default:postgres-15
4. **Backup**:
   - Enable automatic backups: Yes
   - Backup retention period: 7 days (production), 1 day (dev)
   - Backup window: Select preferred time (low-traffic period)
   - Copy tags to snapshots: Yes

5. **Encryption**:
   - Enable encryption: Yes
   - Use default AWS KMS key or custom

6. **Performance Insights**:
   - Enable Performance Insights: Yes (recommended)
   - Retention period: 7 days (free tier)

7. **Monitoring**:
   - Enable Enhanced monitoring: Yes
   - Granularity: 60 seconds

8. **Maintenance**:
   - Enable auto minor version upgrade: Yes
   - Maintenance window: Select preferred time

#### Step 6: Review and Create
1. Review all settings
2. Estimated monthly costs will be shown
3. Click "Create database"
4. Wait for database to be available (5-10 minutes)

#### Step 7: Configure Security Group
1. Go to EC2 → Security Groups
2. Find the RDS security group
3. Edit inbound rules:
   - Type: PostgreSQL
   - Protocol: TCP
   - Port: 5432
   - Source: Your application's security group ID
4. Save rules

#### Step 8: Get Connection Details
1. Go to RDS dashboard
2. Click on your database instance
3. Note the endpoint (e.g., `automechanica-prod-db.xxxxx.us-east-1.rds.amazonaws.com`)
4. Construct connection string:
   ```
   postgres://admin:password@endpoint:5432/appdb?sslmode=require
   ```

#### Step 9: Store Connection String Securely
1. Go to AWS Secrets Manager
2. Click "Store a new secret"
3. Choose "Other type of secret"
4. Add key-value pairs:
   - Key: `DATABASE_URL`
   - Value: Your connection string
5. Secret name: `automechanica/prod/database`
6. Click "Store"

#### Step 10: Test Connection
1. Use psql or a database client to connect:
   ```bash
   psql "postgres://admin:password@endpoint:5432/appdb?sslmode=require"
   ```
2. Verify connection successful
3. Install extensions (same as local setup)

#### Step 11: Enable Multi-AZ (Production Only)
1. Go to RDS dashboard
2. Select your database instance
3. Click "Modify"
4. Under "Availability & durability":
   - Select "Create a standby instance"
5. Apply changes (may require downtime)

### Part 4: Database Backups and Recovery

#### Step 1: Set Up Automated Backups (Local Development)
1. Create backup script `scripts/backup-db.sh`:
   ```bash
   #!/bin/bash
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="./backups"
   mkdir -p $BACKUP_DIR
   
   docker exec <container-name> pg_dump -U app appdb > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
   
   # Keep only last 7 backups
   ls -t $BACKUP_DIR/backup_*.sql | tail -n +8 | xargs rm -f
   ```

2. Make executable:
   ```bash
   chmod +x scripts/backup-db.sh
   ```

3. Run backup:
   ```bash
   ./scripts/backup-db.sh
   ```

#### Step 2: Restore from Backup (Local)
```bash
docker exec -i <container-name> psql -U app appdb < ./backups/backup_20231231_120000.sql
```

#### Step 3: Production Backup Strategy (RDS)
1. **Automated Snapshots**: Already configured (7-day retention)
2. **Manual Snapshots**: Create before major changes
   - Go to RDS dashboard
   - Select instance
   - Actions → Take snapshot
   - Enter snapshot name
   - Click "Take snapshot"

3. **Export to S3** (for long-term storage):
   - Select snapshot
   - Actions → Export to Amazon S3
   - Choose S3 bucket
   - Select data to export
   - Start export

#### Step 4: Test Recovery Quarterly
1. Create test instance from snapshot
2. Verify data integrity
3. Test application connectivity
4. Document recovery time
5. Delete test instance

### Part 5: Database Monitoring and Optimization

#### Step 1: Set Up CloudWatch Alarms (Production)
1. Go to CloudWatch → Alarms
2. Create alarms for:
   - **CPU Utilization** > 80%
   - **Free Storage Space** < 10 GB
   - **Database Connections** > 80% of max
   - **Read/Write Latency** > threshold
   - **Replica Lag** (if using read replicas)

#### Step 2: Regular Maintenance Tasks
1. **Weekly**:
   - Review slow query logs
   - Check database size growth
   - Monitor connection count

2. **Monthly**:
   - Review and optimize queries
   - Analyze table sizes
   - Update statistics (ANALYZE)
   - Check for unused indexes

3. **Quarterly**:
   - Review and update indexes
   - Test backup restoration
   - Review security settings
   - Update PostgreSQL version

#### Step 3: Query Performance Monitoring
1. Enable slow query logging:
   ```sql
   ALTER DATABASE appdb SET log_min_duration_statement = 1000; -- 1 second
   ```

2. Use Performance Insights (RDS):
   - Go to RDS → Your Instance → Performance Insights
   - Review top SQL queries
   - Identify optimization opportunities

3. Install pg_stat_statements extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

### Part 6: Security Best Practices

#### Step 1: Implement Least Privilege Access
1. Create application-specific database user:
   ```sql
   CREATE USER app_service WITH PASSWORD 'strong_password_here';
   GRANT CONNECT ON DATABASE appdb TO app_service;
   GRANT USAGE ON SCHEMA public TO app_service;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_service;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_service;
   ```

2. Use this user in production, not the admin user

#### Step 2: Enable SSL/TLS
1. Always use `sslmode=require` in production connection strings
2. For maximum security, use `sslmode=verify-full`

#### Step 3: Rotate Passwords Regularly
1. Update database password every 90 days
2. Use AWS Secrets Manager for automatic rotation (RDS)

#### Step 4: Regular Security Audits
1. Review user permissions quarterly
2. Check for public accessibility (should be No)
3. Verify security group rules
4. Review audit logs

## docker-compose snippet
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata: {}
```

## Recommended extensions
- `pg_trgm` (fast fuzzy search)
- `uuid-ossp` (generate uuids)
- `citext` (case-insensitive text)
- (optional) `postgis` if location inventory is required

## Migrations
- TypeORM example:
  - `npm run typeorm migration:generate -- -n init` (dev)
  - `npm run typeorm migration:run`
- Prisma example:
  - `npx prisma migrate dev --name init`
  - `npx prisma migrate deploy` (CI/Prod)

## Backups
- Use scheduled `pg_dump` snapshots to object storage (S3)
- Keep point-in-time recovery if using RDS/Aurora
- Test restore process quarterly

## Connection string env var
- `DATABASE_URL=postgres://app:changeme@db-host:5432/appdb?schema=public`
- Use single env var for 12-factor config.

Security: set `sslmode=require` for managed DBs and restrict network access to app subnets.