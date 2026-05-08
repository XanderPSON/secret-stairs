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
COPY apps/secret-phrase/package.json ./apps/secret-phrase/
RUN yarn --immutable

COPY . .

# Configure environment variables
COPY apps/secret-phrase/.env.development apps/secret-phrase/.env

# DYNAMIC: Serve the the app with Node.js
RUN yarn nx run secret-phrase:build

EXPOSE 3001
CMD ["/bin/bash", "-c", "yarn workspace @app/secret-phrase start -p 3001"]