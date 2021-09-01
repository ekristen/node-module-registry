FROM node:16-alpine

WORKDIR /opt
EXPOSE 3100
VOLUME ["/opt/data/storage"]
ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
CMD ["node", "registry/server.js"]

ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 /usr/local/bin/dumb-init

COPY package.json /opt/package.json
RUN apk add --no-cache make gcc g++ python && npm install --production && apk del make gcc g++ python && chmod +x /usr/local/bin/dumb-init

COPY . /opt
