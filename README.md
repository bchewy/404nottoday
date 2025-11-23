# 404NotToday

A lightweight Next.js application for monitoring service health, availability, and version tracking. Built for the ATS Take-Home Assignment.

## Features
- ✅ **Periodic Health Checks**: Monitors services at configurable intervals (default: 60s)
- ✅ **Persistent Storage**: SQLite database for storing check results and historical data
- ✅ **Real-time Dashboard**: Clean, modern UI displaying service status, latency, and uptime
- ✅ **Version Tracking**: Detects and displays service versions with drift warnings
- ✅ **Environment Support**: Group services by environment (staging, production, etc.)
- ✅ **Manual Refresh**: Trigger immediate health checks via UI button
- ✅ **Dockerized**: Ready-to-deploy with Docker and docker-compose

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with Prisma ORM (v5.22)
- **Styling**: Tailwind CSS
- **Runtime**: Node.js 20
- **Deployment**: Docker

# Infrastructure Note:
I'd ideally deploy this on Vercel since it's easy for me to do so (40seconds from the cli command to deployment on https://404.chew.sh); but due to the fact that the Vercel cron jobs are limited on free-tier, i'd much rather self-deploy this on a ec2/box with docker-compose, alternatively we can also deploy this via lambdas and then crud the database. 

I'd also monitor this via other tools better known out there like betteruptime, statuspage, etc... as well as be on-call on pagerduty! (i have some fun experience with it!)

## Quick Start
### Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up --build

# Access the dashboard
open http://localhost:3000
```

## API Endpoints

### GET /api/status

Returns current status of all services with statistics.

**Response:**
```json
{
  "services": [
    {
      "id": "...",
      "name": "My API",
      "url": "https://api.example.com/health",
      "environment": "production",
      "expectedVersion": "1.2.3",
      "latestCheck": {
        "status": "UP",
        "latency": 45,
        "detectedVersion": "1.2.3",
        "errorMessage": null,
        "timestamp": "2025-11-23T11:30:00.000Z"
      },
      "stats": {
        "uptime24h": 99.8,
        "avgLatency24h": 52.3,
        "totalChecks24h": 1440
      }
    }
  ],
  "timestamp": "2025-11-23T11:30:00.000Z"
}
```

### POST /api/refresh

Triggers an immediate poll of all services.

**Response:**
```json
{
  "success": true,
  "message": "Services polled successfully"
}
```

## Architecture & Design

### Polling Mechanism

The application uses Next.js's experimental `instrumentation.ts` hook to run background polling:

1. On startup, services from `services.json` are synced to the database
2. An initial health check runs immediately
3. A recurring interval polls all services every 60 seconds (configurable)
4. Results are stored in the `CheckResult` table

### Version Detection

The poller attempts to detect versions through:
- HTTP headers: `X-Version` or `x-version`
- JSON response body: `{ "version": "..." }` field

### Database Schema

**Service Table:**
- Stores service configuration (name, URL, expected version, environment)
- Synced from `services.json` on startup

**CheckResult Table:**
- Records each health check (status, latency, detected version, errors)
- Indexed by service ID and timestamp for efficient queries
- Used to calculate uptime and average latency statistics

### UI Design

Clean, modern aesthetic with:
- System status banner showing overall health
- Service cards with status badges (green/yellow/red)
- Real-time metrics (latency, 24h uptime)
- Version mismatch warnings
- Manual refresh capability

## Trade-offs & Decisions

### Polling Inside Next.js vs Separate Worker

**Chosen**: Internal polling via `instrumentation.ts`

**Rationale**:
- Simpler deployment (single container)
- Leverages Next.js's built-in capabilities
- Sufficient for moderate polling frequency
- Easy to migrate to separate worker if needed

**Trade-off**: Less isolation, potential impact if Next.js process restarts

### SQLite vs PostgreSQL

**Chosen**: SQLite

**Rationale**:
- Zero external dependencies
- Perfect for this use case (low write volume, single writer)
- Simplified Docker setup
- Easy to backup/migrate

**Trade-off**: Not suitable for high-concurrency scenarios

### Configuration: JSON vs Environment Variables

**Chosen**: `services.json` file

**Rationale**:
- Easier to manage multiple services
- Version-controllable
- Hot-reloadable (restart required)

**Trade-off**: Requires file access; env vars might be simpler for small deployments

## Production Deployment Recommendations

### Infrastructure

**Recommended Setup**: AWS ECS Fargate or EC2 with Docker

1. **Container Orchestration**: Deploy via ECS with persistent EFS volume for SQLite database
2. **Load Balancer**: ALB in front of ECS tasks (if scaling horizontally)
3. **Monitoring**: CloudWatch for logs and metrics
4. **Alerting**: CloudWatch Alarms → SNS → Email/Slack for downtime alerts

**Alternative**: Single EC2 instance with docker-compose for simplicity

### Monitoring & Observability

- **Application Logs**: Structured JSON logs to CloudWatch
- **Health Checks**: ALB health checks hitting `/api/status`
- **Metrics**: Custom CloudWatch metrics for service uptime/latency
- **Alerting**: Trigger alerts when uptime drops below threshold

### Scaling Considerations

- **Vertical**: Increase container CPU/memory for more frequent polling
- **Horizontal**: Challenging with SQLite; migrate to PostgreSQL + Redis for distributed polling
- **Database**: For >100 services or <10s poll intervals, consider PostgreSQL

### Security

- Use VPC with private subnets for ECS tasks
- Restrict security groups to necessary ports
- Use IAM roles for AWS service access
- Consider secrets management (AWS Secrets Manager) for sensitive URLs

### Backup & Recovery

- **SQLite Database**: Periodic snapshots to S3 via cron or Lambda
- **Disaster Recovery**: Store `services.json` and migrations in version control
- **RTO/RPO**: Acceptable data loss of 1-5 minutes (time between polls)

### Cost Optimization

- Single ECS Fargate task (0.25 vCPU, 512 MB): ~$5-10/month
- EFS volume: ~$1-2/month for small database
- Total estimated cost: **< $15/month**

## AI Usage Disclosure

AI tools (Claude via Cursor) were used extensively for:

- **Boilerplate Generation**: Prisma schema, API routes, component structure
- **Debugging**: Prisma 7 configuration issues, Docker multi-stage builds
- **Best Practices**: Next.js 16 App Router patterns, Tailwind styling conventions
- **Documentation**: README structure and deployment recommendations
- **Architecture**: Validation of polling mechanism and data model design

The core architecture, technology choices, and trade-off decisions were human-driven, with AI assisting in implementation details and accelerating development.

# GIFS of the app in action

## Default Webhook Integration
- Edit a service to be faulty and see webhook response.
![Default Webhook Integration](./webhook.gif)

## Telegram Webhook Integration
- Edit a service to be faulty and see telegram message.
![Telegram Webhook Integration](./tele.gif)