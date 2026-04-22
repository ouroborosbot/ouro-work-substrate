FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/vault-control/package.json apps/vault-control/package.json
RUN npm install
COPY tsconfig.base.json vitest.config.ts ./
COPY apps/vault-control apps/vault-control
RUN npm run build --workspace @ouro/vault-control

FROM node:22-slim AS runtime
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/apps/vault-control/package.json apps/vault-control/package.json
COPY --from=build /app/apps/vault-control/dist apps/vault-control/dist
RUN npm install --omit=dev --ignore-scripts
EXPOSE 8080
ENTRYPOINT ["node", "apps/vault-control/dist/index.js"]
