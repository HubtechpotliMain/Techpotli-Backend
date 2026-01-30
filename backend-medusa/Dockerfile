# Use Node 20 (matches package.json engines).
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (no COPY after this that would overwrite node_modules).
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

# Copy source and run build. Do NOT copy again after this so .medusa (admin build) is kept.
COPY . .
RUN npm run build

# Runtime: start with Railway script (HOST=0.0.0.0, PORT from env).
CMD ["node", "scripts/railway-start.js"]
