FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci

FROM deps AS build
COPY apps/backend ./apps/backend
RUN npm run backend:prisma:generate
RUN npm run backend:build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "apps/backend"]
