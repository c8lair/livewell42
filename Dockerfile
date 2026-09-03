FROM node:20-alpine
WORKDIR /app
COPY package.json .
COPY . .
RUN npm install 
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
RUN npm run build
