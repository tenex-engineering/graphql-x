# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS node-base

####
FROM node-base AS deps

WORKDIR /app/

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm/ \
    npm ci

####
FROM node-base

WORKDIR /app/

RUN chown node:node ./

COPY --chown=node:node ./ ./
COPY --chown=node:node --from=deps /app/node_modules/ ./node_modules/

USER node

CMD ["npm", "run", "dev"]
