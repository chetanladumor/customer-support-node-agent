# ==============================================================================
# Stage 1: Build & Prune (Builder)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate type-safe client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript (dist/)
RUN npm run build

# Remove devDependencies to keep runtime lightweight
RUN npm prune --production

# ==============================================================================
# Stage 2: Production Runtime (Runner)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3001

# Copy production node_modules, generated Prisma client, and compiled code
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Non-root user for container security
USER node

# Expose backend port
EXPOSE 3001

# Local container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start production compiled server
CMD ["node", "dist/index.js"]
