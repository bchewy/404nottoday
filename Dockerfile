FROM node:20-slim AS deps
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files and Prisma schema (needed for postinstall prisma generate)
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (includes optional native bindings) and run postinstall (prisma generate)
RUN npm ci --include=optional && \
    node -e "\
      const cp = require('child_process'); \
      const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : null; \
      const libc = process.report?.getReport().header.glibcVersionRuntime ? 'gnu' : 'musl'; \
      if (arch) { \
        const pkgs = [ \
          '@tailwindcss/oxide-linux-' + arch + '-' + libc + '@4.1.17', \
          'lightningcss-linux-' + arch + '-' + libc + '@1.30.2' \
        ]; \
        console.log('Installing native bindings:', pkgs.join(' ')); \
        cp.execSync('npm install --no-save ' + pkgs.join(' '), { stdio: 'inherit' }); \
      } else { \
        console.log('Skipping native oxide/lightningcss install for arch', process.arch); \
      }"

FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma client
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Build arguments for versioning
ARG BUILD_VERSION="dev"
ARG BUILD_COMMIT="unknown"

# Prisma generate requires a connection string even if the DB is unreachable
ARG DATABASE_URL="postgresql://monitoring:monitoring123@localhost:5432/servicehealth"
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Copy pre-installed node_modules and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js standalone output (runs prisma generate first)
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd -g 1001 nodejs \
  && useradd -u 1001 -g nodejs nextjs

# Copy production artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/services.json ./services.json
COPY --from=builder /app/package*.json ./

# Remove devDependencies to slim the image while keeping generated Prisma client
RUN npm prune --omit=dev

USER nextjs
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations on start, then boot the Next.js server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
