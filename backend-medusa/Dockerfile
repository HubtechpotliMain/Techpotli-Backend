# Stage 1: install deps and build (admin goes to .medusa/server/public/admin)
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Runtime looks for admin at public/admin, but build outputs to .medusa/server/public/admin — copy into place
RUN mkdir -p public && cp -r .medusa/server/public/admin public/

# Stage 2: runtime image with built app (including public/admin)
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app .

CMD ["node", "scripts/railway-start.js"]
