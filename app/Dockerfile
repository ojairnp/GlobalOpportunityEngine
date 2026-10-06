# syntax=docker/dockerfile:1
# Imagen de producción del Global Opportunity Engine (MySQL va aparte, ver docker-compose.yml).

# ---- Etapa 1: build (incluye devDependencies) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Etapa 2: runtime (solo dependencias de producción) ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=12000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 12000
CMD ["node", "dist/boot.js"]
