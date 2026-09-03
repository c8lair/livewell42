FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build -- --mode development
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
