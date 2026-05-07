FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY kong.yml ./kong.yml
EXPOSE 8080
CMD ["node", "src/server.js"]

