# Docker Setup Guide

## Quick Start

### Production Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development Mode

```bash
# Run with development overrides (hot reload enabled)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Rebuild after dependency changes
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Environment Configuration

Create a `.env` file from the template:

```bash
cp .env.docker .env
```

Key environment variables:

- `ENABLE_POLLING=true` - Enable automatic service monitoring (now works in production!)
- `POLL_INTERVAL_MS=60000` - Polling interval (default: 60 seconds)
- `APP_PORT=3000` - Application port mapping
- `DB_PORT=5432` - Database port mapping

## Architecture

### Multi-Stage Dockerfile

1. **deps** - Install dependencies
2. **builder** - Build Next.js app with optimized layer caching
3. **runner** - Production runtime (minimal, non-root user)

### Features

✅ **Health Checks** - Built-in `/api/health` endpoint with database connectivity check
✅ **Auto Migrations** - Prisma migrations run automatically on container start
✅ **Optimized Builds** - Layer caching for faster rebuilds
✅ **Resource Limits** - CPU and memory constraints configured
✅ **Logging** - JSON logs with size rotation (10MB max, 3 files)
✅ **Network Isolation** - Services communicate via dedicated bridge network
✅ **Production Polling** - Service monitoring now works in production mode

## Useful Commands

```bash
# View container health status
docker ps

# Inspect health check
docker inspect 404nottoday-app | grep -A 10 Health

# View application logs
docker-compose logs app

# View database logs
docker-compose logs db

# Execute commands in running container
docker-compose exec app sh

# Run Prisma commands
docker-compose exec app npx prisma studio

# Rebuild without cache
docker-compose build --no-cache

# Clean up everything (including volumes)
docker-compose down -v
```

## Development Workflow

The `docker-compose.dev.yml` override provides:

- **Hot Reload** - Source code mounted as volumes
- **Development Mode** - `NODE_ENV=development`
- **Debug Logs** - Agent debug calls enabled
- **Increased Resources** - More CPU/memory for development
- **Alternative Port** - Database on 5433 to avoid local conflicts

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Verify database is healthy
docker-compose ps db
```

### Database connection issues

```bash
# Test database connectivity
docker-compose exec db psql -U monitoring -d servicehealth -c "SELECT 1"
```

### Health check failing

```bash
# Test health endpoint
curl http://localhost:3000/api/health
```

### Rebuild from scratch

```bash
# Remove containers, volumes, and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Production Deployment Checklist

- [ ] Update `.env` with secure passwords
- [ ] Set `ENABLE_POLLING=true` for continuous monitoring
- [ ] Configure `POLL_INTERVAL_MS` based on your needs
- [ ] Review resource limits in `docker-compose.yml`
- [ ] Set up external volume backups for `postgres_data`
- [ ] Configure reverse proxy (nginx, traefik) for SSL
- [ ] Set up log aggregation (ELK, Loki, etc.)
- [ ] Monitor container health and resource usage

## Key Improvements Made

1. **Fixed Production Polling** - Service monitoring now works in production (controlled by `ENABLE_POLLING` env var)
2. **Guarded Debug Calls** - Agent debug logs only fire in development mode
3. **Added Health Endpoint** - `/api/health` with database connectivity check
4. **Optimized Dockerfile** - Better layer caching with selective COPY commands
5. **Enhanced Compose** - Logging, networks, resource limits, and container names
6. **Development Override** - Separate `docker-compose.dev.yml` for local development
7. **Comprehensive .dockerignore** - Excludes tests, docs, IDE files, and build artifacts
8. **Environment Template** - `.env.docker` with all documented variables
