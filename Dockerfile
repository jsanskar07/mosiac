# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system mosaic && adduser --system --ingroup mosaic mosaic

COPY --from=builder --chown=mosaic:mosaic /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=mosaic:mosaic /app/node_modules ./node_modules
COPY --from=builder --chown=mosaic:mosaic /app/dist ./dist

USER mosaic
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["npm", "run", "start"]
