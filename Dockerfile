FROM node:20-alpine
WORKDIR /app
#COPY package.json package-lock.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build -- --mode production
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
