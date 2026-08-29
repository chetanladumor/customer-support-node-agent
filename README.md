<div align="center">
  <h1>🤖 Enterprise Multi-Agent AI Customer Support & AWS Cloud Architecture</h1>
  <p><strong>Full-stack AI orchestration platform built with Node.js, Express, TypeScript, React, PostgreSQL + pgvector, Docker, and production-grade AWS ECS Fargate & S3 deployment.</strong></p>
</div>

---

## 📖 Overview

This repository demonstrates both **modern multi-agent AI architecture** and **production-grade AWS DevOps workflows**:

1. **AI / RAG Backend**: A multi-agent customer support backend (Router Agent, Support Agent, Order Agent, Billing Agent) powered by Vercel AI SDK, Google Gemini / OpenAI, and a PostgreSQL 16 `pgvector` Hybrid Search & Reranking engine.
2. **Interactive Frontend**: A modern React 19 + TailwindCSS SPA with real-time agent reasoning visualization.
3. **Enterprise DevOps & AWS**: Multi-stage Docker containers, GitHub Actions CI/CD with secure OpenID Connect (OIDC), AWS ECR container registry, AWS ECS Fargate serverless containers, RDS PostgreSQL with pgvector, and static hosting on Amazon S3.

---

## 🏛️ System Architecture

### 1. Production AWS Cloud Architecture

```text
                     Developer
                         │
                         │ git push
                         ▼
                 GitHub Repository
                         │
                         ▼
             GitHub Actions CI/CD (OIDC)
               │                     │
               ▼                     ▼
     Build & Push Image       Build & Sync Dist
               │                     │
               ▼                     ▼
          AWS ECR (Docker)      Amazon S3 (React SPA)
               │                     │
               ▼                     ▼
        AWS ECS Fargate         Web Browser
        (Node.js API :3001)          │
               │                     │
               ├─────────────────────┘ (API Calls: CORS enabled)
               ▼
      Amazon RDS PostgreSQL 16
         (+ pgvector extension)
               │
               ▼
     Google Gemini / OpenAI APIs
```

### 2. Scaled Production Evolution (With ALB & CloudFront)
For high-traffic production environments, CloudFront and an ALB can be placed in front to route `/*` to S3 and `/api/*` to ECS with zero CORS overhead and centralized SSL:

```text
                                Internet
                                   │
                                   ▼
                         AWS CloudFront (CDN)
                        /                  \
          (Static Content: /*)         (API Traffic: /api/*)
                      /                      \
                     ▼                        ▼
              Amazon S3 Bucket       Application Load Balancer (ALB)
              (React SPA Build)               │
                                              ▼
                                     ECS Fargate Cluster
                                     (Node.js Containers)
                                       /          \
                                      ▼            ▼
                                 Amazon RDS      Redis Cache /
                               PostgreSQL 16     Rate Limiter
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js 20, Express 5, TypeScript, Zod, Helmet, Morgan, Prisma ORM |
| **AI / RAG** | `@ai-sdk/google` (Gemini), `@ai-sdk/openai`, `@xenova/transformers`, `pgvector` |
| **Frontend** | React 19, Vite, TailwindCSS, Lucide Icons, `@ai-sdk/react` |
| **Databases** | PostgreSQL 16 with `pgvector` (Vector Embeddings + GIN Full-Text Search) |
| **Containerization** | Docker, Multi-Stage Builds, Docker Compose |
| **AWS Cloud** | ECS Fargate, ECR, RDS PostgreSQL 16, S3, Secrets Manager, CloudWatch Logs, IAM OIDC |
| **CI/CD** | GitHub Actions (Automated Linting, Testing, Container Build, OIDC Auth, Deployment) |

---

## 🚀 Local Development & Testing

### Option A: Local Development with Hot-Reloading

For live code editing with instant TypeScript compilation:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start PostgreSQL, Backend (tsx watch), and Frontend (vite dev)
docker compose -f docker-compose.dev.yml up --build

# 3. Apply Prisma database schema & seed initial test data
docker exec -it node_ai_backend_dev npx prisma db push
docker exec -it node_ai_backend_dev npm run db:seed
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

---

### Option B: Local Production Simulation

To test the exact multi-stage compiled production containers locally before pushing to AWS:

```bash
# 1. Build and start production containers
docker compose up --build -d

# 2. Check running services
docker compose ps

# 3. View logs
docker compose logs -f backend

# 4. Tear down
docker compose down
```

---

## 🧪 Testing

Run the automated test suite (Unit tests, middleware checks, tool execution tests, and agent routing):

```bash
# Run all tests
npm test

# Typecheck TypeScript
npm run typecheck

# Test RAG hybrid search directly via CLI
npx tsx scripts/test-rag.ts
```

---

## ☁️ Step-by-Step AWS Setup Guide

Follow these steps to configure your AWS environment for automated deployments:

### Step 1: Create Amazon ECR Repository
Create a private repository to store your backend Docker images:
```bash
aws ecr create-repository \
  --repository-name node-ai-backend \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

### Step 2: Configure Amazon RDS PostgreSQL with pgvector
1. Create a PostgreSQL 16 DB instance on RDS (e.g. `db.t4g.micro` for learning).
2. Connect to the database and enable the `vector` extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Store the database connection URL in **AWS Secrets Manager**:
   - Secret Name: `node-ai/production/DATABASE_URL`
   - Secret Value: `postgresql://dbadmin:<PASSWORD>@<RDS_ENDPOINT>:5432/swadesh_support_db?schema=public&sslmode=require`

### Step 3: Configure AWS Secrets Manager for AI API Key
Store your Google Gemini or OpenAI API key:
- Secret Name: `node-ai/production/GOOGLE_GENERATIVE_AI_API_KEY`
- Secret Value: `<YOUR_GEMINI_API_KEY>`

### Step 4: Create S3 Bucket for Frontend Hosting
1. Create an S3 bucket:
   ```bash
   aws s3 mb s3://my-node-ai-support-frontend --region us-east-1
   ```
2. Enable Static Website Hosting in S3 console with `index.html` as the index document.

### Step 5: Configure IAM & GitHub Actions OIDC (No Permanent Keys!)
1. Create the GitHub Actions OIDC Identity Provider in AWS IAM (`token.actions.githubusercontent.com`).
2. Create an IAM Role named `github-actions-node-ai-deploy` using the trust policy in [`aws/iam-policies/github-oidc-trust-policy.json`](./aws/iam-policies/github-oidc-trust-policy.json).
3. Attach permissions using [`aws/iam-policies/github-actions-deploy-policy.json`](./aws/iam-policies/github-actions-deploy-policy.json).
4. Create the ECS Execution Role using [`aws/iam-policies/ecs-execution-role-policy.json`](./aws/iam-policies/ecs-execution-role-policy.json).

### Step 6: Configure GitHub Repository Secrets & Variables
In your GitHub repository under **Settings $\to$ Secrets and variables $\to$ Actions**, configure:

| Secret / Variable Name | Type | Value / Purpose |
| :--- | :--- | :--- |
| `AWS_DEPLOY_ROLE_ARN` | Secret | `arn:aws:iam::<ACCOUNT_ID>:role/github-actions-node-ai-deploy` |
| `AWS_REGION` | Secret / Variable | `us-east-1` |
| `ECR_REPOSITORY` | Secret / Variable | `node-ai-backend` |
| `ECS_CLUSTER` | Secret / Variable | `node-ai-cluster` |
| `ECS_SERVICE` | Secret / Variable | `node-ai-backend-service` |
| `S3_FRONTEND_BUCKET` | Secret / Variable | `my-node-ai-support-frontend` |
| `BACKEND_API_URL` | Secret / Variable | `http://<ALB_OR_ECS_PUBLIC_IP>:3001` |

---

## 🔄 CI/CD Pipeline Workflow

When you push code to `main`:

```text
git push origin main
        │
        ▼
[GitHub Actions]
  ├── Step 1: Run Backend Tests (Jest) & Typecheck (tsc)
  ├── Step 2: Run Frontend Typecheck & Build
  │
  ├── [Backend Deploy]:
  │     ├── Authenticate with AWS via OIDC (No permanent keys)
  │     ├── Build Docker multi-stage production image
  │     ├── Push to ECR tagged with git SHA (${{ github.sha }}) and 'latest'
  │     ├── Render updated Task Definition
  │     └── Deploy to ECS Fargate service & wait for healthy status
  │
  └── [Frontend Deploy]:
        ├── Build Vite React app with production VITE_API_URL
        └── Sync ./client/dist to S3 bucket (--delete flag)
```

---

## ⏪ Rollback Strategy

If a deployment introduces a critical issue:

1. **Instant ECS Rollback via AWS CLI / Console**:
   ```bash
   # Revert ECS service to previous task definition revision (e.g. revision 3)
   aws ecs update-service \
     --cluster node-ai-cluster \
     --service node-ai-backend-service \
     --task-definition node-ai-backend:3
   ```
2. **Git-Driven Rollback**:
   ```bash
   git revert HEAD
   git push origin main
   ```
   GitHub Actions will automatically redeploy the previously stable Git SHA image.

---

## 💰 Cost Optimization Analysis

### Learning / Low-Cost Tier (~$15 - $25 / month)
- **Frontend**: Amazon S3 Static Website Hosting (~$0.50/mo for storage & GET requests).
- **Backend**: AWS ECS Fargate 0.25 vCPU + 0.5 GB RAM task (~$9.00/mo).
- **Database**: Amazon RDS PostgreSQL `db.t4g.micro` Single-AZ with 20 GB gp3 (~$15.00/mo, or free under AWS 12-month Free Tier).
- **Load Balancing / Networking**: Direct public subnet task with Security Group limiting access, avoiding the ~$32/mo NAT Gateway and ~$18/mo ALB for pure learning environments.

### Production Tier (~$80 - $150 / month)
- **Frontend**: S3 + CloudFront CDN with Custom Domain & Free ACM SSL Certificate.
- **Backend**: Multi-task ECS Fargate across 2 Availability Zones behind an Application Load Balancer (ALB).
- **Database**: Amazon RDS Multi-AZ for automated high-availability failover.
- **Caching**: Amazon ElastiCache Redis (`cache.t4g.micro`) for distributed rate limiting & vector embedding caching.
