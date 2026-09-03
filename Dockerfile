FROM node:20-alpine
WORKDIR /app
COPY package.json .
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
