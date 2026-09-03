FROM node:20-alpine
WORKDIR /app
COPY package.json .
ENV NODE_ENV=development
COPY . .
RUN npm install .
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
