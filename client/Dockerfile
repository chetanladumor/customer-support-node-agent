FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Expose Vite to the docker network using --host
CMD ["npm", "run", "dev", "--", "--host"]
