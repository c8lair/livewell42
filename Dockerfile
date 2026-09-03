FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --include=dev
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
