FROM node:20-alpine

WORKDIR /app

# Prisma's query engine needs OpenSSL, which node:alpine does not ship
RUN apk add --no-cache openssl

# Copy package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies (exact versions from backend/package-lock.json)
RUN npm ci

# Copy source
COPY backend/src ./src
COPY backend/tsconfig.json ./
# app.ts serves this at /api/docs and reads it at startup
COPY backend/swagger.yaml ./

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]