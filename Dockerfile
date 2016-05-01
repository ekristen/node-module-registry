FROM mhart/alpine-node:4

WORKDIR /opt

EXPOSE 3000
VOLUME ["/opt/data/storage", "/opt/app/db", "/opt/data/github-cache"]
CMD ["node", "app/server.js"]

COPY package.json /opt/package.json
RUN npm install --production

COPY . /opt
