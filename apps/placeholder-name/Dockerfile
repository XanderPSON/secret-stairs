FROM 652969937640.dkr.ecr.us-east-1.amazonaws.com/containers/node:v24-ub22

RUN apt-get update && apt-get install -y make clang python3 g++

# Avoids Next.js out of memory (OOM) errors
ENV NODE_OPTIONS=--max-old-space-size=8192
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /repo

# Install Depdendencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ .yarn/
COPY apps/placeholder-name/package.json ./apps/placeholder-name/
RUN yarn --immutable

COPY . .

# Configure environment variables
COPY apps/placeholder-name/.env.development apps/placeholder-name/.env

# DYNAMIC: Serve the the app with Node.js
RUN yarn nx run placeholder-name:build

EXPOSE 3001
CMD ["/bin/bash", "-c", "yarn workspace @app/placeholder-name start -p 3001"]