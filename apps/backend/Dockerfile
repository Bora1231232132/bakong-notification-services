# Extract dependency from package.json to avoid invalidate docker cache when package.json change
FROM endeveit/docker-jq AS deps
COPY apps/backend/package.json /tmp
RUN jq '{ dependencies, devDependencies }' < /tmp/package.json > /tmp/deps.json

# Build project
FROM node:20-alpine as builder

ENV NODE_ENV development

RUN mkdir /opt/bk_notification_service && chown node:node /opt/bk_notification_service
WORKDIR /opt/bk_notification_service

USER node
COPY --chown=node:node --from=deps /tmp/deps.json ./package.json
COPY --chown=node:node apps/backend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

COPY --chown=node:node apps/packages/shared /opt/packages/shared
COPY --chown=node:node apps/backend .
RUN npm run build
RUN npm prune --production --legacy-peer-deps || npm prune --production --omit=dev --legacy-peer-deps


FROM node:20-alpine

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

RUN mkdir /opt/bk_notification_service && chown node:node /opt/bk_notification_service
WORKDIR /opt/bk_notification_service

USER node
COPY --from=builder --chown=node:node /opt/bk_notification_service/package*.json ./
COPY --from=builder --chown=node:node /opt/bk_notification_service/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /opt/bk_notification_service/dist/ ./dist/
COPY --from=builder --chown=node:node /opt/packages/shared /opt/packages/shared

ARG PORT=3000
ENV PORT $PORT

CMD ["node", "dist/main.js"]
