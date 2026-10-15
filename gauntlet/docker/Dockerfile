# Development image for every repository that uses the gauntlet kit.
# Both arguments come from docker/.env through the compose file (gauntlet/docker/service/app.yml):
# an ARG before FROM is the supported way to parameterize the base image, and the compose file
# declares both as required, so through compose an empty value is impossible (a direct
# `docker build` must pass both --build-arg). NODE_VERSION must be an alpine tag
# (apk below); init derives it from engines.node in package.json. SERVICE_NAME is the directory
# under /workspace the repository is mounted at; its node_modules mount point is created here so
# the named volume mounted on it belongs to the node user.
ARG NODE_VERSION
FROM node:${NODE_VERSION}
ARG SERVICE_NAME

RUN apk add --no-cache bash curl git libgcc libstdc++ openssh-client ripgrep \
    && mkdir -p /home/node/.local/bin /home/node/.claude /workspace/${SERVICE_NAME}/node_modules \
    && chown -R node:node /home/node /workspace

ENV NPM_CONFIG_PREFIX=/home/node/.local
ENV PATH="/home/node/.local/bin:${PATH}"

USER node
WORKDIR /workspace/${SERVICE_NAME}
