# =========================
# Build stage
# =========================
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Prisma may require DATABASE_URL to be defined during generation.
# This placeholder is for the build only; it is NOT your real database.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder"

# Generate Prisma Client
RUN npx prisma generate

# Remove development dependencies
RUN npm prune --omit=dev


# =========================
# Production stage
# =========================
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Copy production dependencies
COPY --from=build --chown=node:node /app/node_modules ./node_modules

# Copy application files
COPY --chown=node:node package*.json ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node /app/src ./src
COPY --chown=node:node /app/public ./public

# Run as non-root user
USER node

EXPOSE 3000

CMD ["npm", "start"]