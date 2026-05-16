# =========================
# Stage 1 — Dependencies
# =========================
FROM node:20-alpine AS deps

WORKDIR /app/frontend

COPY apps/frontend/package*.json ./

RUN npm ci

# =========================
# Stage 2 — Builder
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

COPY apps/frontend ./frontend

WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# =========================
# Stage 3 — Production
# =========================
FROM node:20-alpine AS runner

WORKDIR /app/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/package*.json ./

USER appuser

EXPOSE 3000

CMD ["npm", "start"]