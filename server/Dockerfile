FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
RUN node --disable-warning=ExperimentalWarning src/seed.js
EXPOSE 4000
CMD ["npm", "start"]
