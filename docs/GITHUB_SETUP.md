# GitHub repo & CI setup

## Step-by-Step Setup Instructions

### Part 1: Initial Repository Setup

#### Step 1: Create GitHub Repository
1. Log in to GitHub
2. Click the "+" icon in the top-right corner → "New repository"
3. Enter repository name: `automechanica-v2`
4. Set visibility: `Private` (recommended initially)
5. Check "Add a README file"
6. Choose "Node" for `.gitignore` template
7. Select a license (e.g., MIT if open source, or skip for proprietary)
8. Click "Create repository"

#### Step 2: Clone Repository Locally
1. Copy the repository URL (HTTPS or SSH)
2. Open your terminal
3. Navigate to your projects directory
4. Clone the repository:
   ```bash
   git clone <repository-url>
   cd automechanica-v2
   ```

#### Step 3: Set Up Repository Structure
1. Create the recommended directory structure:
   ```bash
   mkdir -p apps/api apps/admin apps/worker apps/orchestrator
   mkdir -p libs/shared-types libs/utils libs/shopify-sdk
   mkdir -p infra migrations docs
   ```
2. Initialize package.json for monorepo:
   ```bash
   npm init -y
   ```
3. Update `package.json` to add workspaces:
   ```json
   {
     "name": "automechanica-v2",
     "private": true,
     "workspaces": [
       "apps/*",
       "libs/*"
     ]
   }
   ```

#### Step 4: Set Up Git Configuration
1. Configure Git user (if not already done):
   ```bash
   git config user.name "Your Name"
   git config user.email "your.email@example.com"
   ```
2. Create `.gitignore` to ensure it includes:
   ```
   node_modules/
   .env
   .env.local
   dist/
   build/
   *.log
   .DS_Store
   coverage/
   ```

#### Step 5: Initialize Branch Strategy
1. Create and push `develop` branch:
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```
2. Return to main:
   ```bash
   git checkout main
   ```

### Part 2: Repository Settings and Protection

#### Step 1: Configure Branch Protection for `main`
1. Go to repository on GitHub
2. Navigate to "Settings" → "Branches"
3. Click "Add rule" for branch protection
4. Branch name pattern: `main`
5. Enable the following:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (set to 2)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings
6. Click "Create" or "Save changes"

#### Step 2: Configure Branch Protection for `develop`
1. Repeat the above process for `develop` branch
2. Set required approvals to 1 (can be less strict than `main`)

#### Step 3: Set Up Repository Secrets
1. Go to "Settings" → "Secrets and variables" → "Actions"
2. Click "New repository secret"
3. Add each of the following secrets:

   **Shopify Secrets:**
   ```
   Name: SHOPIFY_API_KEY
   Value: <your-shopify-api-key>
   
   Name: SHOPIFY_API_SECRET
   Value: <your-shopify-api-secret>
   
   Name: SHOPIFY_ACCESS_TOKEN
   Value: <your-shopify-access-token>
   ```

   **Database Secrets:**
   ```
   Name: DATABASE_URL
   Value: <your-database-connection-string>
   ```

   **RabbitMQ Secrets:**
   ```
   Name: RABBITMQ_URL
   Value: <your-rabbitmq-connection-string>
   
   (or separately)
   Name: RABBITMQ_USER
   Value: <username>
   
   Name: RABBITMQ_PASSWORD
   Value: <password>
   
   Name: RABBITMQ_VHOST
   Value: <vhost>
   ```

   **OpenAI Secrets:**
   ```
   Name: OPENAI_API_KEY
   Value: sk-...
   ```

   **AWS Secrets (if deploying to AWS):**
   ```
   Name: AWS_ACCESS_KEY_ID
   Value: <your-access-key>
   
   Name: AWS_SECRET_ACCESS_KEY
   Value: <your-secret-key>
   
   Name: AWS_REGION
   Value: us-east-1
   ```

   **Optional Monitoring:**
   ```
   Name: SENTRY_DSN
   Value: <your-sentry-dsn>
   ```

### Part 3: GitHub Actions CI/CD Setup

#### Step 1: Create Workflows Directory
1. Create directory structure:
   ```bash
   mkdir -p .github/workflows
   ```

#### Step 2: Create CI Workflow
1. Create file `.github/workflows/ci.yml`
2. Add the following content:
   ```yaml
   name: CI

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]

   jobs:
     ci:
       runs-on: ubuntu-latest
       
       steps:
         - name: Checkout code
           uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Lint
           run: npm run lint
         
         - name: Build all workspaces
           run: npm run build --workspaces --if-present
         
         - name: Run tests
           run: npm test --workspaces --if-present -- --ci --coverage
         
         - name: Upload coverage
           uses: codecov/codecov-action@v3
           if: always()
           with:
             files: ./coverage/coverage-final.json
   ```

#### Step 3: Create Deployment Workflow (Optional)
1. Create file `.github/workflows/deploy.yml`
2. Add deployment steps for your hosting platform

#### Step 4: Test CI Pipeline
1. Commit and push the CI workflow:
   ```bash
   git add .github/workflows/ci.yml
   git commit -m "Add CI workflow"
   git push origin main
   ```
2. Go to repository → "Actions" tab
3. Verify the workflow runs successfully

### Part 4: Pull Request Template

#### Step 1: Create PR Template Directory
```bash
mkdir -p .github
```

#### Step 2: Create Pull Request Template
1. Create file `.github/pull_request_template.md`
2. Add the following content:
   ```markdown
   ## Description
   <!-- Describe what this PR changes and why -->

   ## Type of Change
   - [ ] Bug fix (non-breaking change which fixes an issue)
   - [ ] New feature (non-breaking change which adds functionality)
   - [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
   - [ ] Documentation update

   ## Checklist
   - [ ] Describes change and motivation clearly
   - [ ] Tests added/updated and all tests pass
   - [ ] Lint passes (`npm run lint`)
   - [ ] Environment variables documented (if needed)
   - [ ] Security/privacy implications considered
   - [ ] Webhook/event behaviors verified locally (if applicable)
   - [ ] Human checkpoints added for high-risk operations (if applicable)
   - [ ] No hardcoded secrets or credentials

   ## Testing
   <!-- Describe how you tested this change -->

   ## Screenshots (if applicable)
   <!-- Add screenshots to help explain your changes -->

   ## Related Issues
   <!-- Link to related issues: Fixes #123, Relates to #456 -->
   ```

#### Step 3: Create Issue Templates (Optional)
1. Create `.github/ISSUE_TEMPLATE/bug_report.md`
2. Create `.github/ISSUE_TEMPLATE/feature_request.md`

### Part 5: Collaboration Settings

#### Step 1: Configure Team Access
1. Go to "Settings" → "Collaborators and teams"
2. Add team members with appropriate roles:
   - Admin: Full access
   - Write: Can push to repository
   - Read: Can view and clone

#### Step 2: Configure Notifications
1. Go to repository → "Watch" button
2. Choose notification level:
   - "All Activity" for critical repositories
   - "Custom" to select specific events

#### Step 3: Set Up Code Owners (Optional)
1. Create file `.github/CODEOWNERS`
2. Add ownership rules:
   ```
   # Global owners
   * @team-lead @senior-dev

   # Specific path owners
   /apps/api/ @backend-team
   /apps/admin/ @frontend-team
   /infra/ @devops-team
   ```

### Part 6: Development Workflow

#### Step 1: Creating Feature Branches
1. Always branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/TICKET-123-short-description
   ```

#### Step 2: Making Commits
1. Make changes and commit:
   ```bash
   git add .
   git commit -m "feat: add product listing automation"
   ```
2. Use conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `chore:` for maintenance tasks
   - `refactor:` for code refactoring
   - `test:` for adding tests

#### Step 3: Pushing and Creating Pull Requests
1. Push feature branch:
   ```bash
   git push -u origin feature/TICKET-123-short-description
   ```
2. Go to GitHub repository
3. Click "Compare & pull request"
4. Fill out PR template
5. Set base branch to `develop` (not `main`)
6. Request reviewers
7. Click "Create pull request"

#### Step 4: Code Review Process
1. Wait for CI checks to pass
2. Address review comments
3. Push additional commits as needed
4. Request re-review after changes
5. Once approved, merge using "Squash and merge"

#### Step 5: Release Process
1. When ready for production, create release branch from `develop`:
   ```bash
   git checkout -b release/v1.0.0
   ```
2. Update version numbers and changelog
3. Create PR from `release/v1.0.0` to `main`
4. After merge, tag the release:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```
5. Merge `main` back to `develop`:
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```

### Part 7: Maintenance and Best Practices

#### Step 1: Regular Repository Maintenance
1. Weekly: Review and close stale PRs and issues
2. Monthly: Update dependencies and security patches
3. Quarterly: Review and update documentation

#### Step 2: Keep CI Green
1. Fix failing tests immediately
2. Don't merge PRs with failing CI
3. Monitor CI run times and optimize if necessary

#### Step 3: Security Best Practices
1. Enable Dependabot alerts (Settings → Security → Dependabot)
2. Enable secret scanning (Settings → Security → Secret scanning)
3. Enable code scanning (Settings → Security → Code scanning)
4. Regularly rotate secrets

## Repo layout (recommended)
- `apps/api/` — NestJS backend
- `apps/admin/` — admin UI (React/Vite)
- `apps/worker/` — background worker consuming RabbitMQ
- `infra/` — docker-compose, k8s manifests
- `libs/*` — shared utils, types, SDKs
- `migrations/` — DB migrations

## Branch strategy
- `main` — production-ready
- `develop` — integration branch
- feature branches: `feature/<ticket>-short-name`
- release branches: `release/vX.Y`

## GitHub Actions CI (sample steps)
- Lint: `npm run lint`
- Build: `npm run build` for each app
- Test: `npm run test -- --ci`
- Example job snippet (conceptual):
```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '20'}
      - run: npm ci
      - run: npm run lint
      - run: npm run build --workspaces
      - run: npm test --workspaces --silent
```

## Secrets to add (GitHub repo secrets)
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_ACCESS_TOKEN`
- `DATABASE_URL`
- `RABBITMQ_URL` or `RABBITMQ_USER`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST`
- `OPENAI_API_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `SENTRY_DSN` (optional)

## Pull Request template checklist
- [ ] Describes change and motivation
- [ ] Tests added/updated and pass
- [ ] Lint passes
- [ ] Env/secrets documented (if needed)
- [ ] Security/privacy implications considered
- [ ] Webhook/event behaviors verified locally
- [ ] Human checkpoints added (if listing/sourcing related)

Keep CI green and require two reviewers for `main` merges.