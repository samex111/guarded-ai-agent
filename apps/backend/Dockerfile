# =========================
# Stage 1 — Dependencies
# =========================
FROM node:20-alpine AS deps

WORKDIR /app/backend

COPY apps/backend/package*.json ./

RUN npm ci

# =========================
# Stage 2 — Builder
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/backend/node_modules ./backend/node_modules

COPY apps/backend ./backend
COPY apps/filesystem-mcp ./filesystem-mcp
COPY apps/lead-mcp ./lead-mcp

WORKDIR /app/backend

RUN npx prisma generate

RUN npm run build

# =========================
# Stage 3 — Production
# =========================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/filesystem-mcp ./filesystem-mcp
COPY --from=builder /app/lead-mcp ./lead-mcp

USER appuser

EXPOSE 8080

CMD ["node", "backend/dist/server.js"]